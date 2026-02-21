/* ------------------------------------------------------------------ */
/*  TRK:IQ — Musixmatch Client                                       */
/*  Fetches Rich Sync (word-level timestamps) from the Musixmatch API */
/*  via a Supabase edge function proxy that holds the API key.        */
/*                                                                    */
/*  Rich Sync provides curated, human-verified per-word timing that   */
/*  is trusted as-is — SOFA only needs to resolve phonemes within     */
/*  each word's time window instead of doing full alignment.          */
/* ------------------------------------------------------------------ */

import { createClient } from "@/lib/supabase/client";
import type { LyricsData, WordTimestamp, SyncedLine } from "./types";

/* ── Rich Sync format ─────────────────────────────────────────────── */

/**
 * A single word/token in a Rich Sync line.
 * `c` = character content, `o` = offset from line start in seconds.
 */
interface RichSyncToken {
  c: string;
  o: number;
}

/**
 * A single line in the Musixmatch Rich Sync body.
 * `ts` = line start (seconds), `te` = line end (seconds),
 * `x`  = full line text, `l`  = word-level tokens.
 */
interface RichSyncLine {
  ts: number;
  te: number;
  x: string;
  l: RichSyncToken[];
}

/** Raw proxy response shape */
interface MusixmatchProxyResponse {
  found: boolean;
  trackId?: number;
  hasRichSync?: boolean;
  richSyncBody?: string;
  plainLyrics?: string;
  syncedLyrics?: string;
  duration?: number;
  error?: string;
}

/* ── Proxy call ───────────────────────────────────────────────────── */

/**
 * Call the musixmatch-proxy edge function via the Supabase SDK.
 * Returns null if Supabase is not configured or the call fails.
 */
async function proxyRichSync(
  artist: string,
  title: string,
): Promise<MusixmatchProxyResponse | null> {
  try {
    const supabase = createClient();
    if (!supabase) return null;

    const { data, error } = await supabase.functions.invoke(
      "musixmatch-proxy",
      { body: { action: "richsync", artist, title } },
    );

    if (error) return null;
    if (!data?.found) return null;
    return data as MusixmatchProxyResponse;
  } catch {
    return null;
  }
}

/* ── Rich Sync → WordTimestamp[] conversion ────────────────────────── */

/**
 * Parse Musixmatch Rich Sync JSON body into WordTimestamp[].
 *
 * Each line has a list of tokens with character content (`c`) and
 * offset from the line start (`o`).  We derive word end times from
 * the next token's start (or the line's `te` for the final token).
 */
export function parseRichSync(richSyncBody: string): WordTimestamp[] {
  let lines: RichSyncLine[];
  try {
    lines = JSON.parse(richSyncBody);
  } catch {
    return [];
  }

  if (!Array.isArray(lines)) return [];

  const words: WordTimestamp[] = [];

  for (const line of lines) {
    if (!line.l || line.l.length === 0) continue;

    for (let i = 0; i < line.l.length; i++) {
      const token = line.l[i];
      const text = token.c.trim();
      if (!text) continue;

      const wordStart = line.ts + token.o;

      // End time: next non-empty token's start, or line end.
      let wordEnd = line.te;
      for (let j = i + 1; j < line.l.length; j++) {
        if (line.l[j].c.trim()) {
          wordEnd = line.ts + line.l[j].o;
          break;
        }
      }

      // Sanity: end must be after start.
      if (wordEnd <= wordStart) {
        wordEnd = wordStart + 0.1;
      }

      words.push({
        word: text,
        start: Math.round(wordStart * 10000) / 10000,
        end: Math.round(wordEnd * 10000) / 10000,
      });
    }
  }

  return words;
}

/**
 * Extract SyncedLine[] from Rich Sync lines (line-level timing).
 */
function richSyncToSyncedLines(richSyncBody: string): SyncedLine[] {
  let lines: RichSyncLine[];
  try {
    lines = JSON.parse(richSyncBody);
  } catch {
    return [];
  }
  if (!Array.isArray(lines)) return [];

  return lines
    .filter((l) => l.x && l.x.trim())
    .map((l) => ({
      timeMs: Math.round(l.ts * 1000),
      text: l.x.trim(),
    }));
}

/* ── Public API ────────────────────────────────────────────────────── */

/**
 * Fetch Musixmatch Rich Sync for a track.
 *
 * Returns LyricsData with word-level timestamps when Rich Sync is
 * available.  Returns null if Musixmatch is not configured, the track
 * is not found, or Rich Sync is not available for this track.
 */
export async function fetchMusixmatchRichSync(
  artist: string,
  title: string,
): Promise<LyricsData | null> {
  const data = await proxyRichSync(artist, title);
  if (!data) return null;

  if (!data.richSyncBody) return null;

  const wordTimestamps = parseRichSync(data.richSyncBody);
  if (wordTimestamps.length === 0) return null;

  // Build plain text and synced lines from Rich Sync.
  const syncedLines = richSyncToSyncedLines(data.richSyncBody);
  const plainText =
    data.plainLyrics || syncedLines.map((l) => l.text).join("\n") || "";

  return {
    plainText,
    syncedLines: syncedLines.length > 0 ? syncedLines : null,
    source: "musixmatch",
    originalDurationSec:
      data.duration && data.duration > 0 ? data.duration : undefined,
    wordTimestamps,
  };
}
