/* ------------------------------------------------------------------ */
/*  TRK:IQ — Unified Processing Pipeline                              */
/*  All audio processing on Replicate: Demucs + Essentia + Force-Align */
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
import type { BeatTrack, BeatiqStats, LabeledMark } from "@/lib/beatiq/types";
import type { VocalTrack, LyriqStats } from "@/lib/lyriq/types";

// Beat:IQ — local analysis (fallback when Essentia is unavailable)
import { generateBars } from "@/lib/beatiq/tempo-detector";
import {
  analyzeAudio as localBeatAnalysis,
  computeStats as computeBeatStats,
} from "@/lib/beatiq/beat-processor";

// Lyr:IQ — phoneme engine (local, no API needed)
import {
  processAlignedWords,
  computeStats as computeLyriqStats,
} from "@/lib/lyriq/lyrics-processor";
import type { AlignedWord } from "@/lib/lyriq/lyrics-processor";

// API clients — all Replicate processing goes through Edge Functions
import { fetchLyrics, searchLyrics } from "./lrclib-client";
import { separateStems, checkDemucsAvailable } from "./replicate-client";
import { forceAlignLyrics } from "./force-align-client";
import type { ForceAlignWord } from "./force-align-client";
import { analyzeStems } from "./essentia-onset-client";
import type { EssentiaOnsetResult } from "./essentia-onset-client";

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
 *   1. Decode audio (get duration metadata)
 *   2. Demucs on Replicate → stem separation
 *   3. In parallel after Demucs:
 *      a. Essentia Cog on Replicate → onset detection on drums/bass/other
 *         Falls back to local beatiq analysis if Essentia is unavailable
 *      b. force-align-wordstamps on Replicate → lyrics alignment on vocals
 *         (runs independently — always completes regardless of Essentia)
 *   4. Assemble all timing tracks into .xtiming
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

  // ── Step 1: Decode audio (duration metadata only) ─────────────────
  update("decode", "active", "Reading audio metadata...");
  const durationMs = await getAudioDuration(file);
  const updatedMetadata = { ...metadata, durationMs };
  update("decode", "done");

  // ── Step 2: Stem separation via Demucs (Replicate) ────────────────
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
      update("stems", "skipped", `Stem separation failed — ${msg}`);
    }
  } else {
    update("stems", "skipped", "Sign in for AI stem separation");
  }

  // ── Fetch lyrics (can start right after we have metadata) ─────────
  let lyrics: LyricsData | null = existingLyrics ?? null;

  if (lyrics && lyrics.plainText.trim().length > 0) {
    // Already have lyrics — no fetch needed
  } else {
    try {
      lyrics =
        (await fetchLyrics(metadata.artist, metadata.title)) ||
        (await searchLyrics(`${metadata.artist} ${metadata.title}`)) ||
        (await searchLyrics(metadata.title));
    } catch {
      // Lyrics fetch failed — not critical
    }
  }

  // ── Steps 3 + 4: Analyze + Lyrics (parallel on Replicate) ────────
  interface BeatResult {
    tracks: BeatTrack[];
    bpm: number;
    essentia: boolean;
  }
  interface LyricsResult {
    tracks: VocalTrack[];
    stats: LyriqStats | null;
  }

  const hasLyrics = !!(lyrics && lyrics.plainText.trim().length > 0);

  /** Run beat analysis: Essentia on Replicate → local fallback */
  async function processBeats(stemsAvailable: boolean): Promise<BeatResult> {
    if (stemsAvailable && stems) {
      update("analyze", "active", "Running Essentia on stems...");
      const essentiaResults = await analyzeStems(stems, (msg) =>
        update("analyze", "active", msg),
      );

      if (essentiaResults.length > 0) {
        const { tracks, bpm } = buildTracksFromEssentia(
          essentiaResults,
          durationMs,
        );
        update("analyze", "done");
        return { tracks, bpm, essentia: true };
      }

      // Essentia failed — fall back to local analysis
      update(
        "analyze",
        "active",
        "Essentia unavailable \u2014 analyzing audio locally...",
      );
    } else {
      update("analyze", "active", "Analyzing audio locally...");
    }

    try {
      const fallback = await localBeatAnalysis(file, updatedMetadata, () => {});
      const detail = stemsAvailable
        ? "Local beat analysis (Essentia unavailable)"
        : "Local beat analysis";
      update("analyze", "done", detail);
      return {
        tracks: fallback.tracks,
        bpm: fallback.stats.bpm,
        essentia: false,
      };
    } catch {
      update("analyze", "error", "Beat analysis failed");
      return { tracks: [], bpm: 0, essentia: false };
    }
  }

  /** Run lyrics alignment: Force-Align on Replicate → synced-line fallback */
  async function processLyricsStep(
    stemsAvailable: boolean,
  ): Promise<LyricsResult> {
    if (!hasLyrics) {
      update("lyrics", "skipped", "No lyrics found");
      return { tracks: [], stats: null };
    }

    // Try force-align if stems are available
    let alignedWords: AlignedWord[] | null = null;
    if (stemsAvailable && stems?.vocals) {
      update("lyrics", "active", "Running forced alignment on vocals...");
      alignedWords = await runForceAlign(stems.vocals, lyrics!, (msg) =>
        update("lyrics", "active", msg),
      );
    }

    if (alignedWords && alignedWords.length > 0) {
      update("lyrics", "active", "Generating singing face timing...");
      const leadTrack = processAlignedWords(alignedWords, "lead");
      const vTracks = [leadTrack];
      update("lyrics", "done");
      return { tracks: vTracks, stats: computeLyriqStats(vTracks) };
    }

    // Fallback: synced lines or even distribution
    update("lyrics", "active", "Generating timing from synced lyrics...");
    const fallbackWords = buildLyricsFallback(lyrics!, durationMs);
    if (fallbackWords.length > 0) {
      const leadTrack = processAlignedWords(fallbackWords, "lead");
      const vTracks = [leadTrack];
      const detail = stemsAvailable
        ? "Lyrics fallback (alignment unavailable)"
        : undefined;
      update("lyrics", "done", detail);
      return { tracks: vTracks, stats: computeLyriqStats(vTracks) };
    }

    update("lyrics", "done");
    return { tracks: [], stats: null };
  }

  // Run beat + lyrics processing in parallel — neither blocks the other
  const hasStemsAvailable = stems !== null;
  const [beatResult, lyricsResult] = await Promise.all([
    processBeats(hasStemsAvailable),
    processLyricsStep(hasStemsAvailable),
  ]);

  const beatTracks = beatResult.tracks;
  const vocalTracks = lyricsResult.tracks;
  const lyriqStats = lyricsResult.stats;
  const detectedBpm = beatResult.bpm;
  const usedEssentia = beatResult.essentia;

  updatedMetadata.bpm = detectedBpm || undefined;

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
    usedEssentia,
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
 * Get audio duration without full PCM decode.
 * Uses an Audio element to read metadata only.
 */
