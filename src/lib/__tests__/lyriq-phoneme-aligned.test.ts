import { describe, it, expect } from "vitest";
import {
  processPhonemeAlignedWords,
  computeStats,
} from "@/lib/lyriq/lyrics-processor";
import type { PhonemeAlignedWord } from "@/lib/lyriq/lyrics-processor";

describe("processPhonemeAlignedWords", () => {
  it("produces a VocalTrack using phoneme timestamps from audio", () => {
    // "close" with phoneme-level timestamps from wav2vec2 CTC
    // K=5%, L=5%, OW=80%, Z=10% — as derived from actual audio
    const words: PhonemeAlignedWord[] = [
      {
        text: "close",
        startMs: 1000,
        endMs: 1400,
        confidence: 0.92,
        phonemes: [
          { phoneme: "K", startMs: 1000, endMs: 1020 },
          { phoneme: "L", startMs: 1020, endMs: 1040 },
          { phoneme: "OW", startMs: 1040, endMs: 1360 },
          { phoneme: "Z", startMs: 1360, endMs: 1400 },
        ],
      },
    ];

    const track = processPhonemeAlignedWords(words, "lead");

    expect(track.type).toBe("lead");
    expect(track.label).toBe("Lyrics (Lead)");
    expect(track.phrases).toHaveLength(1);

    const word = track.phrases[0].words[0];
    expect(word.text).toBe("close");
    expect(word.phonemes).toHaveLength(4);

    // Verify phoneme timestamps match the audio-derived values exactly
    expect(word.phonemes[0].arpabet).toBe("K");
    expect(word.phonemes[0].code).toBe("etc");
    expect(word.phonemes[0].startMs).toBe(1000);
    expect(word.phonemes[0].endMs).toBe(1020);

    expect(word.phonemes[1].arpabet).toBe("L");
    expect(word.phonemes[1].code).toBe("L");
    expect(word.phonemes[1].startMs).toBe(1020);
    expect(word.phonemes[1].endMs).toBe(1040);

    expect(word.phonemes[2].arpabet).toBe("OW");
    expect(word.phonemes[2].code).toBe("O");
    expect(word.phonemes[2].startMs).toBe(1040);
    expect(word.phonemes[2].endMs).toBe(1360);

    expect(word.phonemes[3].arpabet).toBe("Z");
    expect(word.phonemes[3].code).toBe("etc");
    expect(word.phonemes[3].startMs).toBe(1360);
    expect(word.phonemes[3].endMs).toBe(1400);

    // OW should dominate — 80% of the word (320ms / 400ms)
    const owDuration = word.phonemes[2].endMs - word.phonemes[2].startMs;
    expect(owDuration).toBe(320);
    expect(owDuration / 400).toBe(0.8);
  });

  it("maps Preston Blair codes correctly from audio phonemes", () => {
    const words: PhonemeAlignedWord[] = [
      {
        text: "my",
        startMs: 0,
        endMs: 500,
        confidence: 0.9,
        phonemes: [
          { phoneme: "M", startMs: 0, endMs: 80 },
          { phoneme: "AY", startMs: 80, endMs: 500 },
        ],
      },
    ];

    const track = processPhonemeAlignedWords(words, "lead");
    const phonemes = track.phrases[0].words[0].phonemes;

    expect(phonemes[0].code).toBe("MBP"); // M → lips pressed
    expect(phonemes[1].code).toBe("AI"); // AY → wide open jaw
  });

  it("groups words into phrases using silence gaps", () => {
    const words: PhonemeAlignedWord[] = [
      {
        text: "jingle",
        startMs: 2400,
        endMs: 3100,
        confidence: 0.9,
        phonemes: [
          { phoneme: "JH", startMs: 2400, endMs: 2550 },
          { phoneme: "IH", startMs: 2550, endMs: 2750 },
          { phoneme: "NG", startMs: 2750, endMs: 2850 },
          { phoneme: "G", startMs: 2850, endMs: 2920 },
          { phoneme: "AH", startMs: 2920, endMs: 3020 },
          { phoneme: "L", startMs: 3020, endMs: 3100 },
        ],
      },
      {
        text: "bells",
        startMs: 3130,
        endMs: 3800,
        confidence: 0.9,
        phonemes: [
          { phoneme: "B", startMs: 3130, endMs: 3200 },
          { phoneme: "EH", startMs: 3200, endMs: 3550 },
          { phoneme: "L", startMs: 3550, endMs: 3650 },
          { phoneme: "Z", startMs: 3650, endMs: 3800 },
        ],
      },
      // 500ms gap → new phrase
      {
        text: "jingle",
        startMs: 4300,
        endMs: 5000,
        confidence: 0.9,
        phonemes: [
          { phoneme: "JH", startMs: 4300, endMs: 4450 },
          { phoneme: "IH", startMs: 4450, endMs: 4650 },
          { phoneme: "NG", startMs: 4650, endMs: 4750 },
          { phoneme: "G", startMs: 4750, endMs: 4820 },
          { phoneme: "AH", startMs: 4820, endMs: 4920 },
          { phoneme: "L", startMs: 4920, endMs: 5000 },
        ],
      },
    ];

    const track = processPhonemeAlignedWords(words, "lead");
    expect(track.phrases).toHaveLength(2);
    expect(track.phrases[0].words).toHaveLength(2);
    expect(track.phrases[1].words).toHaveLength(1);
  });

  it("preserves non-uniform phoneme durations from audio", () => {
    // Real-world scenario: singer holds the vowel much longer
    // than the consonants in "go"
    const words: PhonemeAlignedWord[] = [
      {
        text: "go",
        startMs: 0,
        endMs: 2000,
        confidence: 0.95,
        phonemes: [
          { phoneme: "G", startMs: 0, endMs: 40 }, // 2% of word
          { phoneme: "OW", startMs: 40, endMs: 2000 }, // 98% — held note
        ],
      },
    ];

    const track = processPhonemeAlignedWords(words, "lead");
    const phonemes = track.phrases[0].words[0].phonemes;

    // The audio-derived timing should be preserved exactly
    const gDuration = phonemes[0].endMs - phonemes[0].startMs;
    const owDuration = phonemes[1].endMs - phonemes[1].startMs;

    expect(gDuration).toBe(40);
    expect(owDuration).toBe(1960);
    // This is the key insight: OW gets 98% because that's what was
    // actually sung. The heuristic model would give OW only ~55-75%.
    expect(owDuration / 2000).toBeGreaterThan(0.95);
  });

  it("computes stats correctly for phoneme-aligned tracks", () => {
    const words: PhonemeAlignedWord[] = [
      {
        text: "gonna",
        startMs: 0,
        endMs: 500,
        confidence: 0.9,
        phonemes: [
          { phoneme: "G", startMs: 0, endMs: 60 },
          { phoneme: "AH", startMs: 60, endMs: 200 },
          { phoneme: "N", startMs: 200, endMs: 300 },
          { phoneme: "AH", startMs: 300, endMs: 500 },
        ],
      },
      {
        text: "rock",
        startMs: 500,
        endMs: 1000,
        confidence: 0.3,
        phonemes: [
          { phoneme: "R", startMs: 500, endMs: 580 },
          { phoneme: "AA", startMs: 580, endMs: 900 },
          { phoneme: "K", startMs: 900, endMs: 1000 },
        ],
      },
    ];

    const track = processPhonemeAlignedWords(words, "lead");
    const stats = computeStats([track]);

    expect(stats.totalWords).toBe(2);
    expect(stats.totalPhonemes).toBe(7); // 4 + 3
    expect(stats.flaggedWords).toBe(1); // "rock" confidence < 0.5
  });

  it("handles background vocal type", () => {
    const words: PhonemeAlignedWord[] = [
      {
        text: "ooh",
        startMs: 0,
        endMs: 3000,
        confidence: 0.7,
        phonemes: [{ phoneme: "UW", startMs: 0, endMs: 3000 }],
      },
    ];

    const track = processPhonemeAlignedWords(words, "background");
    expect(track.type).toBe("background");
    expect(track.label).toBe("Lyrics (Background)");
  });
});
