"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ── Types ────────────────────────────────────────────────────────── */

interface WordTiming {
  label: string;
  start: number; // ms
  end: number; // ms
}

interface MatchMetrics {
  label: string;
  startDelta: number;
  endDelta: number;
  absStart: number;
  absEnd: number;
  gt: WordTiming;
  sofa: WordTiming;
}

interface CompareResult {
  matched: MatchMetrics[];
  gtOnly: WordTiming[];
  sofaOnly: WordTiming[];
  gtTotal: number;
  sofaTotal: number;
  score: number;
}

/* ── Parsing ──────────────────────────────────────────────────────── */

function parseXtiming(xml: string): WordTiming[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const layers = doc.querySelectorAll("EffectLayer");
  if (layers.length < 2) return [];

  const wordLayer = layers[1];
  const words: WordTiming[] = [];

  for (const el of wordLayer.querySelectorAll("Effect")) {
    const label =
      (el.getAttribute("label") || el.getAttribute("Label") || "").trim();
    const start =
      el.getAttribute("starttime") ??
      el.getAttribute("startTime") ??
      el.getAttribute("StartTime");
    const end =
      el.getAttribute("endtime") ??
      el.getAttribute("endTime") ??
      el.getAttribute("EndTime");

    if (label && start != null && end != null) {
      words.push({ label: label.toUpperCase(), start: +start, end: +end });
    }
  }
  return words;
}

/* ── LCS word alignment ──────────────────────────────────────────── */

function normalizeLabel(label: string): string {
  let s = label.toUpperCase().trim();
  s = s.replace(/^['\-]+|['\-.,!?;:]+$/g, "");
  if (s === "EM") s = "THEM";
  return s;
}

/** Longest-common-subsequence alignment (mirrors difflib.SequenceMatcher). */
function alignWords(
  gt: WordTiming[],
  sofa: WordTiming[],
): [WordTiming | null, WordTiming | null][] {
  const a = gt.map((w) => normalizeLabel(w.label));
  const b = sofa.map((w) => normalizeLabel(w.label));
  const m = a.length;
  const n = b.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to find matched indices
  const matchedPairs: [number, number][] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      matchedPairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  matchedPairs.reverse();

  // Build pairs interleaving unmatched
  const pairs: [WordTiming | null, WordTiming | null][] = [];
  let gi = 0;
  let si = 0;

  for (const [gIdx, sIdx] of matchedPairs) {
    while (gi < gIdx) pairs.push([gt[gi++], null]);
    while (si < sIdx) pairs.push([null, sofa[si++]]);
    pairs.push([gt[gIdx], sofa[sIdx]]);
    gi = gIdx + 1;
    si = sIdx + 1;
  }
  while (gi < m) pairs.push([gt[gi++], null]);
  while (si < n) pairs.push([null, sofa[si++]]);

  return pairs;
}

/* ── Metrics ──────────────────────────────────────────────────────── */

const TOLERANCE_BUCKETS = [25, 50, 100, 150, 200, 300, 500];

function computeMetrics(
  pairs: [WordTiming | null, WordTiming | null][],
): { matched: MatchMetrics[]; gtOnly: WordTiming[]; sofaOnly: WordTiming[] } {
  const matched: MatchMetrics[] = [];
  const gtOnly: WordTiming[] = [];
  const sofaOnly: WordTiming[] = [];

  for (const [g, s] of pairs) {
    if (g && s) {
      const sd = s.start - g.start;
      const ed = s.end - g.end;
      matched.push({
        label: g.label,
        startDelta: sd,
        endDelta: ed,
        absStart: Math.abs(sd),
        absEnd: Math.abs(ed),
        gt: g,
        sofa: s,
      });
    } else if (g) {
      gtOnly.push(g);
    } else if (s) {
      sofaOnly.push(s);
    }
  }

  return { matched, gtOnly, sofaOnly };
}

