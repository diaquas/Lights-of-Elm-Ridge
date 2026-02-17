/**
 * Lyr:IQ — Singing face timing generator for xLights
 *
 * Public API surface for the Lyr:IQ engine.
 */

// Types
export type {
  ArpabetPhoneme,
  CmuConsonant,
  CmuVowel,
  DictionaryEntry,
  DurationModelConfig,
  DurationRange,
  LyricsData,
  LyricsSource,
  LyriqScreen,
  LyriqSession,
  LyriqStats,
  Phoneme,
  PhonemeCategory,
  Phrase,
  PipelineProgress,
  PipelineStep,
  PipelineStepStatus,
  PrestonBlairCode,
  SongMetadata,
  VocalTrack,
  VocalTrackType,
  Word,
} from "./types";

// Phoneme mapping
export {
  ARPABET_TO_PRESTON_BLAIR,
  getPhonemeCategory,
  isVowel,
  stripStress,
  toPrestonBlair,
} from "./phoneme-map";

// Duration model
export { DEFAULT_DURATION_CONFIG, distributePhonemes } from "./duration-model";

// Dictionary
export {
  getExtendedDictionarySize,
  graphemeToPhoneme,
  isInDictionary,
  lookupExtended,
  lookupWord,
} from "./dictionary";

// Lyrics processor
export {
  computeStats,
  detectPhrases,
  processAlignedWords,
  splitLyricsIntoLines,
  tokenizeWords,
} from "./lyrics-processor";
export type { AlignedPhrase, AlignedWord } from "./lyrics-processor";

// .xtiming generator
export {
  buildXtimingFilename,
  downloadXtiming,
  generateMultiTrackXtiming,
  generateXtiming,
} from "./xtiming-generator";
