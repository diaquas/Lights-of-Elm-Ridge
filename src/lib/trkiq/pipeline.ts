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
      let lastEssentiaMsg = "";
      const essentiaResults = await analyzeStems(stems, (msg) => {
        lastEssentiaMsg = msg;
        update("analyze", "active", msg);
      });

      if (essentiaResults.length > 0) {
        const { tracks, bpm } = buildTracksFromEssentia(
          essentiaResults,
          durationMs,
        );
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
      update("lyrics", "active", "Running forced alignment on vocals...");
      let lastAlignMsg = "";
      alignedWords = await runForceAlign(
        stems.vocals,
        lyrics!,
        (msg) => {
          lastAlignMsg = msg;
          update("lyrics", "active", msg);
        },
        durationMs,
      );
      if (!alignedWords) {
        alignError = lastAlignMsg;
      }
    }

    if (alignedWords && alignedWords.length > 0) {
      // Try phoneme-level alignment for acoustic phoneme boundaries
      const phonemeAlignedWords = await runPhonemeAlign(
        stems?.vocals ?? "",
        lyrics!,
        alignedWords,
        (msg) => update("lyrics", "active", msg),
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
      // Remove only stage directions in parentheses (instrumental, intro, etc.)
      // but KEEP sung parenthetical content like (Dead) or (Is no surprise)
      .replace(
        /\((?:instrumental|intro|outro|interlude|bridge|verse|chorus|solo|fade out|fade in|repeat)[^)]*\)/gi,
        "",
      )
      // Unwrap remaining parenthetical content — keep the words, drop the parens
      .replace(/[()]/g, "")
      // Strip remaining brackets
      .replace(/[[\]{}]/g, "")
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

  const MIN_SECTION_S = 14; // Verse-length chunks — long enough to preserve natural silences
  const PADDING_S = 0.75; // Pad each boundary so words at edges aren't clipped
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
          start: Math.max(0, groupStartMs / 1000 - PADDING_S),
          end: endMs / 1000 + PADDING_S,
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
        start: Math.max(0, groupStartMs / 1000 - PADDING_S),
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
  onStatusUpdate: (msg: string) => void,
  durationMs?: number,
): Promise<AlignedWord[] | null> {
  try {
    const transcript = normalizeTranscript(lyrics.plainText);

    // Use section-chunked alignment when LRCLIB synced lines are available.
    // Each section is aligned independently so the model can't confuse
    // repeated phrases across chorus/verse repetitions. 14s minimum sections
    // with 750ms padding preserve natural silences within each chunk.
    let sections: AlignSection[] | undefined;
    if (lyrics.syncedLines && lyrics.syncedLines.length > 0 && durationMs) {
      sections = buildAlignSections(lyrics.syncedLines, durationMs);
      if (sections.length > 0) {
        onStatusUpdate?.(
          `Chunked alignment: ${sections.length} sections detected`,
        );
      } else {
        sections = undefined;
      }
    }

    const wordstamps = await forceAlignLyrics(
      vocalsUrl,
      transcript,
      onStatusUpdate,
      sections,
    );
    const aligned = forceAlignToAlignedWords(
      wordstamps,
      lyrics.syncedLines ?? undefined,
    );
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
  onStatusUpdate: (msg: string) => void,
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
 * Post-processing pipeline:
 *   1. Monotonicity enforcement (prevents repeated-phrase jumps)
 *   2. LRCLIB-anchored drift correction (rubber-bands words to known-good line starts)
 *   3. Low-confidence interpolation (re-derives timing for bad words)
 */
function forceAlignToAlignedWords(
  wordstamps: ForceAlignWord[],
  syncedLines?: SyncedLine[],
): AlignedWord[] {
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

  // ── Step 2: LRCLIB-anchored drift correction ─────────────────────
  // When synced lines are available, use their line-start timestamps as
  // soft anchors. For each line, find the closest matching first word in
  // the alignment. If the deviation exceeds 500ms, shift all words in
  // that line proportionally to pull them toward the anchor.
  if (syncedLines && syncedLines.length > 0) {
    applyLrcAnchorCorrection(raw, syncedLines);
  }

  // ── Step 3: Low-confidence interpolation ─────────────────────────
  // Words with very low confidence likely landed on the wrong audio
  // region. Re-derive their timing by interpolating between their
  // confident neighbors.
  const CONF_THRESHOLD = 0.35;
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
        raw[j].confidence = 0.35; // above threshold to avoid re-interpolation
        cursor = raw[j].endMs + gapMs;
      }
    }
  }

  return raw;
}

