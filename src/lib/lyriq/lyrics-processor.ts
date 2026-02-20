/**
 * Lyr:IQ — Lyrics-to-timing processor
 *
 * Takes raw lyrics text + word-level timestamps and produces a complete
 * VocalTrack with phrases, words, and phonemes.
 *
 * This is the glue between the alignment data (from Moises/forced alignment)
 * and the phoneme engine (dictionary + duration model).
 */

import type {
  LyriqStats,
  Phoneme,
  Phrase,
  VocalTrack,
  VocalTrackType,
  Word,
} from "./types";
import { lookupWord, isInDictionary } from "./dictionary";
import { distributePhonemes } from "./duration-model";
import { stripStress, toPrestonBlair, getPhonemeCategory } from "./phoneme-map";

/* ── Types for alignment input ──────────────────────────────────── */

/** Word-level timestamp from forced alignment or Moises transcription. */
export interface AlignedWord {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

/** A group of aligned words that form a lyric line/phrase. */
export interface AlignedPhrase {
  text: string;
  words: AlignedWord[];
  startMs: number;
  endMs: number;
}

/** Phoneme-level timestamp from the phoneme-align model. */
export interface AlignedPhoneme {
  /** ARPAbet phoneme code (no stress digit), e.g. "K", "L", "OW" */
  phoneme: string;
  /** Start time in milliseconds */
  startMs: number;
  /** End time in milliseconds */
  endMs: number;
}

/** Word with phoneme-level alignment from the phoneme-align model. */
export interface PhonemeAlignedWord {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
  /** Per-phoneme timestamps derived from audio (not heuristic). */
  phonemes: AlignedPhoneme[];
}

/* ── Phrase Detection ───────────────────────────────────────────── */

/** Minimum silence gap (ms) between words to trigger a phrase break. */
const PHRASE_GAP_MS = 300;

/**
 * Group aligned words into phrases based on silence gaps.
 * Words separated by >= PHRASE_GAP_MS of silence start a new phrase.
 */
export function detectPhrases(words: AlignedWord[]): AlignedPhrase[] {
  if (words.length === 0) return [];

  const phrases: AlignedPhrase[] = [];
  let currentWords: AlignedWord[] = [words[0]];

  for (let i = 1; i < words.length; i++) {
    const gap = words[i].startMs - words[i - 1].endMs;
    if (gap >= PHRASE_GAP_MS) {
      // Finish current phrase
      phrases.push(buildAlignedPhrase(currentWords));
      currentWords = [words[i]];
    } else {
      currentWords.push(words[i]);
    }
  }

  // Don't forget the last phrase
  if (currentWords.length > 0) {
    phrases.push(buildAlignedPhrase(currentWords));
  }

  return phrases;
}

function buildAlignedPhrase(words: AlignedWord[]): AlignedPhrase {
  return {
    text: words.map((w) => w.text).join(" "),
    words,
    startMs: words[0].startMs,
    endMs: words[words.length - 1].endMs,
  };
}

/**
 * Group words into phrases using pre-computed word counts per phrase.
 * Used when LRCLIB synced lines provide exact phrase boundaries —
 * much more reliable than silence gap detection, which misplaces
 * words when force-align timing is slightly off.
 */
function buildPhrasesFromWordCounts(
  words: AlignedWord[],
  phraseLengths: number[],
): AlignedPhrase[] {
  const phrases: AlignedPhrase[] = [];
  let wordIdx = 0;

  for (const count of phraseLengths) {
    if (count <= 0) continue;
    const phraseWords: AlignedWord[] = [];
    for (let i = 0; i < count && wordIdx < words.length; i++) {
      phraseWords.push(words[wordIdx]);
      wordIdx++;
    }
    if (phraseWords.length > 0) {
      phrases.push(buildAlignedPhrase(phraseWords));
    }
  }

  // Remaining words go into a final phrase
  if (wordIdx < words.length) {
    const remaining = words.slice(wordIdx);
    if (remaining.length > 0) {
      phrases.push(buildAlignedPhrase(remaining));
    }
  }

  return phrases;
}

/* ── Word → Phoneme Processing ──────────────────────────────────── */

/**
 * Process a single aligned word: dictionary lookup + phoneme distribution.
 */
function processWord(aligned: AlignedWord): Word {
  const entry = lookupWord(aligned.text);
  const phonemes = distributePhonemes(
    entry.phonemes,
    aligned.startMs,
    aligned.endMs,
  );

  return {
    text: aligned.text.toLowerCase(),
    startMs: aligned.startMs,
    endMs: aligned.endMs,
    phonemes,
    confidence: aligned.confidence,
    inDictionary: isInDictionary(aligned.text),
  };
}

/* ── Phoneme-Aligned Word Processing ───────────────────────────── */

/**
 * Process a word that already has phoneme-level timestamps from
 * the phoneme-align model. Bypasses dictionary lookup and duration
 * model entirely — uses the acoustic phoneme boundaries as-is.
 *
 * Post-processes phoneme timestamps to be contiguous: each phoneme
 * extends from its detected start to the next phoneme's start, and
 * the last phoneme extends to the word end. CTC alignment can produce
 * gaps (blank frames between phonemes), but in singing, sound is
 * continuous — vowels sustain until the next consonant.
 */
function processPhonemeAlignedWord(aligned: PhonemeAlignedWord): Word {
  const raw = aligned.phonemes.map((p) => {
    const clean = stripStress(p.phoneme);
    return {
      code: toPrestonBlair(clean),
      arpabet: clean,
      startMs: p.startMs,
      endMs: p.endMs,
      category: getPhonemeCategory(clean),
    };
  });

  // Make phonemes contiguous: each extends to the next phoneme's start,
  // and the last phoneme fills to the word end. First phoneme starts at
  // word start. This fills gaps left by CTC blank frames.
  if (raw.length > 0) {
    raw[0].startMs = aligned.startMs;
    for (let i = 0; i < raw.length - 1; i++) {
      raw[i].endMs = raw[i + 1].startMs;
    }
    raw[raw.length - 1].endMs = aligned.endMs;
  }

  return {
    text: aligned.text.toLowerCase(),
    startMs: aligned.startMs,
    endMs: aligned.endMs,
    phonemes: raw,
    confidence: aligned.confidence,
    inDictionary: isInDictionary(aligned.text),
  };
}

/**
 * Process phoneme-aligned words into a complete VocalTrack.
 *
 * This is the precision path: phoneme timestamps come directly from
 * wav2vec2 CTC alignment against the audio, not from heuristic
 * distribution. Each phoneme's start/end reflects what the model
 * actually heard in the audio.
 *
 * @param words         - Words with per-phoneme timestamps from phoneme-align
 * @param trackType     - "lead", "background", or "duet"
 * @param phraseLengths - Optional word counts per phrase from LRCLIB synced lines.
 *                        When provided, uses exact line boundaries instead of
 *                        silence gap detection (much more accurate).
 * @returns A VocalTrack ready for .xtiming export
 */
export function processPhonemeAlignedWords(
  words: PhonemeAlignedWord[],
  trackType: VocalTrackType = "lead",
  phraseLengths?: number[],
): VocalTrack {
  // Reuse phrase detection by converting to AlignedWord interface
  const asAligned: AlignedWord[] = words.map((w) => ({
    text: w.text,
    startMs: w.startMs,
    endMs: w.endMs,
    confidence: w.confidence,
  }));

  // Default: all words in a single phrase (matches human-correct xtiming).
  // Only split into multiple phrases when explicit phraseLengths are provided.
  const alignedPhrases =
    phraseLengths && phraseLengths.length > 0
      ? buildPhrasesFromWordCounts(asAligned, phraseLengths)
      : asAligned.length > 0
        ? [buildAlignedPhrase(asAligned)]
        : [];

  // Build a lookup so we can find the phoneme-aligned word for each phrase word
  const wordsByKey = new Map<string, PhonemeAlignedWord>();
  for (const w of words) {
    wordsByKey.set(`${w.text}|${w.startMs}|${w.endMs}`, w);
  }

  const phrases: Phrase[] = alignedPhrases.map((ap) => ({
    text: ap.text.toLowerCase(),
    startMs: ap.startMs,
    endMs: ap.endMs,
    words: ap.words.map((aw) => {
      const key = `${aw.text}|${aw.startMs}|${aw.endMs}`;
      const phonemeWord = wordsByKey.get(key);
      if (phonemeWord) {
        return processPhonemeAlignedWord(phonemeWord);
      }
      // Fallback to heuristic if somehow missing
      return processWord(aw);
    }),
  }));

  const labelMap: Record<VocalTrackType, string> = {
    lead: "Lyrics (Lead)",
    background: "Lyrics (Background)",
    duet: "Lyrics (Duet/Alt)",
  };

  return {
    type: trackType,
    label: labelMap[trackType],
    phrases,
  };
}

/* ── Full Pipeline ──────────────────────────────────────────────── */

/**
 * Process aligned words into a complete VocalTrack.
 * Uses dictionary lookup + duration model heuristic for phoneme timing.
 *
 * @param words         - Word-level timestamps from alignment
 * @param trackType     - "lead", "background", or "duet"
 * @param phraseLengths - Optional word counts per phrase from LRCLIB synced lines.
 * @returns A VocalTrack ready for .xtiming export
 */
export function processAlignedWords(
  words: AlignedWord[],
  trackType: VocalTrackType = "lead",
  phraseLengths?: number[],
): VocalTrack {
  const alignedPhrases =
    phraseLengths && phraseLengths.length > 0
      ? buildPhrasesFromWordCounts(words, phraseLengths)
      : detectPhrases(words);

  const phrases: Phrase[] = alignedPhrases.map((ap) => ({
    text: ap.text.toLowerCase(),
    startMs: ap.startMs,
    endMs: ap.endMs,
    words: ap.words.map(processWord),
  }));

  const labelMap: Record<VocalTrackType, string> = {
    lead: "Lyrics (Lead)",
    background: "Lyrics (Background)",
    duet: "Lyrics (Duet/Alt)",
  };

  return {
    type: trackType,
    label: labelMap[trackType],
    phrases,
  };
}

/**
 * Compute stats for a processed vocal track.
 */
export function computeStats(tracks: VocalTrack[]): LyriqStats {
  let totalWords = 0;
  let totalPhonemes = 0;
  let flaggedWords = 0;
  let dictionaryHits = 0;
  let dictionaryMisses = 0;

  for (const track of tracks) {
    for (const phrase of track.phrases) {
      for (const word of phrase.words) {
        totalWords++;
        totalPhonemes += word.phonemes.length;

        if (word.confidence < 0.5) flaggedWords++;
        if (word.inDictionary) dictionaryHits++;
        else dictionaryMisses++;
      }
    }
  }

  return {
    totalWords,
    totalPhonemes,
    flaggedWords,
    dictionaryHits,
    dictionaryMisses,
  };
}

/**
 * Split raw lyrics text into lines, filtering empty lines.
 */
export function splitLyricsIntoLines(text: string): string[] {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Parse a lyrics line into individual word tokens.
 */
export function tokenizeWords(line: string): string[] {
  return line
    .split(/\s+/)
    .map((w) => w.replace(/[^\w']/g, ""))
    .filter((w) => w.length > 0);
}
