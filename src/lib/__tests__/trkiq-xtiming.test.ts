import { describe, it, expect } from "vitest";
import {
  generateCombinedXtiming,
  buildTrkiqFilename,
} from "@/lib/trkiq/xtiming-export";
import type { BeatTrack } from "@/lib/beatiq/types";
import type { VocalTrack } from "@/lib/lyriq/types";

const SAMPLE_BEAT: BeatTrack = {
  id: "kick",
  name: "Drums \u2014 Kick",
  category: "drums",
  enabled: true,
  marks: [
    { timeMs: 500, strength: 1.0 },
    { timeMs: 1000, strength: 0.8 },
  ],
};

const SAMPLE_SECTIONS: BeatTrack = {
  id: "sections",
  name: "Song Sections",
  category: "structure",
  enabled: true,
  marks: [],
  labeledMarks: [
    { label: "intro", startMs: 0, endMs: 10000 },
    { label: "verse", startMs: 10000, endMs: 30000 },
  ],
};

const SAMPLE_VOCAL: VocalTrack = {
  type: "lead",
  label: "Lyrics (Lead)",
  phrases: [
    {
      text: "hello world",
      startMs: 1000,
      endMs: 2000,
      words: [
        {
          text: "hello",
          startMs: 1000,
          endMs: 1400,
          confidence: 0.9,
          inDictionary: true,
          phonemes: [
            {
              code: "MBP",
              arpabet: "HH",
              startMs: 1000,
              endMs: 1100,
              category: "fricative",
            },
            {
              code: "E",
              arpabet: "EH",
              startMs: 1100,
              endMs: 1250,
              category: "vowel",
            },
            {
              code: "L",
              arpabet: "L",
              startMs: 1250,
              endMs: 1350,
              category: "liquid",
            },
            {
              code: "O",
              arpabet: "OW",
              startMs: 1350,
              endMs: 1400,
              category: "vowel",
            },
          ],
        },
        {
          text: "world",
          startMs: 1500,
          endMs: 2000,
          confidence: 0.85,
          inDictionary: true,
          phonemes: [
            {
              code: "WQ",
              arpabet: "W",
              startMs: 1500,
              endMs: 1600,
              category: "glide",
            },
            {
              code: "etc",
              arpabet: "ER",
              startMs: 1600,
              endMs: 1800,
              category: "vowel",
            },
            {
              code: "L",
              arpabet: "L",
              startMs: 1800,
              endMs: 1900,
              category: "liquid",
            },
            {
              code: "etc",
              arpabet: "D",
              startMs: 1900,
              endMs: 2000,
              category: "stop",
            },
          ],
        },
      ],
    },
  ],
};

describe("trkiq xtiming-export", () => {
  describe("generateCombinedXtiming", () => {
    it("combines beat tracks and vocal tracks in one file", () => {
      const xml = generateCombinedXtiming([SAMPLE_BEAT], [SAMPLE_VOCAL]);
      expect(xml).toContain("<timings>");
      expect(xml).toContain("</timings>");
      expect(xml).toContain('name="Drums');
      expect(xml).toContain('name="Lyrics (Lead)"');
    });

    it("generates correct number of timing elements", () => {
      const xml = generateCombinedXtiming(
        [SAMPLE_BEAT, SAMPLE_SECTIONS],
        [SAMPLE_VOCAL],
      );
      const timingCount = (xml.match(/<timing /g) || []).length;
      expect(timingCount).toBe(3); // kick + sections + vocals
    });

    it("generates 3 EffectLayers for vocal tracks", () => {
      const xml = generateCombinedXtiming([], [SAMPLE_VOCAL]);
      // The vocal timing should have 3 layers: phrases, words, phonemes
      const layerCount = (xml.match(/<EffectLayer>/g) || []).length;
      expect(layerCount).toBe(3);
    });

    it("generates 1 EffectLayer for beat tracks", () => {
      const xml = generateCombinedXtiming([SAMPLE_BEAT], []);
      const layerCount = (xml.match(/<EffectLayer>/g) || []).length;
      expect(layerCount).toBe(1);
    });

    it("includes phrases, words, and phonemes from vocal tracks", () => {
      const xml = generateCombinedXtiming([], [SAMPLE_VOCAL]);
      // Phrase
      expect(xml).toContain('label="hello world"');
      // Words (uppercased per xLights convention)
      expect(xml).toContain('label="HELLO"');
      expect(xml).toContain('label="WORLD"');
      // Phonemes
      expect(xml).toContain('label="MBP"');
      expect(xml).toContain('label="E"');
      expect(xml).toContain('label="WQ"');
    });

    it("includes labeled marks from beat tracks", () => {
      const xml = generateCombinedXtiming([SAMPLE_SECTIONS], []);
      expect(xml).toContain('label="intro"');
      expect(xml).toContain('label="verse"');
    });

    it("excludes disabled beat tracks", () => {
      const disabled = { ...SAMPLE_BEAT, enabled: false };
      const xml = generateCombinedXtiming([disabled], [SAMPLE_VOCAL]);
      expect(xml).not.toContain("Drums");
      expect(xml).toContain("Lyrics");
    });

    it("returns empty string for no tracks", () => {
      expect(generateCombinedXtiming([], [])).toBe("");
    });

    it("uses integer timestamps", () => {
      const xml = generateCombinedXtiming([SAMPLE_BEAT], [SAMPLE_VOCAL]);
      const times = xml.match(/(?:start|end)time="([^"]+)"/g) || [];
      for (const t of times) {
        const value = t.match(/"([^"]+)"/)?.[1];
        expect(value).toMatch(/^\d+$/);
      }
    });
  });

  describe("buildTrkiqFilename", () => {
    it("produces a clean filename with TrkIQ suffix", () => {
      const name = buildTrkiqFilename(
        "Trans-Siberian Orchestra",
        "Wizards in Winter",
      );
      expect(name).toBe("TransSiberianOrchestra_WizardsinWinter_TrkIQ.xtiming");
    });

    it("strips special characters", () => {
      const name = buildTrkiqFilename(
        "Mannheim Steamroller",
        "Deck the Halls!",
      );
      expect(name).toBe("MannheimSteamroller_DecktheHalls_TrkIQ.xtiming");
    });
  });
});