function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);

    audio.onloadedmetadata = () => {
      const ms = audio.duration * 1000;
      URL.revokeObjectURL(objectUrl);
      resolve(ms);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to read audio metadata"));
    };

    audio.src = objectUrl;
  });
}

/**
 * Run force-align and convert results to AlignedWord[].
 * Returns null if alignment fails.
 */
async function runForceAlign(
  vocalsUrl: string,
  lyrics: LyricsData,
  onStatusUpdate: (msg: string) => void,
): Promise<AlignedWord[] | null> {
  try {
    const wordstamps = await forceAlignLyrics(
      vocalsUrl,
      lyrics.plainText,
      onStatusUpdate,
    );
    const aligned = forceAlignToAlignedWords(wordstamps);
    return aligned.length > 0 ? aligned : null;
  } catch {
    onStatusUpdate("Alignment unavailable \u2014 using synced lyrics...");
    return null;
  }
}

/**
 * Convert force-align-wordstamps output to AlignedWord[].
 */
function forceAlignToAlignedWords(wordstamps: ForceAlignWord[]): AlignedWord[] {
  return wordstamps
    .filter((w) => w.word.trim().length > 0)
    .map((w) => ({
      text: w.word.trim(),
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(w.end * 1000),
      confidence: w.probability ?? 0.9,
    }));
}

