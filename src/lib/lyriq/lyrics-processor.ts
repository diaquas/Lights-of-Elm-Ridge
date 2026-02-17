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
  Phrase,
  VocalTrack,
  VocalTrackType,
  Word,
} from "./types";
import { lookupWord, isInDictionary } from "./dictionary";
import { distributePhonemes } from "./duration-model";

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

/* ── Full Pipeline ──────────────────────────────────────────────── */

/**
 * Process aligned words into a complete VocalTrack.
 *
 * @param words     - Word-level timestamps from alignment
 * @param trackType - "lead", "background", or "duet"
 * @returns A VocalTrack ready for .xtiming export
 */
export function processAlignedWords(
  words: AlignedWord[],
  trackType: VocalTrackType = "lead",
): VocalTrack {
  const alignedPhrases = detectPhrases(words);

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
