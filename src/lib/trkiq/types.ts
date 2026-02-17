/* ------------------------------------------------------------------ */
/*  TRK:IQ — Unified Type Definitions                                 */
/*  Combines instrument timing (Beat:IQ) + vocal timing (Lyr:IQ)      */
/* ------------------------------------------------------------------ */

import type { BeatTrack, BeatiqStats } from "@/lib/beatiq/types";
import type { VocalTrack, LyriqStats } from "@/lib/lyriq/types";

/* -- Reexport shared types ----------------------------------------- */
export type { BeatTrack, BeatiqStats } from "@/lib/beatiq/types";
export type { VocalTrack, LyriqStats } from "@/lib/lyriq/types";
export type {
  TimingMark,
  LabeledMark,
  TrackCategory,
  FrequencyBand,
} from "@/lib/beatiq/types";

/* -- Song Metadata ------------------------------------------------- */

/** Unified song metadata (superset of beatiq + lyriq metadata) */
export interface SongMetadata {
  title: string;
  artist: string;
  album?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Detected BPM (populated after analysis) */
  bpm?: number;
}

/* -- Demucs Stems -------------------------------------------------- */

/** Stems returned by Demucs separation */
export interface StemSet {
  /** URL to the vocals stem */
  vocals?: string;
  /** URL to the drums stem */
  drums?: string;
  /** URL to the bass stem */
  bass?: string;
  /** URL to the guitar stem */
  guitar?: string;
  /** URL to the piano stem */
  piano?: string;
  /** URL to the other/residual stem */
  other?: string;
}

/** Status of a Replicate prediction */
export type PredictionStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

/** Response from the Demucs Edge Function */
export interface DemucsResponse {
  predictionId: string;
  status: PredictionStatus;
  /** Stem URLs — only present when status is "succeeded" */
  stems?: StemSet;
  /** Error message — only present when status is "failed" */
  error?: string;
}

/* -- Lyrics -------------------------------------------------------- */

/** Source of lyrics data */
export type LyricsSource = "lrclib" | "user" | "none";

/** LRCLIB synced lyrics line */
export interface SyncedLine {
  /** Timestamp in milliseconds */
  timeMs: number;
  /** Line text */
  text: string;
}

/** Lyrics data from LRCLIB or user input */
export interface LyricsData {
  /** Plain lyrics text */
  plainText: string;
  /** Synced lines (if available from LRCLIB) */
  syncedLines: SyncedLine[] | null;
  /** Data source */
  source: LyricsSource;
}

/* -- Pipeline ------------------------------------------------------ */

/** Processing pipeline steps for TRK:IQ */
export type TrkiqPipelineStep =
  | "decode"
  | "stems"
  | "analyze"
  | "lyrics"
  | "generate";

/** Status of a pipeline step */
export type PipelineStepStatus =
  | "pending"
  | "active"
  | "done"
  | "skipped"
  | "error";

/** Pipeline progress entry */
export interface PipelineProgress {
  step: TrkiqPipelineStep;
  status: PipelineStepStatus;
  /** Optional detail message (e.g., "Uploading to Replicate...") */
  detail?: string;
}

/* -- Session ------------------------------------------------------- */

export type TrkiqScreen = "upload" | "processing" | "editor";

/** Complete TRK:IQ session state */
export interface TrkiqSession {
  screen: TrkiqScreen;
  /** Uploaded audio file */
  audioFile: File | null;
  /** Object URL for playback */
  audioUrl: string | null;
  /** Song metadata */
  metadata: SongMetadata | null;
  /** Lyrics data */
  lyrics: LyricsData | null;
  /** Processing pipeline */
  pipeline: PipelineProgress[];
  /** Whether Demucs stem separation is available */
  stemsAvailable: boolean;
  /** Demucs prediction ID (for polling) */
  predictionId: string | null;
  /** Generated instrument timing tracks */
  beatTracks: BeatTrack[];
  /** Generated vocal timing tracks */
  vocalTracks: VocalTrack[];
  /** Beat:IQ stats */
  beatStats: BeatiqStats | null;
  /** Lyr:IQ stats */
  lyriqStats: LyriqStats | null;
}

/* -- Combined Stats ------------------------------------------------ */

/** Summary statistics for the TRK:IQ editor */
export interface TrkiqStats {
  bpm: number;
  instrumentTracks: number;
  vocalTracks: number;
  totalMarks: number;
  totalWords: number;
  totalPhonemes: number;
  durationMs: number;
  usedStems: boolean;
}
