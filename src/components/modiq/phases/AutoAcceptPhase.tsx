"use client";

import { useState, useMemo } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { PhaseEmptyState } from "../PhaseEmptyState";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

const GREEN_THRESHOLD = 0.90;

// ─── Type helpers ────────────────────────────────────────

function getTypeLabel(layer: SourceLayerMapping): string {
  if (layer.sourceModel.groupType === "SUBMODEL_GROUP") return "HD Group";
  if (layer.isGroup) return "Group";
  return "Model";
}

function getTypeBadgeClass(layer: SourceLayerMapping): string {
  if (layer.sourceModel.groupType === "SUBMODEL_GROUP")
    return "bg-purple-500/15 text-purple-400";
  if (layer.isGroup) return "bg-blue-500/15 text-blue-400";
  return "bg-foreground/5 text-foreground/40";
}

// ─── Main Component ────────────────────────────────────────

export function AutoAcceptPhase() {
  const {
    phaseItems,
    goToNextPhase,
    interactive,
    scoreMap,
    overallProgress,
    reassignFromAutoAccept,
  } = useMappingPhase();

  const [rejectedNames, setRejectedNames] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [yellowOpen, setYellowOpen] = useState(true);
  const [greenOpen, setGreenOpen] = useState(false);

  // Build top-suggestion map for each item
  const suggestions = useMemo(() => {
    const map = new Map<
      string,
      { name: string; score: number; pixelCount: number | undefined }
    >();
    for (const item of phaseItems) {
      const suggs = interactive.getSuggestionsForLayer(item.sourceModel);
      if (suggs.length > 0) {
        map.set(item.sourceModel.name, {
          name: suggs[0].model.name,
          score: suggs[0].score,
          pixelCount: suggs[0].model.pixelCount,
        });
      }
    }
    return map;
  }, [phaseItems, interactive]);

  // Split into green (90%+) and yellow (70-89%) groups
  const { greenItems, yellowItems, stats } = useMemo(() => {
    const green: SourceLayerMapping[] = [];
    const yellow: SourceLayerMapping[] = [];

    for (const item of phaseItems) {
      const score = scoreMap.get(item.sourceModel.name) ?? 0;
      if (score >= GREEN_THRESHOLD) {
        green.push(item);
      } else {
        yellow.push(item);
      }
    }

    // Sort by confidence ascending within each group (lowest first for review)
    const byScore = (a: SourceLayerMapping, b: SourceLayerMapping) =>
      (scoreMap.get(a.sourceModel.name) ?? 0) -
      (scoreMap.get(b.sourceModel.name) ?? 0);
    green.sort(byScore);
    yellow.sort(byScore);

    const accepted = phaseItems.filter(
      (i) => !rejectedNames.has(i.sourceModel.name),
    );
    const greenAccepted = green.filter(
      (i) => !rejectedNames.has(i.sourceModel.name),
    );
    const yellowAccepted = yellow.filter(
      (i) => !rejectedNames.has(i.sourceModel.name),
    );

    const groups = accepted.filter(
      (i) =>
        i.isGroup && i.sourceModel.groupType !== "SUBMODEL_GROUP",
    );
    const hdGroups = accepted.filter(
      (i) => i.sourceModel.groupType === "SUBMODEL_GROUP",
    );
    const models = accepted.filter(
      (i) => !i.isGroup && i.sourceModel.groupType !== "SUBMODEL_GROUP",
    );

    return {
      greenItems: green,
      yellowItems: yellow,
      stats: {
        total: phaseItems.length,
        accepted: accepted.length,
        greenCount: green.length,
        yellowCount: yellow.length,
        greenAccepted: greenAccepted.length,
        yellowAccepted: yellowAccepted.length,
        overallTotal: overallProgress.total,
        groups: groups.length,
        models: models.length,
        hdGroups: hdGroups.length,
        coveragePercent:
          overallProgress.total > 0
            ? Math.round((accepted.length / overallProgress.total) * 100)
            : 0,
      },
    };
  }, [phaseItems, rejectedNames, scoreMap, overallProgress.total]);

  // Search filter
  const filterBySearch = (items: SourceLayerMapping[]) => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) => {
      const sugg = suggestions.get(i.sourceModel.name);
      return (
        i.sourceModel.name.toLowerCase().includes(q) ||
        (sugg && sugg.name.toLowerCase().includes(q))
      );
    });
  };

  const filteredYellow = filterBySearch(yellowItems);
  const filteredGreen = filterBySearch(greenItems);

  const toggleReject = (name: string) => {
    setRejectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleContinue = () => {
    // Assign all non-rejected items with their top suggestion
    for (const item of phaseItems) {
      if (item.isMapped) continue;
      if (rejectedNames.has(item.sourceModel.name)) continue;
      const sugg = suggestions.get(item.sourceModel.name);
      if (sugg) {
        interactive.assignUserModelToLayer(item.sourceModel.name, sugg.name);
      }
    }
    // Reassign rejected items to their fallback phases
    if (rejectedNames.size > 0) {
      reassignFromAutoAccept(rejectedNames);
    }
    goToNextPhase();
  };

  // No high-confidence matches at all
  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#128170;</span>}
        title="Manual Matching Mode"
        description="No 70%+ auto-matches this time — continue to map groups, models, and submodel groups manually."
      />
    );
  }

  // User came back — everything already mapped
  const unmappedCount = phaseItems.filter((i) => !i.isMapped).length;
  if (unmappedCount === 0) {
    return <AllDoneView items={phaseItems} scoreMap={scoreMap} interactive={interactive} overallTotal={overallProgress.total} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Success Banner ───────────────────────────── */}
      <div className="px-8 py-5 flex-shrink-0 border-b border-border">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {stats.accepted} Items Auto-Matched
              </h2>
              <p className="text-[13px] text-foreground/50">
                {stats.groups > 0 && <>{stats.groups} Group{stats.groups !== 1 && "s"} &middot; </>}
                {stats.models} Model{stats.models !== 1 && "s"}
                {stats.hdGroups > 0 && <> &middot; {stats.hdGroups} HD Group{stats.hdGroups !== 1 && "s"}</>}
              </p>
            </div>
          </div>

          {/* Coverage Bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium text-foreground/60">
                Display Coverage
              </span>
              <span className="text-lg font-bold text-green-400">
                {stats.coveragePercent}%
              </span>
            </div>
            <CoverageBar
              greenCount={stats.greenAccepted}
              yellowCount={stats.yellowAccepted}
              total={stats.overallTotal}
            />
          </div>
        </div>
      </div>

      {/* ── Instructions + Search ───────────────────── */}
      <div className="px-8 pt-4 pb-2 flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-foreground/50 mb-3">
            Uncheck any items you&apos;d prefer to map manually:
          </p>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search matches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
            />
          </div>
        </div>
      </div>

      {/* ── Scrollable Sections ─────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-3">
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Yellow Section — Needs Review (default OPEN) */}
          {yellowItems.length > 0 && (
            <CollapsibleSection
              color="yellow"
              open={yellowOpen}
              onToggle={() => setYellowOpen(!yellowOpen)}
              label={`Needs Review (${filteredYellow.length} match${filteredYellow.length !== 1 ? "es" : ""})`}
              badge="70-89%"
              items={filteredYellow}
              rejectedNames={rejectedNames}
              suggestions={suggestions}
              scoreMap={scoreMap}
              onToggleReject={toggleReject}
              searchActive={!!search}
            />
          )}

          {/* Green Section — High Confidence (default CLOSED) */}
          {greenItems.length > 0 && (
            <CollapsibleSection
              color="green"
              open={greenOpen}
              onToggle={() => setGreenOpen(!greenOpen)}
              label={`High Confidence (${filteredGreen.length} match${filteredGreen.length !== 1 ? "es" : ""})`}
              badge="90%+"
              items={filteredGreen}
              rejectedNames={rejectedNames}
              suggestions={suggestions}
              scoreMap={scoreMap}
              onToggleReject={toggleReject}
              searchActive={!!search}
            />
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      <div className="px-8 py-4 border-t border-border flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-sm text-foreground/40">
            {stats.accepted} of {stats.total} accepted
          </span>
          <button
            type="button"
            onClick={handleContinue}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-green-600/20"
          >
            Continue
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Coverage Bar ────────────────────────────────────────

function CoverageBar({
  greenCount,
  yellowCount,
  total,
}: {
  greenCount: number;
  yellowCount: number;
  total: number;
}) {
  if (total === 0) return null;
  const greenPct = (greenCount / total) * 100;
  const yellowPct = (yellowCount / total) * 100;
  const uncoveredPct = Math.max(0, 100 - greenPct - yellowPct);

  return (
    <div className="space-y-1.5">
      <div className="h-5 rounded-full overflow-hidden bg-foreground/10 flex">
        {greenPct > 0 && (
          <div
            className="bg-green-500 flex items-center justify-center text-[10px] text-white font-semibold transition-all duration-500"
            style={{ width: `${greenPct}%` }}
          >
            {greenPct > 12 && greenCount}
          </div>
        )}
        {yellowPct > 0 && (
          <div
            className="bg-amber-400 flex items-center justify-center text-[10px] text-amber-900 font-semibold transition-all duration-500"
            style={{ width: `${yellowPct}%` }}
          >
            {yellowPct > 8 && yellowCount}
          </div>
        )}
        {uncoveredPct > 0 && (
          <div
            className="bg-foreground/5 flex items-center justify-center text-[10px] text-foreground/30 transition-all duration-500"
            style={{ width: `${uncoveredPct}%` }}
          >
            {uncoveredPct > 12 && `${Math.round(uncoveredPct)}%`}
          </div>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-foreground/40">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-500" />
          {greenCount} green ({Math.round(greenPct)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
          {yellowCount} yellow ({Math.round(yellowPct)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-foreground/10" />
          uncovered
        </span>
      </div>
    </div>
  );
}

// ─── Collapsible Section ────────────────────────────────

function CollapsibleSection({
  color,
  open,
  onToggle,
  label,
  badge,
  items,
  rejectedNames,
  suggestions,
  scoreMap,
  onToggleReject,
  searchActive,
}: {
  color: "green" | "yellow";
  open: boolean;
  onToggle: () => void;
  label: string;
  badge: string;
  items: SourceLayerMapping[];
  rejectedNames: Set<string>;
  suggestions: Map<string, { name: string; score: number; pixelCount: number | undefined }>;
  scoreMap: Map<string, number>;
  onToggleReject: (name: string) => void;
  searchActive: boolean;
}) {
  const isGreen = color === "green";
  const headerBg = isGreen ? "bg-green-500/5" : "bg-amber-500/5";
  const headerHover = isGreen
    ? "hover:bg-green-500/10"
    : "hover:bg-amber-500/10";
  const headerText = isGreen ? "text-green-400" : "text-amber-400";
  const badgeBg = isGreen
    ? "bg-green-500/15 text-green-400"
    : "bg-amber-500/15 text-amber-400";
  const icon = isGreen ? "\u2713" : "\u26A0";

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full px-4 py-3 ${headerBg} ${headerHover} flex items-center justify-between transition-colors`}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-foreground/40 transition-transform ${open ? "rotate-90" : ""}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className={`font-medium text-sm ${headerText}`}>
            {icon} {label}
          </span>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badgeBg}`}
        >
          {badge}
        </span>
      </button>

      {/* Items */}
      {open && (
        <div className="divide-y divide-border/30">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-foreground/30">
              No matches{searchActive && " matching your search"}
            </div>
          ) : (
            items.map((item) => (
              <AutoMatchRow
                key={item.sourceModel.name}
                item={item}
                isRejected={rejectedNames.has(item.sourceModel.name)}
                suggestion={suggestions.get(item.sourceModel.name)}
                score={scoreMap.get(item.sourceModel.name) ?? 0}
                onToggle={() => onToggleReject(item.sourceModel.name)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Match Row ──────────────────────────────────────────

function AutoMatchRow({
  item,
  isRejected,
  suggestion,
  score,
  onToggle,
}: {
  item: SourceLayerMapping;
  isRejected: boolean;
  suggestion: { name: string; score: number; pixelCount: number | undefined } | undefined;
  score: number;
  onToggle: () => void;
}) {
  const isAccepted = !isRejected;
  const typeLabel = getTypeLabel(item);
  const typeBadgeClass = getTypeBadgeClass(item);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-foreground/[0.02] ${
        isRejected ? "opacity-40" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isAccepted
            ? "bg-green-500 border-green-500"
            : "border-foreground/20 hover:border-foreground/40"
        }`}
      >
        {isAccepted && (
          <svg
            className="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Source name */}
      <span className="text-[13px] font-medium text-foreground truncate flex-1 min-w-0">
        {item.sourceModel.name}
      </span>

      {/* Arrow */}
      <svg
        className="w-4 h-4 text-foreground/20 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14 5l7 7m0 0l-7 7m7-7H3"
        />
      </svg>

      {/* Dest name */}
      <span className="text-[13px] text-foreground/50 truncate flex-1 min-w-0 text-right">
        {suggestion?.name ?? "—"}
      </span>

      {/* Type badge */}
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${typeBadgeClass}`}
      >
        {typeLabel}
      </span>

      {/* Confidence */}
      <ConfidenceBadge score={score} size="sm" />
    </div>
  );
}

// ─── All Done View (user navigated back) ────────────────

function AllDoneView({
  items,
  scoreMap,
  interactive,
  overallTotal,
}: {
  items: SourceLayerMapping[];
  scoreMap: Map<string, number>;
  interactive: { getSuggestionsForLayer: (model: SourceLayerMapping["sourceModel"]) => { model: { name: string }; score: number }[] };
  overallTotal: number;
}) {
  const greenItems = items.filter(
    (i) => (scoreMap.get(i.sourceModel.name) ?? 0) >= GREEN_THRESHOLD,
  );
  const yellowItems = items.filter(
    (i) => (scoreMap.get(i.sourceModel.name) ?? 0) < GREEN_THRESHOLD,
  );
  const coveragePercent =
    overallTotal > 0 ? Math.round((items.length / overallTotal) * 100) : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-8 py-6 flex-shrink-0 border-b border-border">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Auto-Matches Complete!
              </h2>
              <p className="text-[13px] text-foreground/50">
                {items.length} items confirmed
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium text-foreground/60">
                Display Coverage
              </span>
              <span className="text-lg font-bold text-green-400">
                {coveragePercent}%
              </span>
            </div>
            <CoverageBar
              greenCount={greenItems.length}
              yellowCount={yellowItems.length}
              total={overallTotal}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-3">
        <div className="max-w-2xl mx-auto bg-surface rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border/30">
            {items.map((item) => {
              const score = scoreMap.get(item.sourceModel.name) ?? 0;
              return (
                <div
                  key={item.sourceModel.name}
                  className="px-4 py-2.5 flex items-center gap-3 hover:bg-foreground/[0.02]"
                >
                  <svg
                    className="w-4 h-4 text-green-400 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-[13px] text-foreground/70 truncate flex-1">
                    {item.sourceModel.name}
                  </span>
                  <span className="text-foreground/20">&rarr;</span>
                  <span className="text-[13px] text-foreground/50 truncate flex-1 text-right">
                    {item.assignedUserModels[0]?.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${getTypeBadgeClass(item)}`}
                  >
                    {getTypeLabel(item)}
                  </span>
                  <ConfidenceBadge score={score} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
