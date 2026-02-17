/**
 * ModIQ — AI Enhancement Pipeline
 *
 * Orchestrates all three AI enhancements in a four-phase pipeline:
 *
 *   Phase 1: Dictionary Lookup — instant matches from crowdsourced corrections
 *   Phase 2: Rule-Based Matching — original six-factor algorithm
 *   Phase 3: Semantic Embeddings — re-score MEDIUM candidates with embeddings
 *   Phase 4: LLM Classification — batch-classify remaining ambiguous pairs
 *
 * Each phase is optional and degrades gracefully. The pipeline works without
 * any API keys configured — it just falls back to the original algorithm.
 *
 * @see modiq-ai-enhancements-spec.md — Combined Flow
 */

import type { ParsedModel } from "./parser";
import type { MappingResult, Confidence } from "./matcher";
import { matchModels } from "./matcher";
import {
  lookupMapping,
  detectVendor,
  type DictionaryLookupResult,
} from "./mapping-dictionary";
import {
  classifyAmbiguousPairs,
  mapLLMResultsToConfidence,
  type AmbiguousPair,
  type LLMClassifierConfig,
} from "./llm-classifier";
import {
  computeSemanticScores,
  type EmbeddingConfig,
} from "./semantic-embeddings";

// ─── Types ──────────────────────────────────────────────────────────

export interface AIPipelineConfig {
  /** Enable Enhancement 1: Dictionary lookup (default: true) */
  enableDictionary?: boolean;
  /** Enable Enhancement 2: LLM classification (requires llmConfig) */
  enableLLM?: boolean;
  /** Enable Enhancement 3: Semantic embeddings (requires embeddingConfig) */
  enableEmbeddings?: boolean;
  /** Anthropic API config for LLM classification */
  llmConfig?: LLMClassifierConfig;
  /** OpenAI API config for semantic embeddings */
  embeddingConfig?: EmbeddingConfig;
  /** Vendor hint for dictionary lookup scoping */
  vendorHint?: string | null;
  /** Folder path for vendor auto-detection */
  folderPath?: string;
  /** Minimum confidence to skip embedding re-scoring */
  highConfidenceThreshold?: number;
  /** Minimum combined score after embeddings to consider resolved */
  embeddingResolveThreshold?: number;
}

export interface AIPipelineResult extends MappingResult {
  /** Per-mapping AI enhancement metadata */
  aiMetadata: Map<
    string,
    {
      /** Which phase resolved this mapping */
      resolvedBy:
        | "dictionary"
        | "algorithm"
        | "embeddings"
        | "llm"
        | "original";
      /** Dictionary lookup result if applicable */
      dictionaryLookup?: DictionaryLookupResult;
      /** Semantic similarity score if computed */
      semanticScore?: number;
      /** LLM reasoning if classified */
      llmReasoning?: string;
      /** LLM confidence source */
      llmSource?: string;
      /** Original confidence before AI enhancements */
      originalConfidence?: Confidence;
    }
  >;
  /** Pipeline execution stats */
  pipelineStats: {
    dictionaryHits: number;
    dictionaryMisses: number;
    embeddingUpgrades: number;
    llmUpgrades: number;
    llmDowngrades: number;
    llmCallMade: boolean;
    embeddingCallMade: boolean;
    totalApiCostEstimate: number;
  };
}

// ─── Default Thresholds ─────────────────────────────────────────────

const DEFAULT_EMBEDDING_RESOLVE_THRESHOLD = 0.75;

// ─── Pipeline ───────────────────────────────────────────────────────

/**
 * Run the full AI-enhanced matching pipeline.
 *
 * Phase 1: Dictionary Lookup
 *   - Check each source model against the mapping dictionary
 *   - Exact/fuzzy matches get instant HIGH confidence
 *
 * Phase 2: Rule-Based Matching (original algorithm)
 *   - Run matchModels() on remaining unresolved models
 *   - HIGH confidence results are returned as-is
 *
 * Phase 3: Semantic Embeddings
 *   - For MEDIUM confidence pairs, compute embedding similarity
 *   - Re-score with combined string + semantic signals
 *   - Pairs scoring ≥ 0.75 are upgraded
 *
 * Phase 4: LLM Classification
 *   - Remaining ambiguous MEDIUM pairs sent to Claude in batch
 *   - Confidence ≥ 0.7 → HIGH, 0.4–0.7 → MEDIUM, < 0.4 → LOW
 */
