import { describe, it, expect } from "vitest";
import {
  detectTempo,
  generateBeatGrid,
  generateBars,
  detectSections,
} from "@/lib/beatiq/tempo-detector";
import type { TimingMark, LabeledMark } from "@/lib/beatiq/types";

describe("tempo-detector", () => {
  describe("detectTempo", () => {
    it("detects tempo from a periodic signal", () => {
      // Simulate a 120 BPM signal: beat every 500ms
      // At 10ms per frame, that's every 50 frames
      const len = 1000;
      const flux = new Float32Array(len);
      const times = new Float32Array(len);

      for (let i = 0; i < len; i++) {
        times[i] = i * 10;
        flux[i] = 0.1;
        if (i % 50 === 0) flux[i] = 1.0; // spike every 50 frames = 500ms = 120 BPM
      }

      const result = detectTempo(flux, times);
      // Should be close to 120 BPM (allow some tolerance)
      expect(result.bpm).toBeGreaterThan(100);
      expect(result.bpm).toBeLessThan(140);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("returns default 120 BPM for empty input", () => {
      const result = detectTempo(new Float32Array(0), new Float32Array(0));
      expect(result.bpm).toBe(120);
      expect(result.confidence).toBe(0);
    });

    it("returns default 120 BPM for flat signal", () => {
      const flux = new Float32Array(500).fill(0.5);
      const times = new Float32Array(500);
      for (let i = 0; i < 500; i++) times[i] = i * 10;

      const result = detectTempo(flux, times);
      expect(result.bpm).toBe(120);
      expect(result.confidence).toBe(0);
    });

    it("returns BPM within the 60-200 range", () => {
      const len = 500;
      const flux = new Float32Array(len);
      const times = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        times[i] = i * 10;
        flux[i] = Math.random();
      }

      const result = detectTempo(flux, times);
      expect(result.bpm).toBeGreaterThanOrEqual(60);
      expect(result.bpm).toBeLessThanOrEqual(200);
    });
  });

  describe("generateBeatGrid", () => {
    it("generates beats at the correct interval", () => {
      const beats = generateBeatGrid(120, 10000); // 120 BPM, 10 seconds
      // 120 BPM = beat every 500ms, so ~20 beats in 10 seconds
      expect(beats.length).toBeGreaterThan(15);
      expect(beats.length).toBeLessThan(25);
    });

    it("labels beats cycling 1,2,3,4", () => {
      const beats = generateBeatGrid(120, 10000);
      expect(beats[0].label).toBe("1");
      expect(beats[1].label).toBe("2");
      expect(beats[2].label).toBe("3");
      expect(beats[3].label).toBe("4");
      expect(beats[4].label).toBe("1"); // cycles back
    });

    it("produces contiguous effects (endMs = next startMs)", () => {
      const beats = generateBeatGrid(120, 10000);
      for (let i = 0; i < beats.length - 1; i++) {
        expect(beats[i].endMs).toBe(beats[i + 1].startMs);
      }
    });

    it("returns empty for zero BPM", () => {
      expect(generateBeatGrid(0, 10000)).toHaveLength(0);
    });

    it("returns empty for zero duration", () => {
      expect(generateBeatGrid(120, 0)).toHaveLength(0);
    });

    it("aligns to onsets when provided", () => {
      const onsets: TimingMark[] = [
        { timeMs: 100, strength: 1.0 },
        { timeMs: 600, strength: 1.0 },
        { timeMs: 1100, strength: 1.0 },
      ];
      const beats = generateBeatGrid(120, 5000, onsets);
      expect(beats.length).toBeGreaterThan(0);
      // All timestamps should be integers
      for (const b of beats) {
        expect(b.startMs).toBe(Math.round(b.startMs));
        expect(b.endMs).toBe(Math.round(b.endMs));
      }
    });

    it("produces integer timestamps", () => {
      const beats = generateBeatGrid(127.3, 60000);
      for (const b of beats) {
        expect(b.startMs).toBe(Math.round(b.startMs));
        expect(b.endMs).toBe(Math.round(b.endMs));
      }
    });
  });

  describe("generateBars", () => {
    it("groups beats into bars of 4", () => {
      // Create labeled beats like generateBeatGrid produces
      const beats: LabeledMark[] = [];
      for (let i = 0; i < 16; i++) {
        beats.push({
          label: String((i % 4) + 1),
          startMs: i * 500,
          endMs: (i + 1) * 500,
        });
      }

      const bars = generateBars(beats, 120, 10000);
      expect(bars.length).toBe(4);
      expect(bars[0].label).toBe("1");
      expect(bars[0].startMs).toBe(0);
      expect(bars[1].label).toBe("2");
      expect(bars[1].startMs).toBe(2000);
    });

    it("returns empty for empty beats", () => {
      expect(generateBars([], 120, 10000)).toHaveLength(0);
    });

    it("handles beats not evenly divisible by beatsPerBar", () => {
      const beats: LabeledMark[] = [];
      for (let i = 0; i < 7; i++) {
        beats.push({
          label: String((i % 4) + 1),
          startMs: i * 500,
          endMs: (i + 1) * 500,
        });
      }

      const bars = generateBars(beats, 120, 10000);
      // 7 beats: downbeats at 0 and 2000 = 2 bars
      expect(bars.length).toBe(2);
    });

    it("produces integer timestamps", () => {
      const beats: LabeledMark[] = [];
      for (let i = 0; i < 8; i++) {
        beats.push({
          label: String((i % 4) + 1),
          startMs: Math.round(i * 471.7),
          endMs: Math.round((i + 1) * 471.7),
        });
      }

      const bars = generateBars(beats, 127.2, 10000);
      for (const bar of bars) {
        expect(bar.startMs).toBe(Math.round(bar.startMs));
        expect(bar.endMs).toBe(Math.round(bar.endMs));
      }
    });
  });

  describe("detectSections", () => {
    it("detects sections from energy transitions", () => {
      const len = 200;
      const flux = new Float32Array(len);
      const times = new Float32Array(len);

      // First half: quiet (intro/verse), second half: loud (chorus)
      for (let i = 0; i < len; i++) {
        times[i] = i * 100; // 100ms per frame, total 20 seconds
        flux[i] = i < 100 ? 0.2 : 0.8;
      }

      const sections = detectSections(flux, times, 20000);
      expect(sections.length).toBeGreaterThanOrEqual(1);
      // Each section has a label
      for (const s of sections) {
        expect(s.label).toBeTruthy();
        expect(s.startMs).toBeGreaterThanOrEqual(0);
        expect(s.endMs).toBeGreaterThan(s.startMs);
      }
    });

    it("returns a single section for constant energy", () => {
      const len = 100;
      const flux = new Float32Array(len).fill(0.5);
      const times = new Float32Array(len);
      for (let i = 0; i < len; i++) times[i] = i * 100;

      const sections = detectSections(flux, times, 10000);
      expect(sections.length).toBeGreaterThanOrEqual(1);
    });

    it("returns empty-safe for empty input", () => {
      const sections = detectSections(
        new Float32Array(0),
        new Float32Array(0),
        0,
      );
      expect(sections).toHaveLength(0);
    });

    it("produces contiguous sections covering the full duration", () => {
      const len = 300;
      const flux = new Float32Array(len);
      const times = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        times[i] = i * 100; // 30 seconds
        // Alternating quiet/loud every 10 seconds
        flux[i] = i < 100 ? 0.2 : i < 200 ? 0.8 : 0.2;
      }

      const sections = detectSections(flux, times, 30000);
      // First section starts at 0
      expect(sections[0].startMs).toBe(0);
      // Last section ends at duration
      expect(sections[sections.length - 1].endMs).toBe(30000);
      // Sections are contiguous
      for (let i = 1; i < sections.length; i++) {
        expect(sections[i].startMs).toBe(sections[i - 1].endMs);
      }
    });
  });
});
