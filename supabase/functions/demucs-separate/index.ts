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
// ryan5453/demucs — maintained Demucs model on Replicate with pinned version
const DEMUCS_VERSION =
  "5a7041cc9b82e5a558fea6b3d7b12dea89625e89da33f0447bd727c2d0ab9e77";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Health check — visit the URL in a browser to verify deployment
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, function: "demucs-separate", v: 2 }),
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

  // Create a Replicate prediction using pinned version hash
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
