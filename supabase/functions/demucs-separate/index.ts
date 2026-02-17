// Supabase Edge Function: demucs-separate
// Proxies audio stem separation requests to Replicate (Demucs model).
//
// Actions:
//   start  — Upload audio to Replicate, create prediction, return predictionId
//   status — Poll prediction status, return stems when complete
//
// Required secrets:
//   REPLICATE_API_TOKEN — Your Replicate API token
//   ALLOWED_ORIGIN      — CORS origin (e.g., https://lightsofelmridge.com)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGIN =
  Deno.env.get("ALLOWED_ORIGIN") || "https://lightsofelmridge.com";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API = "https://api.replicate.com/v1";
// Demucs model — htdemucs_6s splits into: vocals, drums, bass, guitar, piano, other
const DEMUCS_VERSION =
  "25a173108cff36ef9f80f854c162d01df9e6528be175794b81571f6571d6c1df";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    if (!replicateToken) {
      throw new Error("REPLICATE_API_TOKEN not configured");
    }

    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Invalid authentication");
    }

    const body = await req.json();

    if (body.action === "start" && body.storagePath) {
      return await handleStart(body.storagePath, supabase, replicateToken);
    } else if (body.action === "status" && body.predictionId) {
      return await handleStatus(body.predictionId, replicateToken);
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

  // Create a Replicate prediction
  const response = await fetch(`${REPLICATE_API}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateToken}`,
      "Content-Type": "application/json",
      Prefer: "respond-async",
    },
    body: JSON.stringify({
      version: DEMUCS_VERSION,
      input: {
        audio: signedUrlData.signedUrl,
        // htdemucs_6s gives us 6 stems: vocals, drums, bass, guitar, piano, other
        model: "htdemucs_6s",
        stem: "none", // return all stems
        mp3: true, // return as mp3 for faster download
        mp3_bitrate: 128,
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
 * Check the status of a Demucs prediction.
 * Returns stems when the prediction has succeeded.
 */
async function handleStatus(
  predictionId: string,
  replicateToken: string,
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
    // Demucs output is a URL to a zip or individual stem URLs
    // depending on the model version — normalize to StemSet
    if (typeof prediction.output === "string") {
      result.stems = { archive: prediction.output };
    } else {
      result.stems = prediction.output;
    }
  }

  if (prediction.status === "failed") {
    result.error = prediction.error || "Stem separation failed";
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}
