// Supabase Edge Function: phoneme-align
// Proxies phoneme-level forced alignment requests to Replicate
// (diaquas/phoneme-align — wav2vec2 CTC, per-phoneme timestamps).
//
// Actions:
//   start  — Submit vocals URL + transcript + word timestamps, create prediction
//   status — Poll prediction status, return phoneme timestamps when complete
//
// Required secrets:
//   REPLICATE_API_TOKEN — Your Replicate API token

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

// diaquas/phoneme-align — wav2vec2 CTC phoneme-level alignment
// Pinned version hash — update after each cog push.
const PHONEME_ALIGN_MODEL = "diaquas/phoneme-align";
const PHONEME_ALIGN_VERSION =
  "3c3d3f69792f4752dc28a33cbf12a3850e67cafa40816137006795f042a04361";

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
        function: "phoneme-align",
        model: PHONEME_ALIGN_MODEL,
        version: PHONEME_ALIGN_VERSION.slice(0, 12),
        v: 1,
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

    if (body.action === "start" && body.vocalsUrl && body.transcript) {
      return await handleStart(
        body.vocalsUrl,
        body.transcript,
        replicateToken,
        corsHeaders,
        body.wordTimestamps,
        body.lineTimestamps,
      );
    } else if (body.action === "status" && body.predictionId) {
      return await handleStatus(body.predictionId, replicateToken, corsHeaders);
    } else {
      throw new Error("Invalid action — expected start or status");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});

/**
 * Start a phoneme-level alignment job.
 * Sends vocals URL + transcript + optional word timestamps to Replicate.
 */
async function handleStart(
  vocalsUrl: string,
  transcript: string,
  replicateToken: string,
  corsHeaders: Record<string, string>,
  wordTimestamps?: string,
  lineTimestamps?: string,
): Promise<Response> {
  const input: Record<string, unknown> = {
    audio_file: vocalsUrl,
    transcript,
  };
  if (lineTimestamps) {
    input.line_timestamps = lineTimestamps;
  } else if (wordTimestamps) {
    input.word_timestamps = wordTimestamps;
  }

  const response = await fetch(`${REPLICATE_API}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateToken}`,
      "Content-Type": "application/json",
      Prefer: "respond-async",
    },
    body: JSON.stringify({
      version: PHONEME_ALIGN_VERSION,
      input,
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
 * Check the status of a phoneme alignment prediction.
 * Returns phoneme timestamps when the prediction has succeeded.
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
      const output =
        typeof prediction.output === "string"
          ? JSON.parse(prediction.output)
          : prediction.output;
      result.words = output.words ?? output;
    } else {
      result.status = "failed";
      result.error = "Model succeeded but returned no output";
    }
  }

  if (prediction.status === "failed") {
    result.error = prediction.error || "Phoneme alignment failed";
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}
