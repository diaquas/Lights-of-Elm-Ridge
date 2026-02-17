/**
 * ModIQ — Mapping Dictionary (Enhancement 1)
 *
 * Persistent dictionary of confirmed mapping pairs. Stores every mapping
 * that users confirm (auto-matched and kept, corrected, or manually created).
 * Before running the matching algorithm, the dictionary is checked first —
 * known pairs get instant HIGH confidence matches.
 *
 * The dictionary is global across all users: User B benefits from User A's
 * corrections. No user-identifying information is stored.
 *
 * @see modiq-ai-enhancements-spec.md — Enhancement 1
 */

import { createClient } from "@/lib/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────

export type MatchSource = "auto_confirmed" | "user_correction" | "user_manual";

export interface DictionaryEntry {
  id?: string;

  /** Source side (from the vendor's sequence) */
  source_name: string;
  source_name_normalized: string;
  source_type: string; // "model" | "group" | "submodel"
  source_pixel_count: number | null;

  /** Destination side (from the user's layout) */
  dest_name: string;
  dest_name_normalized: string;
  dest_type: string;
  dest_pixel_count: number | null;

  /** Metadata */
  vendor_hint: string | null;
  match_source: MatchSource;
  confidence: number;
  times_confirmed: number;
  first_seen: string;
  last_confirmed: string;
}

export interface DictionaryLookupResult {
  entry: DictionaryEntry;
  lookup_method: "exact" | "fuzzy" | "pixel_type";
  lookup_confidence: number;
}

/** What happened during a mapping session, used to update the dictionary */
export interface MappingSessionEvent {
  source_name: string;
  source_type: string;
  source_pixel_count: number | null;
  dest_name: string | null; // null = user unmapped (do NOT store)
  dest_type: string;
  dest_pixel_count: number | null;
  event_type: MatchSource;
  vendor_hint: string | null;
}

// ─── Name Normalization ─────────────────────────────────────────────

/**
 * Normalize a model name for dictionary lookup.
 * Strips vendor prefixes, lowercases, collapses whitespace/underscores,
 * removes common noise words, and sorts tokens for order-independent matching.
 */
export function normalizeName(name: string): string {
  let n = name;

  // Split camelCase BEFORE lowercasing (needs uppercase boundaries)
  n = n.replace(/([a-z])([A-Z])/g, "$1 $2");

  n = n.toLowerCase();

  // Strip known vendor prefixes
  const vendorPrefixes = [
    "boscoyo",
    "gilbert",
    "ge_",
    "ge ",
    "ppd_",
    "ppd ",
    "efl_",
    "efl ",
    "ccc_",
    "ccc ",
    "xtreme_",
    "xtreme ",
    "holiday coro",
    "pixel pro",
  ];
  for (const prefix of vendorPrefixes) {
    if (n.startsWith(prefix)) {
      n = n.slice(prefix.length);
    }
  }

  // Replace underscores, dashes, dots with spaces
  n = n.replace(/[_\-.]+/g, " ");

  // Strip trailing "px" from numeric tokens (e.g., "180px" → "180")
  n = n.replace(/(\d+)px\b/g, "$1");

  // Remove common noise words
  const noise = ["grp", "group", "rgb", "pixel", "pixels", "px", "led"];
  const tokens = n
    .split(/\s+/)
    .filter((t) => t.length > 0 && !noise.includes(t));

  // Sort tokens for order-independent matching
  tokens.sort();
  return tokens.join("_");
}

// ─── Vendor Detection ───────────────────────────────────────────────

const VENDOR_PATTERNS: [RegExp, string][] = [
  [/boscoyo/i, "Boscoyo Studio"],
  [/\bge[_\s]/i, "Gilbert Engineering"],
  [/\bgilbert/i, "Gilbert Engineering"],
  [/\bppd[_\s]/i, "Pixel Pro Displays"],
  [/\befl[_\s]/i, "EFL"],
  [/\bccc[_\s]/i, "CCC"],
  [/\bxtreme/i, "Xtreme Sequences"],
  [/\bholiday\s*coro/i, "Holiday Coro"],
  [/\bpixel\s*pro/i, "Pixel Pro Displays"],
];

/**
 * Attempt to detect vendor from model name, folder path, or metadata.
 */
export function detectVendor(name: string, folderPath?: string): string | null {
  const searchStr = `${name} ${folderPath ?? ""}`;
  for (const [pattern, vendor] of VENDOR_PATTERNS) {
    if (pattern.test(searchStr)) return vendor;
  }
  return null;
}

