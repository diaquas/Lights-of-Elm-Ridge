// Supabase Edge Function: force-align
// Proxies word-level forced alignment requests to Replicate
// (diaquas/force-align — stable-ts + wav2vec2, with refine crash fix).
//
// Actions:
//   start  — Submit vocals URL + transcript, create prediction, return predictionId
//   status — Poll prediction status, return word timestamps when complete
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

// diaquas/force-align — custom fork with refine crash fix
// Uses model-name API until first version is pushed, then pin the hash here.
const FORCE_ALIGN_MODEL = "diaquas/force-align";

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
        function: "force-align",
        model: FORCE_ALIGN_MODEL,
        v: 4,
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
 * Start a forced alignment job.
 * Sends the Demucs vocals stem URL + lyrics transcript to Replicate.
 */
async function handleStart(
  vocalsUrl: string,
  transcript: string,
  replicateToken: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const response = await fetch(`${REPLICATE_API}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: FORCE_ALIGN_MODEL,
      input: {
        audio_file: vocalsUrl,
        transcript,
        show_probabilities: true,
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
 * Check the status of a forced alignment prediction.
 * Returns word timestamps when the prediction has succeeded.
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
      // Output format varies: our model returns a JSON string,
      // third-party models may return an object directly.
      const output =
        typeof prediction.output === "string"
          ? JSON.parse(prediction.output)
          : prediction.output;
      result.wordstamps = output.wordstamps ?? output;
    } else {
      // Model succeeded but returned no output — surface as error
      // so the client stops polling instead of spinning.
      result.status = "failed";
      result.error = "Model succeeded but returned no output";
    }
  }

  if (prediction.status === "failed") {
    result.error = prediction.error || "Forced alignment failed";
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}
