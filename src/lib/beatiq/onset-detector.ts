/* ------------------------------------------------------------------ */
/*  Beat:IQ — Onset Detector                                          */
/*  Pure functions: detect onsets from energy envelopes                */
/* ------------------------------------------------------------------ */

import type { TimingMark } from "./types";

/**
 * Detect onsets from an energy envelope using adaptive thresholding
 * and peak picking.
 *
 * @param energyValues   - Energy values per analysis frame
 * @param frameTimes     - Timestamp in ms for each frame
 * @param threshold      - Sensitivity threshold (0-1, lower = more sensitive)
 * @param minIntervalMs  - Minimum time between consecutive onsets
 * @returns Array of TimingMark with onset times and strengths
 */
export function detectOnsets(
  energyValues: Float32Array,
  frameTimes: Float32Array,
  threshold: number,
  minIntervalMs: number,
): TimingMark[] {
  const len = energyValues.length;
  if (len < 3) return [];

  // Compute the adaptive threshold using a median filter
  const medianWindowSize = 15;
  const adaptiveThreshold = computeAdaptiveThreshold(
    energyValues,
    medianWindowSize,
    threshold,
  );

  // Peak picking: find local maxima above the adaptive threshold
  const marks: TimingMark[] = [];
  let lastOnsetMs = -Infinity;

  for (let i = 1; i < len - 1; i++) {
    const val = energyValues[i];
    if (
      val > adaptiveThreshold[i] &&
      val > energyValues[i - 1] &&
      val >= energyValues[i + 1]
    ) {
      const timeMs = frameTimes[i];
      if (timeMs - lastOnsetMs >= minIntervalMs) {
        // Normalize strength relative to the max energy
        marks.push({
          timeMs: Math.round(timeMs),
          strength: val,
        });
        lastOnsetMs = timeMs;
      }
    }
  }

  // Normalize strengths to 0-1 range
  return normalizeStrengths(marks);
}

/**
 * Compute an adaptive threshold using a running median + offset.
 * This prevents dense regions from flooding with false detections
 * while still allowing quiet passages to register.
 */
function computeAdaptiveThreshold(
  values: Float32Array,
  windowSize: number,
  sensitivity: number,
): Float32Array {
  const len = values.length;
  const result = new Float32Array(len);
  const halfWindow = Math.floor(windowSize / 2);

  // Pre-compute the global mean for the offset
  let globalSum = 0;
  for (let i = 0; i < len; i++) globalSum += values[i];
  const globalMean = len > 0 ? globalSum / len : 0;

  for (let i = 0; i < len; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(len - 1, i + halfWindow);

    // Use mean of local window (faster than true median, good enough)
    let sum = 0;
    let count = 0;
    for (let j = start; j <= end; j++) {
      sum += values[j];
      count++;
    }
    const localMean = sum / count;

    // Threshold = local mean + sensitivity * global mean
    result[i] = localMean + sensitivity * globalMean;
  }

  return result;
}

/**
 * Normalize timing mark strengths to the 0-1 range.
 */
export function normalizeStrengths(marks: TimingMark[]): TimingMark[] {
  if (marks.length === 0) return marks;
  let maxStrength = 0;
  for (const m of marks) {
    if (m.strength > maxStrength) maxStrength = m.strength;
  }
  if (maxStrength === 0) return marks;
  return marks.map((m) => ({
    timeMs: m.timeMs,
    strength: m.strength / maxStrength,
  }));
}

/**
 * Detect onsets from spectral flux data (for overall onset strength).
 * Same algorithm as detectOnsets but with defaults tuned for spectral flux.
 */
export function detectOnsetsFromFlux(
  flux: Float32Array,
  frameTimes: Float32Array,
  minIntervalMs: number = 200,
): TimingMark[] {
  return detectOnsets(flux, frameTimes, 0.3, minIntervalMs);
}
