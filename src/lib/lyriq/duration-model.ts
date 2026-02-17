/**
 * Lyr:IQ — Linguistically-weighted phoneme duration model
 *
 * The core differentiation from AutoLyrics and xLights' default equal-duration
 * breakdown. Vowels stretch to fill the sung portion of each word while
 * consonants receive fixed durations based on their articulatory category.
 *
 * Example: "close" (K L OW Z) at 400ms
 *   xLights default: K=100ms  L=100ms  OW=100ms  Z=100ms  (equal)
 *   Lyr:IQ:          K=50ms   L=70ms   OW=220ms  Z=60ms   (weighted)
 */

import type {
  ArpabetPhoneme,
  DurationModelConfig,
  Phoneme,
  PhonemeCategory,
} from "./types";
import {
  getPhonemeCategory,
  isVowel,
  stripStress,
  toPrestonBlair,
} from "./phoneme-map";

/* ── Default duration configuration ─────────────────────────────── */

export const DEFAULT_DURATION_CONFIG: DurationModelConfig = {
  vowel: { shareOfWord: { min: 0.45, max: 0.75 } },
  plosive: { minMs: 40, maxMs: 80 },
  fricative: { minMs: 60, maxMs: 100 },
  liquid: { minMs: 60, maxMs: 100 },
  glide: { minMs: 50, maxMs: 90 },
  nasal: { minMs: 50, maxMs: 90 },
  stop: { minMs: 30, maxMs: 60 },
};

/**
 * Get the "base" fixed duration for a consonant category.
 * Returns the midpoint of the configured range.
 */
function baseDurationMs(
  category: PhonemeCategory,
  config: DurationModelConfig,
): number {
  if (category === "vowel") return 0; // vowels are stretch-to-fill
  const range = config[category];
  return (range.minMs + range.maxMs) / 2;
}

/**
 * Clamp a consonant duration within its configured range.
 */
function clampConsonant(
  ms: number,
  category: PhonemeCategory,
  config: DurationModelConfig,
): number {
  if (category === "vowel") return ms;
  const range = config[category];
  return Math.max(range.minMs, Math.min(range.maxMs, ms));
}

/**
 * Distribute durations across phonemes for a single word.
 *
 * Algorithm:
 * 1. Assign base durations to all consonants.
 * 2. Sum consonant time; remaining time goes to vowels.
 * 3. If multiple vowels, split remaining time proportionally
 *    (first vowel gets slightly more — typically the nucleus).
 * 4. If consonant time exceeds word duration, scale everything down
 *    proportionally (very short word edge case).
 *
 * @param arpabetTokens - ARPAbet phoneme tokens (may include stress digits)
 * @param wordStartMs   - Word start time in ms
 * @param wordEndMs     - Word end time in ms
 * @param config        - Duration model configuration
 * @returns Array of Phoneme objects filling [wordStartMs, wordEndMs]
 */
export function distributePhonemes(
  arpabetTokens: string[],
  wordStartMs: number,
  wordEndMs: number,
  config: DurationModelConfig = DEFAULT_DURATION_CONFIG,
): Phoneme[] {
  const wordDurationMs = wordEndMs - wordStartMs;

  if (arpabetTokens.length === 0) return [];
  if (wordDurationMs <= 0) return [];

  // Single phoneme gets the full word duration
  if (arpabetTokens.length === 1) {
    const token = arpabetTokens[0];
    const clean = stripStress(token);
    return [
      {
        code: toPrestonBlair(clean),
        arpabet: clean,
        startMs: wordStartMs,
        endMs: wordEndMs,
        category: getPhonemeCategory(clean),
      },
    ];
  }

  // Classify each phoneme
  const classified = arpabetTokens.map((token) => {
    const clean = stripStress(token);
    const category = getPhonemeCategory(clean);
    return {
      arpabet: clean as ArpabetPhoneme,
      category,
      isVowel: isVowel(clean),
    };
  });

  const vowelIndices = classified
    .map((p, i) => (p.isVowel ? i : -1))
    .filter((i) => i >= 0);
  const consonantIndices = classified
    .map((p, i) => (!p.isVowel ? i : -1))
    .filter((i) => i >= 0);

  // Compute raw durations
  const durations = new Array<number>(classified.length).fill(0);

  // Assign base consonant durations
  let totalConsonantMs = 0;
  for (const i of consonantIndices) {
    const base = baseDurationMs(classified[i].category, config);
    durations[i] = base;
    totalConsonantMs += base;
  }

  if (vowelIndices.length === 0) {
    // No vowels (rare — e.g., "shh", "psst") → distribute proportionally
    const scale = wordDurationMs / Math.max(totalConsonantMs, 1);
    for (const i of consonantIndices) {
      durations[i] = Math.round(durations[i] * scale);
    }
  } else if (totalConsonantMs >= wordDurationMs) {
    // Consonants exceed word duration — scale everything down, give vowels minimum
    const minVowelMs = 20;
    const totalMinVowel = vowelIndices.length * minVowelMs;
    const availableForConsonants = Math.max(wordDurationMs - totalMinVowel, 0);
    const scale = availableForConsonants / Math.max(totalConsonantMs, 1);

    for (const i of consonantIndices) {
      durations[i] = Math.round(
        clampConsonant(durations[i] * scale, classified[i].category, config),
      );
    }
    // Recalculate
    totalConsonantMs = consonantIndices.reduce(
      (sum, i) => sum + durations[i],
      0,
    );
    const remainingForVowels = Math.max(wordDurationMs - totalConsonantMs, 0);
    distributeVowelTime(remainingForVowels, vowelIndices, durations);
  } else {
    // Normal case: remaining time goes to vowels
    const remainingForVowels = wordDurationMs - totalConsonantMs;
    distributeVowelTime(remainingForVowels, vowelIndices, durations);
  }

  // Fix rounding: adjust last phoneme to perfectly fill the word
  const totalAssigned = durations.reduce((a, b) => a + b, 0);
  const drift = wordDurationMs - totalAssigned;
  if (drift !== 0) {
    // Apply drift to the last vowel, or last phoneme if no vowels
    const adjustIdx =
      vowelIndices.length > 0
        ? vowelIndices[vowelIndices.length - 1]
        : durations.length - 1;
    durations[adjustIdx] += drift;
  }

  // Convert to absolute timestamps
  let cursor = wordStartMs;
  return classified.map((p, i) => {
    const startMs = cursor;
    const endMs = cursor + durations[i];
    cursor = endMs;
    return {
      code: toPrestonBlair(p.arpabet),
      arpabet: p.arpabet,
      startMs,
      endMs,
      category: p.category,
    };
  });
}

/**
 * Distribute remaining time among vowels.
 * First vowel (typically the nucleus) gets a slight bonus (60/40 split for 2 vowels).
 */
function distributeVowelTime(
  totalMs: number,
  vowelIndices: number[],
  durations: number[],
): void {
  if (vowelIndices.length === 0) return;

  if (vowelIndices.length === 1) {
    durations[vowelIndices[0]] = Math.round(totalMs);
    return;
  }

  // Weight: first vowel gets 1.5x, rest get 1x
  const firstWeight = 1.5;
  const restWeight = 1.0;
  const totalWeight = firstWeight + restWeight * (vowelIndices.length - 1);

  vowelIndices.forEach((idx, i) => {
    const weight = i === 0 ? firstWeight : restWeight;
    durations[idx] = Math.round((totalMs * weight) / totalWeight);
  });
}
