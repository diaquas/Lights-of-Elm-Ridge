import { describe, it, expect } from "vitest";
import {
  escapeXml,
  generateXtiming,
  generateMultiTrackXtiming,
  buildXtimingFilename,
} from "@/lib/beatiq/xtiming-generator";
import type { BeatTrack } from "@/lib/beatiq/types";

const SAMPLE_TRACK: BeatTrack = {
  id: "kick",
  name: "Drums \u2014 Kick",
  category: "drums",
  enabled: true,
  marks: [
    { timeMs: 500, strength: 1.0 },
    { timeMs: 1000, strength: 0.8 },
    { timeMs: 1500, strength: 0.9 },
  ],
};

const SAMPLE_LABELED_TRACK: BeatTrack = {
  id: "sections",
  name: "Song Sections",
  category: "structure",
  enabled: true,
  marks: [],
  labeledMarks: [
    { label: "intro", startMs: 0, endMs: 15000 },
    { label: "verse 1", startMs: 15000, endMs: 45000 },
    { label: "chorus", startMs: 45000, endMs: 65000 },
  ],
};

describe("xtiming-generator", () => {
  describe("escapeXml", () => {
    it("escapes ampersands", () => {
      expect(escapeXml("rock & roll")).toBe("rock &amp; roll");
    });

    it("escapes angle brackets", () => {
      expect(escapeXml("Drums <Kick>")).toBe("Drums &lt;Kick&gt;");
    });

    it("escapes double quotes", () => {
      expect(escapeXml('say "hello"')).toBe("say &quot;hello&quot;");
    });

    it("handles all special characters together", () => {
      expect(escapeXml('A & B <C> "D"')).toBe(
        "A &amp; B &lt;C&gt; &quot;D&quot;",
      );
    });

    it("returns plain strings unchanged", () => {
      expect(escapeXml("Drums - Kick")).toBe("Drums - Kick");
    });
  });

  describe("generateXtiming", () => {
    it("produces valid XML with correct structure", () => {
      const xml = generateXtiming(SAMPLE_TRACK);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain("SourceVersion=");
      expect(xml).toContain("<EffectLayer>");
      expect(xml).toContain("</EffectLayer>");
      expect(xml).toContain("</timing>");
    });

    it("includes the track name", () => {
      const xml = generateXtiming(SAMPLE_TRACK);
      expect(xml).toContain('name="Drums \u2014 Kick"');
    });

    it("generates correct number of effects for timing marks", () => {
      const xml = generateXtiming(SAMPLE_TRACK);
      const effectCount = (xml.match(/<Effect /g) || []).length;
      expect(effectCount).toBe(3);
    });

    it("uses integer millisecond timestamps", () => {
      const xml = generateXtiming(SAMPLE_TRACK);
      const times = xml.match(/(?:start|end)time="([^"]+)"/g) || [];
      for (const t of times) {
        const value = t.match(/"([^"]+)"/)?.[1];
        expect(value).toMatch(/^\d+$/);
      }
    });

    it("generates effects with 50ms default duration for onset marks", () => {
      const xml = generateXtiming(SAMPLE_TRACK);
      expect(xml).toContain('starttime="500" endtime="550"');
      expect(xml).toContain('starttime="1000" endtime="1050"');
    });

    it("generates labeled effects for labeled marks", () => {
      const xml = generateXtiming(SAMPLE_LABELED_TRACK);
      expect(xml).toContain('label="intro" starttime="0" endtime="15000"');
      expect(xml).toContain(
        'label="verse 1" starttime="15000" endtime="45000"',
      );
      expect(xml).toContain('label="chorus" starttime="45000" endtime="65000"');
    });

    it("handles empty marks array", () => {
      const emptyTrack: BeatTrack = {
        id: "empty",
        name: "Empty",
        category: "structure",
        enabled: true,
        marks: [],
      };
      const xml = generateXtiming(emptyTrack);
      expect(xml).toContain("<EffectLayer>");
      const effectCount = (xml.match(/<Effect /g) || []).length;
      expect(effectCount).toBe(0);
    });
  });

  describe("generateMultiTrackXtiming", () => {
    it("wraps multiple tracks in a timings element", () => {
      const xml = generateMultiTrackXtiming([
        SAMPLE_TRACK,
        SAMPLE_LABELED_TRACK,
      ]);
      expect(xml).toContain("<timings>");
      expect(xml).toContain("</timings>");
    });

    it("includes all enabled tracks", () => {
      const xml = generateMultiTrackXtiming([
        SAMPLE_TRACK,
        SAMPLE_LABELED_TRACK,
      ]);
      const timingCount = (xml.match(/<timing /g) || []).length;
      expect(timingCount).toBe(2);
    });

    it("excludes disabled tracks", () => {
      const disabled: BeatTrack = { ...SAMPLE_TRACK, enabled: false };
      const xml = generateMultiTrackXtiming([disabled, SAMPLE_LABELED_TRACK]);
      const timingCount = (xml.match(/<timing /g) || []).length;
      expect(timingCount).toBe(1);
      expect(xml).not.toContain("Drums");
    });

    it("returns single-track format for one track", () => {
      const xml = generateMultiTrackXtiming([SAMPLE_TRACK]);
      expect(xml).not.toContain("<timings>");
      expect(xml).toContain('<timing offset="0" name="Drums');
    });

    it("returns empty string for no enabled tracks", () => {
      const disabled: BeatTrack = { ...SAMPLE_TRACK, enabled: false };
      const xml = generateMultiTrackXtiming([disabled]);
      expect(xml).toBe("");
    });
  });

  describe("buildXtimingFilename", () => {
    it("produces a clean filename", () => {
      const name = buildXtimingFilename(
        "Trans-Siberian Orchestra",
        "Christmas Eve Sarajevo",
      );
      expect(name).toBe(
        "TransSiberianOrchestra_ChristmasEveSarajevo_BeatIQ.xtiming",
      );
    });

    it("strips special characters", () => {
      const name = buildXtimingFilename("AC/DC", "Back In Black (Live)");
      expect(name).toBe("ACDC_BackInBlackLive_BeatIQ.xtiming");
    });

    it("handles empty strings", () => {
      const name = buildXtimingFilename("", "");
      expect(name).toBe("__BeatIQ.xtiming");
    });
  });
});