function confidenceScore(matched: MatchMetrics[]): number {
  if (matched.length === 0) return 0;

  function score(ms: number): number {
    if (ms <= 25) return 1.0;
    if (ms <= 50) return 0.95;
    if (ms <= 100) return 0.8;
    if (ms <= 200) return 0.5;
    if (ms <= 500) return 0.2;
    return 0;
  }

  let total = 0;
  for (const m of matched) {
    total += 0.6 * score(m.absStart) + 0.4 * score(m.absEnd);
  }
  return (total / matched.length) * 100;
}

function pct(count: number, total: number): string {
  if (total === 0) return "N/A";
  return `${((count / total) * 100).toFixed(1)}%`;
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmtMs(ms: number): string {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, "0")}`;
}

/* ── Component ────────────────────────────────────────────────────── */

export default function XtimingComparePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [fileA, setFileA] = useState<{ name: string; xml: string } | null>(
    null,
  );
  const [fileB, setFileB] = useState<{ name: string; xml: string } | null>(
    null,
  );
  const [result, setResult] = useState<CompareResult | null>(null);
  const [tab, setTab] = useState<
    "summary" | "tolerance" | "errors" | "sections" | "unmatched"
  >("summary");

  // Auth
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      setIsAdmin(user?.email === adminEmail);
      setIsLoading(false);
    }
    checkAuth();
  }, []);

  // Read file
  const readFile = useCallback(
    (slot: "a" | "b") => (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const xml = reader.result as string;
        const setter = slot === "a" ? setFileA : setFileB;
        setter({ name: file.name, xml });
      };
      reader.readAsText(file);
    },
    [],
  );

  // Run comparison
  useEffect(() => {
    if (!fileA || !fileB) {
      setResult(null);
      return;
    }

    const gtWords = parseXtiming(fileA.xml);
    const sofaWords = parseXtiming(fileB.xml);

    if (gtWords.length === 0 || sofaWords.length === 0) {
      setResult(null);
      return;
    }

    const pairs = alignWords(gtWords, sofaWords);
    const { matched, gtOnly, sofaOnly } = computeMetrics(pairs);
    const score = confidenceScore(matched);

    setResult({
      matched,
      gtOnly,
      sofaOnly,
      gtTotal: gtWords.length,
      sofaTotal: sofaWords.length,
      score,
    });
    setTab("summary");
  }, [fileA, fileB]);

  // Section breakdown (memoized)
  const sections = useMemo(() => {
    if (!result || result.matched.length === 0) return [];
    const windowS = 15;
    const maxTime = Math.max(...result.matched.map((m) => m.gt.end));
    const out: {
      range: string;
      count: number;
      meanErr: number;
      within50: string;
      within100: string;
    }[] = [];

    let cursor = 0;
    while (cursor * 1000 < maxTime) {
      const lo = cursor * 1000;
      const hi = (cursor + windowS) * 1000;
      const bucket = result.matched.filter(
        (m) => lo <= m.gt.start && m.gt.start < hi,
      );
      if (bucket.length > 0) {
        const starts = bucket.map((m) => m.absStart);
        out.push({
          range: `${lo / 1000}-${hi / 1000}s`,
          count: bucket.length,
          meanErr: Math.round(mean(starts)),
          within50: pct(
            starts.filter((x) => x <= 50).length,
            bucket.length,
          ),
          within100: pct(
            starts.filter((x) => x <= 100).length,
            bucket.length,
          ),
        });
      }
      cursor += windowS;
    }
    return out;
  }, [result]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-surface rounded-xl border border-border p-8 text-center max-w-md">
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-foreground/60 mb-4">
            Admin access required.
          </p>
          <Link href="/" className="text-accent hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm text-foreground/50 hover:text-accent transition-colors"
          >
            &larr; Admin
          </Link>
          <h1 className="text-3xl font-bold mt-2">XTiming Compare</h1>
          <p className="text-foreground/60">
            Upload two .xtiming files to compare word-level alignment accuracy
          </p>
        </div>

        {/* Upload zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <DropZone
            label="Ground Truth"
            sublabel="Human-corrected .xtiming"
            file={fileA}
            onFile={readFile("a")}
            onClear={() => setFileA(null)}
            accent="emerald"
          />
          <DropZone
            label="SOFA Export"
            sublabel="AI-generated .xtiming"
            file={fileB}
            onFile={readFile("b")}
            onClear={() => setFileB(null)}
            accent="blue"
          />
        </div>

        {/* Results */}
        {result && result.matched.length > 0 && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            {/* Score banner */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <span className="text-sm text-foreground/50 uppercase tracking-wide">
                  Confidence Score
                </span>
                <div
                  className={`text-4xl font-bold ${scoreColor(result.score)}`}
                >
                  {result.score.toFixed(1)}%
                </div>
              </div>
              <div className="text-right text-sm text-foreground/60 space-y-1">
                <div>
                  Matched: {result.matched.length} / {result.gtTotal} words
                </div>
                <div>
                  Match rate: {pct(result.matched.length, result.gtTotal)}
                </div>
                {result.gtOnly.length > 0 && (
                  <div className="text-amber-400">
                    Missed: {result.gtOnly.length}
                  </div>
                )}
                {result.sofaOnly.length > 0 && (
                  <div className="text-amber-400">
                    Extra: {result.sofaOnly.length}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-4 gap-1 overflow-x-auto">
              {(
                [
                  ["summary", "Summary"],
                  ["tolerance", "Accuracy"],
                  ["errors", "Error Stats"],
                  ["sections", "Sections"],
                  ["unmatched", "Unmatched"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    tab === key
                      ? "border-accent text-accent"
                      : "border-transparent text-foreground/50 hover:text-foreground/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
              {tab === "summary" && <SummaryTab result={result} />}
              {tab === "tolerance" && <ToleranceTab result={result} />}
              {tab === "errors" && <ErrorsTab result={result} />}
              {tab === "sections" && <SectionsTab sections={sections} />}
              {tab === "unmatched" && <UnmatchedTab result={result} />}
            </div>
          </div>
        )}

        {/* Empty state after upload */}
        {fileA && fileB && (!result || result.matched.length === 0) && (
          <div className="bg-surface rounded-xl border border-border p-8 text-center text-foreground/50">
            Could not parse word layers from both files. Make sure each file has
            at least 2 EffectLayers.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────── */

function DropZone({
  label,
  sublabel,
  file,
  onFile,
  onClear,
  accent,
}: {
  label: string;
  sublabel: string;
  file: { name: string; xml: string } | null;
  onFile: (f: File) => void;
  onClear: () => void;
  accent: "emerald" | "blue";
}) {
  const [dragActive, setDragActive] = useState(false);
  const accentClass =
    accent === "emerald"
      ? "border-emerald-500/50 bg-emerald-500/5"
      : "border-blue-500/50 bg-blue-500/5";
  const tagClass =
    accent === "emerald"
      ? "bg-emerald-500/20 text-emerald-400"
      : "bg-blue-500/20 text-blue-400";

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  if (file) {
    return (
      <div className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${tagClass}`}>
            {label}
          </span>
          <span className="text-sm truncate">{file.name}</span>
        </div>
        <button
          onClick={onClear}
          className="text-foreground/40 hover:text-foreground/70 text-sm ml-3 shrink-0"
        >
          clear
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border-2 border-dashed transition-all duration-200 p-8 text-center cursor-pointer ${
        dragActive ? accentClass : "border-border hover:border-foreground/30"
      }`}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xtiming,.xml";
        input.onchange = () => {
          const f = input.files?.[0];
          if (f) onFile(f);
        };
        input.click();
      }}
    >
      <div
        className={`text-sm font-medium mb-1 ${accent === "emerald" ? "text-emerald-400" : "text-blue-400"}`}
      >
        {label}
      </div>
      <div className="text-xs text-foreground/40">{sublabel}</div>
      <div className="text-xs text-foreground/30 mt-2">
        Drop file or click to browse
      </div>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-amber-400";
  return "text-red-400";
}

/* ── Summary Tab ──────────────────────────────────────────────────── */

function SummaryTab({ result }: { result: CompareResult }) {
  const { matched } = result;
  const starts = matched.map((m) => m.absStart);
  const ends = matched.map((m) => m.absEnd);
  const signedStarts = matched.map((m) => m.startDelta);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Mean start err"
          value={`${Math.round(mean(starts))}ms`}
        />
        <StatCard
          label="Mean end err"
          value={`${Math.round(mean(ends))}ms`}
        />
        <StatCard
          label="Median start err"
          value={`${Math.round(median(starts))}ms`}
        />
        <StatCard
          label="Bias"
          value={mean(signedStarts) > 0 ? "SOFA late" : "SOFA early"}
          sub={`${mean(signedStarts) > 0 ? "+" : ""}${Math.round(mean(signedStarts))}ms avg`}
        />
      </div>

      {/* Quick tolerance */}
      <div>
        <h3 className="text-sm font-medium text-foreground/60 mb-2">
          At a glance
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[50, 100, 200].map((tol) => {
            const count = matched.filter(
              (m) => m.absStart <= tol && m.absEnd <= tol,
            ).length;
            return (
              <div
                key={tol}
                className="bg-background rounded-lg border border-border p-3 text-center"
              >
                <div className="text-2xl font-bold">
                  {pct(count, matched.length)}
                </div>
                <div className="text-xs text-foreground/40">within {tol}ms</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-background rounded-lg border border-border p-3">
      <div className="text-xs text-foreground/50 mb-1">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      {sub && <div className="text-xs text-foreground/40">{sub}</div>}
    </div>
  );
}

/* ── Tolerance Tab ────────────────────────────────────────────────── */

function ToleranceTab({ result }: { result: CompareResult }) {
  const { matched } = result;
  const n = matched.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-foreground/50 border-b border-border">
            <th className="text-left py-2 pr-4">Threshold</th>
            <th className="text-right py-2 px-4">Start</th>
            <th className="text-right py-2 px-4">End</th>
            <th className="text-right py-2 pl-4">Both</th>
          </tr>
        </thead>
        <tbody>
          {TOLERANCE_BUCKETS.map((tol) => {
            const s = matched.filter((m) => m.absStart <= tol).length;
            const e = matched.filter((m) => m.absEnd <= tol).length;
            const b = matched.filter(
              (m) => m.absStart <= tol && m.absEnd <= tol,
            ).length;
            const isKey = tol === 50;
            return (
              <tr
                key={tol}
                className={`border-b border-border/50 ${isKey ? "bg-accent/5" : ""}`}
              >
                <td className="py-2 pr-4 font-mono">
                  &plusmn;{tol}ms {isKey && <span className="text-accent">*</span>}
                </td>
                <td className="text-right py-2 px-4">{pct(s, n)}</td>
                <td className="text-right py-2 px-4">{pct(e, n)}</td>
                <td className="text-right py-2 pl-4 font-medium">
                  {pct(b, n)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Errors Tab ───────────────────────────────────────────────────── */

function ErrorsTab({ result }: { result: CompareResult }) {
  const { matched } = result;
  const worstStart = [...matched]
    .sort((a, b) => b.absStart - a.absStart)
    .slice(0, 15);
  const worstEnd = [...matched]
    .sort((a, b) => b.absEnd - a.absEnd)
    .slice(0, 15);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground/60 mb-2">
          Top 15 worst START errors
        </h3>
        <ErrorTable items={worstStart} field="start" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-foreground/60 mb-2">
          Top 15 worst END errors
        </h3>
        <ErrorTable items={worstEnd} field="end" />
      </div>
    </div>
  );
}

function ErrorTable({
  items,
  field,
}: {
  items: MatchMetrics[];
  field: "start" | "end";
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="text-foreground/50 border-b border-border">
            <th className="text-left py-2 pr-3">Word</th>
            <th className="text-right py-2 px-3">GT</th>
            <th className="text-right py-2 px-3">SOFA</th>
            <th className="text-right py-2 px-3">Delta</th>
            <th className="text-left py-2 pl-3">Context</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, i) => {
            const gtVal = field === "start" ? m.gt.start : m.gt.end;
            const sofaVal = field === "start" ? m.sofa.start : m.sofa.end;
            const delta = field === "start" ? m.startDelta : m.endDelta;
            return (
              <tr key={i} className="border-b border-border/30">
                <td className="py-1.5 pr-3">{m.label}</td>
                <td className="text-right py-1.5 px-3 text-foreground/60">
                  {fmtMs(gtVal)}
                </td>
                <td className="text-right py-1.5 px-3 text-foreground/60">
                  {fmtMs(sofaVal)}
                </td>
                <td
                  className={`text-right py-1.5 px-3 font-medium ${Math.abs(delta) > 200 ? "text-red-400" : Math.abs(delta) > 100 ? "text-amber-400" : "text-foreground/60"}`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}ms
                </td>
                <td className="py-1.5 pl-3 text-foreground/30 text-xs">
                  GT [{m.gt.start}-{m.gt.end}] SOFA [{m.sofa.start}-
                  {m.sofa.end}]
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Sections Tab ─────────────────────────────────────────────────── */

function SectionsTab({
  sections,
}: {
  sections: {
    range: string;
    count: number;
    meanErr: number;
    within50: string;
    within100: string;
  }[];
}) {
  if (sections.length === 0) {
    return (
      <div className="text-foreground/40 text-center py-8">
        No section data available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-foreground/50 border-b border-border">
            <th className="text-left py-2 pr-4">Time range</th>
            <th className="text-right py-2 px-4">Words</th>
            <th className="text-right py-2 px-4">Mean err</th>
            <th className="text-right py-2 px-4">&plusmn;50ms</th>
            <th className="text-right py-2 pl-4">&plusmn;100ms</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((s) => (
            <tr key={s.range} className="border-b border-border/30">
              <td className="py-1.5 pr-4 font-mono">{s.range}</td>
              <td className="text-right py-1.5 px-4">{s.count}</td>
              <td
                className={`text-right py-1.5 px-4 font-mono ${s.meanErr > 200 ? "text-red-400" : s.meanErr > 100 ? "text-amber-400" : "text-foreground/70"}`}
              >
                {s.meanErr}ms
              </td>
              <td className="text-right py-1.5 px-4">{s.within50}</td>
              <td className="text-right py-1.5 pl-4">{s.within100}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Unmatched Tab ────────────────────────────────────────────────── */

function UnmatchedTab({ result }: { result: CompareResult }) {
  const { gtOnly, sofaOnly } = result;

  if (gtOnly.length === 0 && sofaOnly.length === 0) {
    return (
      <div className="text-foreground/40 text-center py-8">
        All words matched between both files.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-medium text-foreground/60 mb-2">
          GT only (SOFA missed) &mdash; {gtOnly.length}
        </h3>
        {gtOnly.length > 0 ? (
          <div className="space-y-1 max-h-80 overflow-y-auto font-mono text-sm">
            {gtOnly.slice(0, 50).map((w, i) => (
              <div
                key={i}
                className="flex justify-between text-foreground/60 px-2 py-0.5 rounded hover:bg-background"
              >
                <span>{w.label}</span>
                <span className="text-foreground/30">
                  [{fmtMs(w.start)}-{fmtMs(w.end)}]
                </span>
              </div>
            ))}
            {gtOnly.length > 50 && (
              <div className="text-foreground/30 px-2">
                ...and {gtOnly.length - 50} more
              </div>
            )}
          </div>
        ) : (
          <div className="text-foreground/30 text-sm">None</div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium text-foreground/60 mb-2">
          SOFA only (extra) &mdash; {sofaOnly.length}
        </h3>
        {sofaOnly.length > 0 ? (
          <div className="space-y-1 max-h-80 overflow-y-auto font-mono text-sm">
            {sofaOnly.slice(0, 50).map((w, i) => (
              <div
                key={i}
                className="flex justify-between text-foreground/60 px-2 py-0.5 rounded hover:bg-background"
              >
                <span>{w.label}</span>
                <span className="text-foreground/30">
                  [{fmtMs(w.start)}-{fmtMs(w.end)}]
                </span>
              </div>
            ))}
            {sofaOnly.length > 50 && (
              <div className="text-foreground/30 px-2">
                ...and {sofaOnly.length - 50} more
              </div>
            )}
          </div>
        ) : (
          <div className="text-foreground/30 text-sm">None</div>
        )}
      </div>
    </div>
  );
}
