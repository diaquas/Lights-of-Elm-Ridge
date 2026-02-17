/* ------------------------------------------------------------------ */
/*  Beat:IQ — Beat Processor                                          */
/*  Orchestrates the analysis pipeline: decode → analyze → tracks     */
/* ------------------------------------------------------------------ */

import type {
  BeatTrack,
  BeatiqStats,
  SongMetadata,
  PipelineProgress,
  PipelineStep,
  AnalysisConfig,
} from "./types";
import {
  decodeAudio,
  computeBandEnergies,
  computeSpectralFlux,
  DEFAULT_CONFIG,
} from "./audio-analyzer";
import { detectOnsets } from "./onset-detector";
import {
  detectTempo,
  generateBeatGrid,
  generateBars,
  detectSections,
} from "./tempo-detector";

/** Callback for reporting pipeline progress */
export type ProgressCallback = (pipeline: PipelineProgress[]) => void;

/**
 * Result of the full Beat:IQ analysis pipeline.
 */
export interface AnalysisResult {
  tracks: BeatTrack[];
  metadata: SongMetadata;
  stats: BeatiqStats;
}

/**
 * Run the full Beat:IQ analysis pipeline on an audio file.
 *
 * @param file     - The uploaded audio file
 * @param metadata - Pre-extracted song metadata (title, artist)
 * @param onProgress - Callback for pipeline progress updates
 * @param config   - Optional analysis configuration
 * @returns AnalysisResult with all generated tracks and stats
 */
export async function analyzeAudio(
  file: File,
  metadata: SongMetadata,
  onProgress: ProgressCallback,
  config: AnalysisConfig = DEFAULT_CONFIG,
): Promise<AnalysisResult> {
  const steps: PipelineStep[] = [
    "decode",
    "spectrum",
    "tempo",
    "onsets",
    "tracks",
  ];
  const pipeline: PipelineProgress[] = steps.map((step) => ({
    step,
    status: "pending" as const,
  }));

  const updateStep = (
    step: PipelineStep,
    status: PipelineProgress["status"],
  ) => {
    const idx = pipeline.findIndex((p) => p.step === step);
    if (idx >= 0) {
      pipeline[idx] = { ...pipeline[idx], status };
      onProgress([...pipeline]);
    }
  };

  // Step 1: Decode audio
  updateStep("decode", "active");
  const { samples, sampleRate, durationMs } = await decodeAudio(file);
  const updatedMetadata = { ...metadata, durationMs };
  updateStep("decode", "done");

  // Step 2: Compute frequency spectrum / band energies
  updateStep("spectrum", "active");
  const bandEnergies = computeBandEnergies(samples, sampleRate, config);
  const { flux, frameTimes: fluxTimes } = computeSpectralFlux(
    samples,
    sampleRate,
    config.frameSize,
    config.hopSize,
  );
  updateStep("spectrum", "done");

  // Step 3: Detect tempo
  updateStep("tempo", "active");
  const tempo = detectTempo(flux, fluxTimes);
  updatedMetadata.bpm = tempo.bpm;
  updateStep("tempo", "done");

  // Step 4: Detect onsets per frequency band
  updateStep("onsets", "active");
  const tracks: BeatTrack[] = [];

  // Instrument-approximation tracks from frequency bands
  for (let i = 0; i < config.bands.length; i++) {
    const band = config.bands[i];
    const energy = bandEnergies[i];
    const marks = detectOnsets(
      energy.values,
      energy.frameTimes,
      band.threshold,
      band.minIntervalMs,
    );

    if (marks.length > 0) {
      tracks.push({
        id: band.id,
        name: band.name,
        category: band.category,
        enabled: true,
        marks,
      });
    }
  }
  updateStep("onsets", "done");

  // Step 5: Generate structural tracks
  updateStep("tracks", "active");

  // Beat grid (labeled with cycling 1,2,3,4)
  const allOnsets = tracks.flatMap((t) => t.marks);
  const beats = generateBeatGrid(tempo.bpm, durationMs, allOnsets);
  if (beats.length > 0) {
    tracks.push({
      id: "beats",
      name: "Beat Count",
      category: "structure",
      enabled: true,
      marks: [],
      labeledMarks: beats,
    });
  }

  // Bars
  const bars = generateBars(beats, tempo.bpm, durationMs);
  if (bars.length > 0) {
    tracks.push({
      id: "bars",
      name: "Bars",
      category: "structure",
      enabled: true,
      marks: [],
      labeledMarks: bars,
    });
  }

  // Song sections
  const sections = detectSections(flux, fluxTimes, durationMs);
  if (sections.length > 0) {
    tracks.push({
      id: "sections",
      name: "Sections",
      category: "structure",
      enabled: true,
      marks: [],
      labeledMarks: sections,
    });
  }

  updateStep("tracks", "done");

  // Compute stats
  const stats = computeStats(tracks, tempo.bpm, durationMs);

  return {
    tracks,
    metadata: updatedMetadata,
    stats,
  };
}

/**
 * Compute summary statistics from the analysis results.
 */
export function computeStats(
  tracks: BeatTrack[],
  bpm: number,
  durationMs: number,
): BeatiqStats {
  let totalMarks = 0;
  let minInterval = Infinity;

  for (const track of tracks) {
    totalMarks += track.marks.length;
    if (track.labeledMarks) totalMarks += track.labeledMarks.length;

    // Find the minimum interval between consecutive marks
    for (let i = 1; i < track.marks.length; i++) {
      const interval = track.marks[i].timeMs - track.marks[i - 1].timeMs;
      if (interval > 0 && interval < minInterval) {
        minInterval = interval;
      }
    }
  }

  // Determine recommended FPS based on minimum interval
  // At N fps, frame duration = 1000/N ms
  // Need frame duration <= minInterval for clean resolution
  let recommendedFps = 20; // xLights default
  if (minInterval < 50) recommendedFps = 50;
  else if (minInterval < 40) recommendedFps = 50;
  else if (minInterval < 25) recommendedFps = 50;

  const hasSubFrameEvents = minInterval < 50; // 50ms = 20fps frame

  return {
    bpm,
    totalMarks,
    trackCount: tracks.length,
    durationMs,
    hasSubFrameEvents,
    recommendedFps,
  };
}
