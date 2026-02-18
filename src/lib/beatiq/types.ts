/* ------------------------------------------------------------------ */
/*  Beat:IQ — Type Definitions                                        */
/* ------------------------------------------------------------------ */

/* -- Screen & Session State -- */

/** Screens in the Beat:IQ workflow */
export type BeatiqScreen = "upload" | "processing" | "editor";

/** Song metadata extracted from the uploaded file */
export interface SongMetadata {
  /** Song title (from ID3 or filename) */
  title: string;
  /** Artist name (from ID3 or "Unknown Artist") */
  artist: string;
  /** Album name if available */
  album?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Detected BPM (populated after analysis) */
  bpm?: number;
}

/* -- Beat Tracks -- */

/** Categories for grouping tracks in the UI */
export type TrackCategory = "drums" | "melodic" | "structure";

/** Individual timing mark within a track */
export interface TimingMark {
  /** Onset time in milliseconds */
  timeMs: number;
  /** Detection strength/confidence 0-1 */
  strength: number;
}

/** A labeled timing mark (for chords, sections, etc.) */
export interface LabeledMark {
  /** Label text (e.g., "Am", "verse", "chorus") */
  label: string;
  /** Start time in milliseconds */
  startMs: number;
  /** End time in milliseconds */
  endMs: number;
}

/** How a track was generated */
export type TrackSource = "ai" | "local";

/** A single timing track (e.g., "Drums — Kick") */
export interface BeatTrack {
  /** Unique track identifier */
  id: string;
  /** Display name (e.g., "Drums — Kick") */
  name: string;
  /** Track category for UI grouping */
  category: TrackCategory;
  /** Whether this track is enabled for export */
  enabled: boolean;
  /** Timing marks (onset events) */
  marks: TimingMark[];
  /** Labeled marks (for structure tracks with labels) */
  labeledMarks?: LabeledMark[];
  /** How this track was generated */
  source?: TrackSource;
  /** Confidence range [min, max] where 0-1 */
  confidenceRange?: [number, number];
}

/* -- Analysis Configuration -- */

/** Frequency band definition for onset detection */
export interface FrequencyBand {
  /** Band identifier */
  id: string;
  /** Display name */
  name: string;
  /** Track category */
  category: TrackCategory;
  /** Low cutoff frequency in Hz */
  lowHz: number;
  /** High cutoff frequency in Hz */
  highHz: number;
  /** Onset detection sensitivity threshold (0-1, lower = more sensitive) */
  threshold: number;
  /** Minimum interval between onsets in ms */
  minIntervalMs: number;
}

/** Configuration for the audio analysis pipeline */
export interface AnalysisConfig {
  /** FFT frame size in samples (must be power of 2) */
  frameSize: number;
  /** Hop size in samples (typically frameSize / 2) */
  hopSize: number;
  /** Frequency bands to analyze */
  bands: FrequencyBand[];
}

/* -- Energy Data -- */

/** Energy envelope for a single frequency band */
export interface BandEnergy {
  /** Band identifier matching FrequencyBand.id */
  bandId: string;
  /** Energy values per frame */
  values: Float32Array;
  /** Time in ms corresponding to each frame */
  frameTimes: Float32Array;
}

/* -- Pipeline -- */

/** Pipeline step identifiers */
export type PipelineStep =
  | "decode"
  | "spectrum"
  | "tempo"
  | "onsets"
  | "tracks";

/** Status of a pipeline step */
export type PipelineStepStatus = "pending" | "active" | "done" | "error";

/** Pipeline progress entry */
export interface PipelineProgress {
  /** Step identifier */
  step: PipelineStep;
  /** Current status */
  status: PipelineStepStatus;
}

/* -- Session -- */

/** Complete Beat:IQ session state */
export interface BeatiqSession {
  /** Current screen */
  screen: BeatiqScreen;
  /** Uploaded audio file */
  audioFile: File | null;
  /** Object URL for audio playback */
  audioUrl: string | null;
  /** Song metadata */
  metadata: SongMetadata | null;
  /** Processing pipeline state */
  pipeline: PipelineProgress[];
  /** Generated timing tracks */
  tracks: BeatTrack[];
  /** Analysis statistics */
  stats: BeatiqStats | null;
}

/* -- Stats -- */

/** Summary statistics for the analysis results */
export interface BeatiqStats {
  /** Detected BPM */
  bpm: number;
  /** Total number of timing marks across all tracks */
  totalMarks: number;
  /** Number of generated tracks */
  trackCount: number;
  /** Duration of the analyzed audio in ms */
  durationMs: number;
  /** Whether any tracks have marks closer than a given frame rate can resolve */
  hasSubFrameEvents: boolean;
  /** Recommended minimum frame rate (fps) for xLights */
  recommendedFps: number;
}