/**
 * Apply LRCLIB line-start anchors to correct drift in force-aligned words.
 *
 * For each synced line, finds the best-matching word in the alignment
 * (by text match on the first word of the line within a ±5s window).
 * If the force-align time deviates from the LRCLIB time by more than
 * MAX_DRIFT_MS, shifts all words between this anchor and the next one
 * proportionally to close the gap.
 */
function applyLrcAnchorCorrection(
  words: AlignedWord[],
  syncedLines: SyncedLine[],
): void {
  const MAX_DRIFT_MS = 500;
  const SEARCH_WINDOW_MS = 5000;

  // Build anchor points: for each synced line, find the matching word index
  interface Anchor {
    wordIdx: number;
    lrcMs: number;
    alignMs: number;
  }
  const anchors: Anchor[] = [];

  for (const line of syncedLines) {
    const lineFirstWord = line.text.trim().split(/\s+/)[0]?.toLowerCase();
    if (!lineFirstWord) continue;

    // Search for the closest word matching the line's first word
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let w = 0; w < words.length; w++) {
      const wordText = words[w].text.toLowerCase().replace(/[^\w']/g, "");
      if (wordText !== lineFirstWord) continue;
      const dist = Math.abs(words[w].startMs - line.timeMs);
      if (dist < SEARCH_WINDOW_MS && dist < bestDist) {
        bestDist = dist;
        bestIdx = w;
      }
    }

    if (bestIdx >= 0) {
      anchors.push({
        wordIdx: bestIdx,
        lrcMs: line.timeMs,
        alignMs: words[bestIdx].startMs,
      });
    }
  }

  if (anchors.length === 0) return;

  // Deduplicate: if multiple anchors point to the same word, keep closest
  const seen = new Set<number>();
  const uniqueAnchors = anchors.filter((a) => {
    if (seen.has(a.wordIdx)) return false;
    seen.add(a.wordIdx);
    return true;
  });

  // Apply corrections between consecutive anchor pairs
  for (let a = 0; a < uniqueAnchors.length; a++) {
    const anchor = uniqueAnchors[a];
    const drift = anchor.lrcMs - anchor.alignMs;

    if (Math.abs(drift) <= MAX_DRIFT_MS) continue;

    // Determine the range of words to shift: from this anchor to the next
    const rangeStart = anchor.wordIdx;
    const rangeEnd =
      a + 1 < uniqueAnchors.length
        ? uniqueAnchors[a + 1].wordIdx
        : words.length;

    // Apply a decaying correction: full shift at the anchor, tapering to 0
    // at the next anchor so we don't create a discontinuity
    const rangeLen = rangeEnd - rangeStart;
    for (let w = rangeStart; w < rangeEnd; w++) {
      const progress = rangeLen > 1 ? (w - rangeStart) / (rangeLen - 1) : 0;
      const correction = Math.round(drift * (1 - progress * 0.8));
      words[w].startMs += correction;
      words[w].endMs += correction;
    }
  }

  // Re-enforce monotonicity after shifting
  for (let i = 1; i < words.length; i++) {
    if (words[i].startMs < words[i - 1].endMs) {
      words[i].startMs = words[i - 1].endMs;
      if (words[i].endMs < words[i].startMs + 20) {
        words[i].endMs = words[i].startMs + 20;
      }
    }
  }
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
