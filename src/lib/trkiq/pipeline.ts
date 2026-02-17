/* ------------------------------------------------------------------ */
/*  TRK:IQ — Unified Processing Pipeline                              */
/*  One upload → parallel analysis → combined timing tracks            */
/* ------------------------------------------------------------------ */

import type {
  SongMetadata,
  LyricsData,
  StemSet,
  PipelineProgress,
  TrkiqPipelineStep,
  TrkiqStats,
  SyncedLine,
} from "./types";
import type { BeatTrack, BeatiqStats } from "@/lib/beatiq/types";
import type { VocalTrack, LyriqStats } from "@/lib/lyriq/types";

// Beat:IQ engine
import {
  decodeAudio,
  computeBandEnergies,
  computeSpectralFlux,
  DEFAULT_CONFIG,
} from "@/lib/beatiq/audio-analyzer";
import { detectOnsets } from "@/lib/beatiq/onset-detector";
import {
  detectTempo,
  generateBeatGrid,
  generateBars,
  detectSections,
} from "@/lib/beatiq/tempo-detector";
import type { LabeledMark } from "@/lib/beatiq/types";
import { computeStats as computeBeatStats } from "@/lib/beatiq/beat-processor";
import { detectBeatsWithEssentia } from "@/lib/beatiq/essentia-client";

// Lyr:IQ engine
import {
  processAlignedWords,
  computeStats as computeLyriqStats,
} from "@/lib/lyriq/lyrics-processor";
import type { AlignedWord } from "@/lib/lyriq/lyrics-processor";

// API clients
import { fetchLyrics, searchLyrics } from "./lrclib-client";
import { separateStems, checkDemucsAvailable } from "./replicate-client";

/** Callback for pipeline progress updates */
export type ProgressCallback = (pipeline: PipelineProgress[]) => void;

/** Full analysis result */
export interface TrkiqResult {
  beatTracks: BeatTrack[];
  vocalTracks: VocalTrack[];
  metadata: SongMetadata;
  lyrics: LyricsData | null;
  beatStats: BeatiqStats;
  lyriqStats: LyriqStats | null;
  combined: TrkiqStats;
}

/**
 * Run the full TRK:IQ pipeline.
 *
 * Flow:
 *   1. Decode audio (client)
 *   2. [If auth] Separate stems via Demucs (Replicate)
 *   3. Analyze: BPM/beats + onset detection (on stems or full mix)
 *   4. Fetch lyrics (LRCLIB) + process to phonemes
 *   5. Assemble all timing tracks
 */
