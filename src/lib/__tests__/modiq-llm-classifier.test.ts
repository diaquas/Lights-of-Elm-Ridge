import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  classifyAmbiguousPairs,
  mapLLMResultsToConfidence,
  type AmbiguousPair,
  type LLMClassifierConfig,
} from "../modiq/llm-classifier";

// ─── mapLLMResultsToConfidence ──────────────────────────────────────

describe("mapLLMResultsToConfidence", () => {
  it("upgrades to HIGH when match=true and confidence >= 0.7", () => {
    const results = mapLLMResultsToConfidence([
      {
        index: 0,
        match: true,
        confidence: 0.92,
        reasoning: "Same spinner prop",
      },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].newConfidence).toBe("high");
    expect(results[0].source).toBe("llm_confirmed");
  });

  it("keeps MEDIUM when match=true and confidence 0.4–0.7", () => {
    const results = mapLLMResultsToConfidence([
      {
        index: 0,
        match: true,
        confidence: 0.55,
        reasoning: "Possibly same arch",
      },
    ]);
    expect(results[0].newConfidence).toBe("medium");
    expect(results[0].source).toBe("llm_tentative");
  });

  it("downgrades to LOW when match=false", () => {
    const results = mapLLMResultsToConfidence([
      {
        index: 0,
        match: false,
        confidence: 0.2,
        reasoning: "Different prop types",
      },
    ]);
    expect(results[0].newConfidence).toBe("low");
    expect(results[0].source).toBe("llm_rejected");
  });

  it("downgrades to LOW when match=true but confidence < 0.4", () => {
    const results = mapLLMResultsToConfidence([
      { index: 0, match: true, confidence: 0.3, reasoning: "Very uncertain" },
    ]);
    expect(results[0].newConfidence).toBe("low");
    expect(results[0].source).toBe("llm_rejected");
  });

  it("handles multiple results with mixed classifications", () => {
    const results = mapLLMResultsToConfidence([
      { index: 0, match: true, confidence: 0.95, reasoning: "Exact match" },
      { index: 1, match: true, confidence: 0.5, reasoning: "Maybe" },
      { index: 2, match: false, confidence: 0.1, reasoning: "No match" },
    ]);
    expect(results[0].newConfidence).toBe("high");
    expect(results[1].newConfidence).toBe("medium");
    expect(results[2].newConfidence).toBe("low");
  });

  it("clamps confidence values to 0–1", () => {
    // classifyAmbiguousPairs clamps, but mapLLMResultsToConfidence
    // should handle edge cases too
    const results = mapLLMResultsToConfidence([
      { index: 0, match: true, confidence: 1.0, reasoning: "Perfect" },
      { index: 1, match: false, confidence: 0.0, reasoning: "None" },
    ]);
    expect(results[0].newConfidence).toBe("high");
    expect(results[1].newConfidence).toBe("low");
  });

  it("preserves reasoning text in output", () => {
    const results = mapLLMResultsToConfidence([
      {
        index: 5,
        match: true,
        confidence: 0.88,
        reasoning: "Both are 16-strand mega trees with matching pixel counts",
      },
    ]);
    expect(results[0].reasoning).toBe(
      "Both are 16-strand mega trees with matching pixel counts",
    );
    expect(results[0].index).toBe(5);
  });
});

// ─── classifyAmbiguousPairs ─────────────────────────────────────────

describe("classifyAmbiguousPairs", () => {
  const config: LLMClassifierConfig = {
    apiKey: "test-key",
    model: "claude-sonnet-4-20250514",
    timeoutMs: 5000,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty results for empty pairs", async () => {
    const result = await classifyAmbiguousPairs([], config);
    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
  });

  it("handles successful API response", async () => {
    const pairs: AmbiguousPair[] = [
      {
        index: 0,
        source_name: "SP_CW_16_Arm_01",
        source_type: "model",
        source_pixels: 50,
        source_parent: null,
        dest_name: "Spinner Clockwise Arm 1",
        dest_type: "model",
        dest_pixels: 50,
        dest_parent: null,
      },
    ];

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify([
              {
                pair: 1,
                match: true,
                confidence: 0.95,
                reasoning: "SP_CW = Spinner Clockwise, Arm_01 = Arm 1",
              },
            ]),
          },
        ],
        usage: { input_tokens: 200, output_tokens: 100 },
      }),
      text: vi.fn(),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse as unknown as Response,
    );

    const result = await classifyAmbiguousPairs(pairs, config);
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].match).toBe(true);
    expect(result.results[0].confidence).toBe(0.95);
    expect(result.usage?.input_tokens).toBe(200);
  });

  it("handles API error gracefully", async () => {
    const pairs: AmbiguousPair[] = [
      {
        index: 0,
        source_name: "TestModel",
        source_type: "model",
        source_pixels: null,
        source_parent: null,
        dest_name: "OtherModel",
        dest_type: "model",
        dest_pixels: null,
        dest_parent: null,
      },
    ];

    const mockResponse = {
      ok: false,
      status: 429,
      text: vi.fn().mockResolvedValue("Rate limited"),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse as unknown as Response,
    );

    const result = await classifyAmbiguousPairs(pairs, config);
    expect(result.success).toBe(false);
    expect(result.error).toContain("429");
    expect(result.results).toEqual([]);
  });

  it("handles network error gracefully", async () => {
    const pairs: AmbiguousPair[] = [
      {
        index: 0,
        source_name: "TestModel",
        source_type: "model",
        source_pixels: null,
        source_parent: null,
        dest_name: "OtherModel",
        dest_type: "model",
        dest_pixels: null,
        dest_parent: null,
      },
    ];

    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Network failure"),
    );

    const result = await classifyAmbiguousPairs(pairs, config);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Network failure");
    expect(result.results).toEqual([]);
  });

  it("handles markdown-wrapped JSON response", async () => {
    const pairs: AmbiguousPair[] = [
      {
        index: 0,
        source_name: "Arch_L",
        source_type: "model",
        source_pixels: 100,
        source_parent: null,
        dest_name: "Left Arch",
        dest_type: "model",
        dest_pixels: 100,
        dest_parent: null,
      },
    ];

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: '```json\n[{"pair": 1, "match": true, "confidence": 0.88, "reasoning": "Same arch"}]\n```',
          },
        ],
      }),
      text: vi.fn(),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse as unknown as Response,
    );

    const result = await classifyAmbiguousPairs(pairs, config);
    expect(result.success).toBe(true);
    expect(result.results[0].match).toBe(true);
  });

  it("sends correct API request format", async () => {
    const pairs: AmbiguousPair[] = [
      {
        index: 0,
        source_name: "MegaTree_180",
        source_type: "model",
        source_pixels: 2880,
        source_parent: null,
        dest_name: "Mega Tree 16 Strand",
        dest_type: "model",
        dest_pixels: 2880,
        dest_parent: null,
      },
    ];

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: '[{"pair": 1, "match": true, "confidence": 0.9, "reasoning": "Same tree"}]',
          },
        ],
      }),
    } as unknown as Response);

    await classifyAmbiguousPairs(pairs, config);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(options?.method).toBe("POST");

    const body = JSON.parse(options?.body as string);
    expect(body.model).toBe("claude-sonnet-4-20250514");
    expect(body.system).toContain("xLights");
    expect(body.messages[0].content).toContain("MegaTree_180");
  });
});
