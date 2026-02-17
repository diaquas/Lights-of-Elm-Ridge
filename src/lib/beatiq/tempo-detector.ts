/* ------------------------------------------------------------------ */
/*  Beat:IQ — Tempo Detector                                          */
/*  Pure functions: BPM detection, beat grid, bar detection            */
/* ------------------------------------------------------------------ */

import type { TimingMark, LabeledMark } from "./types";

/** BPM search range */
const MIN_BPM = 60;
const MAX_BPM = 200;

/** Result of tempo detection */
export interface TempoResult {
  /** Detected BPM */
  bpm: number;
  /** Confidence (0-1) of the BPM estimate */
  confidence: number;
}

/**
 * Detect the tempo (BPM) of audio from its spectral flux envelope
 * using autocorrelation.
 *
 * @param flux       - Spectral flux values per frame
 * @param frameTimes - Timestamp in ms per frame
 * @returns TempoResult with BPM and confidence
 */
export function detectTempo(
  flux: Float32Array,
  frameTimes: Float32Array,
): TempoResult {
  const len = flux.length;
  if (len < 2) return { bpm: 120, confidence: 0 };

  // Estimate the frame rate from the frame times
  const frameIntervalMs =
    len > 1 ? (frameTimes[len - 1] - frameTimes[0]) / (len - 1) : 1;

  // Autocorrelation-based tempo detection
  // Convert BPM range to lag range in frames
  const minLag = Math.floor(60000 / (MAX_BPM * frameIntervalMs));
  const maxLag = Math.ceil(60000 / (MIN_BPM * frameIntervalMs));
  const safeLag = Math.min(maxLag, Math.floor(len / 2));

  if (minLag >= safeLag) return { bpm: 120, confidence: 0 };

  // Normalize flux (zero mean, unit variance)
  let mean = 0;
  for (let i = 0; i < len; i++) mean += flux[i];
  mean /= len;

  let variance = 0;
  for (let i = 0; i < len; i++) {
    const d = flux[i] - mean;
    variance += d * d;
  }
  const std = Math.sqrt(variance / len);
  if (std < 1e-10) return { bpm: 120, confidence: 0 };

  // Compute normalized autocorrelation for each lag
  let bestLag = minLag;
  let bestCorr = -Infinity;
  const correlations = new Float32Array(safeLag + 1);

  for (let lag = minLag; lag <= safeLag; lag++) {
    let sum = 0;
    const n = len - lag;
    for (let i = 0; i < n; i++) {
      sum += (flux[i] - mean) * (flux[i + lag] - mean);
    }
    const corr = sum / (n * std * std);
    correlations[lag] = corr;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  // Parabolic interpolation for sub-frame accuracy
  const refinedLag = parabolicInterp(correlations, bestLag, minLag, safeLag);
  const bpm = 60000 / (refinedLag * frameIntervalMs);

  // Clamp and round to reasonable precision
  const clampedBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));

  return {
    bpm: Math.round(clampedBpm * 10) / 10,
    confidence: Math.max(0, Math.min(1, bestCorr)),
  };
}

/**
 * Parabolic interpolation around a peak for sub-sample accuracy.
 */
function parabolicInterp(
  values: Float32Array,
  peak: number,
  minIdx: number,
  maxIdx: number,
): number {
  if (peak <= minIdx || peak >= maxIdx) return peak;
  const a = values[peak - 1];
  const b = values[peak];
  const c = values[peak + 1];
  const denom = a - 2 * b + c;
  if (Math.abs(denom) < 1e-10) return peak;
  return peak + (0.5 * (a - c)) / denom;
}

/**
 * Generate a beat grid (evenly-spaced beats) at the given BPM,
 * aligned to the strongest onset near the expected beat positions.
 *
 * @param bpm          - Detected BPM
 * @param durationMs   - Total audio duration in ms
 * @param onsets       - Optional onset marks for alignment
 * @returns Array of TimingMark representing beat positions
 */
export function generateBeatGrid(
  bpm: number,
  durationMs: number,
  onsets?: TimingMark[],
): TimingMark[] {
  if (bpm <= 0 || durationMs <= 0) return [];

  const beatIntervalMs = 60000 / bpm;
  const totalBeats = Math.floor(durationMs / beatIntervalMs);

  // Find the best starting offset by aligning to onsets
  const startOffset = findBestOffset(beatIntervalMs, durationMs, onsets);

  const beats: TimingMark[] = [];
  for (let i = 0; i < totalBeats; i++) {
    const timeMs = Math.round(startOffset + i * beatIntervalMs);
    if (timeMs >= 0 && timeMs <= durationMs) {
      beats.push({
        timeMs,
        strength: i % 4 === 0 ? 1.0 : 0.6, // Downbeats are stronger
      });
    }
  }

  return beats;
}

/**
 * Find the best starting offset for the beat grid by testing
 * alignment against detected onsets.
 */