export async function runAIPipeline(
  sourceModels: ParsedModel[],
  destModels: ParsedModel[],
  config: AIPipelineConfig = {},
  superGroups?: { source?: Set<string>; dest?: Set<string> },
): Promise<AIPipelineResult> {
  const enableDictionary = config.enableDictionary !== false;
  const enableLLM = config.enableLLM === true && !!config.llmConfig;
  const enableEmbeddings =
    config.enableEmbeddings === true && !!config.embeddingConfig;
  const embedResolveThreshold =
    config.embeddingResolveThreshold ?? DEFAULT_EMBEDDING_RESOLVE_THRESHOLD;

  // Detect vendor if not provided
  const vendorHint =
    config.vendorHint ??
    (config.folderPath
      ? detectVendor("", config.folderPath)
      : sourceModels.length > 0
        ? detectVendor(sourceModels[0].name)
        : null);

  const aiMetadata: AIPipelineResult["aiMetadata"] = new Map();
  const stats: AIPipelineResult["pipelineStats"] = {
    dictionaryHits: 0,
    dictionaryMisses: 0,
    embeddingUpgrades: 0,
    llmUpgrades: 0,
    llmDowngrades: 0,
    llmCallMade: false,
    embeddingCallMade: false,
    totalApiCostEstimate: 0,
  };

  // ── Phase 1: Dictionary Lookup ─────────────────────────────────
  const dictionaryResolved = new Set<string>();

  if (enableDictionary) {
    for (const source of sourceModels) {
      const sourceType = source.isGroup ? "group" : "model";
      const result = await lookupMapping(
        source.name,
        sourceType,
        source.pixelCount,
        vendorHint,
      );

      if (result) {
        stats.dictionaryHits++;
        dictionaryResolved.add(source.name);
        aiMetadata.set(source.name, {
          resolvedBy: "dictionary",
          dictionaryLookup: result,
        });
      } else {
        stats.dictionaryMisses++;
      }
    }
  }

  // ── Phase 2: Rule-Based Matching ───────────────────────────────
  // Run the original algorithm on ALL models (dictionary results are
  // overlaid afterward, not pre-filtered, to preserve the Hungarian
  // algorithm's global optimization).
  const baseResult = matchModels(sourceModels, destModels, superGroups);

  // Overlay dictionary results onto base mappings
  for (const mapping of baseResult.mappings) {
    const sourceName = mapping.sourceModel.name;

    if (dictionaryResolved.has(sourceName)) {
      const meta = aiMetadata.get(sourceName);
      const dictResult = meta?.dictionaryLookup;

      if (dictResult && mapping.destModel) {
        // Check if dictionary destination matches the algorithm's choice
        const dictDestNorm = dictResult.entry.dest_name
          .toLowerCase()
          .replace(/[_\s]+/g, "");
        const algoDestNorm = mapping.destModel.name
          .toLowerCase()
          .replace(/[_\s]+/g, "");

        if (dictDestNorm === algoDestNorm) {
          // Dictionary confirms algorithm — boost to HIGH
          mapping.confidence = "high";
          mapping.reason = `Dictionary match (${dictResult.lookup_method}) · ${mapping.reason}`;
        }
        // If dictionary disagrees, keep algorithm result but flag it
        // (the user may have a different layout than previous users)
      }
    }

    // Track original confidence for models not resolved by dictionary
    if (!aiMetadata.has(sourceName)) {
      aiMetadata.set(sourceName, {
        resolvedBy: "algorithm",
        originalConfidence: mapping.confidence,
      });
    }
  }

  // ── Phase 3: Semantic Embeddings ───────────────────────────────
  if (enableEmbeddings && config.embeddingConfig) {
    // Collect MEDIUM confidence pairs for embedding re-scoring
    const mediumPairs = baseResult.mappings.filter(
      (m) =>
        m.confidence === "medium" &&
        m.destModel &&
        !dictionaryResolved.has(m.sourceModel.name),
    );

    if (mediumPairs.length > 0) {
      stats.embeddingCallMade = true;

      const sourceNames = mediumPairs.map((m) => m.sourceModel.name);
      const destNames = mediumPairs.map((m) => m.destModel!.name);

      const semanticResult = await computeSemanticScores(
        sourceNames,
        destNames,
        config.embeddingConfig,
      );

      if (semanticResult.success) {
        // Estimate cost: ~10 tokens per name, $0.02 per million tokens
        const uniqueNames = new Set([...sourceNames, ...destNames]).size;
        stats.totalApiCostEstimate += (uniqueNames * 12 * 0.02) / 1_000_000;

        // Apply semantic scores to matching pairs (diagonal — each source
        // compared to its currently-matched dest)
        for (let i = 0; i < mediumPairs.length; i++) {
          const diagonalScore = semanticResult.scores.find(
            (s) => s.sourceIndex === i && s.destIndex === i,
          );

          if (diagonalScore) {
            const mapping = mediumPairs[i];
            const meta = aiMetadata.get(mapping.sourceModel.name) ?? {
              resolvedBy: "algorithm" as const,
              originalConfidence: mapping.confidence,
            };
            meta.semanticScore = diagonalScore.similarity;

            if (diagonalScore.similarity >= embedResolveThreshold) {
              // Upgrade to HIGH — embeddings resolved the ambiguity
              mapping.confidence = "high";
              mapping.reason = `Semantic match (${(diagonalScore.similarity * 100).toFixed(0)}%) · ${mapping.reason}`;
              meta.resolvedBy = "embeddings";
              stats.embeddingUpgrades++;
            }

            aiMetadata.set(mapping.sourceModel.name, meta);
          }
        }
      }
    }
  }

  // ── Phase 4: LLM Classification ───────────────────────────────
  if (enableLLM && config.llmConfig) {
    // Collect remaining MEDIUM pairs that embeddings didn't resolve
    const stillAmbiguous = baseResult.mappings.filter(
      (m) =>
        (m.confidence === "medium" || m.confidence === "low") &&
        m.destModel &&
        !dictionaryResolved.has(m.sourceModel.name) &&
        aiMetadata.get(m.sourceModel.name)?.resolvedBy !== "embeddings",
    );

    if (stillAmbiguous.length > 0) {
      stats.llmCallMade = true;

      const pairs: AmbiguousPair[] = stillAmbiguous.map((m, i) => ({
        index: i,
        source_name: m.sourceModel.name,
        source_type: m.sourceModel.isGroup ? "group" : "model",
        source_pixels: m.sourceModel.pixelCount,
        source_parent: m.sourceModel.memberModels?.[0] ?? null,
        dest_name: m.destModel!.name,
        dest_type: m.destModel!.isGroup ? "group" : "model",
        dest_pixels: m.destModel!.pixelCount,
        dest_parent: m.destModel!.memberModels?.[0] ?? null,
      }));

      const llmResponse = await classifyAmbiguousPairs(pairs, config.llmConfig);

      if (llmResponse.success) {
        // Estimate cost: ~1150 tokens at Sonnet pricing (~$3/M input, $15/M output)
        if (llmResponse.usage) {
          stats.totalApiCostEstimate +=
            (llmResponse.usage.input_tokens * 3) / 1_000_000 +
            (llmResponse.usage.output_tokens * 15) / 1_000_000;
        }

        const updates = mapLLMResultsToConfidence(llmResponse.results);

        for (const update of updates) {
          if (update.index < stillAmbiguous.length) {
            const mapping = stillAmbiguous[update.index];
            const previousConfidence = mapping.confidence;

            mapping.confidence = update.newConfidence;
            mapping.reason = `${update.reasoning} · ${mapping.reason}`;

            const meta = aiMetadata.get(mapping.sourceModel.name) ?? {
              resolvedBy: "algorithm" as const,
              originalConfidence: previousConfidence,
            };
            meta.resolvedBy = "llm";
            meta.llmReasoning = update.reasoning;
            meta.llmSource = update.source;
            aiMetadata.set(mapping.sourceModel.name, meta);

            if (
              update.newConfidence === "high" &&
              previousConfidence !== "high"
            ) {
              stats.llmUpgrades++;
            } else if (
              update.newConfidence === "low" &&
              previousConfidence !== "low"
            ) {
              stats.llmDowngrades++;
            }
          }
        }
      }
    }
  }

  // ── Recompute summary stats ────────────────────────────────────
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  let unmappedSource = 0;

  for (const m of baseResult.mappings) {
    switch (m.confidence) {
      case "high":
        highConfidence++;
        break;
      case "medium":
        mediumConfidence++;
        break;
      case "low":
        lowConfidence++;
        break;
      case "unmapped":
        unmappedSource++;
        break;
    }
  }

  return {
    ...baseResult,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    unmappedSource,
    aiMetadata,
    pipelineStats: stats,
  };
}

