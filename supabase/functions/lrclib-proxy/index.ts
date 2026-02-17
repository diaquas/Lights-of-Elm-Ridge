// Supabase Edge Function: lrclib-proxy
// Proxies lyrics requests to LRCLIB with proper User-Agent header.
// Browser fetch() cannot set User-Agent (forbidden header), so we
// proxy through this function to satisfy LRCLIB's requirements.
//
// Actions:
//   get    — Exact match by artist + title
//   search — Free-text search query

const ALLOWED_ORIGIN =
  Deno.env.get("ALLOWED_ORIGIN") || "https://lightsofelmridge.com";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LRCLIB_BASE = "https://lrclib.net/api";
const USER_AGENT =
  "TrkIQ/1.0 lightsofelmridge.com (github.com/diaquas/Lights-of-Elm-Ridge)";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (body.action === "get" && body.artist && body.title) {
      return await handleGet(body.artist, body.title);
    } else if (body.action === "search" && body.query) {
      return await handleSearch(body.query);
    } else {
      throw new Error("Invalid action — expected get or search");
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
 * Exact match: GET /api/get?artist_name=...&track_name=...
 */
async function handleGet(artist: string, title: string): Promise<Response> {
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
async function handleSearch(query: string): Promise<Response> {
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
