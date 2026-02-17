import { describe, it, expect } from "vitest";
import {
  detectPhrases,
  processAlignedWords,
  computeStats,
  splitLyricsIntoLines,
  tokenizeWords,
} from "@/lib/lyriq/lyrics-processor";
import type { AlignedWord } from "@/lib/lyriq/lyrics-processor";

describe("lyrics-processor", () => {
  describe("detectPhrases", () => {
    it("groups words with small gaps into one phrase", () => {
      const words: AlignedWord[] = [
        { text: "jingle", startMs: 2400, endMs: 3100, confidence: 0.9 },
        { text: "bells", startMs: 3130, endMs: 3800, confidence: 0.9 },
      ];

      const phrases = detectPhrases(words);
      expect(phrases).toHaveLength(1);
      expect(phrases[0].text).toBe("jingle bells");
      expect(phrases[0].startMs).toBe(2400);
      expect(phrases[0].endMs).toBe(3800);
    });

    it("splits into multiple phrases at large gaps", () => {
      const words: AlignedWord[] = [
        { text: "jingle", startMs: 2400, endMs: 3100, confidence: 0.9 },
        { text: "bells", startMs: 3130, endMs: 3800, confidence: 0.9 },
        // 500ms gap → new phrase
        { text: "jingle", startMs: 4300, endMs: 5000, confidence: 0.9 },
        { text: "all", startMs: 5030, endMs: 5300, confidence: 0.9 },
      ];

      const phrases = detectPhrases(words);
      expect(phrases).toHaveLength(2);
      expect(phrases[0].words).toHaveLength(2);
      expect(phrases[1].words).toHaveLength(2);
    });

    it("returns empty for no words", () => {
      expect(detectPhrases([])).toHaveLength(0);
    });

    it("handles a single word", () => {
      const words: AlignedWord[] = [
        { text: "hey", startMs: 1000, endMs: 1500, confidence: 0.8 },
      ];
      const phrases = detectPhrases(words);
      expect(phrases).toHaveLength(1);
      expect(phrases[0].text).toBe("hey");
    });
  });

  describe("processAlignedWords", () => {
    it("produces a VocalTrack with phrases, words, and phonemes", () => {
      const words: AlignedWord[] = [
        { text: "gonna", startMs: 1000, endMs: 1500, confidence: 0.95 },
        { text: "rock", startMs: 1530, endMs: 2000, confidence: 0.88 },
      ];

      const track = processAlignedWords(words, "lead");

      expect(track.type).toBe("lead");
      expect(track.label).toBe("Lyrics (Lead)");
      expect(track.phrases.length).toBeGreaterThan(0);

      // First phrase should contain both words
      const phrase = track.phrases[0];
      expect(phrase.words).toHaveLength(2);

      // Each word should have phonemes
      for (const word of phrase.words) {
        expect(word.phonemes.length).toBeGreaterThan(0);
        // Phonemes should tile the word duration
        expect(word.phonemes[0].startMs).toBe(word.startMs);
        expect(word.phonemes[word.phonemes.length - 1].endMs).toBe(word.endMs);
      }
    });

    it("uses correct label for background vocals", () => {
      const words: AlignedWord[] = [
        { text: "ooh", startMs: 0, endMs: 2000, confidence: 0.7 },
      ];
      const track = processAlignedWords(words, "background");
      expect(track.label).toBe("Lyrics (Background)");
    });

    it("marks extended dictionary words correctly", () => {
      const words: AlignedWord[] = [
        { text: "gonna", startMs: 0, endMs: 500, confidence: 0.9 },
        { text: "xyzzyx", startMs: 500, endMs: 1000, confidence: 0.5 },
      ];

      const track = processAlignedWords(words, "lead");
      const gonnaWord = track.phrases[0].words[0];
      const unknownWord = track.phrases[0].words[1];

      expect(gonnaWord.inDictionary).toBe(true);
      expect(unknownWord.inDictionary).toBe(false);
    });
  });

  describe("computeStats", () => {
    it("counts words, phonemes, and flags correctly", () => {
      const words: AlignedWord[] = [
        { text: "gonna", startMs: 0, endMs: 500, confidence: 0.9 },
        { text: "rock", startMs: 500, endMs: 1000, confidence: 0.3 },
      ];

      const track = processAlignedWords(words, "lead");
      const stats = computeStats([track]);

      expect(stats.totalWords).toBe(2);
      expect(stats.totalPhonemes).toBeGreaterThan(0);
      expect(stats.flaggedWords).toBe(1); // "rock" confidence < 0.5
    });
  });

  describe("splitLyricsIntoLines", () => {
    it("splits on newlines and filters empty lines", () => {
      const text = "jingle bells\njingle bells\n\njingle all the way";
      const lines = splitLyricsIntoLines(text);
      expect(lines).toEqual([
        "jingle bells",
        "jingle bells",
        "jingle all the way",
      ]);
    });

    it("trims whitespace", () => {
      const lines = splitLyricsIntoLines("  hello  \n  world  ");
      expect(lines).toEqual(["hello", "world"]);
    });
  });

  describe("tokenizeWords", () => {
    it("splits on whitespace", () => {
      expect(tokenizeWords("hello world")).toEqual(["hello", "world"]);
    });

    it("strips punctuation", () => {
      expect(tokenizeWords("hello, world!")).toEqual(["hello", "world"]);
    });

    it("preserves apostrophes", () => {
      expect(tokenizeWords("don't stop")).toEqual(["don't", "stop"]);
    });
  });
});