export async function runPipeline(
  file: File,
  metadata: SongMetadata,
  onProgress: ProgressCallback,
  existingLyrics?: LyricsData | null,
): Promise<TrkiqResult> {
  const steps: TrkiqPipelineStep[] = [
    "decode",
    "stems",
    "analyze",
    "lyrics",
    "generate",
  ];
  const pipeline: PipelineProgress[] = steps.map((step) => ({
    step,
    status: "pending" as const,
  }));

  const update = (
    step: TrkiqPipelineStep,
    status: PipelineProgress["status"],
    detail?: string,
  ) => {
    const idx = pipeline.findIndex((p) => p.step === step);
    if (idx >= 0) {
      pipeline[idx] = { step, status, detail };
      onProgress([...pipeline]);
    }
  };

  // ── Step 1: Decode audio ──────────────────────────────────────────
  update("decode", "active", "Decoding audio...");
  const { samples, sampleRate, durationMs } = await decodeAudio(file);
  const updatedMetadata = { ...metadata, durationMs };
  update("decode", "done");

  // ── Step 2: Stem separation (if available) ────────────────────────
  let stems: StemSet | null = null;
  const demucsAvailable = await checkDemucsAvailable();

  if (demucsAvailable) {
    update("stems", "active", "Uploading audio...");
    try {
      stems = await separateStems(file, (msg) =>
        update("stems", "active", msg),
      );
      update("stems", "done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      update("stems", "skipped", `Client-side fallback — ${msg}`);
    }
  } else {
    update("stems", "skipped", "Sign in for AI stem separation");
  }

  // ── Step 3: Analyze (BPM, beats, onsets) ──────────────────────────
  update("analyze", "active", "Detecting tempo...");

  // Run Essentia.js beat detection in parallel with spectral flux
  const essentiaPromise = detectBeatsWithEssentia(samples, sampleRate);

  // Compute spectral flux (needed for sections + fallback tempo)
  const { flux, frameTimes: fluxTimes } = computeSpectralFlux(
    samples,
    sampleRate,
  );
  const fallbackTempo = detectTempo(flux, fluxTimes);

  // Await Essentia — use its results if available, otherwise fall back
  const essentiaResult = await essentiaPromise;

  let detectedBpm: number;
  let essentiaTicks: number[] | null = null;

  if (
    essentiaResult &&
    essentiaResult.bpm > 0 &&
    essentiaResult.ticksMs.length > 4
  ) {
    detectedBpm = essentiaResult.bpm;
    essentiaTicks = essentiaResult.ticksMs;
    update(
      "analyze",
      "active",
      `Essentia: ${detectedBpm} BPM — detecting onsets...`,
    );
  } else {
    detectedBpm = fallbackTempo.bpm;
    update(
      "analyze",
      "active",
      `Fallback: ${detectedBpm} BPM — detecting onsets...`,
    );
  }
  updatedMetadata.bpm = detectedBpm;

  const beatTracks: BeatTrack[] = [];

  // ── Onset detection per stem (higher thresholds = fewer, cleaner hits) ──
  // Per-stem sensitivity: drums get stricter thresholds, melodic instruments
  // even stricter to only catch prominent transients.
  const stemOnsetConfig: Record<
    string,
    { threshold: number; minIntervalMs: number }
  > = {
    drums: { threshold: 0.5, minIntervalMs: 80 },
    bass: { threshold: 0.45, minIntervalMs: 150 },
    guitar: { threshold: 0.45, minIntervalMs: 120 },
    piano: { threshold: 0.45, minIntervalMs: 120 },
    other: { threshold: 0.5, minIntervalMs: 120 },
  };

  if (stems) {
    // Onset detection on separated stems
    const stemEntries = Object.entries(stems).filter(
      ([key]) => key !== "archive" && key !== "vocals",
    );

    for (const [stemName, stemUrl] of stemEntries) {
      try {
        const stemSamples = await fetchAndDecodeStem(stemUrl);
        if (!stemSamples) continue;

        const cfg = stemOnsetConfig[stemName] ?? {
          threshold: 0.45,
          minIntervalMs: 120,
        };

        const stemEnergies = computeBandEnergies(
          stemSamples.samples,
          stemSamples.sampleRate,
          {
            frameSize: 2048,
            hopSize: 512,
            bands: [
              {
                id: stemName,
                name: formatStemName(stemName),
                category: stemName === "drums" ? "drums" : "melodic",
                lowHz: 20,
                highHz: 20000,
                threshold: cfg.threshold,
                minIntervalMs: cfg.minIntervalMs,
              },
            ],
          },
        );

        if (stemEnergies.length > 0) {
          const marks = detectOnsets(
            stemEnergies[0].values,
            stemEnergies[0].frameTimes,
            cfg.threshold,
            cfg.minIntervalMs,
          );

          if (marks.length > 0) {
            beatTracks.push({
              id: stemName,
              name: formatStemName(stemName),
              category: stemName === "drums" ? "drums" : "melodic",
              enabled: true,
              marks,
            });
          }
        }
      } catch {
        // Skip this stem if it fails to decode
      }
    }

    // If drums stem exists, also try sub-band separation on it
    if (stems.drums) {
      try {
        const drumSamples = await fetchAndDecodeStem(stems.drums);
        if (drumSamples) {
          await addDrumSubBands(
            drumSamples.samples,
            drumSamples.sampleRate,
            beatTracks,
          );
        }
      } catch {
        // Sub-band drum separation failed — main drums track is still there
      }
    }
  } else {
    // Fallback: frequency-band analysis on full mix
    const bandEnergies = computeBandEnergies(
      samples,
      sampleRate,
      DEFAULT_CONFIG,
    );

    for (let i = 0; i < DEFAULT_CONFIG.bands.length; i++) {
      const band = DEFAULT_CONFIG.bands[i];
      const energy = bandEnergies[i];
      const marks = detectOnsets(
        energy.values,
        energy.frameTimes,
        band.threshold,
        band.minIntervalMs,
      );
      if (marks.length > 0) {
        beatTracks.push({
          id: band.id,
          name: band.name,
          category: band.category,
          enabled: true,
          marks,
        });
      }
    }
  }

  // ── Beat grid + bars + sections ─────────────────────────────────────
  let beats: LabeledMark[];

  if (essentiaTicks && essentiaTicks.length > 4) {
    // Use Essentia's actual beat positions — much more accurate than a
    // rigid grid because they track real tempo fluctuations.
    beats = essentiaTicks.map((ms, i) => ({
      label: String((i % 4) + 1),
      startMs: Math.round(ms),
      endMs:
        i + 1 < essentiaTicks.length
          ? Math.round(essentiaTicks[i + 1])
          : Math.min(
              Math.round(ms + 60000 / detectedBpm),
              Math.round(durationMs),
            ),
    }));
  } else {
    // Fallback: generate an even grid from BPM
    const allOnsets = beatTracks.flatMap((t) => t.marks);
    beats = generateBeatGrid(detectedBpm, durationMs, allOnsets);
  }

  if (beats.length > 0) {
    beatTracks.push({
      id: "beats",
      name: "Beat Count",
      category: "structure",
      enabled: true,
      marks: [],
      labeledMarks: beats,
    });
  }

  const bars = generateBars(beats, detectedBpm, durationMs);
  if (bars.length > 0) {
    beatTracks.push({
      id: "bars",
      name: "Bars",
      category: "structure",
      enabled: true,
      marks: [],
      labeledMarks: bars,
    });
  }

  const sections = detectSections(flux, fluxTimes, durationMs);
  if (sections.length > 0) {
    beatTracks.push({
      id: "sections",
      name: "Sections",
      category: "structure",
      enabled: true,
      marks: [],
      labeledMarks: sections,
    });
  }

  update("analyze", "done");

  // ── Step 4: Lyrics ────────────────────────────────────────────────
  let lyrics: LyricsData | null = existingLyrics ?? null;
  let vocalTracks: VocalTrack[] = [];
  let lyriqStats: LyriqStats | null = null;

  if (lyrics && lyrics.plainText.trim().length > 0) {
    update("lyrics", "active", "Using pre-loaded lyrics...");
  } else {
    update("lyrics", "active", "Searching for lyrics...");
    try {
      lyrics =
        (await fetchLyrics(metadata.artist, metadata.title)) ||
        (await searchLyrics(`${metadata.artist} ${metadata.title}`)) ||
        (await searchLyrics(metadata.title));
    } catch {
      // Lyrics fetch failed — not critical
    }
  }

  if (lyrics && lyrics.plainText.trim().length > 0) {
    update("lyrics", "active", "Generating singing face timing...");

    // If we have synced lines + a vocals stem, use audio onset detection
    // within each line segment for better word-level timing.
    let vocalsSamples: { samples: Float32Array; sampleRate: number } | null =
      null;
    if (stems?.vocals && lyrics.syncedLines && lyrics.syncedLines.length > 0) {
      try {
        vocalsSamples = await fetchAndDecodeStem(stems.vocals);
      } catch {
        // Vocals stem fetch failed — fall back to character distribution
      }
    }

    const alignedWords = lyricsToAlignedWords(
      lyrics.plainText,
      lyrics.syncedLines,
      durationMs,
      vocalsSamples,
    );

    if (alignedWords.length > 0) {
      const leadTrack = processAlignedWords(alignedWords, "lead");
      vocalTracks = [leadTrack];
      lyriqStats = computeLyriqStats(vocalTracks);
    }

    update("lyrics", "done");
  } else {
    update("lyrics", "skipped", "No lyrics found");
  }

  // ── Step 5: Assemble ──────────────────────────────────────────────
  update("generate", "active", "Assembling timing tracks...");

  const beatStats = computeBeatStats(beatTracks, detectedBpm, durationMs);

  const combined: TrkiqStats = {
    bpm: detectedBpm,
    instrumentTracks: beatTracks.length,
    vocalTracks: vocalTracks.length,
    totalMarks: beatStats.totalMarks,
    totalWords: lyriqStats?.totalWords || 0,
    totalPhonemes: lyriqStats?.totalPhonemes || 0,
    durationMs,
    usedStems: stems !== null,
    usedEssentia: essentiaTicks !== null,
  };

  update("generate", "done");

  return {
    beatTracks,
    vocalTracks,
    metadata: updatedMetadata,
    lyrics,
    beatStats,
    lyriqStats,
    combined,
  };
}

/* ── Helpers ──────────────────────────────────────────────────────── */

/**
 * Fetch and decode a stem audio file from a URL.
 */
async function fetchAndDecodeStem(
  url: string,
): Promise<{ samples: Float32Array; sampleRate: number } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const ctx = new AudioContext();
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      // Mix to mono
      const mono = new Float32Array(audioBuffer.length);
      const numChannels = audioBuffer.numberOfChannels;
      for (let ch = 0; ch < numChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch);
        for (let i = 0; i < audioBuffer.length; i++) {
          mono[i] += channelData[i] / numChannels;
        }
      }
      return { samples: mono, sampleRate: audioBuffer.sampleRate };
    } finally {
      await ctx.close();
    }
  } catch {
    return null;
  }
}

