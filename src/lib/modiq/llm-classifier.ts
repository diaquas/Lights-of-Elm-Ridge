/**
 * ModIQ — LLM Classification for Ambiguous Matches (Enhancement 2)
 *
 * For matches scoring LOW or MEDIUM confidence, sends ambiguous pairs to
 * Claude Sonnet for classification. The LLM understands context, abbreviations,
 * vendor naming conventions, and prop semantics that string matching cannot.
 *
 * Design principles:
 * - Only called for LOW/MEDIUM confidence pairs (never HIGH or UNMAPPED)
 * - All ambiguous pairs batched into a single API call
 * - Graceful fallback if API fails — never a hard dependency
 * - Cost: ~$0.001 per mapping session (~20 pairs)
 *
 * @see modiq-ai-enhancements-spec.md — Enhancement 2
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface AmbiguousPair {
  /** Index in the caller's array (for correlating results) */
  index: number;
  source_name: string;
  source_type: string;
  source_pixels: number | null;
  source_parent: string | null;
  dest_name: string;
  dest_type: string;
  dest_pixels: number | null;
  dest_parent: string | null;
}

export interface LLMClassificationResult {
  /** Index from the input AmbiguousPair */
  index: number;
  /** LLM's verdict: are these the same prop? */
  match: boolean;
  /** LLM confidence 0.0–1.0 */
  confidence: number;
  /** One-sentence reasoning */
  reasoning: string;
}

export interface LLMClassificationResponse {
  results: LLMClassificationResult[];
  /** Whether the API call succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Token usage for monitoring */
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface LLMClassifierConfig {
  /** Anthropic API key */
  apiKey: string;
  /** Model to use (default: claude-sonnet-4-20250514) */
  model?: string;
  /** Max tokens for response (default: 1024) */
  maxTokens?: number;
  /** Timeout in ms (default: 30000) */
  timeoutMs?: number;
  /** API base URL (default: https://api.anthropic.com) */
  baseUrl?: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_BASE_URL = "https://api.anthropic.com";

const SYSTEM_PROMPT = `You are an expert in xLights Christmas/Halloween lighting displays.
You understand model naming conventions across vendors like Boscoyo Studio,
Gilbert Engineering (GE), Pixel Pro Displays (PPD), Xtreme Sequences,
Holiday Coro, EFL, CCC, and others.

Your job is to evaluate whether pairs of xLights model names refer to the
same physical prop/element. Consider:
- Abbreviations (SP = Spinner, MT = MegaTree, CC = Candy Cane, SF = Singing Face)
- Vendor prefixes/suffixes that can be ignored when comparing
- Pixel counts as strong matching signals (same count = very likely same prop)
- Submodel group semantics (arms, strands, segments, spokes, rings)
- "Per model" render style meaning effects target the group, not individuals
- Position indicators (L/R, CW/CCW, Top/Bottom, 1/2/3)
- Spanish-English equivalents (tumba=tombstone, estrella=star, arbol=tree)
- GE product lines (Overlord, Rosa, Fuzion, SpinReel)
- Holiday-specific props (pumpkins ↔ ghosts can swap across holiday themes)

Respond ONLY with valid JSON. No markdown fences, no commentary.`;

// ─── API Call ───────────────────────────────────────────────────────

/**
 * Build the user prompt for a batch of ambiguous pairs.
 */
function buildUserPrompt(pairs: AmbiguousPair[]): string {
  const pairsText = pairs
    .map(
      (p, i) =>
        `${i + 1}. Source: "${p.source_name}" (type: ${p.source_type}, pixels: ${p.source_pixels ?? "unknown"})
   Dest: "${p.dest_name}" (type: ${p.dest_type}, pixels: ${p.dest_pixels ?? "unknown"})
   Context: source parent="${p.source_parent ?? "none"}", dest parent="${p.dest_parent ?? "none"}"`,
    )
    .join("\n\n");

  return `Evaluate these ambiguous model mapping pairs. For each, respond with:
- pair: the pair number (1-indexed)
- match: true/false — are these the same prop?
- confidence: 0.0-1.0
- reasoning: one sentence explaining why

Pairs to evaluate:

${pairsText}

Respond as a JSON array:
[{"pair": 1, "match": true, "confidence": 0.92, "reasoning": "..."}]`;
}

/**
 * Parse the LLM response JSON, handling common formatting issues.
 */
function parseLLMResponse(
  text: string,
  pairs: AmbiguousPair[],
): LLMClassificationResult[] {
  // Strip markdown fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned) as Array<{
    pair: number;
    match: boolean;
    confidence: number;
    reasoning: string;
  }>;

  return parsed.map((item) => {
    // Map 1-indexed pair number back to the original index
    const pairIdx = item.pair - 1;
    const originalPair = pairs[pairIdx];

    return {
      index: originalPair?.index ?? pairIdx,
      match: Boolean(item.match),
      confidence: Math.max(0, Math.min(1, item.confidence)),
      reasoning: String(item.reasoning ?? ""),
    };
  });
}

/**
 * Classify ambiguous mapping pairs using Claude Sonnet.
 *
 * Batches all pairs into a single API call.
 * Falls back gracefully on any error.
 */
export async function classifyAmbiguousPairs(
  pairs: AmbiguousPair[],
  config: LLMClassifierConfig,
): Promise<LLMClassificationResponse> {
  if (pairs.length === 0) {
    return { results: [], success: true };
  }

  const model = config.model ?? DEFAULT_MODEL;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  const userPrompt = buildUserPrompt(pairs);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        results: [],
        success: false,
        error: `API returned ${response.status}: ${errorText}`,
      };
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const textContent = data.content?.find((c) => c.type === "text");
    if (!textContent?.text) {
      return {
        results: [],
        success: false,
        error: "No text content in API response",
      };
    }

    const results = parseLLMResponse(textContent.text, pairs);

    return {
      results,
      success: true,
      usage: data.usage,
    };
  } catch (err) {
    // Graceful fallback — LLM is an enhancement, not a dependency
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Request timed out after ${timeoutMs}ms`
          : err.message
        : String(err);

    return {
      results: [],
      success: false,
      error: message,
    };
  }
}

// ─── Confidence Mapping ─────────────────────────────────────────────

export type ConfidenceSource =
  | "llm_confirmed"
  | "llm_tentative"
  | "llm_rejected";

export interface LLMConfidenceUpdate {
  index: number;
  newConfidence: "high" | "medium" | "low";
  source: ConfidenceSource;
  reasoning: string;
}

/**
 * Map LLM classification results to confidence updates for the matcher.
 *
 * - match + confidence ≥ 0.7 → upgrade to HIGH ("llm_confirmed")
 * - match + confidence 0.4–0.7 → keep as MEDIUM ("llm_tentative")
 * - no match or confidence < 0.4 → downgrade to LOW ("llm_rejected")
 */
export function mapLLMResultsToConfidence(
  results: LLMClassificationResult[],
): LLMConfidenceUpdate[] {
  return results.map((result) => {
    if (result.match && result.confidence >= 0.7) {
      return {
        index: result.index,
        newConfidence: "high" as const,
        source: "llm_confirmed" as const,
        reasoning: result.reasoning,
      };
    }

    if (result.match && result.confidence >= 0.4) {
      return {
        index: result.index,
        newConfidence: "medium" as const,
        source: "llm_tentative" as const,
        reasoning: result.reasoning,
      };
    }

    return {
      index: result.index,
      newConfidence: "low" as const,
      source: "llm_rejected" as const,
      reasoning: result.reasoning,
    };
  });
}
