/**
 * Lyr:IQ — Core type definitions
 *
 * Singing face timing generator for xLights.
 * Produces 3-layer .xtiming files: phrases / words / phonemes.
 */

/* ── Preston Blair Phoneme Codes (xLights standard) ─────────────── */

export type PrestonBlairCode =
  | "AI"
  | "O"
  | "E"
  | "U"
  | "etc"
  | "L"
  | "WQ"
  | "MBP"
  | "FV"
  | "rest";

/** Category that governs duration behavior. */
export type PhonemeCategory =
  | "vowel"
  | "plosive"
  | "fricative"
  | "liquid"
  | "glide"
  | "nasal"
  | "stop";

/* ── CMU ARPAbet Phonemes ───────────────────────────────────────── */

export type CmuVowel =
  | "AA"
  | "AE"
  | "AH"
  | "AO"
  | "AW"
  | "AY"
  | "EH"
  | "ER"
  | "EY"
  | "IH"
  | "IY"
  | "OW"
  | "OY"
  | "UH"
  | "UW";

export type CmuConsonant =
  | "B"
  | "CH"
  | "D"
  | "DH"
  | "F"
  | "G"
  | "HH"
  | "JH"
  | "K"
  | "L"
  | "M"
  | "N"
  | "NG"
  | "P"
  | "R"
  | "S"
  | "SH"
  | "T"
  | "TH"
  | "V"
  | "W"
  | "WH"
  | "Y"
  | "Z"
  | "ZH";

/** ARPAbet phoneme (without stress digit). */
export type ArpabetPhoneme = CmuVowel | CmuConsonant;

/* ── Timing Entities ────────────────────────────────────────────── */

/** A single phoneme with timing and metadata. */
export interface Phoneme {
  /** Preston Blair code for xLights. */
  code: PrestonBlairCode;
  /** Original ARPAbet phoneme(s) this maps from. */
  arpabet: string;
  /** Start time in milliseconds. */
  startMs: number;
  /** End time in milliseconds. */
  endMs: number;
  /** Duration category for the duration model. */
  category: PhonemeCategory;
}

/** A word with timing and its phoneme breakdown. */
export interface Word {
  /** The word text (lowercase). */
  text: string;
  /** Start time in milliseconds. */
  startMs: number;
  /** End time in milliseconds. */
  endMs: number;
  /** Ordered phonemes filling [startMs, endMs]. */
  phonemes: Phoneme[];
  /** Alignment confidence 0-1 (from forced alignment). */
  confidence: number;
  /** Whether the word was found in the dictionary. */
  inDictionary: boolean;
}

/** A phrase (lyric line) with timing and its word breakdown. */
export interface Phrase {
  /** Full phrase text (lowercase). */
  text: string;
  /** Start time in milliseconds. */
  startMs: number;
  /** End time in milliseconds. */
  endMs: number;
  /** Ordered words filling [startMs, endMs]. */
  words: Word[];
}

/* ── Vocal Tracks ───────────────────────────────────────────────── */

export type VocalTrackType = "lead" | "background" | "duet";

/** A complete timing track for one vocal part. */
export interface VocalTrack {
  type: VocalTrackType;
  /** Display label, e.g. "Lyrics (Lead)". */
  label: string;
  phrases: Phrase[];
}

/* ── Song Metadata ──────────────────────────────────────────────── */

export interface SongMetadata {
  title: string;
  artist: string;
  album?: string;
  /** Duration in seconds. */
  durationSec: number;
  /** Source of the metadata (id3, filename, user). */
  source: "id3" | "filename" | "user";
}

/* ── Lyrics ─────────────────────────────────────────────────────── */

export type LyricsSource = "auto" | "moises" | "user";

export interface LyricsData {
  /** Raw lyrics text (newline-separated lines). */
  text: string;
  source: LyricsSource;
  /** Whether the user has confirmed/edited the lyrics. */
  confirmed: boolean;
}

/* ── Processing Pipeline ────────────────────────────────────────── */

export type PipelineStep =
  | "upload"
  | "separating"
  | "fetching-lyrics"
  | "aligning-lead"
  | "aligning-background"
  | "generating-phonemes"
  | "optimizing";

export type PipelineStepStatus = "pending" | "active" | "done" | "error";

export interface PipelineProgress {
  step: PipelineStep;
  status: PipelineStepStatus;
  message?: string;
}

/* ── Session State ──────────────────────────────────────────────── */

export type LyriqScreen = "upload" | "processing" | "editor";

export interface LyriqSession {
  screen: LyriqScreen;
  /** The uploaded MP3 file (client-side only). */
  audioFile: File | null;
  /** Object URL for playback. */
  audioUrl: string | null;
  metadata: SongMetadata | null;
  lyrics: LyricsData | null;
  /** Processing pipeline progress. */
  pipeline: PipelineProgress[];
  /** Generated vocal tracks (populated after processing). */
  tracks: VocalTrack[];
  /** Stats for the editor screen. */
  stats: LyriqStats | null;
}

export interface LyriqStats {
  totalWords: number;
  totalPhonemes: number;
  flaggedWords: number;
  dictionaryHits: number;
  dictionaryMisses: number;
}

/* ── Dictionary Entry ───────────────────────────────────────────── */

/** A word and its ARPAbet pronunciation. */
export interface DictionaryEntry {
  word: string;
  /** ARPAbet phonemes (without stress digits). */
  phonemes: ArpabetPhoneme[];
}

/* ── Duration Model Config ──────────────────────────────────────── */

export interface DurationRange {
  minMs: number;
  maxMs: number;
}

export interface DurationModelConfig {
  vowel: { shareOfWord: { min: number; max: number } };
  plosive: DurationRange;
  fricative: DurationRange;
  liquid: DurationRange;
  glide: DurationRange;
  nasal: DurationRange;
  stop: DurationRange;
}
