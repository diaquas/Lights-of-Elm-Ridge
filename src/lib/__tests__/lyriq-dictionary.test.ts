import { describe, it, expect } from "vitest";
import {
  lookupExtended,
  graphemeToPhoneme,
  lookupWord,
  isInDictionary,
  getExtendedDictionarySize,
} from "@/lib/lyriq/dictionary";

describe("dictionary", () => {
  describe("lookupExtended", () => {
    it("finds common singing words", () => {
      expect(lookupExtended("gonna")).toEqual(["G", "AH", "N", "AH"]);
      expect(lookupExtended("wanna")).toEqual(["W", "AA", "N", "AH"]);
      expect(lookupExtended("gotta")).toEqual(["G", "AA", "T", "AH"]);
    });

    it("finds sung nonsense words", () => {
      expect(lookupExtended("ooh")).toEqual(["UW"]);
      expect(lookupExtended("whoa")).toEqual(["W", "OW"]);
      expect(lookupExtended("la")).toEqual(["L", "AA"]);
    });

    it("finds holiday words", () => {
      expect(lookupExtended("falala")).toEqual([
        "F",
        "AH",
        "L",
        "AH",
        "L",
        "AH",
      ]);
      expect(lookupExtended("rudolph")).toEqual([
        "R",
        "UW",
        "D",
        "AA",
        "L",
        "F",
      ]);
      expect(lookupExtended("noel")).toEqual(["N", "OW", "EH", "L"]);
    });

    it("is case-insensitive", () => {
      expect(lookupExtended("GONNA")).toEqual(lookupExtended("gonna"));
      expect(lookupExtended("Whoa")).toEqual(lookupExtended("whoa"));
    });

    it("returns null for unknown words", () => {
      expect(lookupExtended("supercalifragilistic")).toBeNull();
      expect(lookupExtended("xyzzyx")).toBeNull();
    });
  });

  describe("graphemeToPhoneme", () => {
    it("converts simple words", () => {
      const result = graphemeToPhoneme("cat");
      expect(result.length).toBeGreaterThan(0);
      // c→K, a→AE, t→T
      expect(result).toContain("K");
      expect(result).toContain("AE");
      expect(result).toContain("T");
    });

    it("handles multi-character patterns", () => {
      const result = graphemeToPhoneme("she");
      // sh→SH, e→(silent or EH)
      expect(result).toContain("SH");
    });

    it("handles empty string", () => {
      expect(graphemeToPhoneme("")).toEqual([]);
    });

    it("strips non-alpha characters", () => {
      const result = graphemeToPhoneme("don't");
      expect(result.length).toBeGreaterThan(0);
    });

    it("applies silent-e rule", () => {
      const withE = graphemeToPhoneme("made");
      const withoutE = graphemeToPhoneme("mad");
      // "made" should not end with an extra EH for the silent e
      expect(withE[withE.length - 1]).not.toBe("EH");
    });
  });

  describe("lookupWord", () => {
    it("returns extended dictionary entry when available", () => {
      const entry = lookupWord("gonna");
      expect(entry.word).toBe("gonna");
      expect(entry.phonemes).toEqual(["G", "AH", "N", "AH"]);
    });

    it("falls back to G2P for unknown words", () => {
      const entry = lookupWord("skedaddle");
      expect(entry.word).toBe("skedaddle");
      expect(entry.phonemes.length).toBeGreaterThan(0);
    });
  });

  describe("isInDictionary", () => {
    it("returns true for known words", () => {
      expect(isInDictionary("gonna")).toBe(true);
      expect(isInDictionary("whoa")).toBe(true);
    });

    it("returns false for unknown words", () => {
      expect(isInDictionary("flibbertigibbet")).toBe(false);
    });
  });

  describe("getExtendedDictionarySize", () => {
    it("returns a reasonable number of entries", () => {
      const size = getExtendedDictionarySize();
      expect(size).toBeGreaterThan(50);
      expect(size).toBeLessThan(500);
    });
  });
});
