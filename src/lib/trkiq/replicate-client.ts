/* ------------------------------------------------------------------ */
/*  TRK:IQ — Replicate Client (browser-side)                          */
/*  Uploads audio + polls Demucs stem separation via Edge Function     */
/* ------------------------------------------------------------------ */

import { createClient } from "@/lib/supabase/client";
import type { DemucsResponse, StemSet } from "./types";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 120; // 6 minutes max

/**
 * Get the Supabase client, throwing if unavailable.
 */
function getClient() {
  const client = createClient();
  if (!client) throw new Error("Supabase client not available");
  return client;
}

/**
 * Check whether the current user can use Demucs stem separation.
 * Requires: authenticated user + Supabase configured.
 */
export async function checkDemucsAvailable(): Promise<boolean> {
  try {
    const supabase = createClient();
    if (!supabase) return false;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user !== null;
  } catch {
    return false;
  }
}

/**
 * Upload an audio file to Supabase Storage for Demucs processing.
 * Returns the storage path.
 */
async function uploadAudio(file: File): Promise<string> {
  const supabase = getClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required for stem separation");

  const ext = file.name.split(".").pop() || "mp3";
  const storagePath = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("audio-uploads")
    .upload(storagePath, file, {
      contentType: file.type || "audio/mpeg",
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return storagePath;
}

/**
 * Call the Demucs Edge Function via the Supabase SDK.
 * Uses supabase.functions.invoke() which correctly handles
 * body serialization through the Supabase gateway.
 */
async function callDemucsFunction(
  body: Record<string, unknown>,
): Promise<DemucsResponse> {
  const supabase = getClient();

  const { data, error } = await supabase.functions.invoke("demucs-separate", {
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Edge functions return 200 with { error: "..." } for application errors
  // so the SDK passes the body through instead of swallowing it.
  if (data?.error) {
    throw new Error(data.error);
  }

  return data as DemucsResponse;
}

/**
 * Start a Demucs separation job via Edge Function.
 */
async function startSeparation(storagePath: string): Promise<string> {
  const result = await callDemucsFunction({
    action: "start",
    storagePath,
  });
  return result.predictionId;
}

/**
 * Poll the Edge Function for prediction status.
 */
async function pollStatus(predictionId: string): Promise<DemucsResponse> {
  return callDemucsFunction({ action: "status", predictionId });
}

/**
 * Run the full Demucs stem separation pipeline:
 * 1. Upload audio to Supabase Storage
 * 2. Start separation via Edge Function → Replicate
 * 3. Poll for completion
 * 4. Return stem URLs
 *
 * @param file           - The audio file to separate
 * @param onStatusUpdate - Called with status messages during processing
 * @returns StemSet with URLs to each separated stem
 */
export async function separateStems(
  file: File,
  onStatusUpdate?: (message: string) => void,
): Promise<StemSet> {
  // Step 1: Upload
  onStatusUpdate?.("Uploading audio...");
  const storagePath = await uploadAudio(file);

  // Step 2: Start
  onStatusUpdate?.("Starting stem separation...");
  const predictionId = await startSeparation(storagePath);

  // Step 3: Poll
  onStatusUpdate?.("Separating instruments (this takes 30-60 seconds)...");
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    await sleep(POLL_INTERVAL_MS);
    attempts++;

    const result = await pollStatus(predictionId);

    if (result.status === "succeeded" && result.stems) {
      // Validate that we have at least one *recognized* stem URL.
      // Previous check only counted any URL — a mis-parsed output like
      // { stems: "oneUrl" } would pass (1 URL) but downstream steps
      // need actual stem names (vocals, drums, bass, etc.) to work.
      const RECOGNIZED_STEMS = [
        "vocals",
        "drums",
        "bass",
        "guitar",
        "piano",
        "other",
      ];
      const recognizedCount = RECOGNIZED_STEMS.filter(
        (name) =>
          typeof (result.stems as Record<string, unknown>)[name] === "string" &&
          (result.stems as Record<string, string>)[name].startsWith("http"),
      ).length;

      if (recognizedCount === 0) {
        // Debug: dump what we received so we can diagnose the format mismatch
        const debugInfo = {
          stemsType: typeof result.stems,
          stemsKeys: Object.keys(result.stems),
          stemsEntries: Object.entries(result.stems).map(([k, v]) => ({
            key: k,
            valueType: typeof v,
            value: String(v).slice(0, 80),
          })),
          rawResult: JSON.stringify(result).slice(0, 500),
          _debug: (result as unknown as Record<string, unknown>)._debug,
        };
        cleanupUpload(storagePath).catch(() => {});
        throw new Error(
          `Demucs returned no recognized stem URLs — debug: ${JSON.stringify(debugInfo)}`,
        );
      }

      cleanupUpload(storagePath).catch(() => {});
      return result.stems;
    }

    if (result.status === "failed") {
      cleanupUpload(storagePath).catch(() => {});
      throw new Error(result.error || "Stem separation failed");
    }

    if (result.status === "canceled") {
      cleanupUpload(storagePath).catch(() => {});
      throw new Error("Stem separation was canceled");
    }

    // Still processing — update status
    onStatusUpdate?.(
      `Separating instruments... (${Math.round((attempts * POLL_INTERVAL_MS) / 1000)}s)`,
    );
  }

  cleanupUpload(storagePath).catch(() => {});
  throw new Error("Stem separation timed out");
}

/**
 * Delete the temporary uploaded audio file.
 */
async function cleanupUpload(storagePath: string): Promise<void> {
  try {
    const supabase = getClient();
    await supabase.storage.from("audio-uploads").remove([storagePath]);
  } catch {
    // Cleanup failure is non-critical
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
