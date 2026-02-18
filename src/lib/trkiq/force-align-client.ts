/* ------------------------------------------------------------------ */
/*  TRK:IQ — Force-Align Client (browser-side)                       */
/*  Calls cureau/force-align-wordstamps on Replicate via Edge Function */
/*  to get word-level timestamps for lyrics alignment.                */
/* ------------------------------------------------------------------ */

import { createClient } from "@/lib/supabase/client";
import type { PredictionStatus } from "./types";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 90; // 3 minutes max (alignment is fast)

/** A single word timestamp from force-align-wordstamps */
export interface ForceAlignWord {
  word: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Confidence score (0-1), present when show_probabilities=true */
  probability?: number;
}

/** Response from the force-align Edge Function */
interface ForceAlignResponse {
  predictionId: string;
  status: PredictionStatus;
  wordstamps?: ForceAlignWord[];
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
 * Call the force-align Edge Function via the Supabase SDK.
 */
async function callForceAlignFunction(
  body: Record<string, unknown>,
): Promise<ForceAlignResponse> {
  const supabase = getClient();

  const { data, error } = await supabase.functions.invoke("force-align", {
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Edge functions return 200 with { error: "..." } for application errors
  if (data?.error) {
    throw new Error(data.error);
  }

  return data as ForceAlignResponse;
}

/**
 * Run forced alignment on a vocals stem + lyrics transcript.
 *
 * @param vocalsUrl      - URL to the Demucs vocals stem (NOT the original MP3)
 * @param transcript     - Plain lyrics text to align against the audio
 * @param onStatusUpdate - Called with status messages during processing
 * @returns Array of word-level timestamps
 */
export async function forceAlignLyrics(
  vocalsUrl: string,
  transcript: string,
  onStatusUpdate?: (message: string) => void,
): Promise<ForceAlignWord[]> {
  // Step 1: Start the alignment job
  onStatusUpdate?.("Starting forced alignment...");
  const startResult = await callForceAlignFunction({
    action: "start",
    vocalsUrl,
    transcript,
  });
  const predictionId = startResult.predictionId;

  // Step 2: Poll for completion
  onStatusUpdate?.("Aligning lyrics to audio (this takes 10-30 seconds)...");
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    await sleep(POLL_INTERVAL_MS);
    attempts++;

    const result = await callForceAlignFunction({
      action: "status",
      predictionId,
    });

    if (result.status === "succeeded" && result.wordstamps) {
      return result.wordstamps;
    }

    if (result.status === "failed") {
      throw new Error(result.error || "Forced alignment failed");
    }

    if (result.status === "canceled") {
      throw new Error("Forced alignment was canceled");
    }

    onStatusUpdate?.(
      `Aligning lyrics to audio... (${Math.round((attempts * POLL_INTERVAL_MS) / 1000)}s)`,
    );
  }

  throw new Error("Forced alignment timed out");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
