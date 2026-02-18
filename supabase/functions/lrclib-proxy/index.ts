// Supabase Edge Function: lrclib-proxy
// Proxies lyrics requests to LRCLIB with proper User-Agent header.
// Browser fetch() cannot set User-Agent (forbidden header), so we
// proxy through this function to satisfy LRCLIB's requirements.
//
// Actions:
//   get    — Exact match by artist + title
//   search — Free-text search query

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

const LRCLIB_BASE = "https://lrclib.net/api";
const USER_AGENT =
  "TrkIQ/1.0 lightsofelmridge.com (github.com/diaquas/Lights-of-Elm-Ridge)";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Health check — visit the URL in a browser to verify deployment
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, function: "lrclib-proxy", v: 2 }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }

  try {
    const body = await req.json();

    if (body.action === "get" && body.artist && body.title) {
      return await handleGet(body.artist, body.title, corsHeaders);
    } else if (body.action === "search" && body.query) {
      return await handleSearch(body.query, corsHeaders);
    } else {
      throw new Error("Invalid action — expected get or search");
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
 * Exact match: GET /api/get?artist_name=...&track_name=...
 */
async function handleGet(
  artist: string,
  title: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
  });

  const response = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ found: false, status: response.status }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }

  const data = await response.json();
  return new Response(JSON.stringify({ found: true, ...data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

/**
 * Search: GET /api/search?q=...
 */
async function handleSearch(
  query: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const params = new URLSearchParams({ q: query });

  const response = await fetch(`${LRCLIB_BASE}/search?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ results: [], status: response.status }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }

  const results = await response.json();
  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}
