/* ------------------------------------------------------------------ */
/*  TRK:IQ — LRCLIB Client                                            */
/*  Fetches plain + synced lyrics from the free LRCLIB API             */
/*  https://lrclib.net — no API key required                           */
/*                                                                     */
/*  Browser fetch() cannot set User-Agent (forbidden header), so we    */
/*  route through a Supabase edge function that adds the header.       */
/*  Falls back to direct LRCLIB calls if Supabase is not configured.   */
/* ------------------------------------------------------------------ */

import type { LyricsData, SyncedLine } from "./types";

const LRCLIB_BASE = "https://lrclib.net/api";

/** Raw response from the LRCLIB /api/get endpoint */
interface LrclibResponse {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration: number;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

/* ── Proxy helpers ─────────────────────────────────────────────────── */

/**
 * Call the LRCLIB proxy edge function.
 * Returns null if Supabase is not configured or the call fails.
 */
async function proxyGet(
  artist: string,
  title: string,
): Promise<LrclibResponse | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const response = await fetch(`${supabaseUrl}/functions/v1/lrclib-proxy`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "get", artist, title }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  if (!data.found) return null;
  return data as LrclibResponse;
}

async function proxySearch(query: string): Promise<LrclibResponse | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const response = await fetch(`${supabaseUrl}/functions/v1/lrclib-proxy`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "search", query }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0] as LrclibResponse;
}

/* ── Direct LRCLIB helpers (fallback when proxy unavailable) ──────── */

async function directGet(
  artist: string,
  title: string,
): Promise<LrclibResponse | null> {
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
  });

  const response = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`);
  if (!response.ok) return null;

  const data: LrclibResponse = await response.json();
  return data;
}

async function directSearch(query: string): Promise<LrclibResponse | null> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${LRCLIB_BASE}/search?${params.toString()}`);
  if (!response.ok) return null;

  const results: LrclibResponse[] = await response.json();
  if (results.length === 0) return null;
  return results[0];
}

/* ── Shared helpers ────────────────────────────────────────────────── */

function responseToLyricsData(data: LrclibResponse): LyricsData | null {
  if (!data.plainLyrics && !data.syncedLyrics) return null;

  const syncedLines = data.syncedLyrics ? parseLrc(data.syncedLyrics) : null;

  return {
    plainText: data.plainLyrics || extractPlainFromSynced(syncedLines) || "",
    syncedLines,
    source: "lrclib",
  };
}

/* ── Public API ────────────────────────────────────────────────────── */

/**
 * Fetch lyrics from LRCLIB by artist and track name.
 * Tries edge function proxy first, falls back to direct browser fetch.
 */
export async function fetchLyrics(
  artist: string,
  title: string,
): Promise<LyricsData | null> {
  try {
    const data =
      (await proxyGet(artist, title)) || (await directGet(artist, title));
    if (!data) return null;
    return responseToLyricsData(data);
  } catch {
    return null;
  }
}

/**
 * Search LRCLIB for lyrics by query string.
 * Tries edge function proxy first, falls back to direct browser fetch.
 */
export async function searchLyrics(query: string): Promise<LyricsData | null> {
  try {
    const data = (await proxySearch(query)) || (await directSearch(query));
    if (!data) return null;
    return responseToLyricsData(data);
  } catch {
    return null;
  }
}

/**
 * Parse LRC-format synced lyrics into SyncedLine[].
 *
 * LRC format: [mm:ss.xx]Line text
 * Example: [00:12.34]Hello world
 */
export function parseLrc(lrc: string): SyncedLine[] {
  const lines = lrc.split("\n");
  const result: SyncedLine[] = [];

  for (const line of lines) {
    const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)$/);
    if (!match) continue;

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    // Handle both 2-digit (centiseconds) and 3-digit (milliseconds)
    const fraction = match[3];
    const ms =
      fraction.length === 2
        ? parseInt(fraction, 10) * 10
        : parseInt(fraction, 10);

    const timeMs = minutes * 60000 + seconds * 1000 + ms;
    const text = match[4].trim();

    if (text.length > 0) {
      result.push({ timeMs, text });
    }
  }

  return result;
}

/**
 * Extract plain text from synced lines.
 */
function extractPlainFromSynced(lines: SyncedLine[] | null): string | null {
  if (!lines || lines.length === 0) return null;
  return lines.map((l) => l.text).join("\n");
}
