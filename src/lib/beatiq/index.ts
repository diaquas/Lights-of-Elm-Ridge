/* ------------------------------------------------------------------ */
/*  Beat:IQ — Barrel Export                                            */
/* ------------------------------------------------------------------ */

// Types
export type {
  BeatiqScreen,
  BeatiqSession,
  BeatiqStats,
  BeatTrack,
  TimingMark,
  LabeledMark,
  SongMetadata,
  TrackCategory,
  FrequencyBand,
  AnalysisConfig,
  BandEnergy,
  PipelineStep,
  PipelineStepStatus,
  PipelineProgress,
} from "./types";

// Audio analyzer
export {
  decodeAudio,
  computeBandEnergies,
  computeSpectralFlux,
  hannWindow,
  fft,
  DEFAULT_BANDS,
  DEFAULT_CONFIG,
} from "./audio-analyzer";

// Onset detector
export {
  detectOnsets,
  detectOnsetsFromFlux,
  normalizeStrengths,
} from "./onset-detector";

// Tempo detector
export {
  detectTempo,
  generateBeatGrid,
  generateBars,
  detectSections,
} from "./tempo-detector";
export type { TempoResult } from "./tempo-detector";

// Beat processor
export { analyzeAudio, computeStats } from "./beat-processor";
export type { AnalysisResult, ProgressCallback } from "./beat-processor";

// xTiming generator
export {
  generateXtiming,
  generateMultiTrackXtiming,
  buildXtimingFilename,
  downloadXtiming,
  escapeXml,
} from "./xtiming-generator";
