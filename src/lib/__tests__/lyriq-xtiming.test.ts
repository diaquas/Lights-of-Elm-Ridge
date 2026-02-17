import { describe, it, expect } from "vitest";
import {
  generateXtiming,
  generateMultiTrackXtiming,
  buildXtimingFilename,
} from "@/lib/lyriq/xtiming-generator";
import type { VocalTrack } from "@/lib/lyriq/types";

const SAMPLE_TRACK: VocalTrack = {
  type: "lead",
  label: "Lyrics (Lead)",
  phrases: [
    {
      text: "jingle bells jingle bells",
      startMs: 2400,
      endMs: 5200,
      words: [
        {
          text: "jingle",
          startMs: 2400,
          endMs: 3100,
          confidence: 0.95,
          inDictionary: true,
          phonemes: [
            {
              code: "etc",
              arpabet: "JH",
              startMs: 2400,
              endMs: 2480,
              category: "stop",
            },
            {
              code: "AI",
              arpabet: "IH",
              startMs: 2480,
              endMs: 2900,
              category: "vowel",
            },
            {
              code: "etc",
              arpabet: "NG",
              startMs: 2900,
              endMs: 2970,
              category: "nasal",
            },
            {
              code: "etc",
              arpabet: "G",
              startMs: 2970,
              endMs: 3020,
              category: "stop",
            },
            {
              code: "L",
              arpabet: "L",
              startMs: 3020,
              endMs: 3100,
              category: "liquid",
            },
          ],
        },
        {
          text: "bells",
          startMs: 3100,
          endMs: 3800,
          confidence: 0.92,
          inDictionary: true,
          phonemes: [
            {
              code: "MBP",
              arpabet: "B",
              startMs: 3100,
              endMs: 3170,
              category: "plosive",
            },
            {
              code: "E",
              arpabet: "EH",
              startMs: 3170,
              endMs: 3600,
              category: "vowel",
            },
            {
              code: "L",
              arpabet: "L",
              startMs: 3600,
              endMs: 3700,
              category: "liquid",
            },
            {
              code: "etc",
              arpabet: "Z",
              startMs: 3700,
              endMs: 3800,
              category: "fricative",
            },
          ],
        },
        {
          text: "jingle",
          startMs: 3800,
          endMs: 4500,
          confidence: 0.93,
          inDictionary: true,
          phonemes: [
            {
              code: "etc",
              arpabet: "JH",
              startMs: 3800,
              endMs: 3880,
              category: "stop",
            },
            {
              code: "AI",
              arpabet: "IH",
              startMs: 3880,
              endMs: 4300,
              category: "vowel",
            },
            {
              code: "etc",
              arpabet: "NG",
              startMs: 4300,
              endMs: 4370,
              category: "nasal",
            },
            {
              code: "etc",
              arpabet: "G",
              startMs: 4370,
              endMs: 4420,
              category: "stop",
            },
            {
              code: "L",
              arpabet: "L",
              startMs: 4420,
              endMs: 4500,
              category: "liquid",
            },
          ],
        },
        {
          text: "bells",
          startMs: 4500,
          endMs: 5200,
          confidence: 0.91,
          inDictionary: true,
          phonemes: [
            {
              code: "MBP",
              arpabet: "B",
              startMs: 4500,
              endMs: 4570,
              category: "plosive",
            },
            {
              code: "E",
              arpabet: "EH",
              startMs: 4570,
              endMs: 5000,
              category: "vowel",
            },
            {
              code: "L",
              arpabet: "L",
              startMs: 5000,
              endMs: 5100,
              category: "liquid",
            },
            {
              code: "etc",
              arpabet: "Z",
              startMs: 5100,
              endMs: 5200,
              category: "fricative",
            },
          ],
        },
      ],
    },
  ],
};

describe("xtiming-generator", () => {
  describe("generateXtiming", () => {
    it("produces valid XML with correct structure", () => {
      const xml = generateXtiming(SAMPLE_TRACK);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<timing offset="0" name="Lyrics (Lead)"');
      expect(xml).toContain("SourceVersion=");
    });

    it("has exactly 3 EffectLayer elements", () => {
      const xml = generateXtiming(SAMPLE_TRACK);
      const layerCount = (xml.match(/<EffectLayer>/g) || []).length;
      expect(layerCount).toBe(3);
    });

    it("includes phrase-level effects in layer 0", () => {
      const xml = generateXtiming(SAMPLE_TRACK);
      expect(xml).toContain(
        'label="jingle bells jingle bells" starttime="2400" endtime="5200"',
      );
    });

    it("includes word-level effects in layer 1", () => {
      const xml = generateXtiming(SAMPLE_TRACK);
      expect(xml).toContain('label="jingle" starttime="2400" endtime="3100"');
      expect(xml).toContain('label="bells" starttime="3100" endtime="3800"');
    });

    it("includes phoneme-level effects in layer 2", () => {
      const xml = generateXtiming(SAMPLE_TRACK);
      expect(xml).toContain('label="etc" starttime="2400" endtime="2480"');
      expect(xml).toContain('label="MBP" starttime="3100" endtime="3170"');
      expect(xml).toContain('label="E" starttime="3170" endtime="3600"');
    });

    it("uses integer millisecond values", () => {
      const xml = generateXtiming(SAMPLE_TRACK);
      // All startTime and endTime should be integers (no decimal points)
      const times = xml.match(/(?:start|end)time="([^"]+)"/g) || [];
      for (const t of times) {
        const value = t.match(/"([^"]+)"/)?.[1];
        expect(value).toMatch(/^\d+$/);
      }
    });

    it("escapes XML special characters", () => {
      const track: VocalTrack = {
        type: "lead",
        label: "Lyrics & <Lead>",
        phrases: [
          {
            text: 'rock & roll "yeah"',
            startMs: 0,
            endMs: 1000,
            words: [],
          },
        ],
      };
      const xml = generateXtiming(track);
      expect(xml).toContain("Lyrics &amp; &lt;Lead&gt;");
      expect(xml).toContain("rock &amp; roll &quot;yeah&quot;");
    });
  });

  describe("generateMultiTrackXtiming", () => {
    it("wraps multiple tracks in <timings> root", () => {
      const xml = generateMultiTrackXtiming([SAMPLE_TRACK]);
      expect(xml).toContain("<timings>");
      expect(xml).toContain("</timings>");
    });

    it("includes all tracks", () => {
      const bgTrack: VocalTrack = {
        ...SAMPLE_TRACK,
        type: "background",
        label: "Lyrics (Background)",
      };
      const xml = generateMultiTrackXtiming([SAMPLE_TRACK, bgTrack]);
      expect(xml).toContain('name="Lyrics (Lead)"');
      expect(xml).toContain('name="Lyrics (Background)"');
    });
  });

  describe("buildXtimingFilename", () => {
    it("builds a clean filename", () => {
      expect(buildXtimingFilename("Bobby Helms", "Jingle Bell Rock")).toBe(
        "BobbyHelms_JingleBellRock_LyrIQ.xtiming",
      );
    });

    it("strips special characters", () => {
      expect(
        buildXtimingFilename("Mariah Carey", "All I Want for Christmas!"),
      ).toBe("MariahCarey_AllIWantforChristmas_LyrIQ.xtiming");
    });

    it("handles artists with punctuation", () => {
      expect(
        buildXtimingFilename("Trans-Siberian Orchestra", "Carol of the Bells"),
      ).toBe("TransSiberianOrchestra_CaroloftheBells_LyrIQ.xtiming");
    });
  });
});
