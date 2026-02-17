/* ------------------------------------------------------------------ */
/*  TRK:IQ — LRCLIB Client                                            */
/*  Fetches plain + synced lyrics from the free LRCLIB API             */
/*  https://lrclib.net — no API key required                           */
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

/**
 * Fetch lyrics from LRCLIB by artist and track name.
 * Returns null if no lyrics are found.
 *
 * LRCLIB is a free, public API — no key needed, CORS supported.
 */
export async function fetchLyrics(
  artist: string,
  title: string,
): Promise<LyricsData | null> {
  try {
    const params = new URLSearchParams({
      artist_name: artist,
      track_name: title,
    });

    const response = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`, {
      headers: { "User-Agent": "TrkIQ/1.0 lightsofelmridge.com" },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      return null;
    }

    const data: LrclibResponse = await response.json();

    if (!data.plainLyrics && !data.syncedLyrics) return null;

    const syncedLines = data.syncedLyrics ? parseLrc(data.syncedLyrics) : null;

    return {
      plainText: data.plainLyrics || extractPlainFromSynced(syncedLines) || "",
      syncedLines,
      source: "lrclib",
    };
  } catch {
    return null;
  }
}

/**
 * Search LRCLIB for lyrics (fallback if exact match fails).
 */
export async function searchLyrics(query: string): Promise<LyricsData | null> {
  try {
    const params = new URLSearchParams({ q: query });
    const response = await fetch(`${LRCLIB_BASE}/search?${params.toString()}`, {
      headers: { "User-Agent": "TrkIQ/1.0 lightsofelmridge.com" },
    });

    if (!response.ok) return null;

    const results: LrclibResponse[] = await response.json();
    if (results.length === 0) return null;

    const best = results[0];
    if (!best.plainLyrics && !best.syncedLyrics) return null;

    const syncedLines = best.syncedLyrics ? parseLrc(best.syncedLyrics) : null;

    return {
      plainText: best.plainLyrics || extractPlainFromSynced(syncedLines) || "",
      syncedLines,
      source: "lrclib",
    };
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
