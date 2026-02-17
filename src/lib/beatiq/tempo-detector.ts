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
  let bpm = 60000 / (refinedLag * frameIntervalMs);

  // ── Octave correction ──────────────────────────────────────────────
  // Autocorrelation naturally favors half-tempo (every beat at 120 BPM
  // also correlates at 60 BPM).  Check if doubling the BPM yields a
  // comparable correlation; prefer the faster tempo when it does,
  // since most popular music lives in the 90-180 BPM range.
  const halfLag = Math.round(refinedLag / 2);
  if (halfLag >= minLag && halfLag <= safeLag) {
    const halfCorr = correlations[halfLag];
    // If the double-BPM candidate has ≥80% of the best correlation
    // and falls in the common 80-200 range, prefer it
    const doubleBpm = 60000 / (halfLag * frameIntervalMs);
    if (halfCorr >= bestCorr * 0.8 && doubleBpm <= MAX_BPM) {
      bpm = doubleBpm;
    }
  }

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
 * Returns LabeledMark[] with cycling "1","2","3","4" labels and
 * contiguous timing (each beat's endMs = next beat's startMs).
 *
 * @param bpm          - Detected BPM
 * @param durationMs   - Total audio duration in ms
 * @param onsets       - Optional onset marks for alignment
 * @param beatsPerBar  - Beats per measure (default 4, for labeling)
 * @returns Array of LabeledMark representing beat positions
 */
export function generateBeatGrid(
  bpm: number,
  durationMs: number,
  onsets?: TimingMark[],
  beatsPerBar: number = 4,
): LabeledMark[] {
  if (bpm <= 0 || durationMs <= 0) return [];

  const beatIntervalMs = 60000 / bpm;
  const totalBeats = Math.floor(durationMs / beatIntervalMs);

  // Find the best starting offset by aligning to onsets
  const startOffset = findBestOffset(beatIntervalMs, durationMs, onsets);

  const beats: LabeledMark[] = [];
  for (let i = 0; i < totalBeats; i++) {
    const startMs = Math.round(startOffset + i * beatIntervalMs);
    const endMs = Math.round(startOffset + (i + 1) * beatIntervalMs);
    if (startMs >= 0 && startMs <= durationMs) {
      beats.push({
        label: String((i % beatsPerBar) + 1),
        startMs,
        endMs: Math.min(endMs, Math.round(durationMs)),
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
 * Generate bar (measure) marks from a labeled beat grid.
 * Groups beats into bars based on label "1" (downbeat).
 *
 * @param beats       - Labeled beat positions from generateBeatGrid
 * @param bpm         - Detected BPM (for calculating last bar's end)
 * @param durationMs  - Total audio duration in ms
 * @returns Array of LabeledMark representing bar boundaries
 */
export function generateBars(
  beats: LabeledMark[],
  bpm: number,
  durationMs: number,
): LabeledMark[] {
  if (beats.length === 0) return [];

  const bars: LabeledMark[] = [];
  let barNumber = 1;
  let barStart = beats[0].startMs;

  for (let i = 1; i < beats.length; i++) {
    // A new bar starts on every downbeat (label "1")
    if (beats[i].label === "1") {
      bars.push({
        label: String(barNumber),
        startMs: barStart,
        endMs: beats[i].startMs,
      });
      barNumber++;
      barStart = beats[i].startMs;
    }
  }

  // Final partial bar
  const beatIntervalMs = 60000 / bpm;
  const lastEnd = Math.min(
    Math.round(barStart + 4 * beatIntervalMs),
    Math.round(durationMs),
  );
  if (lastEnd > barStart) {
    bars.push({
      label: String(barNumber),
      startMs: barStart,
      endMs: lastEnd,
    });
  }

  return bars;
}

/**
 * Detect approximate song sections based on energy changes.
 * Produces contiguous, non-overlapping sections that cover the full track.
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
  // Build contiguous sections — every ms belongs to a section
  const rawSections: { isHigh: boolean; startMs: number; endMs: number }[] = [];
  let currentIsHigh = smoothed[0] > median;
  let sectionStartFrame = 0;

  for (let i = 1; i < len; i++) {
    const isHigh = smoothed[i] > median;
    if (isHigh !== currentIsHigh) {
      const startMs =
        sectionStartFrame === 0 ? 0 : Math.round(frameTimes[sectionStartFrame]);
      const endMs = Math.round(frameTimes[i]);
      rawSections.push({ isHigh: currentIsHigh, startMs, endMs });
      sectionStartFrame = i;
      currentIsHigh = isHigh;
    }
  }

  // Final section extends to end of track
  const finalStartMs =
    sectionStartFrame === 0 ? 0 : Math.round(frameTimes[sectionStartFrame]);
  rawSections.push({
    isHigh: currentIsHigh,
    startMs: finalStartMs,
    endMs: Math.round(durationMs),
  });

  // Merge short sections (< 8 seconds) into their neighbors
  const MIN_SECTION_MS = 8000;
  const merged: typeof rawSections = [];
  for (const section of rawSections) {
    if (
      merged.length > 0 &&
      (section.endMs - section.startMs < MIN_SECTION_MS ||
        merged[merged.length - 1].endMs - merged[merged.length - 1].startMs <
          MIN_SECTION_MS)
    ) {
      // Absorb into previous section
      merged[merged.length - 1].endMs = section.endMs;
      merged[merged.length - 1].isHigh =
        section.endMs - section.startMs >
        merged[merged.length - 1].endMs - merged[merged.length - 1].startMs
          ? section.isHigh
          : merged[merged.length - 1].isHigh;
    } else {
      merged.push({ ...section });
    }
  }

  // Assign labels based on energy pattern and position
  const sections: LabeledMark[] = [];
  const total = merged.length;

  for (let i = 0; i < total; i++) {
    const m = merged[i];
    let label: string;
    if (i === 0 && !m.isHigh) {
      label = "INTRO";
    } else if (i === total - 1 && !m.isHigh) {
      label = "OUTRO";
    } else if (m.isHigh) {
      label = `CHORUS ${sections.filter((s) => s.label.startsWith("CHORUS")).length + 1}`;
    } else {
      const verseCount = sections.filter(
        (s) => s.label.startsWith("VERSE") || s.label.startsWith("BREAKDOWN"),
      ).length;
      label = verseCount === 0 ? "VERSE 1" : `VERSE ${verseCount + 1}`;
    }

    sections.push({
      label,
      startMs: m.startMs,
      endMs: m.endMs,
    });
  }

  // If no sections at all, return one big section
  if (sections.length === 0) {
    sections.push({
      label: "FULL SONG",
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
