/* ------------------------------------------------------------------ */
/*  TRK:IQ — Phoneme-Align Client (browser-side)                     */
/*  Calls diaquas/phoneme-align-sofa on Replicate via Edge Function   */
/*  to get word + phoneme timestamps from SOFA forced alignment.      */
/*                                                                    */
/*  SOFA (Singing-Oriented Forced Aligner) uses a UNet backbone       */
/*  trained on singing voice data — better accuracy on held notes,    */
/*  melisma, and diphthongs vs speech-trained models.                 */
/*                                                                    */
/*  Features: VAD-based chunking for long audio, CMUdict stress-      */
/*  weighted vowel duration, spectral onset boundary refinement.      */
/* ------------------------------------------------------------------ */

import { createClient } from "@/lib/supabase/client";
import type { PredictionStatus } from "./types";
import type { ForceAlignWord } from "./force-align-client";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150; // 5 minutes max

/** A single phoneme timestamp from the phoneme-align model */
export interface PhonemeTimestamp {
  /** ARPAbet phoneme code (no stress digit), e.g. "K", "L", "OW" */
  phoneme: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
}

/** A word with its phoneme-level alignment from the model */
export interface PhonemeAlignWord {
  /** Word text */
  word: string;
  /** Word start time in seconds */
  start: number;
  /** Word end time in seconds */
  end: number;
  /** Per-phoneme timestamps within this word */
  phonemes: PhonemeTimestamp[];
}

/** A line timestamp from LRCLIB synced lyrics for per-line alignment */
export interface LineTimestamp {
  /** Normalized line text */
  text: string;
  /** Line start time in milliseconds */
  startMs: number;
}

/** Response from the phoneme-align Edge Function */
interface PhonemeAlignResponse {
  predictionId: string;
  status: PredictionStatus;
  words?: PhonemeAlignWord[];
  error?: string;
}

/**
 * Get the Supabase client, throwing if unavailable.
 */
function getClient() {
  const client = createClient();
  if (!client) throw new Error("Supabase client not available");
  return client;
}

/**
 * Call the phoneme-align Edge Function via the Supabase SDK.
 */
async function callPhonemeAlignFunction(
  body: Record<string, unknown>,
): Promise<PhonemeAlignResponse> {
  const supabase = getClient();

  const { data, error } = await supabase.functions.invoke("phoneme-align", {
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as PhonemeAlignResponse;
}

/**
 * Run phoneme-level alignment on a vocals stem.
 *
 * @param vocalsUrl       - URL to the Demucs vocals stem
 * @param transcript      - Plain lyrics text to align
 * @param onStatusUpdate  - Called with status messages during processing
 * @param wordTimestamps  - Word-level timestamps from force-align (for precision)
 * @returns Array of words with per-phoneme timestamps
 */
/** Status callback includes the Replicate prediction phase */
export type PhonemeAlignStatusCallback = (
  message: string,
  phase?: "queued" | "running",
) => void;

export async function phonemeAlignLyrics(
  vocalsUrl: string,
  transcript: string,
  onStatusUpdate?: PhonemeAlignStatusCallback,
  wordTimestamps?: ForceAlignWord[],
  lineTimestamps?: LineTimestamp[],
): Promise<PhonemeAlignWord[]> {
  // Step 1: Start the alignment job — always use full-file CTC.
  // Pass transcript only; line timestamps are not needed (full-file CTC
  // aligns the entire transcript against the full audio in one pass).
  const mode = wordTimestamps?.length ? "word-boundary" : "full-file CTC";
  onStatusUpdate?.(`Starting ${mode} alignment...`, "queued");
  const body: Record<string, unknown> = {
    action: "start",
    vocalsUrl,
    transcript,
  };
  if (wordTimestamps && wordTimestamps.length > 0) {
    body.wordTimestamps = JSON.stringify(
      wordTimestamps.map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })),
    );
  }
  const startResult = await callPhonemeAlignFunction(body);
  const predictionId = startResult.predictionId;

  // Step 2: Poll for completion
  onStatusUpdate?.("Waiting for GPU...", "queued");
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    await sleep(POLL_INTERVAL_MS);
    attempts++;

    const result = await callPhonemeAlignFunction({
      action: "status",
      predictionId,
    });

    if (result.status === "succeeded" && result.words) {
      return result.words;
    }

    if (result.status === "failed") {
      throw new Error(result.error || "Phoneme alignment failed");
    }

    if (result.status === "canceled") {
      throw new Error("Phoneme alignment was canceled");
    }

    const elapsed = Math.round((attempts * POLL_INTERVAL_MS) / 1000);
    if (result.status === "starting") {
      onStatusUpdate?.(`Waiting for GPU... (${elapsed}s)`, "queued");
    } else {
      onStatusUpdate?.(`Mapping phonemes to audio... (${elapsed}s)`, "running");
    }
  }

  throw new Error("Phoneme alignment timed out");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