// ─── Levenshtein Distance ───────────────────────────────────────────

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ─── In-Memory Cache ────────────────────────────────────────────────

let dictionaryCache: DictionaryEntry[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load all dictionary entries, with caching.
 */
async function loadDictionary(): Promise<DictionaryEntry[]> {
  const now = Date.now();
  if (dictionaryCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return dictionaryCache;
  }

  const client = createClient();
  if (!client) {
    return dictionaryCache ?? [];
  }

  const { data, error } = await client
    .from("modiq_mapping_dictionary")
    .select("*")
    .order("times_confirmed", { ascending: false });

  if (error) {
    // Fallback to cached data on error
    return dictionaryCache ?? [];
  }

  dictionaryCache = data as DictionaryEntry[];
  cacheTimestamp = now;
  return dictionaryCache;
}

/** Invalidate the in-memory cache (call after writes). */
export function invalidateDictionaryCache(): void {
  dictionaryCache = null;
  cacheTimestamp = 0;
}

// ─── Lookup Functions ───────────────────────────────────────────────

/**
 * Look up a source model name in the dictionary.
 *
 * Strategy (in priority order):
 * 1. Exact normalized name match → instant HIGH confidence
 * 2. Fuzzy normalized match (edit distance ≤ 2) → HIGH confidence
 * 3. Pixel count + type match → additional signal (MEDIUM)
 * 4. Vendor-scoped lookup narrows search space when vendor is detected
 */
export async function lookupMapping(
  sourceName: string,
  sourceType: string,
  sourcePixelCount: number | null,
  vendorHint?: string | null,
): Promise<DictionaryLookupResult | null> {
  const dictionary = await loadDictionary();
  if (dictionary.length === 0) return null;

  const normalized = normalizeName(sourceName);

  // Scope to vendor if detected
  const candidates = vendorHint
    ? dictionary.filter(
        (e) => e.vendor_hint === vendorHint || e.vendor_hint === null,
      )
    : dictionary;

  // 1. Exact normalized match
  const exactMatch = candidates.find(
    (e) => e.source_name_normalized === normalized,
  );
  if (exactMatch) {
    return {
      entry: exactMatch,
      lookup_method: "exact",
      lookup_confidence: 1.0,
    };
  }

  // 2. Fuzzy match (edit distance ≤ 2)
  let bestFuzzy: DictionaryEntry | null = null;
  let bestDist = Infinity;

  for (const entry of candidates) {
    // Only check entries of similar length (skip wildly different names)
    if (Math.abs(entry.source_name_normalized.length - normalized.length) > 3) {
      continue;
    }
    const dist = levenshteinDistance(entry.source_name_normalized, normalized);
    if (dist <= 2 && dist < bestDist) {
      bestDist = dist;
      bestFuzzy = entry;
    }
  }

  if (bestFuzzy) {
    const confidence = bestDist === 1 ? 0.95 : 0.85;
    return {
      entry: bestFuzzy,
      lookup_method: "fuzzy",
      lookup_confidence: confidence,
    };
  }

  // 3. Pixel count + type match (not standalone — needs type match too)
  if (sourcePixelCount && sourcePixelCount > 0) {
    const pixelTypeMatch = candidates.find(
      (e) =>
        e.source_type === sourceType &&
        e.source_pixel_count !== null &&
        e.source_pixel_count > 0 &&
        Math.abs(e.source_pixel_count - sourcePixelCount) /
          Math.max(e.source_pixel_count, sourcePixelCount) <
          0.05, // within 5% pixel count
    );
    if (pixelTypeMatch) {
      return {
        entry: pixelTypeMatch,
        lookup_method: "pixel_type",
        lookup_confidence: 0.7,
      };
    }
  }

  return null;
}

/**
 * Batch lookup: check multiple source models against the dictionary.
 * Returns a map of source name → lookup result.
 */
export async function batchLookup(
  sources: Array<{
    name: string;
    type: string;
    pixelCount: number | null;
  }>,
  vendorHint?: string | null,
): Promise<Map<string, DictionaryLookupResult>> {
  const results = new Map<string, DictionaryLookupResult>();

  for (const source of sources) {
    const result = await lookupMapping(
      source.name,
      source.type,
      source.pixelCount,
      vendorHint,
    );
    if (result) {
      results.set(source.name, result);
    }
  }

  return results;
}

// ─── Storage Functions ──────────────────────────────────────────────

/**
 * Store a mapping session's results in the dictionary.
 *
 * - Auto-matched pairs the user KEPT → stored as "auto_confirmed"
 * - Auto-matched pairs the user CHANGED → stored as "user_correction"
 * - Manual mappings created from scratch → stored as "user_manual"
 * - Unmapped models (user left empty) → NOT stored
 */
export async function storeMappingEvents(
  events: MappingSessionEvent[],
): Promise<{ stored: number; updated: number; errors: string[] }> {
  const client = createClient();
  if (!client) {
    return { stored: 0, updated: 0, errors: ["Supabase client unavailable"] };
  }

  let stored = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const event of events) {
    // Skip unmapped models
    if (!event.dest_name) continue;

    const sourceNormalized = normalizeName(event.source_name);
    const destNormalized = normalizeName(event.dest_name);
    const now = new Date().toISOString();

    try {
      // Check if entry already exists
      const { data: existing } = await client
        .from("modiq_mapping_dictionary")
        .select("*")
        .eq("source_name_normalized", sourceNormalized)
        .eq("dest_name_normalized", destNormalized)
        .limit(1)
        .single();

      if (existing) {
        // Update existing entry: increment times_confirmed
        const { error } = await client
          .from("modiq_mapping_dictionary")
          .update({
            times_confirmed: (existing as DictionaryEntry).times_confirmed + 1,
            last_confirmed: now,
            // Upgrade match_source if user explicitly confirmed
            match_source:
              event.event_type === "user_correction"
                ? "user_correction"
                : (existing as DictionaryEntry).match_source,
          })
          .eq("id", (existing as DictionaryEntry).id);

        if (error) {
          errors.push(
            `Update failed for ${event.source_name}: ${error.message}`,
          );
        } else {
          updated++;
        }
      } else {
        // Insert new entry
        const newEntry: Omit<DictionaryEntry, "id"> = {
          source_name: event.source_name,
          source_name_normalized: sourceNormalized,
          source_type: event.source_type,
          source_pixel_count: event.source_pixel_count,
          dest_name: event.dest_name,
          dest_name_normalized: destNormalized,
          dest_type: event.dest_type,
          dest_pixel_count: event.dest_pixel_count,
          vendor_hint: event.vendor_hint,
          match_source: event.event_type,
          confidence: 1.0,
          times_confirmed: 1,
          first_seen: now,
          last_confirmed: now,
        };

        const { error } = await client
          .from("modiq_mapping_dictionary")
          .insert(newEntry);

        if (error) {
          errors.push(
            `Insert failed for ${event.source_name}: ${error.message}`,
          );
        } else {
          stored++;
        }
      }
    } catch (err) {
      errors.push(
        `Exception for ${event.source_name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Invalidate cache after writes
  invalidateDictionaryCache();

  return { stored, updated, errors };
}

/**
 * Build MappingSessionEvents from a completed mapping session.
 *
 * Compares the original auto-matched results with the user's final decisions
 * to determine what was kept, corrected, or manually created.
 */
export function buildSessionEvents(
  originalMappings: Array<{
    sourceName: string;
    sourceType: string;
    sourcePixelCount: number | null;
    destName: string | null;
    destType: string;
    destPixelCount: number | null;
  }>,
  finalMappings: Array<{
    sourceName: string;
    sourceType: string;
    sourcePixelCount: number | null;
    destName: string | null;
    destType: string;
    destPixelCount: number | null;
  }>,
  vendorHint?: string | null,
): MappingSessionEvent[] {
  const events: MappingSessionEvent[] = [];

  // Index original mappings by source name
  const originalBySource = new Map(
    originalMappings.map((m) => [m.sourceName, m]),
  );

  for (const final of finalMappings) {
    // Skip unmapped
    if (!final.destName) continue;

    const original = originalBySource.get(final.sourceName);

    let eventType: MatchSource;
    if (!original || !original.destName) {
      // User manually created this mapping (was unmapped before)
      eventType = "user_manual";
    } else if (original.destName === final.destName) {
      // User kept the auto-match
      eventType = "auto_confirmed";
    } else {
      // User changed the auto-match
      eventType = "user_correction";
    }

    events.push({
      source_name: final.sourceName,
      source_type: final.sourceType,
      source_pixel_count: final.sourcePixelCount,
      dest_name: final.destName,
      dest_type: final.destType,
      dest_pixel_count: final.destPixelCount,
      event_type: eventType,
      vendor_hint: vendorHint ?? detectVendor(final.sourceName),
    });
  }

  return events;
}