/**
 * Add sub-band drum tracks (kick, snare, hi-hat) from the drums stem.
 */
async function addDrumSubBands(
  samples: Float32Array,
  sampleRate: number,
  tracks: BeatTrack[],
): Promise<void> {
  // Lower thresholds than the full-mix defaults because we're operating
  // on an already-isolated drums stem (no bass/guitar/vocal bleed).
  const drumBands = [
    {
      id: "kick",
      name: "Drums \u2014 Kick",
      lowHz: 20,
      highHz: 150,
      threshold: 0.35,
      minIntervalMs: 120,
    },
    {
      id: "snare",
      name: "Drums \u2014 Snare",
      lowHz: 200,
      highHz: 2000,
      threshold: 0.3,
      minIntervalMs: 100,
    },
    {
      id: "hihat",
      name: "Drums \u2014 Hi-Hat",
      lowHz: 5000,
      highHz: 15000,
      threshold: 0.3,
      minIntervalMs: 80,
    },
  ];

  const config = {
    frameSize: 2048,
    hopSize: 512,
    bands: drumBands.map((b) => ({
      ...b,
      category: "drums" as const,
    })),
  };

  const energies = computeBandEnergies(samples, sampleRate, config);

  for (let i = 0; i < drumBands.length; i++) {
    const band = drumBands[i];
    const energy = energies[i];
    const marks = detectOnsets(
      energy.values,
      energy.frameTimes,
      band.threshold,
      band.minIntervalMs,
    );

    // Only add if we have reasonable marks and don't already have this track
    if (marks.length > 0 && !tracks.some((t) => t.id === band.id)) {
      tracks.push({
        id: band.id,
        name: band.name,
        category: "drums",
        enabled: true,
        marks,
      });
    }
  }
}

