// Supabase Edge Function: musixmatch-proxy
// Proxies Musixmatch API requests with the API key server-side.
// The browser never sees the Musixmatch API key.
//
// Actions:
//   richsync — Match track by artist + title, return Rich Sync (word-level timing)
//
// Required secrets:
//   MUSIXMATCH_API_KEY — Your Musixmatch API key (commercial plan for richsync)

const MUSIXMATCH_API = "https://api.musixmatch.com/ws/1.1";

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

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Health check
  if (req.method === "GET") {
    const hasKey = !!Deno.env.get("MUSIXMATCH_API_KEY");
    return new Response(
      JSON.stringify({
        ok: true,
        function: "musixmatch-proxy",
        configured: hasKey,
        v: 1,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }

  try {
    const apiKey = Deno.env.get("MUSIXMATCH_API_KEY");
    if (!apiKey) {
      return jsonResponse(
        { found: false, error: "not_configured" },
        corsHeaders,
      );
    }

    const body = await req.json();

    if (body.action === "richsync" && body.artist && body.title) {
      return await handleRichSync(body.artist, body.title, apiKey, corsHeaders);
    } else {
      throw new Error("Invalid action — expected richsync");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ found: false, error: message }, corsHeaders);
  }
});

/**
 * Match a track by artist + title, then fetch Rich Sync if available.
 *
 * Two-step process:
 *   1. matcher.track.get → find the Musixmatch track_id
 *   2. track.richsync.get → fetch word-level timing for that track
 */
async function handleRichSync(
  artist: string,
  title: string,
  apiKey: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Step 1: Match track.
  const matchParams = new URLSearchParams({
    apikey: apiKey,
    q_artist: artist,
    q_track: title,
    f_has_richsync: "1",
  });

  const matchResponse = await fetch(
    `${MUSIXMATCH_API}/matcher.track.get?${matchParams.toString()}`,
  );
  if (!matchResponse.ok) {
    return jsonResponse(
      { found: false, error: `match_failed_${matchResponse.status}` },
      corsHeaders,
    );
  }

  const matchData = await matchResponse.json();
  const track = matchData?.message?.body?.track;

  if (!track || !track.track_id) {
    return jsonResponse({ found: false }, corsHeaders);
  }

  const trackId: number = track.track_id;
  const hasRichSync: boolean = track.has_richsync === 1;
  const duration: number = track.track_length || 0;

  if (!hasRichSync) {
    return jsonResponse(
      {
        found: true,
        trackId,
        hasRichSync: false,
        duration,
      },
      corsHeaders,
    );
  }

  // Step 2: Fetch Rich Sync.
  const richParams = new URLSearchParams({
    apikey: apiKey,
    track_id: String(trackId),
  });

  const richResponse = await fetch(
    `${MUSIXMATCH_API}/track.richsync.get?${richParams.toString()}`,
  );

  if (!richResponse.ok) {
    return jsonResponse(
      {
        found: true,
        trackId,
        hasRichSync: false,
        duration,
        error: `richsync_fetch_${richResponse.status}`,
      },
      corsHeaders,
    );
  }

  const richData = await richResponse.json();
  const richSync = richData?.message?.body?.richsync;

  if (!richSync?.richsync_body) {
    return jsonResponse(
      {
        found: true,
        trackId,
        hasRichSync: false,
        duration,
      },
      corsHeaders,
    );
  }

  // Also try to get plain lyrics for the transcript.
  let plainLyrics: string | undefined;
  try {
    const lyricsParams = new URLSearchParams({
      apikey: apiKey,
      track_id: String(trackId),
    });
    const lyricsResponse = await fetch(
      `${MUSIXMATCH_API}/track.lyrics.get?${lyricsParams.toString()}`,
    );
    if (lyricsResponse.ok) {
      const lyricsData = await lyricsResponse.json();
      plainLyrics = lyricsData?.message?.body?.lyrics?.lyrics_body;
    }
  } catch {
    // Plain lyrics are optional — Rich Sync includes line text.
  }

  return jsonResponse(
    {
      found: true,
      trackId,
      hasRichSync: true,
      richSyncBody: richSync.richsync_body,
      plainLyrics,
      duration,
    },
    corsHeaders,
  );
}

function jsonResponse(
  data: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}
