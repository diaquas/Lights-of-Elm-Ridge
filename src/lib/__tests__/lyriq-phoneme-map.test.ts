import { describe, it, expect } from "vitest";
import {
  toPrestonBlair,
  getPhonemeCategory,
  isVowel,
  stripStress,
  ARPABET_TO_PRESTON_BLAIR,
} from "@/lib/lyriq/phoneme-map";

describe("phoneme-map", () => {
  describe("stripStress", () => {
    it("removes trailing stress digits", () => {
      expect(stripStress("AA0")).toBe("AA");
      expect(stripStress("AA1")).toBe("AA");
      expect(stripStress("AA2")).toBe("AA");
      expect(stripStress("EY1")).toBe("EY");
    });

    it("leaves clean phonemes unchanged", () => {
      expect(stripStress("AA")).toBe("AA");
      expect(stripStress("SH")).toBe("SH");
      expect(stripStress("B")).toBe("B");
    });
  });

  describe("toPrestonBlair", () => {
    it("maps vowels to their Preston Blair codes", () => {
      expect(toPrestonBlair("AA")).toBe("AI");
      expect(toPrestonBlair("AE")).toBe("AI");
      expect(toPrestonBlair("AH")).toBe("AI");
      expect(toPrestonBlair("AY")).toBe("AI");
      expect(toPrestonBlair("AO")).toBe("O");
      expect(toPrestonBlair("OW")).toBe("O");
      expect(toPrestonBlair("EH")).toBe("E");
      expect(toPrestonBlair("IY")).toBe("E");
      expect(toPrestonBlair("UW")).toBe("U");
    });

    it("maps lip consonants to MBP", () => {
      expect(toPrestonBlair("M")).toBe("MBP");
      expect(toPrestonBlair("B")).toBe("MBP");
      expect(toPrestonBlair("P")).toBe("MBP");
    });

    it("maps F/V to FV", () => {
      expect(toPrestonBlair("F")).toBe("FV");
      expect(toPrestonBlair("V")).toBe("FV");
    });

    it("maps L to L", () => {
      expect(toPrestonBlair("L")).toBe("L");
    });

    it("maps W/WH to WQ", () => {
      expect(toPrestonBlair("W")).toBe("WQ");
      expect(toPrestonBlair("WH")).toBe("WQ");
    });

    it("maps remaining consonants to etc", () => {
      expect(toPrestonBlair("S")).toBe("etc");
      expect(toPrestonBlair("T")).toBe("etc");
      expect(toPrestonBlair("D")).toBe("etc");
      expect(toPrestonBlair("K")).toBe("etc");
      expect(toPrestonBlair("N")).toBe("etc");
      expect(toPrestonBlair("R")).toBe("etc");
    });

    it("handles stressed phonemes", () => {
      expect(toPrestonBlair("AA1")).toBe("AI");
      expect(toPrestonBlair("OW0")).toBe("O");
      expect(toPrestonBlair("IY2")).toBe("E");
    });

    it("returns 'etc' for unknown phonemes", () => {
      expect(toPrestonBlair("XX")).toBe("etc");
    });
  });

  describe("getPhonemeCategory", () => {
    it("identifies vowels", () => {
      expect(getPhonemeCategory("AA")).toBe("vowel");
      expect(getPhonemeCategory("IY")).toBe("vowel");
      expect(getPhonemeCategory("UW")).toBe("vowel");
    });

    it("identifies plosives", () => {
      expect(getPhonemeCategory("B")).toBe("plosive");
      expect(getPhonemeCategory("P")).toBe("plosive");
    });

    it("identifies fricatives", () => {
      expect(getPhonemeCategory("F")).toBe("fricative");
      expect(getPhonemeCategory("V")).toBe("fricative");
      expect(getPhonemeCategory("S")).toBe("fricative");
    });
  });

  describe("isVowel", () => {
    it("returns true for vowels", () => {
      expect(isVowel("AA")).toBe(true);
      expect(isVowel("EY")).toBe(true);
      expect(isVowel("UW")).toBe(true);
      expect(isVowel("OW1")).toBe(true);
    });

    it("returns false for consonants", () => {
      expect(isVowel("B")).toBe(false);
      expect(isVowel("S")).toBe(false);
      expect(isVowel("L")).toBe(false);
    });
  });

  describe("ARPABET_TO_PRESTON_BLAIR completeness", () => {
    it("has mappings for all standard ARPAbet phonemes", () => {
      const expectedCount = 15 + 25; // 15 vowels + 25 consonants (incl. WH)
      expect(Object.keys(ARPABET_TO_PRESTON_BLAIR).length).toBe(expectedCount);
    });

    it("every mapping has a valid Preston Blair code", () => {
      const validCodes = new Set([
        "AI",
        "O",
        "E",
        "U",
        "etc",
        "L",
        "WQ",
        "MBP",
        "FV",
        "rest",
      ]);

      for (const [phoneme, mapping] of Object.entries(
        ARPABET_TO_PRESTON_BLAIR,
      )) {
        expect(validCodes.has(mapping.prestonBlair)).toBe(true);
      }
    });
  });
});
