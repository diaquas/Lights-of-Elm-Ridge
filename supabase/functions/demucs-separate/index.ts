// Supabase Edge Function: demucs-separate
// Proxies audio stem separation requests to Replicate (Demucs model).
//
// Actions:
//   start  — Upload audio to Replicate, create prediction, return predictionId
//   status — Poll prediction status, return stems when complete
//
// Required secrets:
//   REPLICATE_API_TOKEN — Your Replicate API token

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Validate request origin against allowlist.
 * Accepts: production domain, Cloudflare Pages previews, localhost dev.
 */
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed =
    origin === "https://lightsofelmridge.com" ||
    origin.endsWith(".pages.dev") ||
    origin.startsWith("http://localhost:");

  return {
    "Access-Control-Allow-Origin": allowed
      ? origin
      : "https://lightsofelmridge.com",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const REPLICATE_API = "https://api.replicate.com/v1";
const DEMUCS_MODEL =
  Deno.env.get("DEMUCS_MODEL") || "ryan5453/demucs";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Health check — visit the URL in a browser to verify deployment
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, function: "demucs-separate", model: DEMUCS_MODEL, v: 3 }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }

  try {
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    if (!replicateToken) {
      throw new Error("REPLICATE_API_TOKEN not configured");
    }

    // Use service role key for storage operations (bypasses RLS).
    // JWT verification is disabled at the gateway level; client-side
    // auth guards access to this function in the UI.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();

    if (body.action === "start" && body.storagePath) {
      return await handleStart(
        body.storagePath,
        supabase,
        replicateToken,
        corsHeaders,
      );
    } else if (body.action === "status" && body.predictionId) {
      return await handleStatus(body.predictionId, replicateToken, corsHeaders);
    } else {
      throw new Error("Invalid action");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

/**
 * Start a Demucs separation job.
 * Gets a signed URL for the uploaded audio, sends it to Replicate.
 */
async function handleStart(
  storagePath: string,
  supabase: ReturnType<typeof createClient>,
  replicateToken: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Create a signed URL for the uploaded audio file
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("audio-uploads")
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new Error(
      `Failed to create signed URL: ${signedUrlError?.message || "unknown"}`,
    );
  }

  // Create a Replicate prediction via model-based API (auto-resolves latest version)
  const response = await fetch(
    `${REPLICATE_API}/models/${DEMUCS_MODEL}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          audio: signedUrlData.signedUrl,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate API error: ${response.status} — ${errorText}`);
  }

  const prediction = await response.json();

  return new Response(
    JSON.stringify({
      predictionId: prediction.id,
      status: prediction.status,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    },
  );
}

/**
 * Check the status of a Demucs prediction.
 * Returns stems when the prediction has succeeded.
 */
async function handleStatus(
  predictionId: string,
  replicateToken: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const response = await fetch(`${REPLICATE_API}/predictions/${predictionId}`, {
    headers: {
      Authorization: `Bearer ${replicateToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate API error: ${response.status} — ${errorText}`);
  }

  const prediction = await response.json();

  const result: Record<string, unknown> = {
    predictionId: prediction.id,
    status: prediction.status,
  };

  if (prediction.status === "succeeded" && prediction.output) {
    result.stems = normalizeStemOutput(prediction.output);
  }

  if (prediction.status === "failed") {
    result.error = prediction.error || "Stem separation failed";
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

/** Known stem names from Demucs (htdemucs / htdemucs_6s) */
const STEM_NAMES = ["vocals", "drums", "bass", "other", "guitar", "piano"];

/**
 * Normalize Demucs output into a StemSet object.
 *
 * Replicate models return outputs in different shapes depending on the
 * Cog version and model config:
 *
 *   1. Object with stem keys: { vocals: "url", drums: "url", ... }  ← ideal
 *   2. Array of URLs: ["url/vocals.wav", "url/drums.wav", ...]       ← parse filenames
 *   3. Single string URL (zip archive): "url/stems.zip"              ← pass as archive
 */
function normalizeStemOutput(output: unknown): Record<string, string> {
  // Case 1: Object with stem keys — pass through (most common)
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const obj = output as Record<string, unknown>;
    const stems: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string" && value.startsWith("http")) {
        stems[key] = value;
      }
    }
    if (Object.keys(stems).length > 0) return stems;
  }

  // Case 2: Array of URLs — extract stem names from filenames
  if (Array.isArray(output)) {
    const stems: Record<string, string> = {};
    for (const url of output) {
      if (typeof url !== "string") continue;
      // Extract filename: "https://replicate.delivery/.../vocals.wav" → "vocals"
      const filename = url.split("/").pop()?.split(".")[0]?.toLowerCase() || "";
      const stemName = STEM_NAMES.find((s) => filename.includes(s));
      if (stemName) {
        stems[stemName] = url;
      }
    }
    if (Object.keys(stems).length > 0) return stems;
    // If no recognized stems, try positional mapping (htdemucs default order)
    if (output.length >= 4) {
      return {
        drums: output[0] as string,
        bass: output[1] as string,
        other: output[2] as string,
        vocals: output[3] as string,
      };
    }
  }

  // Case 3: Single string URL (zip archive)
  if (typeof output === "string") {
    return { archive: output };
  }

  return {};
}
