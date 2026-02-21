#!/usr/bin/env python3
"""
compare-xtiming.py — Compare SOFA-aligned xtiming against human-corrected ground truth.

Parses the word-level EffectLayer from both .xtiming files, aligns words via
longest-common-subsequence matching (handles lyric differences, insertions,
deletions), and reports timing accuracy metrics.

Usage:
    python scripts/compare-xtiming.py <ground_truth.xtiming> <sofa_export.xtiming>

    # With options:
    python scripts/compare-xtiming.py ground.xtiming sofa.xtiming --tolerance 50 --csv report.csv
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from statistics import mean, median


# ── Data model ───────────────────────────────────────────────────────

@dataclass
class WordTiming:
    label: str
    start: int  # milliseconds
    end: int    # milliseconds

    @property
    def duration(self) -> int:
        return self.end - self.start

    def __repr__(self) -> str:
        return f"{self.label} [{self.start}-{self.end}]"


# ── Parsing ──────────────────────────────────────────────────────────

def parse_xtiming(path: str) -> list[WordTiming]:
    """Extract word-level timings from the second EffectLayer.

    Handles both attribute casings:
      - Ground truth: startTime / endTime (camelCase)
      - SOFA export:  starttime / endtime (lowercase)
    """
    tree = ET.parse(path)
    root = tree.getroot()

    # Find all EffectLayer elements regardless of nesting depth.
    layers = root.findall(".//" + "EffectLayer")
    if len(layers) < 2:
        print(f"ERROR: Expected at least 2 EffectLayers, found {len(layers)} in {path}",
              file=sys.stderr)
        sys.exit(1)

    word_layer = layers[1]  # Second layer = word-level
    words: list[WordTiming] = []

    for effect in word_layer:
        attrib = {k.lower(): v for k, v in effect.attrib.items()}
        label = attrib.get("label", "").strip()
        start = attrib.get("starttime")
        end = attrib.get("endtime")
        if label and start is not None and end is not None:
            words.append(WordTiming(
                label=label.upper(),
                start=int(start),
                end=int(end),
            ))

    return words


# ── Word alignment ───────────────────────────────────────────────────

def normalize_label(label: str) -> str:
    """Normalize word labels for matching.

    Strips punctuation, collapses contractions, lowercases — so that
    ground truth "THEM" matches SOFA "'EM", "THERE'S" matches "THERE IS", etc.
    """
    s = label.upper().strip()
    # Remove leading/trailing punctuation
    s = re.sub(r"^['\"\-]+|['\"\-.,!?;:]+$", "", s)
    # Collapse 'EM → EM (contraction of THEM)
    if s == "EM":
        s = "THEM"
    return s


def align_words(
    gt: list[WordTiming], sofa: list[WordTiming]
) -> list[tuple[WordTiming | None, WordTiming | None]]:
    """Align ground truth and SOFA word sequences using LCS.

    Returns a list of (gt_word, sofa_word) pairs.
    Unmatched words appear as (gt_word, None) or (None, sofa_word).
    """
    gt_labels = [normalize_label(w.label) for w in gt]
    sofa_labels = [normalize_label(w.label) for w in sofa]

    matcher = SequenceMatcher(None, gt_labels, sofa_labels, autojunk=False)
    pairs: list[tuple[WordTiming | None, WordTiming | None]] = []

    gt_used = set()
    sofa_used = set()

    for block in matcher.get_matching_blocks():
        # Fill in unmatched from both sides before each matched block
        gt_start = max(gt_used, default=-1) + 1 if gt_used else 0
        sofa_start = max(sofa_used, default=-1) + 1 if sofa_used else 0

        for i in range(gt_start, block.a):
            if i not in gt_used:
                pairs.append((gt[i], None))
                gt_used.add(i)
        for j in range(sofa_start, block.b):
            if j not in sofa_used:
                pairs.append((None, sofa[j]))
                sofa_used.add(j)

        for k in range(block.size):
            gi = block.a + k
            si = block.b + k
            pairs.append((gt[gi], sofa[si]))
            gt_used.add(gi)
            sofa_used.add(si)

    # Remaining unmatched after all blocks
    for i in range(len(gt)):
        if i not in gt_used:
            pairs.append((gt[i], None))
    for j in range(len(sofa)):
        if j not in sofa_used:
            pairs.append((None, sofa[j]))

    return pairs


# ── Metrics ──────────────────────────────────────────────────────────

@dataclass
class MatchMetrics:
    label: str
    start_delta_ms: int    # sofa.start - gt.start (signed)
    end_delta_ms: int      # sofa.end - gt.end (signed)
    abs_start_ms: int      # |start_delta|
    abs_end_ms: int        # |end_delta|
    gt_word: WordTiming
    sofa_word: WordTiming


def compute_metrics(
    pairs: list[tuple[WordTiming | None, WordTiming | None]],
) -> tuple[list[MatchMetrics], list[WordTiming], list[WordTiming]]:
    """Compute per-word timing deltas for matched pairs.

    Returns:
        matched: list of MatchMetrics for paired words
        gt_only: words only in ground truth (SOFA missed)
        sofa_only: words only in SOFA output (extra/hallucinated)
    """
    matched: list[MatchMetrics] = []
    gt_only: list[WordTiming] = []
    sofa_only: list[WordTiming] = []

    for gt_w, sofa_w in pairs:
        if gt_w and sofa_w:
            start_d = sofa_w.start - gt_w.start
            end_d = sofa_w.end - gt_w.end
            matched.append(MatchMetrics(
                label=gt_w.label,
                start_delta_ms=start_d,
                end_delta_ms=end_d,
                abs_start_ms=abs(start_d),
                abs_end_ms=abs(end_d),
                gt_word=gt_w,
                sofa_word=sofa_w,
            ))
        elif gt_w:
            gt_only.append(gt_w)
        elif sofa_w:
            sofa_only.append(sofa_w)

    return matched, gt_only, sofa_only


# ── Reporting ────────────────────────────────────────────────────────

TOLERANCE_BUCKETS_MS = [25, 50, 100, 150, 200, 300, 500]


def pct(count: int, total: int) -> str:
    if total == 0:
        return "N/A"
    return f"{count / total * 100:.1f}%"


def confidence_score(matched: list[MatchMetrics]) -> float:
    """Weighted confidence score (0-100).

    Scoring rubric:
      - Start accuracy weighted 60% (start timing matters most for cues)
      - End accuracy weighted 40%

    Per-word score based on absolute error:
      ≤25ms  → 1.00  (imperceptible)
      ≤50ms  → 0.95  (excellent)
      ≤100ms → 0.80  (good, usable without edits)
      ≤200ms → 0.50  (noticeable, may need touch-up)
      ≤500ms → 0.20  (clearly off)
      >500ms → 0.00  (broken)
    """
    if not matched:
        return 0.0

    def _score(abs_ms: int) -> float:
        if abs_ms <= 25:
            return 1.00
        if abs_ms <= 50:
            return 0.95
        if abs_ms <= 100:
            return 0.80
        if abs_ms <= 200:
            return 0.50
        if abs_ms <= 500:
            return 0.20
        return 0.00

    total = 0.0
    for m in matched:
        total += 0.60 * _score(m.abs_start_ms) + 0.40 * _score(m.abs_end_ms)

    return (total / len(matched)) * 100


def print_report(
    matched: list[MatchMetrics],
    gt_only: list[WordTiming],
    sofa_only: list[WordTiming],
    gt_total: int,
    sofa_total: int,
    tolerance_ms: int = 50,
) -> None:
    """Print a detailed comparison report to stdout."""

    n = len(matched)
    if n == 0:
        print("No matched words — cannot compare.")
        return

    starts = [m.abs_start_ms for m in matched]
    ends = [m.abs_end_ms for m in matched]
    # Combined: average of start and end error per word
    combined = [(m.abs_start_ms + m.abs_end_ms) / 2 for m in matched]

    score = confidence_score(matched)

    # ── Header ──
    print("=" * 72)
    print(f"  XTIMING COMPARISON REPORT")
    print(f"  Confidence Score: {score:.1f}%")
    print("=" * 72)
    print()

    # ── Summary ──
    print(f"  Ground truth words:   {gt_total}")
    print(f"  SOFA export words:    {sofa_total}")
    print(f"  Matched pairs:        {n}")
    print(f"  GT-only (missed):     {len(gt_only)}")
    print(f"  SOFA-only (extra):    {len(sofa_only)}")
    print(f"  Match rate:           {pct(n, gt_total)} of ground truth")
    print()

    # ── Accuracy by tolerance ──
    print("  Accuracy by tolerance (% of matched words within threshold):")
    print("  " + "-" * 56)
    print(f"  {'Threshold':>10}  {'Start':>10}  {'End':>10}  {'Both':>10}")
    print("  " + "-" * 56)

    for tol in TOLERANCE_BUCKETS_MS:
        s_count = sum(1 for x in starts if x <= tol)
        e_count = sum(1 for x in ends if x <= tol)
        b_count = sum(1 for m in matched if m.abs_start_ms <= tol and m.abs_end_ms <= tol)
        marker = "  ◄" if tol == tolerance_ms else ""
        print(f"  {'±' + str(tol) + 'ms':>10}  {pct(s_count, n):>10}  "
              f"{pct(e_count, n):>10}  {pct(b_count, n):>10}{marker}")

    print()

    # ── Error stats ──
    print("  Error statistics (ms):")
    print("  " + "-" * 56)
    print(f"  {'':>14}  {'Start':>10}  {'End':>10}  {'Combined':>10}")
    print("  " + "-" * 56)
    print(f"  {'Mean abs':>14}  {mean(starts):>10.0f}  {mean(ends):>10.0f}  {mean(combined):>10.0f}")
    print(f"  {'Median abs':>14}  {median(starts):>10.0f}  {median(ends):>10.0f}  {median(combined):>10.0f}")
    print(f"  {'Max abs':>14}  {max(starts):>10}  {max(ends):>10}  {max(combined):>10.0f}")

    # Signed stats (bias direction)
    signed_starts = [m.start_delta_ms for m in matched]
    signed_ends = [m.end_delta_ms for m in matched]
    print()
    print(f"  {'Mean signed':>14}  {mean(signed_starts):>+10.0f}  {mean(signed_ends):>+10.0f}")
    bias_dir = "late" if mean(signed_starts) > 0 else "early"
    print(f"  {'Bias':>14}  {'SOFA tends ' + bias_dir:>22}")
    print()

    # ── Worst offenders ──
    sorted_by_start = sorted(matched, key=lambda m: m.abs_start_ms, reverse=True)
    print("  Top 15 worst START errors:")
    print("  " + "-" * 68)
    print(f"  {'Word':>12}  {'GT start':>10}  {'SOFA start':>11}  {'Delta':>8}  {'Context'}")
    print("  " + "-" * 68)
    for m in sorted_by_start[:15]:
        ctx = f"GT [{m.gt_word.start}-{m.gt_word.end}] vs SOFA [{m.sofa_word.start}-{m.sofa_word.end}]"
        print(f"  {m.label:>12}  {m.gt_word.start:>10}  {m.sofa_word.start:>11}  "
              f"{m.start_delta_ms:>+8}  {ctx}")
    print()

    sorted_by_end = sorted(matched, key=lambda m: m.abs_end_ms, reverse=True)
    print("  Top 15 worst END errors:")
    print("  " + "-" * 68)
    print(f"  {'Word':>12}  {'GT end':>10}  {'SOFA end':>11}  {'Delta':>8}  {'Context'}")
    print("  " + "-" * 68)
    for m in sorted_by_end[:15]:
        ctx = f"GT [{m.gt_word.start}-{m.gt_word.end}] vs SOFA [{m.sofa_word.start}-{m.sofa_word.end}]"
        print(f"  {m.label:>12}  {m.gt_word.end:>10}  {m.sofa_word.end:>11}  "
              f"{m.end_delta_ms:>+8}  {ctx}")
    print()

    # ── Section-level breakdown ──
    # Group by ~15s windows to show where SOFA drifts
    if matched:
        print("  Accuracy by song section (~15s windows):")
        print("  " + "-" * 60)
        print(f"  {'Time range':>16}  {'Words':>6}  {'Mean err':>9}  {'±50ms':>8}  {'±100ms':>8}")
        print("  " + "-" * 60)

        window_s = 15
        max_time = max(m.gt_word.end for m in matched)
        cursor = 0
        while cursor * 1000 < max_time:
            lo = cursor * 1000
            hi = (cursor + window_s) * 1000
            bucket = [m for m in matched if lo <= m.gt_word.start < hi]
            if bucket:
                bucket_starts = [m.abs_start_ms for m in bucket]
                within_50 = sum(1 for x in bucket_starts if x <= 50)
                within_100 = sum(1 for x in bucket_starts if x <= 100)
                print(f"  {lo // 1000:>6}-{hi // 1000:>4}s    {len(bucket):>6}  "
                      f"{mean(bucket_starts):>8.0f}ms  "
                      f"{pct(within_50, len(bucket)):>8}  "
                      f"{pct(within_100, len(bucket)):>8}")
            cursor += window_s

    print()

    # ── GT-only words ──
    if gt_only:
        print(f"  Words in ground truth not matched in SOFA ({len(gt_only)}):")
        for w in gt_only[:20]:
            print(f"    {w.label:>12}  [{w.start}-{w.end}]")
        if len(gt_only) > 20:
            print(f"    ... and {len(gt_only) - 20} more")
        print()

    # ── SOFA-only words ──
    if sofa_only:
        print(f"  Words in SOFA not matched in ground truth ({len(sofa_only)}):")
        for w in sofa_only[:20]:
            print(f"    {w.label:>12}  [{w.start}-{w.end}]")
        if len(sofa_only) > 20:
            print(f"    ... and {len(sofa_only) - 20} more")
        print()


def write_csv(
    path: str,
    matched: list[MatchMetrics],
    gt_only: list[WordTiming],
    sofa_only: list[WordTiming],
) -> None:
    """Write per-word comparison data to CSV for further analysis."""
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "status", "label",
            "gt_start", "gt_end", "gt_dur",
            "sofa_start", "sofa_end", "sofa_dur",
            "start_delta_ms", "end_delta_ms",
            "abs_start_ms", "abs_end_ms",
        ])
        for m in matched:
            writer.writerow([
                "matched", m.label,
                m.gt_word.start, m.gt_word.end, m.gt_word.duration,
                m.sofa_word.start, m.sofa_word.end, m.sofa_word.duration,
                m.start_delta_ms, m.end_delta_ms,
                m.abs_start_ms, m.abs_end_ms,
            ])
        for w in gt_only:
            writer.writerow([
                "gt_only", w.label,
                w.start, w.end, w.duration,
                "", "", "", "", "", "", "",
            ])
        for w in sofa_only:
            writer.writerow([
                "sofa_only", w.label,
                "", "", "",
                w.start, w.end, w.duration,
                "", "", "", "",
            ])
    print(f"  CSV written to: {path}")


# ── Main ─────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare SOFA-aligned xtiming against human-corrected ground truth."
    )
    parser.add_argument("ground_truth", help="Path to human-corrected .xtiming file")
    parser.add_argument("sofa_export", help="Path to SOFA-exported .xtiming file")
    parser.add_argument(
        "--tolerance", type=int, default=50,
        help="Primary tolerance threshold in ms (default: 50, marked with ◄ in report)"
    )
    parser.add_argument(
        "--csv", type=str, default=None,
        help="Write per-word comparison data to a CSV file"
    )
    args = parser.parse_args()

    gt_path = Path(args.ground_truth)
    sofa_path = Path(args.sofa_export)

    if not gt_path.exists():
        print(f"ERROR: Ground truth file not found: {gt_path}", file=sys.stderr)
        sys.exit(1)
    if not sofa_path.exists():
        print(f"ERROR: SOFA export file not found: {sofa_path}", file=sys.stderr)
        sys.exit(1)

    gt_words = parse_xtiming(str(gt_path))
    sofa_words = parse_xtiming(str(sofa_path))

    print(f"\n  Parsed {len(gt_words)} ground truth words, {len(sofa_words)} SOFA words\n")

    pairs = align_words(gt_words, sofa_words)
    matched, gt_only, sofa_only = compute_metrics(pairs)

    print_report(
        matched, gt_only, sofa_only,
        gt_total=len(gt_words),
        sofa_total=len(sofa_words),
        tolerance_ms=args.tolerance,
    )

    if args.csv:
        write_csv(args.csv, matched, gt_only, sofa_only)


if __name__ == "__main__":
    main()