/**
 * Build lyrics alignment using fallback strategies (no Replicate).
 * Strategy 1: LRCLIB synced lines + proportional word distribution
 * Strategy 2: Even distribution across song duration
 */
function buildLyricsFallback(
  lyrics: LyricsData,
  durationMs: number,
): AlignedWord[] {
  // Try LRCLIB synced lines first
  if (lyrics.syncedLines && lyrics.syncedLines.length > 0) {
    return alignWithSyncedLines(lyrics.syncedLines, durationMs);
  }

  // Last resort: even distribution
  const lines = lyrics.plainText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return distributeWordsEvenly(lines, durationMs);
}

/**
 * Build BeatTrack[] from Essentia Cog results.
 * Converts onset times (seconds) to TimingMark[] and beat times to LabeledMark[].
 */
function buildTracksFromEssentia(
  results: EssentiaOnsetResult[],
  durationMs: number,
): { tracks: BeatTrack[]; bpm: number } {
  const tracks: BeatTrack[] = [];

  // Use the drums stem for BPM (most reliable), or first available
  const drumsResult = results.find((r) => r.stemType === "drums");
  const primaryResult = drumsResult ?? results[0];
  const bpm = primaryResult?.bpm ?? 0;

  // ── Onset tracks (one per stem) ──────────────────────────────────
  for (const result of results) {
    if (result.onsets.length > 0) {
      tracks.push({
        id: result.stemType,
        name: formatStemName(result.stemType),
        category: result.stemType === "drums" ? "drums" : "melodic",
        enabled: true,
        marks: result.onsets.map((t) => ({
          timeMs: Math.round(t * 1000),
          strength: 1.0,
        })),
      });
    }

    // Drum sub-bands (kick, snare, hi-hat)
    if (result.stemType === "drums") {
      if (result.kickOnsets && result.kickOnsets.length > 0) {
        tracks.push({
          id: "kick",
          name: "Drums \u2014 Kick",
          category: "drums",
          enabled: true,
          marks: result.kickOnsets.map((t) => ({
            timeMs: Math.round(t * 1000),
            strength: 1.0,
          })),
        });
      }
      if (result.snareOnsets && result.snareOnsets.length > 0) {
        tracks.push({
          id: "snare",
          name: "Drums \u2014 Snare",
          category: "drums",
          enabled: true,
          marks: result.snareOnsets.map((t) => ({
            timeMs: Math.round(t * 1000),
            strength: 1.0,
          })),
        });
      }
      if (result.hihatOnsets && result.hihatOnsets.length > 0) {
        tracks.push({
          id: "hihat",
          name: "Drums \u2014 Hi-Hat",
          category: "drums",
          enabled: true,
          marks: result.hihatOnsets.map((t) => ({
            timeMs: Math.round(t * 1000),
            strength: 1.0,
          })),
        });
      }
    }
  }

  // ── Beat grid from Essentia beat tracking ────────────────────────
  if (primaryResult && primaryResult.beats.length > 4) {
    const beats: LabeledMark[] = primaryResult.beats.map((t, i) => ({
      label: String((i % 4) + 1),
      startMs: Math.round(t * 1000),
      endMs:
        i + 1 < primaryResult.beats.length
          ? Math.round(primaryResult.beats[i + 1] * 1000)
          : Math.min(
              Math.round(t * 1000 + 60000 / bpm),
              Math.round(durationMs),
            ),
    }));

    tracks.push({
      id: "beats",
      name: "Beat Count",
      category: "structure",
      enabled: true,
      marks: [],
      labeledMarks: beats,
    });

    // Generate bars from beat positions
    const bars = generateBars(beats, bpm, durationMs);
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
  }

  return { tracks, bpm };
}

/**
 * Fallback: create aligned words from LRCLIB synced lines.
 * Distributes words proportionally by character length within each line.
 */
function alignWithSyncedLines(
  syncedLines: SyncedLine[],
  durationMs: number,
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

    // Distribute words proportionally by character length
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
 * Last-resort fallback: distribute words evenly across the duration.
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
      allWords.push({
        text: words[i],
        lineBreakAfter: i === words.length - 1,
      });
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