// ─── Feature Flag Helpers ───────────────────────────────────────────

/**
 * Check if AI features are available (API keys configured).
 */
export function getAICapabilities(): {
  dictionaryAvailable: boolean;
  llmAvailable: boolean;
  embeddingsAvailable: boolean;
} {
  // Dictionary is always available (uses Supabase which may or may not be configured)
  const dictionaryAvailable = true;

  // LLM requires NEXT_PUBLIC_ANTHROPIC_API_KEY
  const llmAvailable =
    typeof process !== "undefined" &&
    !!process.env?.NEXT_PUBLIC_ANTHROPIC_API_KEY;

  // Embeddings require NEXT_PUBLIC_OPENAI_API_KEY
  const embeddingsAvailable =
    typeof process !== "undefined" && !!process.env?.NEXT_PUBLIC_OPENAI_API_KEY;

  return { dictionaryAvailable, llmAvailable, embeddingsAvailable };
}

/**
 * Build a pipeline config from environment variables.
 * Enables each enhancement only if its API key is present.
 */
export function buildPipelineConfigFromEnv(
  overrides?: Partial<AIPipelineConfig>,
): AIPipelineConfig {
  const capabilities = getAICapabilities();

  const config: AIPipelineConfig = {
    enableDictionary: overrides?.enableDictionary ?? true,
    enableLLM: overrides?.enableLLM ?? capabilities.llmAvailable,
    enableEmbeddings:
      overrides?.enableEmbeddings ?? capabilities.embeddingsAvailable,
    ...overrides,
  };

  if (config.enableLLM && !config.llmConfig) {
    const apiKey = process.env?.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    if (apiKey) {
      config.llmConfig = { apiKey };
    } else {
      config.enableLLM = false;
    }
  }

  if (config.enableEmbeddings && !config.embeddingConfig) {
    const apiKey = process.env?.NEXT_PUBLIC_OPENAI_API_KEY;
    if (apiKey) {
      config.embeddingConfig = { apiKey };
    } else {
      config.enableEmbeddings = false;
    }
  }

  return config;
}
