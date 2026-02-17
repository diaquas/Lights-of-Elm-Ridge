import { describe, it, expect } from "vitest";
import { computeStats } from "@/lib/beatiq/beat-processor";
import type { BeatTrack } from "@/lib/beatiq/types";

const SAMPLE_TRACKS: BeatTrack[] = [
  {
    id: "kick",
    name: "Drums \u2014 Kick",
    category: "drums",
    enabled: true,
    marks: [
      { timeMs: 500, strength: 1.0 },
      { timeMs: 1000, strength: 0.8 },
      { timeMs: 1500, strength: 0.9 },
    ],
  },
  {
    id: "beats",
    name: "Beats",
    category: "structure",
    enabled: true,
    marks: [
      { timeMs: 0, strength: 1.0 },
      { timeMs: 500, strength: 0.6 },
      { timeMs: 1000, strength: 0.6 },
      { timeMs: 1500, strength: 0.6 },
    ],
  },
  {
    id: "sections",
    name: "Song Sections",
    category: "structure",
    enabled: true,
    marks: [],
    labeledMarks: [
      { label: "intro", startMs: 0, endMs: 1000 },
      { label: "verse", startMs: 1000, endMs: 2000 },
    ],
  },
];

describe("beat-processor", () => {
  describe("computeStats", () => {
    it("counts total marks including labeled marks", () => {
      const stats = computeStats(SAMPLE_TRACKS, 120, 10000);
      // 3 kick marks + 4 beat marks + 0 section marks + 2 labeled marks = 9
      expect(stats.totalMarks).toBe(9);
    });

    it("counts tracks correctly", () => {
      const stats = computeStats(SAMPLE_TRACKS, 120, 10000);
      expect(stats.trackCount).toBe(3);
    });

    it("reports the correct BPM", () => {
      const stats = computeStats(SAMPLE_TRACKS, 138, 10000);
      expect(stats.bpm).toBe(138);
    });

    it("reports the correct duration", () => {
      const stats = computeStats(SAMPLE_TRACKS, 120, 180000);
      expect(stats.durationMs).toBe(180000);
    });

    it("detects sub-frame events", () => {
      const fastTrack: BeatTrack = {
        id: "hihat",
        name: "Hi-Hat",
        category: "drums",
        enabled: true,
        marks: [
          { timeMs: 100, strength: 0.5 },
          { timeMs: 130, strength: 0.5 }, // 30ms gap — sub-frame at 20fps
          { timeMs: 160, strength: 0.5 },
        ],
      };
      const stats = computeStats([fastTrack], 120, 5000);
      expect(stats.hasSubFrameEvents).toBe(true);
      expect(stats.recommendedFps).toBeGreaterThanOrEqual(40);
    });

    it("does not flag sub-frame for widely spaced marks", () => {
      const slowTrack: BeatTrack = {
        id: "kick",
        name: "Kick",
        category: "drums",
        enabled: true,
        marks: [
          { timeMs: 0, strength: 1.0 },
          { timeMs: 500, strength: 1.0 },
          { timeMs: 1000, strength: 1.0 },
        ],
      };
      const stats = computeStats([slowTrack], 120, 5000);
      expect(stats.hasSubFrameEvents).toBe(false);
    });

    it("handles empty tracks", () => {
      const stats = computeStats([], 120, 5000);
      expect(stats.totalMarks).toBe(0);
      expect(stats.trackCount).toBe(0);
    });
  });
});
