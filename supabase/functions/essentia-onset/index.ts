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
// Model: diaquas/essentia-onset (pinned version hash)

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

// Custom Essentia Cog model on Replicate — pinned version hash.
// Update this after each cog push (get hash from Replicate model page).
const ESSENTIA_MODEL = "diaquas/essentia-onset";
const ESSENTIA_VERSION =
  "6fc6acb12430bff2c0fcd76d33e309e91f0913d022e0a5f491385630ff9bbd08";

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
        version: ESSENTIA_VERSION.slice(0, 12),
        v: 7,
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

    // Debug action — hits the Replicate model endpoint to verify visibility
    if (body.action === "test") {
      const modelRes = await fetch(
        `${REPLICATE_API}/models/${ESSENTIA_MODEL}`,
        {
          headers: { Authorization: `Bearer ${replicateToken}` },
        },
      );
      const modelBody = await modelRes.text();
      return new Response(
        JSON.stringify({
          replicateStatus: modelRes.status,
          replicateUrl: `${REPLICATE_API}/models/${ESSENTIA_MODEL}`,
          replicateResponse: modelBody.slice(0, 2000),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

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
  // Use /predictions with pinned version hash (same pattern as demucs)
  const response = await fetch(`${REPLICATE_API}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateToken}`,
      "Content-Type": "application/json",
      Prefer: "respond-async",
    },
    body: JSON.stringify({
      version: ESSENTIA_VERSION,
      input: {
        audio: stemUrl,
        stem_type: stemType,
        onset_threshold: onsetThreshold,
      },
    }),
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

  if (prediction.status === "succeeded") {
    if (prediction.output) {
      // Output from predict.py — JSON string (-> str) or object.
      const output =
        typeof prediction.output === "string"
          ? JSON.parse(prediction.output)
          : prediction.output;
      result.output = output;
    } else {
      // Model succeeded but returned no output — surface as error
      // so the client stops polling instead of spinning.
      result.status = "failed";
      result.error = "Model succeeded but returned no output";
    }
  }

  if (prediction.status === "failed") {
    result.error = prediction.error || "Onset detection failed";
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}
