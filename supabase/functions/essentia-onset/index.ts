// Supabase Edge Function: essentia-onset
// Proxies onset detection requests to a custom Essentia Cog model on Replicate.
//
// Actions:
//   start  — Submit a stem URL + stem type, create prediction, return predictionId
//   status — Poll prediction status, return onset/beat data when complete
//
// Required secrets:
//   REPLICATE_API_TOKEN — Your Replicate API token
//
// Required env:
//   ESSENTIA_MODEL — Replicate model name (e.g. "diaquas/essentia-onset")

/**
 * Validate request origin against allowlist.
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

// Custom Essentia Cog model on Replicate.
// Update this after deploying: cog push r8.im/diaquas/essentia-onset
const ESSENTIA_MODEL =
  Deno.env.get("ESSENTIA_MODEL") || "diaquas/essentia-onset";

// Pinned version hash — set ESSENTIA_VERSION env var after cog push.
// When set, uses version-based API (same pattern as Demucs/Force-Align).
// When unset, falls back to model-name-based API (requires default version).
const ESSENTIA_VERSION = Deno.env.get("ESSENTIA_VERSION") || "";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Health check
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        function: "essentia-onset",
        model: ESSENTIA_MODEL,
        version: ESSENTIA_VERSION ? ESSENTIA_VERSION.slice(0, 12) : "latest",
        v: 2,
      }),
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

    const body = await req.json();

    if (body.action === "start" && body.stemUrl && body.stemType) {
      return await handleStart(
        body.stemUrl,
        body.stemType,
        body.onsetThreshold ?? 0.5,
        replicateToken,
        corsHeaders,
      );
    } else if (body.action === "status" && body.predictionId) {
      return await handleStatus(body.predictionId, replicateToken, corsHeaders);
    } else {
      throw new Error("Invalid action — expected start or status");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    // Return 200 with error field so supabase.functions.invoke() passes
    // the body through — non-2xx responses get swallowed by the SDK.
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});

/**
 * Start an Essentia onset detection job on a single stem.
 */
async function handleStart(
  stemUrl: string,
  stemType: string,
  onsetThreshold: number,
  replicateToken: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Use version hash when available (reliable, same as Demucs/Force-Align).
  // Fall back to model-name-based API when no version is pinned.
  const predictionBody: Record<string, unknown> = {
    input: {
      audio: stemUrl,
      stem_type: stemType,
      onset_threshold: onsetThreshold,
    },
  };
  if (ESSENTIA_VERSION) {
    predictionBody.version = ESSENTIA_VERSION;
  } else {
    predictionBody.model = ESSENTIA_MODEL;
  }

  const response = await fetch(`${REPLICATE_API}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(predictionBody),
  });

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
 * Check the status of an Essentia onset detection prediction.
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
    // Output is the dict from predict.py: onsets, beats, bpm, etc.
    // If the model returned a JSON string, parse it; otherwise use directly.
    const output =
      typeof prediction.output === "string"
        ? JSON.parse(prediction.output)
        : prediction.output;
    result.output = output;
  }

  if (prediction.status === "failed") {
    result.error = prediction.error || "Onset detection failed";
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}