/**
 * Convert lyrics text (+ optional synced lines) to AlignedWord[].
 * Uses synced timestamps when available, otherwise estimates timing.
 * If a vocals stem is provided, uses audio onset detection within each
 * line segment for much better word-level alignment.
 */
function lyricsToAlignedWords(
  plainText: string,
  syncedLines: SyncedLine[] | null,
  durationMs: number,
  vocalsStem?: { samples: Float32Array; sampleRate: number } | null,
): AlignedWord[] {
  const lines = plainText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // If we have synced timestamps, use them for line-level timing
  if (syncedLines && syncedLines.length > 0) {
    return alignWithSyncedLines(syncedLines, durationMs, vocalsStem ?? null);
  }

  // Fallback: distribute words evenly across the song duration
  return distributeWordsEvenly(lines, durationMs);
}

/**
 * Create aligned words from LRCLIB synced lines.
 *
 * Each synced line gives us a precise "restart" point — we know exactly
 * when each lyric line begins.  Within each line segment:
 * - If we have the vocals stem, detect energy onsets to find word boundaries.
 * - Otherwise, distribute words proportionally by character length.
 */
function alignWithSyncedLines(
  syncedLines: SyncedLine[],
  durationMs: number,
  vocalsStem: { samples: Float32Array; sampleRate: number } | null,
): AlignedWord[] {
  const result: AlignedWord[] = [];

  for (let i = 0; i < syncedLines.length; i++) {
    const line = syncedLines[i];
    const nextTime =
      i + 1 < syncedLines.length
        ? syncedLines[i + 1].timeMs
        : Math.min(line.timeMs + 8000, durationMs);

    const words = line.text
      .split(/\s+/)
      .map((w) => w.replace(/[^\w']/g, ""))
      .filter((w) => w.length > 0);

    if (words.length === 0) continue;

    const lineStartMs = line.timeMs;
    const lineEndMs = nextTime;

    // Try audio-based word alignment using vocals stem onsets
    if (vocalsStem && words.length > 1) {
      const onsetTimes = detectWordOnsetsInSegment(
        vocalsStem.samples,
        vocalsStem.sampleRate,
        lineStartMs,
        lineEndMs,
      );

      // If we got enough onset points, assign words to them
      if (onsetTimes.length >= words.length - 1) {
        // Use the line start + detected onsets as word start times
        const wordStarts = [
          lineStartMs,
          ...onsetTimes.slice(0, words.length - 1),
        ];

        for (let w = 0; w < words.length; w++) {
          const startMs = Math.round(wordStarts[w]);
          const endMs =
            w + 1 < words.length
              ? Math.round(wordStarts[w + 1])
              : Math.round(lineEndMs);

          result.push({
            text: words[w],
            startMs,
            endMs,
            confidence: 0.85,
          });
        }
        continue;
      }
    }

    // Fallback: distribute words proportionally by character length
    const totalChars = words.reduce((sum, w) => sum + w.length, 0);
    const lineMs = lineEndMs - lineStartMs;
    let cursor = lineStartMs;

    for (const word of words) {
      const wordMs = (word.length / totalChars) * lineMs * 0.85;
      const gap = (lineMs * 0.15) / words.length;
      const startMs = Math.round(cursor);
      const endMs = Math.round(cursor + wordMs);

      result.push({
        text: word,
        startMs,
        endMs,
        confidence: 0.7,
      });

      cursor = endMs + gap;
    }
  }

  return result;
}

/**
 * Detect word onsets within a time segment of the vocals stem.
 * Returns onset times (in ms) relative to the audio start.
 */
function detectWordOnsetsInSegment(
  samples: Float32Array,
  sampleRate: number,
  startMs: number,
  endMs: number,
): number[] {
  const startSample = Math.floor((startMs / 1000) * sampleRate);
  const endSample = Math.min(
    Math.ceil((endMs / 1000) * sampleRate),
    samples.length,
  );

  if (endSample - startSample < 1024) return [];

  // Extract the segment
  const segment = samples.subarray(startSample, endSample);

  // Compute short-time energy envelope with small hop for word-level resolution
  const frameSize = 1024;
  const hopSize = 256;
  const numFrames = Math.max(
    0,
    Math.floor((segment.length - frameSize) / hopSize) + 1,
  );
  if (numFrames < 3) return [];

  const energyEnv = new Float32Array(numFrames);
  const frameTimes = new Float32Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    let energy = 0;
    for (let i = 0; i < frameSize && offset + i < segment.length; i++) {
      energy += segment[offset + i] * segment[offset + i];
    }
    energyEnv[f] = Math.sqrt(energy / frameSize);
    frameTimes[f] = startMs + ((offset + frameSize / 2) / sampleRate) * 1000;
  }

  // Use existing onset detector with moderate sensitivity
  const marks = detectOnsets(energyEnv, frameTimes, 0.3, 80);

  // Return onset times, sorted
  return marks.map((m) => m.timeMs).sort((a, b) => a - b);
}

/**
 * Distribute words evenly across the duration (no sync data).
 */
function distributeWordsEvenly(
  lines: string[],
  durationMs: number,
): AlignedWord[] {
  const allWords: { text: string; lineBreakAfter: boolean }[] = [];
  for (const line of lines) {
    const words = line
      .split(/\s+/)
      .map((w) => w.replace(/[^\w']/g, ""))
      .filter((w) => w.length > 0);
    for (let i = 0; i < words.length; i++) {
      allWords.push({ text: words[i], lineBreakAfter: i === words.length - 1 });
    }
  }

  if (allWords.length === 0) return [];

  const wordDurationMs = 350;
  const lineGapMs = 400;
  const totalActiveMs =
    allWords.length * wordDurationMs + lines.length * lineGapMs;
  const scale = Math.min(1, (durationMs * 0.8) / totalActiveMs);
  const adjustedWordMs = wordDurationMs * scale;
  const adjustedGapMs = lineGapMs * scale;

  let cursor = durationMs * 0.05; // start 5% in
  const result: AlignedWord[] = [];

  for (const entry of allWords) {
    const startMs = Math.round(cursor);
    const endMs = Math.round(cursor + adjustedWordMs);
    result.push({
      text: entry.text,
      startMs,
      endMs,
      confidence: 0.4, // Low confidence — estimated timing
    });
    cursor = endMs + 30;
    if (entry.lineBreakAfter) cursor += adjustedGapMs;
  }

  return result;
}

/** Map stem names to display names */
function formatStemName(stem: string): string {
  const names: Record<string, string> = {
    drums: "Drums (Full)",
    bass: "Bass",
    guitar: "Guitar",
    piano: "Piano/Keys",
    other: "Other",
    vocals: "Vocals",
  };
  return names[stem] || stem.charAt(0).toUpperCase() + stem.slice(1);
}
