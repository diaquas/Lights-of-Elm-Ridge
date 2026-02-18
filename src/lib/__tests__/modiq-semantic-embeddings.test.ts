import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  preprocessForEmbedding,
  cosineSimilarity,
  getEmbeddings,
  computeSemanticScores,
  computeCombinedScore,
  clearEmbeddingCache,
  getEmbeddingCacheSize,
  type EmbeddingConfig,
} from "../modiq/semantic-embeddings";

// ─── preprocessForEmbedding ─────────────────────────────────────────

describe("preprocessForEmbedding", () => {
  it("adds xLights model prefix", () => {
    const result = preprocessForEmbedding("Arch");
    expect(result).toContain("xLights model:");
  });

  it("strips vendor prefixes", () => {
    expect(preprocessForEmbedding("Boscoyo_Spinner_CW")).not.toContain(
      "Boscoyo",
    );
    expect(preprocessForEmbedding("GE_Overlord")).not.toContain("GE");
    expect(preprocessForEmbedding("PPD_Wreath")).not.toContain("PPD");
  });

  it("expands abbreviations", () => {
    const result = preprocessForEmbedding("SP_CW_16");
    expect(result).toContain("Spinner");
    expect(result).toContain("Clockwise");
  });

  it("expands MT to MegaTree", () => {
    const result = preprocessForEmbedding("MT_180_S12");
    expect(result).toContain("MegaTree");
  });

  it("expands CC to CandyCane", () => {
    const result = preprocessForEmbedding("CC Left");
    expect(result).toContain("CandyCane");
  });

  it("expands SF to Singing Face", () => {
    const result = preprocessForEmbedding("SF_Santa_Head");
    expect(result).toContain("Singing Face");
  });

  it("converts underscores to spaces", () => {
    const result = preprocessForEmbedding("Mega_Tree_16");
    expect(result).not.toContain("_");
  });

  it("splits camelCase", () => {
    const result = preprocessForEmbedding("MegaTree");
    expect(result).toContain("Mega Tree");
  });

  it("removes empty tokens from stripped vendor abbreviations", () => {
    // GE expands to "" so should be removed
    const result = preprocessForEmbedding("GE Rosa");
    expect(result).not.toMatch(/\s{2,}/); // no double spaces
  });
});

// ─── cosineSimilarity ───────────────────────────────────────────────

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it("returns 0.0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0, 5);
  });

  it("returns -1.0 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0, 5);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("returns 0 for zero vectors", () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it("returns 0 for different-length vectors", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("computes correct similarity for known vectors", () => {
    // cos(45°) ≈ 0.7071
    const a = [1, 0];
    const b = [1, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1 / Math.sqrt(2), 4);
  });

  it("handles high-dimensional vectors", () => {
    const dim = 1536; // text-embedding-3-small dimension
    const a = Array.from({ length: dim }, (_, i) => Math.sin(i));
    const b = Array.from({ length: dim }, (_, i) => Math.sin(i + 0.1));
    const sim = cosineSimilarity(a, b);
    // Should be close to 1.0 (similar vectors)
    expect(sim).toBeGreaterThan(0.99);
  });
});

// ─── computeCombinedScore ───────────────────────────────────────────

describe("computeCombinedScore", () => {
  it("produces weighted average of all factors", () => {
    const result = computeCombinedScore(1.0, 1.0, 1.0, 1.0);
    expect(result.combined).toBeCloseTo(1.0, 5);
  });

  it("applies correct weights (0.3 string, 0.4 semantic, 0.2 pixel, 0.1 type)", () => {
    // Only string score = 1.0, rest = 0.0
    const stringOnly = computeCombinedScore(1.0, 0.0, 0.0, 0.0);
    expect(stringOnly.combined).toBeCloseTo(0.3, 5);

    // Only semantic score = 1.0
    const semanticOnly = computeCombinedScore(0.0, 1.0, 0.0, 0.0);
    expect(semanticOnly.combined).toBeCloseTo(0.4, 5);

    // Only pixel score = 1.0
    const pixelOnly = computeCombinedScore(0.0, 0.0, 1.0, 0.0);
    expect(pixelOnly.combined).toBeCloseTo(0.2, 5);

    // Only type score = 1.0
    const typeOnly = computeCombinedScore(0.0, 0.0, 0.0, 1.0);
    expect(typeOnly.combined).toBeCloseTo(0.1, 5);
  });

  it("returns component breakdown", () => {
    const result = computeCombinedScore(0.8, 0.9, 0.7, 1.0);
    expect(result.components.stringScore).toBe(0.8);
    expect(result.components.semanticScore).toBe(0.9);
    expect(result.components.pixelScore).toBe(0.7);
    expect(result.components.typeScore).toBe(1.0);
  });

  it("handles all zeros", () => {
    const result = computeCombinedScore(0, 0, 0, 0);
    expect(result.combined).toBe(0);
  });
});

