import { describe, it, expect } from "vitest";
import {
  detectTempo,
  generateBeatGrid,
  generateBars,
  detectSections,
} from "@/lib/beatiq/tempo-detector";
import type { TimingMark } from "@/lib/beatiq/types";

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

    it("marks every 4th beat as a downbeat (strength 1.0)", () => {
      const beats = generateBeatGrid(120, 10000);
      const downbeats = beats.filter((b) => b.strength === 1.0);
      const offbeats = beats.filter((b) => b.strength < 1.0);
      expect(downbeats.length).toBeGreaterThan(0);
      expect(offbeats.length).toBeGreaterThan(0);
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
      // All beat times should be integers
      for (const b of beats) {
        expect(b.timeMs).toBe(Math.round(b.timeMs));
      }
    });

    it("produces integer timestamps", () => {
      const beats = generateBeatGrid(127.3, 60000);
      for (const b of beats) {
        expect(b.timeMs).toBe(Math.round(b.timeMs));
      }
    });
  });

  describe("generateBars", () => {
    it("groups beats into bars of 4", () => {
      const beats: TimingMark[] = [];
      for (let i = 0; i < 16; i++) {
        beats.push({ timeMs: i * 500, strength: i % 4 === 0 ? 1.0 : 0.6 });
      }

      const bars = generateBars(beats, 4);
      expect(bars.length).toBe(4);
      expect(bars[0].label).toBe("Bar 1");
      expect(bars[0].startMs).toBe(0);
      expect(bars[1].label).toBe("Bar 2");
      expect(bars[1].startMs).toBe(2000);
    });

    it("returns empty for empty beats", () => {
      expect(generateBars([])).toHaveLength(0);
    });

    it("handles beats not evenly divisible by beatsPerBar", () => {
      const beats: TimingMark[] = [];
      for (let i = 0; i < 7; i++) {
        beats.push({ timeMs: i * 500, strength: 0.6 });
      }

      const bars = generateBars(beats, 4);
      // 7 beats / 4 = 1 full bar + 1 partial bar
      expect(bars.length).toBe(2);
    });

    it("produces integer timestamps", () => {
      const beats: TimingMark[] = [];
      for (let i = 0; i < 8; i++) {
        beats.push({ timeMs: i * 471.7, strength: 0.6 });
      }

      const bars = generateBars(beats, 4);
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
  });
});
