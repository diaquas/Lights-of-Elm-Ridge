import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getAICapabilities,
  buildPipelineConfigFromEnv,
} from "../modiq/ai-pipeline";

// ─── getAICapabilities ──────────────────────────────────────────────

describe("getAICapabilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reports dictionary as always available", () => {
    const caps = getAICapabilities();
    expect(caps.dictionaryAvailable).toBe(true);
  });

  it("reports LLM as unavailable without API key", () => {
    delete process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    const caps = getAICapabilities();
    expect(caps.llmAvailable).toBe(false);
  });

  it("reports LLM as available with API key", () => {
    process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY = "test-key";
    const caps = getAICapabilities();
    expect(caps.llmAvailable).toBe(true);
  });

  it("reports embeddings as unavailable without API key", () => {
    delete process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const caps = getAICapabilities();
    expect(caps.embeddingsAvailable).toBe(false);
  });

  it("reports embeddings as available with API key", () => {
    process.env.NEXT_PUBLIC_OPENAI_API_KEY = "test-key";
    const caps = getAICapabilities();
    expect(caps.embeddingsAvailable).toBe(true);
  });
});

// ─── buildPipelineConfigFromEnv ─────────────────────────────────────

describe("buildPipelineConfigFromEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("enables dictionary by default", () => {
    const config = buildPipelineConfigFromEnv();
    expect(config.enableDictionary).toBe(true);
  });

  it("disables LLM when no API key is set", () => {
    delete process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    const config = buildPipelineConfigFromEnv();
    expect(config.enableLLM).toBe(false);
  });

  it("enables LLM and creates config when API key is set", () => {
    process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY = "sk-ant-test";
    const config = buildPipelineConfigFromEnv();
    expect(config.enableLLM).toBe(true);
    expect(config.llmConfig?.apiKey).toBe("sk-ant-test");
  });

  it("disables embeddings when no API key is set", () => {
    delete process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const config = buildPipelineConfigFromEnv();
    expect(config.enableEmbeddings).toBe(false);
  });

  it("enables embeddings and creates config when API key is set", () => {
    process.env.NEXT_PUBLIC_OPENAI_API_KEY = "sk-openai-test";
    const config = buildPipelineConfigFromEnv();
    expect(config.enableEmbeddings).toBe(true);
    expect(config.embeddingConfig?.apiKey).toBe("sk-openai-test");
  });

  it("respects explicit overrides", () => {
    process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY = "sk-ant-test";
    const config = buildPipelineConfigFromEnv({
      enableLLM: false,
      enableDictionary: false,
    });
    expect(config.enableLLM).toBe(false);
    expect(config.enableDictionary).toBe(false);
  });

  it("passes through vendor hint and folder path", () => {
    const config = buildPipelineConfigFromEnv({
      vendorHint: "Boscoyo Studio",
      folderPath: "/sequences/boscoyo/",
    });
    expect(config.vendorHint).toBe("Boscoyo Studio");
    expect(config.folderPath).toBe("/sequences/boscoyo/");
  });
});
