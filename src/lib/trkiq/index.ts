/* ------------------------------------------------------------------ */
/*  TRK:IQ — Barrel Export                                             */
/* ------------------------------------------------------------------ */

// Types
export type {
  SongMetadata,
  StemSet,
  DemucsResponse,
  PredictionStatus,
  LyricsSource,
  LyricsData,
  SyncedLine,
  TrkiqPipelineStep,
  PipelineStepStatus,
  PipelineSubPhase,
  PipelineProgress,
  TrkiqScreen,
  TrkiqSession,
  TrkiqStats,
  BeatTrack,
  BeatiqStats,
  VocalTrack,
  LyriqStats,
} from "./types";

// Pipeline
export { runPipeline } from "./pipeline";
export type { TrkiqResult, ProgressCallback } from "./pipeline";

// LRCLIB client
export { fetchLyrics, searchLyrics, parseLrc } from "./lrclib-client";

// Replicate client
export { separateStems, checkDemucsAvailable } from "./replicate-client";

// xTiming export
export {
  generateCombinedXtiming,
  buildTrkiqFilename,
  downloadXtiming,
} from "./xtiming-export";
