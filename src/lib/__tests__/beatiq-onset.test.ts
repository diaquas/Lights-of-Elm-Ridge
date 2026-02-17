import { describe, it, expect } from "vitest";
import { detectOnsets, normalizeStrengths } from "@/lib/beatiq/onset-detector";
import type { TimingMark } from "@/lib/beatiq/types";

describe("onset-detector", () => {
  describe("detectOnsets", () => {
    it("detects peaks in a simple energy envelope", () => {
      // Create a signal with clear peaks at known positions
      const len = 100;
      const values = new Float32Array(len);
      const times = new Float32Array(len);

      for (let i = 0; i < len; i++) {
        times[i] = i * 10; // 10ms per frame
        values[i] = 0.1; // baseline
      }

      // Add peaks
      values[20] = 1.0;
      values[50] = 0.8;
      values[80] = 0.9;

      const marks = detectOnsets(values, times, 0.2, 50);
      expect(marks.length).toBeGreaterThanOrEqual(2);

      // Peaks should be near 200ms, 500ms, 800ms
      const peakTimes = marks.map((m) => m.timeMs);
      expect(peakTimes.some((t) => Math.abs(t - 200) < 20)).toBe(true);
      expect(peakTimes.some((t) => Math.abs(t - 500) < 20)).toBe(true);
    });

    it("returns empty for empty input", () => {
      const marks = detectOnsets(
        new Float32Array(0),
        new Float32Array(0),
        0.3,
        100,
      );
      expect(marks).toHaveLength(0);
    });

    it("returns empty for very short input", () => {
      const marks = detectOnsets(
        new Float32Array([0.5, 0.5]),
        new Float32Array([0, 10]),
        0.3,
        100,
      );
      expect(marks).toHaveLength(0);
    });

    it("respects minimum interval constraint", () => {
      const len = 50;
      const values = new Float32Array(len);
      const times = new Float32Array(len);

      for (let i = 0; i < len; i++) {
        times[i] = i * 10;
        values[i] = 0.05;
      }

      // Two peaks very close together
      values[10] = 1.0;
      values[12] = 0.9; // 20ms later

      const marks = detectOnsets(values, times, 0.1, 100); // min 100ms
      // Should only detect one of the two
      const nearbyPeaks = marks.filter(
        (m) => m.timeMs >= 80 && m.timeMs <= 140,
      );
      expect(nearbyPeaks.length).toBeLessThanOrEqual(1);
    });

    it("normalizes strengths to 0-1 range", () => {
      const len = 50;
      const values = new Float32Array(len);
      const times = new Float32Array(len);

      for (let i = 0; i < len; i++) {
        times[i] = i * 20;
        values[i] = 0.05;
      }
      values[15] = 1.0;
      values[35] = 0.5;

      const marks = detectOnsets(values, times, 0.1, 100);
      for (const m of marks) {
        expect(m.strength).toBeGreaterThanOrEqual(0);
        expect(m.strength).toBeLessThanOrEqual(1);
      }
      // The strongest peak should have strength 1.0
      if (marks.length > 0) {
        const maxStrength = Math.max(...marks.map((m) => m.strength));
        expect(maxStrength).toBeCloseTo(1.0, 5);
      }
    });
  });

  describe("normalizeStrengths", () => {
    it("normalizes to 0-1 range", () => {
      const marks: TimingMark[] = [
        { timeMs: 100, strength: 2.0 },
        { timeMs: 200, strength: 1.0 },
        { timeMs: 300, strength: 0.5 },
      ];
      const normalized = normalizeStrengths(marks);
      expect(normalized[0].strength).toBeCloseTo(1.0);
      expect(normalized[1].strength).toBeCloseTo(0.5);
      expect(normalized[2].strength).toBeCloseTo(0.25);
    });

    it("returns empty for empty input", () => {
      expect(normalizeStrengths([])).toHaveLength(0);
    });

    it("handles all-zero strengths", () => {
      const marks: TimingMark[] = [
        { timeMs: 100, strength: 0 },
        { timeMs: 200, strength: 0 },
      ];
      const normalized = normalizeStrengths(marks);
      expect(normalized[0].strength).toBe(0);
      expect(normalized[1].strength).toBe(0);
    });

    it("preserves timeMs values", () => {
      const marks: TimingMark[] = [
        { timeMs: 123, strength: 5.0 },
        { timeMs: 456, strength: 2.5 },
      ];
      const normalized = normalizeStrengths(marks);
      expect(normalized[0].timeMs).toBe(123);
      expect(normalized[1].timeMs).toBe(456);
    });
  });
});