// ─── Embedding Cache ────────────────────────────────────────────────

describe("embedding cache", () => {
  beforeEach(() => {
    clearEmbeddingCache();
  });

  it("starts empty", () => {
    expect(getEmbeddingCacheSize()).toBe(0);
  });

  it("clears successfully", () => {
    clearEmbeddingCache();
    expect(getEmbeddingCacheSize()).toBe(0);
  });
});

// ─── getEmbeddings ──────────────────────────────────────────────────

describe("getEmbeddings", () => {
  const config: EmbeddingConfig = {
    apiKey: "test-key",
    model: "text-embedding-3-small",
    timeoutMs: 5000,
  };

  beforeEach(() => {
    clearEmbeddingCache();
    vi.restoreAllMocks();
  });

  it("returns empty map for empty input", async () => {
    const result = await getEmbeddings([], config);
    expect(result.success).toBe(true);
    expect(result.embeddings.size).toBe(0);
  });

  it("handles successful API response and caches results", async () => {
    const mockEmbedding = [0.1, 0.2, 0.3];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ index: 0, embedding: mockEmbedding }],
        usage: { total_tokens: 10 },
      }),
    } as unknown as Response);

    const result = await getEmbeddings(["Arch Left"], config);
    expect(result.success).toBe(true);
    expect(result.embeddings.get("Arch Left")).toEqual(mockEmbedding);

    // Verify it's cached
    expect(getEmbeddingCacheSize()).toBe(1);
  });

  it("uses cache for repeated names", async () => {
    const mockEmbedding = [0.1, 0.2, 0.3];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ index: 0, embedding: mockEmbedding }],
        usage: { total_tokens: 10 },
      }),
    } as unknown as Response);

    // First call - should hit API
    await getEmbeddings(["Arch Left"], config);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const result2 = await getEmbeddings(["Arch Left"], config);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // no additional fetch
    expect(result2.success).toBe(true);
    expect(result2.embeddings.get("Arch Left")).toEqual(mockEmbedding);
    expect(result2.usage?.total_tokens).toBe(0); // cached = no tokens
  });

  it("handles API error gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("Internal error"),
    } as unknown as Response);

    const result = await getEmbeddings(["Arch Left"], config);
    expect(result.success).toBe(false);
    expect(result.error).toContain("500");
  });

  it("handles network error gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Connection refused"),
    );

    const result = await getEmbeddings(["Arch Left"], config);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Connection refused");
  });

  it("sends correct request format", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [
          { index: 0, embedding: [0.1] },
          { index: 1, embedding: [0.2] },
        ],
      }),
    } as unknown as Response);

    await getEmbeddings(["Arch Left", "Right Arch"], config);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/embeddings");

    const body = JSON.parse(options?.body as string);
    expect(body.model).toBe("text-embedding-3-small");
    expect(body.input).toHaveLength(2);
    // Input should be preprocessed
    expect(body.input[0]).toContain("xLights model:");
  });
});

// ─── computeSemanticScores ──────────────────────────────────────────

describe("computeSemanticScores", () => {
  const config: EmbeddingConfig = {
    apiKey: "test-key",
    timeoutMs: 5000,
  };

  beforeEach(() => {
    clearEmbeddingCache();
    vi.restoreAllMocks();
  });

  it("returns empty scores on API failure with no cache", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const result = await computeSemanticScores(["Source1"], ["Dest1"], config);
    expect(result.success).toBe(false);
    expect(result.scores).toEqual([]);
  });

  it("computes pairwise similarity scores", async () => {
    // Mock embedding that will produce known cosine similarity
    const embed1 = [1, 0, 0];
    const embed2 = [0, 1, 0];
    const embed3 = [1, 0, 0]; // same as embed1

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [
          { index: 0, embedding: embed1 },
          { index: 1, embedding: embed2 },
          { index: 2, embedding: embed3 },
        ],
      }),
    } as unknown as Response);

    const result = await computeSemanticScores(
      ["SourceA"],
      ["DestA", "DestB"],
      config,
    );

    expect(result.success).toBe(true);
    expect(result.scores.length).toBeGreaterThan(0);
  });
});
