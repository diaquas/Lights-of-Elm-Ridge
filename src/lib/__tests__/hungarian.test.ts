import { describe, it, expect } from "vitest";
import { hungarianMaximize } from "../modiq/hungarian";

describe("hungarianMaximize", () => {
  it("returns empty for empty input", () => {
    expect(hungarianMaximize([])).toEqual([]);
    expect(hungarianMaximize([[]])).toEqual([]);
  });

  it("handles 1x1 matrix", () => {
    expect(hungarianMaximize([[0.9]])).toEqual([[0, 0]]);
  });

  it("handles 1x1 matrix with zero score", () => {
    expect(hungarianMaximize([[0]])).toEqual([]);
  });

  it("finds optimal assignment for square matrix", () => {
    // Classic example where greedy gives suboptimal result:
    // Greedy picks [0,0]=0.92, then [1,1]=0.60, total=1.52
    // Optimal picks [0,1]=0.89, then [1,0]=0.91, total=1.80
    const scores = [
      [0.92, 0.89],
      [0.91, 0.60],
    ];
    const result = hungarianMaximize(scores);
    const total = result.reduce(
      (sum, [r, c]) => sum + scores[r][c],
      0,
    );
    // Optimal total is 1.80
    expect(total).toBeCloseTo(1.80, 2);
  });

  it("handles rectangular matrix (more sources than dests)", () => {
    const scores = [
      [0.9, 0.3],
      [0.8, 0.85],
      [0.1, 0.7],
    ];
    const result = hungarianMaximize(scores);
    // Only 2 dests available, so 2 assignments max
    expect(result.length).toBeLessThanOrEqual(2);
    // Should assign [0,0]=0.9 and [1,1]=0.85 for total 1.75
    const total = result.reduce(
      (sum, [r, c]) => sum + scores[r][c],
      0,
    );
    expect(total).toBeCloseTo(1.75, 2);
  });

  it("handles rectangular matrix (more dests than sources)", () => {
    const scores = [
      [0.5, 0.9, 0.3],
      [0.4, 0.2, 0.85],
    ];
    const result = hungarianMaximize(scores);
    // Only 2 sources, so 2 assignments max
    expect(result.length).toBeLessThanOrEqual(2);
    // Should assign [0,1]=0.9 and [1,2]=0.85 for total 1.75
    const total = result.reduce(
      (sum, [r, c]) => sum + scores[r][c],
      0,
    );
    expect(total).toBeCloseTo(1.75, 2);
  });

  it("prevents duplicate assignments (one-to-one)", () => {
    const scores = [
      [0.95, 0.50, 0.30],
      [0.90, 0.80, 0.60],
      [0.85, 0.75, 0.70],
    ];
    const result = hungarianMaximize(scores);
    // Each source and dest should appear at most once
    const srcSet = new Set(result.map(([r]) => r));
    const destSet = new Set(result.map(([, c]) => c));
    expect(srcSet.size).toBe(result.length);
    expect(destSet.size).toBe(result.length);
  });

  it("maximizes total score over greedy", () => {
    // The ticket's example: greedy gives 204, optimal gives 232
    const scores = [
      [0.92, 0.60, 0.52],
      [0.89, 0.91, 0.50],
      [0.85, 0.52, 0.52],
    ];
    const result = hungarianMaximize(scores);
    const total = result.reduce(
      (sum, [r, c]) => sum + scores[r][c],
      0,
    );
    // Greedy total: 0.92 + 0.91 + 0.52 = 2.35
    // This should be at least 2.35 (optimal is >= greedy)
    expect(total).toBeGreaterThanOrEqual(2.35);
  });

  it("skips zero-score assignments", () => {
    const scores = [
      [0.9, 0],
      [0, 0.8],
    ];
    const result = hungarianMaximize(scores);
    // Both pairs with positive scores should be assigned
    expect(result.length).toBe(2);
    for (const [r, c] of result) {
      expect(scores[r][c]).toBeGreaterThan(0);
    }
  });
});
