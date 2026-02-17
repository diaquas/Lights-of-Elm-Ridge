/**
 * ModIQ — Semantic Embeddings for Name Matching (Enhancement 3)
 *
 * Uses an embeddings API to convert model names into semantic vectors,
 * then computes cosine similarity to catch matches that string-based
 * algorithms miss (e.g., "Singing Face Santa" vs "SF_Santa_Head").
 *
 * Design principles:
 * - Aggressive preprocessing expands abbreviations before embedding
 * - All names batched into a single API call (never per-pair)
 * - Embedding results cached — same name never embedded twice
 * - Cost: ~$0.00004 per mapping session (150 names)
 *
 * @see modiq-ai-enhancements-spec.md — Enhancement 3
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface EmbeddingConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use (default: text-embedding-3-small) */
  model?: string;
  /** API base URL (default: https://api.openai.com) */
  baseUrl?: string;
  /** Timeout in ms (default: 30000) */
  timeoutMs?: number;
}

export interface SemanticScore {
  sourceIndex: number;
  destIndex: number;
  similarity: number;
}

export interface EmbeddingResponse {
  embeddings: Map<string, number[]>;
  success: boolean;
  error?: string;
  usage?: {
    total_tokens: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_BASE_URL = "https://api.openai.com";
const DEFAULT_TIMEOUT_MS = 30_000;

// ─── Abbreviation Expansion ─────────────────────────────────────────

const ABBREVIATION_MAP: Record<string, string> = {
  sp: "Spinner",
  mt: "MegaTree",
  cc: "CandyCane",
  sf: "Singing Face",
  ss: "Showstopper",
  mh: "Moving Head",
  dw: "Driveway",
  sw: "Sidewalk",
  ppd: "",
  efl: "",
  ccc: "",
  ge: "",
  moaw: "Wreath",
  boaw: "Wreath",
  pimp: "Singing Pumpkin",
  cw: "Clockwise",
  ccw: "Counter Clockwise",
  rgb: "",
  ww: "Warm White",
  nw: "Neutral White",
  px: "Pixels",
  grp: "Group",
  str: "Strand",
  seg: "Segment",
  vert: "Vertical",
  horiz: "Horizontal",
  lg: "Large",
  sm: "Small",
  med: "Medium",
  l: "Left",
  r: "Right",
  ct: "Center",
};

/**
 * Known vendor prefixes to strip before embedding.
 */
const VENDOR_PREFIXES = [
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

/**
 * Preprocess a model name for optimal embedding quality.
 *
 * - Expand abbreviations
 * - Strip vendor prefixes
 * - Convert camelCase and underscores to spaces
 * - Add "xLights model:" prefix for domain context
 */
export function preprocessForEmbedding(name: string): string {
  let processed = name;

  // Strip vendor prefixes
  const lower = processed.toLowerCase();
  for (const prefix of VENDOR_PREFIXES) {
    if (lower.startsWith(prefix)) {
      processed = processed.slice(prefix.length);
      break;
    }
  }

  // Replace underscores, dashes with spaces
  processed = processed.replace(/[_\-]+/g, " ");

  // Split camelCase
  processed = processed.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Expand abbreviations (word-boundary matching)
  const tokens = processed.split(/\s+/).filter((t) => t.length > 0);
  const expanded = tokens.map((token) => {
    const lower = token.toLowerCase();
    return ABBREVIATION_MAP[lower] ?? token;
  });

  // Remove empty tokens from stripped vendor abbreviations
  const cleaned = expanded.filter((t) => t.length > 0).join(" ");

  // Add domain context prefix
  return `xLights model: ${cleaned}`;
}

// ─── Embedding Cache ────────────────────────────────────────────────

/**
 * In-memory cache for embeddings. Keyed by preprocessed name.
 * Persists for the lifetime of the page/session.
 */
const embeddingCache = new Map<string, number[]>();

/** Clear the embedding cache (for testing or memory management). */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/** Get current cache size (for monitoring). */
export function getEmbeddingCacheSize(): number {
  return embeddingCache.size;
}

// ─── Cosine Similarity ──────────────────────────────────────────────

/**
 * Compute cosine similarity between two embedding vectors.
 * Returns value between -1 and 1 (typically 0 to 1 for normalized embeddings).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  if (magnitude === 0) return 0;

  return dot / magnitude;
}

// ─── API Call ───────────────────────────────────────────────────────

/**
 * Fetch embeddings for a batch of names from the OpenAI API.
 * Uses the cache to avoid re-embedding previously seen names.
 */
export async function getEmbeddings(
  names: string[],
  config: EmbeddingConfig,
): Promise<EmbeddingResponse> {
  if (names.length === 0) {
    return { embeddings: new Map(), success: true };
  }

  const model = config.model ?? DEFAULT_MODEL;
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Preprocess all names
  const preprocessed = names.map((n) => preprocessForEmbedding(n));

  // Separate cached from uncached
  const result = new Map<string, number[]>();
  const uncachedNames: string[] = [];
  const uncachedIndices: number[] = [];

  for (let i = 0; i < preprocessed.length; i++) {
    const key = preprocessed[i];
    const cached = embeddingCache.get(key);
    if (cached) {
      result.set(names[i], cached);
    } else {
      uncachedNames.push(key);
      uncachedIndices.push(i);
    }
  }

  // If everything was cached, return immediately
  if (uncachedNames.length === 0) {
    return { embeddings: result, success: true, usage: { total_tokens: 0 } };
  }

  // Fetch uncached embeddings
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: uncachedNames,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        embeddings: result, // return whatever was cached
        success: false,
        error: `Embeddings API returned ${response.status}: ${errorText}`,
      };
    }

    const data = (await response.json()) as {
      data: Array<{ index: number; embedding: number[] }>;
      usage?: { total_tokens: number };
    };

    // Store results and update cache
    for (const item of data.data) {
      const originalIndex = uncachedIndices[item.index];
      const originalName = names[originalIndex];
      const preprocessedKey = preprocessed[originalIndex];

      result.set(originalName, item.embedding);
      embeddingCache.set(preprocessedKey, item.embedding);
    }

    return {
      embeddings: result,
      success: true,
      usage: data.usage,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Request timed out after ${timeoutMs}ms`
          : err.message
        : String(err);

    return {
      embeddings: result, // return whatever was cached
      success: false,
      error: message,
    };
  }
}

// ─── Batch Similarity Scoring ───────────────────────────────────────

/**
 * Compute semantic similarity scores between all source and dest names.
 *
 * Fetches embeddings for all names in a single batch call, then computes
 * pairwise cosine similarity locally.
 *
 * Returns a flat array of scores, one per (source, dest) pair.
 */
export async function computeSemanticScores(
  sourceNames: string[],
  destNames: string[],
  config: EmbeddingConfig,
): Promise<{
  scores: SemanticScore[];
  success: boolean;
  error?: string;
}> {
  // Deduplicate names for the API call
  const allNames = [...new Set([...sourceNames, ...destNames])];

  const embeddingResult = await getEmbeddings(allNames, config);

  if (!embeddingResult.success && embeddingResult.embeddings.size === 0) {
    return {
      scores: [],
      success: false,
      error: embeddingResult.error,
    };
  }

  // Compute pairwise similarities
  const scores: SemanticScore[] = [];

  for (let si = 0; si < sourceNames.length; si++) {
    const sourceEmb = embeddingResult.embeddings.get(sourceNames[si]);
    if (!sourceEmb) continue;

    for (let di = 0; di < destNames.length; di++) {
      const destEmb = embeddingResult.embeddings.get(destNames[di]);
      if (!destEmb) continue;

      const similarity = cosineSimilarity(sourceEmb, destEmb);
      scores.push({
        sourceIndex: si,
        destIndex: di,
        similarity,
      });
    }
  }

  return {
    scores,
    success: true,
  };
}

/**
 * Compute a combined match score incorporating semantic similarity.
 *
 * Weighted combination:
 * - String similarity: 30%
 * - Semantic similarity: 40%
 * - Pixel count score: 20%
 * - Type score: 10%
 */
export function computeCombinedScore(
  stringScore: number,
  semanticScore: number,
  pixelScore: number,
  typeScore: number,
): {
  combined: number;
  components: {
    stringScore: number;
    semanticScore: number;
    pixelScore: number;
    typeScore: number;
  };
} {
  const combined =
    stringScore * 0.3 +
    semanticScore * 0.4 +
    pixelScore * 0.2 +
    typeScore * 0.1;

  return {
    combined,
    components: { stringScore, semanticScore, pixelScore, typeScore },
  };
}