function findBestOffset(
  beatIntervalMs: number,
  durationMs: number,
  onsets?: TimingMark[],
): number {
  if (!onsets || onsets.length === 0) return 0;

  // Test different starting offsets (subdivisions of the beat interval)
  const numTests = 16;
  const step = beatIntervalMs / numTests;
  let bestOffset = 0;
  let bestScore = -Infinity;

  for (let t = 0; t < numTests; t++) {
    const offset = t * step;
    let score = 0;

    // Score: sum of onset strengths that fall near a beat position
    for (const onset of onsets) {
      const beatPhase =
        (((onset.timeMs - offset) % beatIntervalMs) + beatIntervalMs) %
        beatIntervalMs;
      const distFromBeat = Math.min(beatPhase, beatIntervalMs - beatPhase);
      // Weight by closeness to beat (within 50ms tolerance)
      if (distFromBeat < 50) {
        score += onset.strength * (1 - distFromBeat / 50);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  return bestOffset;
}

/**
 * Generate bar (measure) marks from a beat grid.
 * Assumes 4/4 time signature (standard for most popular music).
 *
 * @param beats         - Beat positions from generateBeatGrid
 * @param beatsPerBar   - Beats per measure (default 4)
 * @returns Array of LabeledMark representing bar boundaries
 */
export function generateBars(
  beats: TimingMark[],
  beatsPerBar: number = 4,
): LabeledMark[] {
  if (beats.length === 0) return [];

  const bars: LabeledMark[] = [];
  let barNumber = 1;

  for (let i = 0; i < beats.length; i += beatsPerBar) {
    const startMs = Math.round(beats[i].timeMs);
    const endIdx = Math.min(i + beatsPerBar, beats.length);
    const endMs =
      endIdx < beats.length
        ? beats[endIdx].timeMs
        : startMs +
          (beats[Math.min(i + 1, beats.length - 1)].timeMs - startMs) *
            beatsPerBar;

    bars.push({
      label: `Bar ${barNumber}`,
      startMs,
      endMs: Math.round(endMs),
    });
    barNumber++;
  }

  return bars;
}

/**
 * Detect approximate song sections based on energy changes.
 * Groups the audio into quiet/loud regions and labels them.
 *
 * @param flux        - Spectral flux values per frame
 * @param frameTimes  - Timestamp in ms per frame
 * @param durationMs  - Total duration in ms
 * @returns Array of LabeledMark representing song sections
 */
export function detectSections(
  flux: Float32Array,
  frameTimes: Float32Array,
  durationMs: number,
): LabeledMark[] {
  const len = flux.length;
  if (len === 0) return [];

  // Smooth the energy with a large window (~5 seconds)
  const smoothWindowFrames = Math.max(
    1,
    Math.floor(len / Math.max(1, durationMs / 5000)),
  );
  const smoothed = smoothEnergy(flux, smoothWindowFrames);

  // Compute global median energy for high/low classification
  const sorted = Float32Array.from(smoothed).sort();
  const median = sorted[Math.floor(sorted.length / 2)];

  // Find transition points (energy crossing the median)
  const sections: LabeledMark[] = [];
  let currentIsHigh = smoothed[0] > median;
  let sectionStart = 0;
  let sectionIdx = 0;

  const sectionLabels = [
    "intro",
    "verse",
    "chorus",
    "verse",
    "chorus",
    "bridge",
    "chorus",
    "outro",
  ];

  for (let i = 1; i < len; i++) {
    const isHigh = smoothed[i] > median;
    if (isHigh !== currentIsHigh) {
      const startMs =
        sectionStart === 0 ? 0 : Math.round(frameTimes[sectionStart]);
      const endMs = Math.round(frameTimes[i]);

      // Only create sections longer than 3 seconds
      if (endMs - startMs >= 3000) {
        sections.push({
          label: sectionLabels[sectionIdx % sectionLabels.length],
          startMs,
          endMs,
        });
        sectionIdx++;
      }

      sectionStart = i;
      currentIsHigh = isHigh;
    }
  }

  // Final section
  const finalStartMs =
    sectionStart === 0 ? 0 : Math.round(frameTimes[sectionStart]);
  if (durationMs - finalStartMs >= 3000) {
    sections.push({
      label: sectionLabels[sectionIdx % sectionLabels.length],
      startMs: finalStartMs,
      endMs: Math.round(durationMs),
    });
  }

  // If no transitions found, return one big section
  if (sections.length === 0) {
    sections.push({
      label: "full song",
      startMs: 0,
      endMs: Math.round(durationMs),
    });
  }

  return sections;
}

/**
 * Smooth an energy signal with a simple moving average.
 */
function smoothEnergy(values: Float32Array, windowSize: number): Float32Array {
  const len = values.length;
  const smoothed = new Float32Array(len);
  const half = Math.floor(windowSize / 2);

  for (let i = 0; i < len; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(len - 1, i + half);
    let sum = 0;
    for (let j = start; j <= end; j++) sum += values[j];
    smoothed[i] = sum / (end - start + 1);
  }

  return smoothed;
}
