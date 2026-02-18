/* ------------------------------------------------------------------ */
/*  TRK:IQ — Essentia Onset Detection Client (browser-side)           */
/*  Calls a custom Essentia Cog model on Replicate via Edge Function   */
/*  for onset detection, beat tracking, and BPM on isolated stems.    */
/* ------------------------------------------------------------------ */

import { createClient } from "@/lib/supabase/client";
import type { PredictionStatus, StemSet } from "./types";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150; // 5 minutes — CPU models on Replicate have slow cold starts

/** Result from the Essentia Cog model for a single stem */
export interface EssentiaOnsetResult {
  /** Which stem this result is for */
  stemType: string;
  /** Onset times in seconds */
  onsets: number[];
  /** Beat positions in seconds */
  beats: number[];
  /** Detected BPM */
  bpm: number;
  /** Beat detection confidence (0-1) */
  beatConfidence: number;
  /** Kick onset times in seconds (drums only) */
  kickOnsets?: number[];
  /** Snare onset times in seconds (drums only) */
  snareOnsets?: number[];
  /** Hi-hat onset times in seconds (drums only) */
  hihatOnsets?: number[];
}

/** Response from the essentia-onset Edge Function */
interface EssentiaResponse {
  predictionId: string;
  status: PredictionStatus;
  output?: {
    onsets?: number[];
    beats?: number[];
    bpm?: number;
    beat_confidence?: number;
    kick_onsets?: number[];
    snare_onsets?: number[];
    hihat_onsets?: number[];
  };
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
 * Call the essentia-onset Edge Function.
 */
async function callEssentiaFunction(
  body: Record<string, unknown>,
): Promise<EssentiaResponse> {
  const supabase = getClient();

  const { data, error } = await supabase.functions.invoke("essentia-onset", {
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Edge functions return 200 with { error: "..." } for application errors
  if (data?.error) {
    throw new Error(data.error);
  }

  return data as EssentiaResponse;
}

/**
 * Run Essentia onset detection on a single stem.
 */
async function analyzeSingleStem(
  stemUrl: string,
  stemType: string,
): Promise<EssentiaOnsetResult> {
  // Start the prediction
  const startResult = await callEssentiaFunction({
    action: "start",
    stemUrl,
    stemType,
  });
  const predictionId = startResult.predictionId;

  // Poll for completion
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    await sleep(POLL_INTERVAL_MS);
    attempts++;

    const result = await callEssentiaFunction({
      action: "status",
      predictionId,
    });

    if (result.status === "succeeded" && result.output) {
      const out = result.output;
      return {
        stemType,
        onsets: out.onsets ?? [],
        beats: out.beats ?? [],
        bpm: out.bpm ?? 0,
        beatConfidence: out.beat_confidence ?? 0,
        kickOnsets: out.kick_onsets,
        snareOnsets: out.snare_onsets,
        hihatOnsets: out.hihat_onsets,
      };
    }

    if (result.status === "failed") {
      throw new Error(result.error || `Essentia failed on ${stemType} stem`);
    }

    if (result.status === "canceled") {
      throw new Error(`Essentia canceled on ${stemType} stem`);
    }
  }

  throw new Error(`Essentia timed out on ${stemType} stem`);
}

/**
 * Run Essentia onset detection on all available stems in parallel.
 *
 * Processes drums, bass, and other stems simultaneously.
 * Each stem gets its own Replicate prediction.
 *
 * @param stems          - Demucs stem URLs
 * @param onStatusUpdate - Called with status messages
 * @returns Array of results (one per successfully analyzed stem)
 */
export async function analyzeStems(
  stems: StemSet,
  onStatusUpdate?: (message: string) => void,
): Promise<EssentiaOnsetResult[]> {
  // Build the list of stems to analyze (skip vocals — handled by force-align)
  const stemJobs: { url: string; type: string }[] = [];
  if (stems.drums) stemJobs.push({ url: stems.drums, type: "drums" });
  if (stems.bass) stemJobs.push({ url: stems.bass, type: "bass" });
  if (stems.other) stemJobs.push({ url: stems.other, type: "other" });

  if (stemJobs.length === 0) return [];

  onStatusUpdate?.(`Analyzing ${stemJobs.length} stems with Essentia...`);

  // Run all stems in parallel
  const settled = await Promise.allSettled(
    stemJobs.map((job) => analyzeSingleStem(job.url, job.type)),
  );

  const results: EssentiaOnsetResult[] = [];
  const errors: string[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
    } else {
      errors.push(outcome.reason?.message || "Unknown error");
    }
  }

  if (errors.length > 0 && results.length === 0) {
    onStatusUpdate?.(`Essentia failed: ${errors[0]}`);
  } else if (errors.length > 0) {
    onStatusUpdate?.(
      `Essentia: ${results.length}/${stemJobs.length} stems (${errors.length} failed)`,
    );
  } else {
    onStatusUpdate?.(
      `Essentia: analyzed ${results.length}/${stemJobs.length} stems`,
    );
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
