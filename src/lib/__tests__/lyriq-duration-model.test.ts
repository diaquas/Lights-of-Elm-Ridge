import { describe, it, expect } from "vitest";
import {
  distributePhonemes,
  DEFAULT_DURATION_CONFIG,
} from "@/lib/lyriq/duration-model";

describe("duration-model", () => {
  describe("distributePhonemes", () => {
    it("gives the full word to a single phoneme", () => {
      const result = distributePhonemes(["AA1"], 1000, 1500);
      expect(result).toHaveLength(1);
      expect(result[0].startMs).toBe(1000);
      expect(result[0].endMs).toBe(1500);
      expect(result[0].code).toBe("AI");
    });

    it("returns empty for empty tokens", () => {
      expect(distributePhonemes([], 0, 500)).toHaveLength(0);
    });

    it("returns empty for zero-length word", () => {
      expect(distributePhonemes(["AA1"], 500, 500)).toHaveLength(0);
    });

    it("distributes 'close' (K L OW Z) with vowel dominance", () => {
      // K=etc, L=liquid, OW=vowel, Z=fricative
      const result = distributePhonemes(["K", "L", "OW1", "Z"], 0, 400);

      expect(result).toHaveLength(4);

      // Verify contiguous tiling
      expect(result[0].startMs).toBe(0);
      expect(result[3].endMs).toBe(400);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].startMs).toBe(result[i - 1].endMs);
      }

      // Vowel (OW) should get the most time
      const vowelDuration = result[2].endMs - result[2].startMs;
      const totalDuration = 400;
      expect(vowelDuration / totalDuration).toBeGreaterThan(0.4);

      // K (stop) should be short
      const kDuration = result[0].endMs - result[0].startMs;
      expect(kDuration).toBeLessThan(100);
    });

    it("handles all-consonant words", () => {
      // "shh" → SH
      const result = distributePhonemes(["SH", "T"], 0, 200);
      expect(result).toHaveLength(2);
      expect(result[0].startMs).toBe(0);
      expect(result[1].endMs).toBe(200);
    });

    it("tiles phonemes contiguously with no gaps", () => {
      const tokens = ["JH", "IH1", "NG", "G", "AH0", "L"];
      const result = distributePhonemes(tokens, 2400, 3100);

      expect(result).toHaveLength(6);
      expect(result[0].startMs).toBe(2400);
      expect(result[5].endMs).toBe(3100);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].startMs).toBe(result[i - 1].endMs);
      }
    });

    it("gives vowels more time than consonants in 'bells' (B EH L Z)", () => {
      const result = distributePhonemes(["B", "EH1", "L", "Z"], 3100, 3800);

      const bDur = result[0].endMs - result[0].startMs;
      const ehDur = result[1].endMs - result[1].startMs;
      const lDur = result[2].endMs - result[2].startMs;
      const zDur = result[3].endMs - result[3].startMs;

      // The vowel EH should dominate
      expect(ehDur).toBeGreaterThan(bDur);
      expect(ehDur).toBeGreaterThan(lDur);
      expect(ehDur).toBeGreaterThan(zDur);
    });

    it("handles multiple vowels (diphthong-like)", () => {
      // "away" → AH W EY
      const result = distributePhonemes(["AH0", "W", "EY1"], 0, 600);
      expect(result).toHaveLength(3);

      const ah = result[0].endMs - result[0].startMs;
      const w = result[1].endMs - result[1].startMs;
      const ey = result[2].endMs - result[2].startMs;

      // Both vowels should be longer than the glide
      expect(ah).toBeGreaterThan(w);
      expect(ey).toBeGreaterThan(w);
    });

    it("handles very short words without crashing", () => {
      // 30ms word — consonants may exceed their base durations
      const result = distributePhonemes(["K", "AE1", "T"], 0, 30);
      expect(result).toHaveLength(3);
      expect(result[0].startMs).toBe(0);
      expect(result[2].endMs).toBe(30);
    });

    it("maps Preston Blair codes correctly", () => {
      const result = distributePhonemes(["M", "EH1", "R", "IY0"], 0, 500);

      expect(result[0].code).toBe("MBP"); // M
      expect(result[1].code).toBe("E"); // EH
      expect(result[2].code).toBe("etc"); // R
      expect(result[3].code).toBe("E"); // IY
    });
  });

  describe("DEFAULT_DURATION_CONFIG", () => {
    it("has vowel share config", () => {
      expect(DEFAULT_DURATION_CONFIG.vowel.shareOfWord.min).toBeGreaterThan(0);
      expect(DEFAULT_DURATION_CONFIG.vowel.shareOfWord.max).toBeLessThanOrEqual(
        1,
      );
    });

    it("has all consonant categories with valid ranges", () => {
      const categories = [
        "plosive",
        "fricative",
        "liquid",
        "glide",
        "nasal",
        "stop",
      ] as const;
      for (const cat of categories) {
        const range = DEFAULT_DURATION_CONFIG[cat];
        expect(range.minMs).toBeGreaterThan(0);
        expect(range.maxMs).toBeGreaterThan(range.minMs);
      }
    });
  });
});
