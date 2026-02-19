/* ------------------------------------------------------------------ */
/*  TRK:IQ — Unified Processing Pipeline                              */
/*  All audio processing on Replicate: Demucs + Essentia + Force-Align */
/* ------------------------------------------------------------------ */

import type {
  SongMetadata,
  LyricsData,
  StemSet,
  PipelineProgress,
  PipelineSubPhase,
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
  processPhonemeAlignedWords,
  computeStats as computeLyriqStats,
} from "@/lib/lyriq/lyrics-processor";
import type {
  AlignedWord,
  PhonemeAlignedWord,
} from "@/lib/lyriq/lyrics-processor";

// API clients — all Replicate processing goes through Edge Functions
import { fetchLyrics, searchLyrics } from "./lrclib-client";
import { separateStems, checkDemucsAvailable } from "./replicate-client";
import { forceAlignLyrics } from "./force-align-client";
import type { ForceAlignWord, AlignSection } from "./force-align-client";
import { phonemeAlignLyrics } from "./phoneme-align-client";
import type { PhonemeAlignWord } from "./phoneme-align-client";
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
    subPhase?: PipelineSubPhase,
    subProgress?: number,
  ) => {
    const idx = pipeline.findIndex((p) => p.step === step);
    if (idx >= 0) {
      const prev = pipeline[idx];
      const startedAt =
        status === "active" && prev.status !== "active"
          ? Date.now()
          : prev.startedAt;
      // Preserve existing logs when status hasn't changed
      const logs = prev.logs ?? [];
      pipeline[idx] = { step, status, detail, startedAt, subPhase, subProgress, logs };
      onProgress([...pipeline]);
    }
  };

  /** Append a log line to a step (append-only, never re-renders existing) */
  const appendLog = (step: TrkiqPipelineStep, text: string) => {
    const idx = pipeline.findIndex((p) => p.step === step);
    if (idx >= 0) {
      const prev = pipeline[idx];
      const logs = [...(prev.logs ?? []), text];
      pipeline[idx] = { ...prev, logs };
      onProgress([...pipeline]);
    }
  };

  // ── Step 1: Decode audio (duration metadata only) ─────────────────
  update("decode", "active", "Analyzing audio\u2026", "running", 10);
  appendLog("decode", "MP3 detected \u2014 reading metadata");
  const durationMs = await getAudioDuration(file);
  const updatedMetadata = { ...metadata, durationMs };
  const durStr = `${Math.floor(durationMs / 60000)}:${String(Math.floor((durationMs % 60000) / 1000)).padStart(2, "0")}`;
  appendLog("decode", `Track length: ${durStr}`);
  appendLog("decode", "\u2713 Audio loaded and ready");
  update("decode", "done");

  // ── Step 2: Stem separation via Demucs (Replicate) ────────────────
  let stems: StemSet | null = null;
  const demucsAvailable = await checkDemucsAvailable();

  if (demucsAvailable) {
    update("stems", "active", "Uploading audio\u2026", "running", 5);
    appendLog("stems", "Uploading audio to processing server");
    try {
      let stemsLoggedQueue = false;
      let stemsLoggedProcessing = false;
      stems = await separateStems(file, (msg, phase) => {
        const sp = phase === "queued" ? 15 : 50;
        update("stems", "active", msg, phase, sp);
        if (phase === "queued" && !stemsLoggedQueue) {
          stemsLoggedQueue = true;
          appendLog("stems", "Requesting a GPU from Replicate");
          appendLog("stems", "In queue \u2014 AI models need dedicated hardware");
        }
        if (phase === "running" && !stemsLoggedProcessing) {
          stemsLoggedProcessing = true;
          appendLog("stems", "We're up \u2014 loading Demucs AI model");
          appendLog("stems", "Isolating vocals, drums, bass, guitar, piano");
        }
      });
      appendLog("stems", "\u2713 6 clean instrument layers ready");
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
      update("analyze", "active", "Detecting rhythm\u2026", "queued", 10);
      appendLog("analyze", "Listening for beats using Essentia AI");
      let lastEssentiaMsg = "";
      let loggedRunning = false;
      const essentiaResults = await analyzeStems(stems, (msg, phase) => {
        lastEssentiaMsg = msg;
        const sp = phase === "queued" ? 20 : 60;
        update("analyze", "active", msg, phase, sp);
        if (phase === "running" && !loggedRunning) {
          loggedRunning = true;
          appendLog("analyze", "GPU active \u2014 analyzing frequency bands");
        }
      });

      if (essentiaResults.length > 0) {
        const { tracks, bpm } = buildTracksFromEssentia(
          essentiaResults,
          durationMs,
        );
        const totalBeats = tracks.reduce((s, t) => s + t.marks.length, 0);
        appendLog("analyze", `Tempo locked: ${bpm} BPM`);
        appendLog("analyze", `\u2713 Beat map complete \u2014 ${totalBeats} marks across ${tracks.length} tracks`);
        update("analyze", "done");
        return { tracks, bpm, essentia: true };
      }

      // Essentia returned no results — show the real error, fall back
      const reason = lastEssentiaMsg || "no results";
      update(
        "analyze",
        "active",
        `Essentia failed (${reason}) \u2014 analyzing locally...`,
      );
    } else {
      update("analyze", "active", "Analyzing audio locally...");
    }

    try {
      const fallback = await localBeatAnalysis(file, updatedMetadata, () => {});
      const detail = stemsAvailable
        ? "Local beat analysis (Essentia failed)"
        : "Local beat analysis";
      update("analyze", "done", detail);
      // Tag all fallback tracks as local with lower confidence
      const taggedTracks = fallback.tracks.map((t) => ({
        ...t,
        source: "local" as const,
        confidenceRange: [0.35, 0.45] as [number, number],
      }));
      return {
        tracks: taggedTracks,
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
    let alignError = "";
    if (stemsAvailable && stems?.vocals) {
      update("lyrics", "active", "Aligning words to audio\u2026", "queued", 10);
      appendLog("lyrics", "Pulling lyrics");
      appendLog("lyrics", "Matching words to vocal layer");
      let lastAlignMsg = "";
      let loggedRunning = false;
      alignedWords = await runForceAlign(
        stems.vocals,
        lyrics!,
        (msg, phase) => {
          lastAlignMsg = msg;
          const sp = phase === "queued" ? 15 : 50;
          update("lyrics", "active", msg, phase, sp);
          if (phase === "running" && !loggedRunning) {
            loggedRunning = true;
            appendLog("lyrics", "GPU active \u2014 running Whisper alignment");
          }
        },
        durationMs,
      );
      if (!alignedWords) {
        alignError = lastAlignMsg;
      } else {
        appendLog("lyrics", `Placing ${alignedWords.length} words at timestamps`);
      }
    }

    if (alignedWords && alignedWords.length > 0) {
      // Try phoneme-level alignment for acoustic phoneme boundaries
      update("lyrics", "active", "Running phoneme alignment\u2026", "running", 70);
      appendLog("lyrics", "Fine-tuning word boundaries with phoneme model");
      const phonemeAlignedWords = await runPhonemeAlign(
        stems?.vocals ?? "",
        lyrics!,
        alignedWords,
        (msg, phase) => update("lyrics", "active", msg, phase, 80),
      );

      let leadTrack: VocalTrack;
      if (phonemeAlignedWords && phonemeAlignedWords.length > 0) {
        update(
          "lyrics",
          "active",
          "Building singing face timing (phoneme-aligned)...",
        );
        leadTrack = processPhonemeAlignedWords(phonemeAlignedWords, "lead");
      } else {
        update(
          "lyrics",
          "active",
          "Building singing face timing (word-aligned)...",
        );
        leadTrack = processAlignedWords(alignedWords, "lead");
      }

      // Compute confidence range from median of per-word probabilities ± 5%
      const confs = alignedWords.map((w) => w.confidence).sort((a, b) => a - b);
      const median = confs[Math.floor(confs.length / 2)];
      leadTrack.source = "ai";
      leadTrack.confidenceRange = [
        Math.round(Math.max(0, median - 0.05) * 100) / 100,
        Math.round(Math.min(1, median + 0.05) * 100) / 100,
      ];
      const vTracks = [leadTrack];
      const wordCount = alignedWords.length;
      appendLog("lyrics", `\u2713 Lyric sync complete \u2014 ${wordCount} cue points`);
      update("lyrics", "done");
      return { tracks: vTracks, stats: computeLyriqStats(vTracks) };
    }

    // Fallback: synced lines or even distribution
    update("lyrics", "active", "Generating timing from synced lyrics...");
    const fallbackWords = buildLyricsFallback(lyrics!, durationMs);
    if (fallbackWords.length > 0) {
      const leadTrack = processAlignedWords(fallbackWords, "lead");
      const hasSyncedLines = !!(
        lyrics!.syncedLines && lyrics!.syncedLines.length > 0
      );
      leadTrack.source = hasSyncedLines ? "synced" : "estimated";
      leadTrack.confidenceRange = hasSyncedLines ? [0.55, 0.65] : [0.25, 0.35];
      const vTracks = [leadTrack];
      const detail = stemsAvailable
        ? `Lyrics fallback (${alignError || "alignment unavailable"})`
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
  update("generate", "active", "Assembling .xtiming\u2026", "running", 20);
  appendLog("generate", "Combining instrument, vocal, and segment tracks");

  const beatStats = computeBeatStats(beatTracks, detectedBpm, durationMs);

  const trackCount = beatTracks.length + vocalTracks.length;
  appendLog("generate", "Formatting for xLights");
  appendLog("generate", `Writing ${trackCount} tracks, ${beatStats.totalMarks + (lyriqStats?.totalPhonemes || 0)} marks`);

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

  appendLog("generate", "\u2713 Your .xtiming file is ready");
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
 * Normalize lyrics text for force-alignment.
 *
 * Force-align works best with clean, predictable input. This strips
 * punctuation artifacts that cause tokenization mismatches (parenthetical
 * asides becoming separate tokens, commas attaching to words, etc.) and
 * normalizes contractions to their sung form.
 */
function normalizeTranscript(text: string): string {
  return (
    text
      // Remove parenthetical stage directions: (Dead), (Is no surprise)
      .replace(/\([^)]*\)/g, "")
      // Strip remaining brackets
      .replace(/[[\](){}]/g, "")
      // Remove commas, semicolons, colons, exclamation/question marks
      .replace(/[,;:!?]/g, "")
      // Normalize curly/smart quotes to straight
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      // Remove quotes
      .replace(/["]/g, "")
      // Expand common sung contractions to full words for dictionary matching
      .replace(/\bdancin'\b/gi, "dancing")
      .replace(/\bsingin'\b/gi, "singing")
      .replace(/\brunin'\b/gi, "running")
      .replace(/\bnothin'\b/gi, "nothing")
      .replace(/\bsomthin'\b/gi, "something")
      .replace(/\bcomin'\b/gi, "coming")
      .replace(/\bgoin'\b/gi, "going")
      // Collapse multiple spaces / blank lines
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * Build section boundaries for chunked alignment from LRCLIB synced lines.
 *
 * Groups consecutive synced lines into sections of ~8-15 seconds each,
 * providing natural phrase boundaries that prevent cross-section confusion.
 * Each section gets its own normalized transcript chunk.
 */
function buildAlignSections(
  syncedLines: SyncedLine[],
  durationMs: number,
): AlignSection[] {
  if (syncedLines.length === 0) return [];

  const MIN_SECTION_S = 6; // Don't create sections shorter than 6s
  const sections: AlignSection[] = [];

  let groupLines: SyncedLine[] = [syncedLines[0]];
  let groupStartMs = syncedLines[0].timeMs;

  for (let i = 1; i < syncedLines.length; i++) {
    const line = syncedLines[i];
    const elapsed = (line.timeMs - groupStartMs) / 1000;

    // Start a new section if we've accumulated enough time
    // and this line starts a new phrase (silence gap or section break)
    if (elapsed >= MIN_SECTION_S) {
      const endMs = line.timeMs;
      const text = groupLines.map((l) => l.text).join("\n");
      const normalized = normalizeTranscript(text);
      if (normalized.trim()) {
        sections.push({
          start: groupStartMs / 1000,
          end: endMs / 1000,
          text: normalized,
        });
      }
      groupLines = [line];
      groupStartMs = line.timeMs;
    } else {
      groupLines.push(line);
    }
  }

  // Flush the last group
  if (groupLines.length > 0) {
    const text = groupLines.map((l) => l.text).join("\n");
    const normalized = normalizeTranscript(text);
    if (normalized.trim()) {
      sections.push({
        start: groupStartMs / 1000,
        end: durationMs / 1000,
        text: normalized,
      });
    }
  }

  return sections;
}

/**
 * Run force-align and convert results to AlignedWord[].
 * When LRCLIB synced lines are available, uses section-chunked alignment
 * to prevent cross-section confusion on repeated phrases.
 * Returns null if alignment fails.
 */
async function runForceAlign(
  vocalsUrl: string,
  lyrics: LyricsData,
  onStatusUpdate: (msg: string, phase?: "queued" | "running") => void,
  durationMs?: number,
): Promise<AlignedWord[] | null> {
  try {
    const transcript = normalizeTranscript(lyrics.plainText);

    // Chunked alignment disabled — the 6-second section grouping was
    // compressing words within a chunk, ignoring natural silence gaps
    // (e.g. a 3s pause between "call" and "like" got eliminated because
    // both words landed in the same section). Full-file alignment lets
    // stable-ts see the complete audio with all silences intact.
    //
    // buildAlignSections() and the Cog _align_chunked() path are still
    // available if we need to re-enable for repeated-phrase issues.

    const wordstamps = await forceAlignLyrics(
      vocalsUrl,
      transcript,
      onStatusUpdate,
    );
    const aligned = forceAlignToAlignedWords(wordstamps);
    return aligned.length > 0 ? aligned : null;
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    onStatusUpdate(`Alignment failed: ${detail}`);
    return null;
  }
}

/**
 * Run phoneme-level alignment on the vocals stem.
 * Uses word-level timestamps from force-align to constrain
 * wav2vec2 CTC alignment within each word's audio window.
 * Returns null if phoneme alignment fails (word-level fallback is fine).
 */
async function runPhonemeAlign(
  vocalsUrl: string,
  lyrics: LyricsData,
  alignedWords: AlignedWord[],
  onStatusUpdate: (msg: string, phase?: "queued" | "running") => void,
): Promise<PhonemeAlignedWord[] | null> {
  if (!vocalsUrl) return null;

  try {
    const transcript = normalizeTranscript(lyrics.plainText);

    // Convert AlignedWord[] to ForceAlignWord[] format for the phoneme client
    const wordTimestamps: ForceAlignWord[] = alignedWords.map((w) => ({
      word: w.text,
      start: w.startMs / 1000,
      end: w.endMs / 1000,
      probability: w.confidence,
    }));

    onStatusUpdate("Running phoneme-level alignment on vocals...");
    const phonemeWords = await phonemeAlignLyrics(
      vocalsUrl,
      transcript,
      onStatusUpdate,
      wordTimestamps,
    );

    if (!phonemeWords || phonemeWords.length === 0) return null;

    // Convert to PhonemeAlignedWord[] for the lyrics processor
    const result: PhonemeAlignedWord[] = phonemeWords.map((pw) => {
      // Find the matching word from force-align for confidence
      const match = alignedWords.find(
        (aw) =>
          aw.text.toLowerCase() === pw.word.toLowerCase() &&
          Math.abs(aw.startMs - pw.start * 1000) < 100,
      );

      return {
        text: pw.word,
        startMs: Math.round(pw.start * 1000),
        endMs: Math.round(pw.end * 1000),
        confidence: match?.confidence ?? 0.8,
        phonemes: pw.phonemes.map((p) => ({
          phoneme: p.phoneme,
          startMs: Math.round(p.start * 1000),
          endMs: Math.round(p.end * 1000),
        })),
      };
    });

    return result.length > 0 ? result : null;
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    onStatusUpdate(`Phoneme alignment failed (using word-level): ${detail}`);
    return null;
  }
}

/**
 * Convert force-align-wordstamps output to AlignedWord[].
 * Passes through raw timestamps from force-align with minimal
 * post-processing:
 *   1. Monotonicity enforcement (prevents repeated-phrase jumps)
 *   2. Low-confidence interpolation (re-derives timing for bad words)
 *
 * No global offset or drift correction is applied — raw force-align
 * timestamps tested closer to human-corrected timing without them.
 * Drift may be revisited once wav2vec2 refinement is working.
 */
function forceAlignToAlignedWords(wordstamps: ForceAlignWord[]): AlignedWord[] {
  const raw = wordstamps
    .filter((w) => w.word.trim().length > 0)
    .map((w) => ({
      text: w.word.trim(),
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(w.end * 1000),
      confidence: w.probability ?? 0.9,
    }));

  if (raw.length === 0) return raw;

  // ── Step 1: Monotonicity enforcement ─────────────────────────────
  // Force-align on repeated lyrics can map words to the wrong repetition,
  // causing timestamps to jump backwards. Walk the array and clamp any
  // word whose start is before the previous word's end.
  for (let i = 1; i < raw.length; i++) {
    const prev = raw[i - 1];
    if (raw[i].startMs < prev.endMs) {
      // This word jumped backward — clamp it to follow the previous word
      const wordDuration = Math.max(raw[i].endMs - raw[i].startMs, 50);
      raw[i].startMs = prev.endMs;
      raw[i].endMs = raw[i].startMs + wordDuration;
      // Mark low confidence so downstream can flag it
      raw[i].confidence = Math.min(raw[i].confidence, 0.3);
    }
  }

  // ── Step 3: Low-confidence interpolation ─────────────────────────
  // Words with very low confidence (< 0.2) likely landed on the wrong
  // audio region. Re-derive their timing by interpolating between their
  // confident neighbors.
  const CONF_THRESHOLD = 0.2;
  let i = 0;
  while (i < raw.length) {
    if (raw[i].confidence >= CONF_THRESHOLD) {
      i++;
      continue;
    }

    // Find the run of consecutive low-confidence words
    const runStart = i;
    while (i < raw.length && raw[i].confidence < CONF_THRESHOLD) {
      i++;
    }
    const runEnd = i; // exclusive
    const runLen = runEnd - runStart;

    // Anchor times: use neighbors or song boundaries
    const anchorStartMs =
      runStart > 0 ? raw[runStart - 1].endMs : raw[runStart].startMs;
    const anchorEndMs =
      runEnd < raw.length ? raw[runEnd].startMs : raw[runEnd - 1].endMs;

    // Only interpolate if the gap is reasonable (< 10s)
    const gap = anchorEndMs - anchorStartMs;
    if (gap > 0 && gap < 10000) {
      // Distribute words proportionally by character length
      const totalChars = raw
        .slice(runStart, runEnd)
        .reduce((sum, w) => sum + Math.max(w.text.length, 1), 0);
      let cursor = anchorStartMs;
      for (let j = runStart; j < runEnd; j++) {
        const charFrac = Math.max(raw[j].text.length, 1) / totalChars;
        const wordMs = gap * charFrac * 0.85;
        const gapMs = (gap * 0.15) / runLen;
        raw[j].startMs = Math.round(cursor);
        raw[j].endMs = Math.round(cursor + wordMs);
        raw[j].confidence = 0.3; // low but not flagged for re-interpolation
        cursor = raw[j].endMs + gapMs;
      }
    }
  }

  return raw;
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
      const conf = Math.max(0, Math.min(1, result.beatConfidence));
      tracks.push({
        id: result.stemType,
        name: formatStemName(result.stemType),
        category: result.stemType === "drums" ? "drums" : "melodic",
        enabled: true,
        source: "ai",
        confidenceRange: [Math.max(0, conf - 0.025), Math.min(1, conf + 0.025)],
        marks: result.onsets.map((t) => ({
          timeMs: Math.round(t * 1000),
          strength: 1.0,
        })),
      });
    }

    // Drum sub-bands (kick, snare, hi-hat)
    if (result.stemType === "drums") {
      const drumConf = Math.max(0, Math.min(1, result.beatConfidence));
      const drumConfRange: [number, number] = [
        Math.max(0, drumConf - 0.025),
        Math.min(1, drumConf + 0.025),
      ];
      if (result.kickOnsets && result.kickOnsets.length > 0) {
        tracks.push({
          id: "kick",
          name: "Drums \u2014 Kick",
          category: "drums",
          enabled: true,
          source: "ai",
          confidenceRange: drumConfRange,
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
          source: "ai",
          confidenceRange: drumConfRange,
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
          source: "ai",
          confidenceRange: drumConfRange,
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

    // Beat grid is essentia's core competency — boost confidence floor
    const structConf = Math.max(
      0.85,
      Math.min(1, primaryResult.beatConfidence),
    );
    tracks.push({
      id: "beats",
      name: "Beat Count",
      category: "structure",
      enabled: true,
      source: "ai",
      confidenceRange: [
        Math.max(0, structConf - 0.025),
        Math.min(1, structConf + 0.025),
      ],
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
        source: "ai",
        confidenceRange: [
          Math.max(0, structConf - 0.025),
          Math.min(1, structConf + 0.025),
        ],
        marks: [],
        labeledMarks: bars,
      });
    }
  }

  // ── Song structure sections ──────────────────────────────────────
  // Use sections from the primary (drums) result if available
  if (primaryResult?.sections && primaryResult.sections.length > 0) {
    const sectionMarks: LabeledMark[] = primaryResult.sections.map((s) => ({
      label: s.label,
      startMs: Math.round(s.start * 1000),
      endMs: Math.round(s.end * 1000),
    }));

    tracks.push({
      id: "sections",
      name: "Song Structure",
      category: "structure",
      enabled: true,
      source: "ai",
      confidenceRange: [0.6, 0.7],
      marks: [],
      labeledMarks: sectionMarks,
    });
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
