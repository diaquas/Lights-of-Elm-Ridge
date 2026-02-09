"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { SacrificeSummary } from "../SacrificeIndicator";
import { generateMatchReasoning } from "@/lib/modiq/generateReasoning";
import type { ModelMapping } from "@/lib/modiq";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

const GREEN_THRESHOLD = 0.9;

// ─── Type helpers ────────────────────────────────────────

type ItemTypeFilter = "all" | "groups" | "models" | "submodelGroups";

function getItemTypeKey(layer: SourceLayerMapping): Exclude<ItemTypeFilter, "all"> {
  if (layer.sourceModel.groupType === "SUBMODEL_GROUP") return "submodelGroups";
  if (layer.isGroup) return "groups";
  return "models";
}

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
    reassignFromAutoAccept,
    registerOnContinue,
  } = useMappingPhase();

  const [rejectedNames, setRejectedNames] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [yellowOpen, setYellowOpen] = useState(true);
  const [greenOpen, setGreenOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>("all");

  // Build top-suggestion map for each item using greedy assignment.
  // Each destination model can only be used once — once claimed by the
  // highest-scoring source, subsequent sources fall back to their next-best.
  const suggestions = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        score: number;
        pixelCount: number | undefined;
        factors: ModelMapping["factors"];
      }
    >();

    // Sort items by score descending so the best matches get first pick
    const sortedItems = [...phaseItems].sort((a, b) => {
      const sa = scoreMap.get(a.sourceModel.name) ?? 0;
      const sb = scoreMap.get(b.sourceModel.name) ?? 0;
      return sb - sa;
    });

    const usedDests = new Set<string>();

    for (const item of sortedItems) {
      const suggs = interactive.getSuggestionsForLayer(item.sourceModel);
      // Find the best suggestion whose destination hasn't been claimed yet
      for (const sugg of suggs) {
        if (!usedDests.has(sugg.model.name)) {
          usedDests.add(sugg.model.name);
          map.set(item.sourceModel.name, {
            name: sugg.model.name,
            score: sugg.score,
            pixelCount: sugg.model.pixelCount,
            factors: sugg.factors,
          });
          break;
        }
      }
    }

    return map;
  }, [phaseItems, interactive, scoreMap]);

  // Split into green (90%+) and yellow (70-89%) groups
  const { greenItems, yellowItems, stats, typeCounts } = useMemo(() => {
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
      (i) => i.isGroup && i.sourceModel.groupType !== "SUBMODEL_GROUP",
    );
    const hdGroups = accepted.filter(
      (i) => i.sourceModel.groupType === "SUBMODEL_GROUP",
    );
    const models = accepted.filter(
      (i) => !i.isGroup && i.sourceModel.groupType !== "SUBMODEL_GROUP",
    );

    // Per-type counts with high/review breakdown
    const typeCounts = {
      all: { total: phaseItems.length, high: green.length, review: yellow.length },
      groups: { total: 0, high: 0, review: 0 },
      models: { total: 0, high: 0, review: 0 },
      submodelGroups: { total: 0, high: 0, review: 0 },
    };
    for (const item of phaseItems) {
      const key = getItemTypeKey(item);
      const isHigh = (scoreMap.get(item.sourceModel.name) ?? 0) >= GREEN_THRESHOLD;
      typeCounts[key].total++;
      if (isHigh) typeCounts[key].high++;
      else typeCounts[key].review++;
    }

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
        groups: groups.length,
        models: models.length,
        hdGroups: hdGroups.length,
      },
      typeCounts,
    };
  }, [phaseItems, rejectedNames, scoreMap]);

  // Preview coverage metrics for accepted items (before they're actually mapped)
  const coveragePreview = useMemo(() => {
    const accepted = phaseItems.filter(
      (i) => !rejectedNames.has(i.sourceModel.name),
    );

    // Effects: sum of effectCount for accepted items vs all effects
    const acceptedEffects = accepted.reduce((sum, i) => sum + i.effectCount, 0);
    const totalEffects = interactive.effectsCoverage.total;
    const effectsPercent =
      totalEffects > 0 ? Math.round((acceptedEffects / totalEffects) * 100) : 0;

    // Display: unique user models that would light up
    const uniqueDest = new Set<string>();
    for (const item of accepted) {
      const sugg = suggestions.get(item.sourceModel.name);
      if (sugg) uniqueDest.add(sugg.name);
    }
    const displayTotal = interactive.displayCoverage.total;
    const displayPercent =
      displayTotal > 0 ? Math.round((uniqueDest.size / displayTotal) * 100) : 0;

    return {
      effects: {
        covered: acceptedEffects,
        total: totalEffects,
        percent: effectsPercent,
      },
      display: {
        covered: uniqueDest.size,
        total: displayTotal,
        percent: displayPercent,
      },
    };
  }, [
    phaseItems,
    rejectedNames,
    interactive.effectsCoverage.total,
    interactive.displayCoverage.total,
    suggestions,
  ]);

  // Combined type + search filter
  const filterItems = (items: SourceLayerMapping[]) => {
    let result = items;
    if (typeFilter !== "all") {
      result = result.filter((i) => getItemTypeKey(i) === typeFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) => {
        const sugg = suggestions.get(i.sourceModel.name);
        return (
          i.sourceModel.name.toLowerCase().includes(q) ||
          (sugg && sugg.name.toLowerCase().includes(q))
        );
      });
    }
    return result;
  };

  const filteredYellow = filterItems(yellowItems);
  const filteredGreen = filterItems(greenItems);

  const toggleReject = (name: string) => {
    setRejectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleContinue = useCallback(() => {
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
    // Clear override before navigating so other phases use default behavior
    registerOnContinue(null);
    goToNextPhase();
  }, [
    phaseItems,
    rejectedNames,
    suggestions,
    interactive,
    reassignFromAutoAccept,
    registerOnContinue,
    goToNextPhase,
  ]);

  // Register the custom continue handler so the top nav button triggers it
  useEffect(() => {
    registerOnContinue(handleContinue);
    return () => registerOnContinue(null);
  }, [registerOnContinue, handleContinue]);

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
    return (
      <AllDoneView
        items={phaseItems}
        scoreMap={scoreMap}
        suggestions={suggestions}
        displayCoverage={interactive.displayCoverage}
        effectsCoverage={interactive.effectsCoverage}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Compact Header ────────────────────────────── */}
      <div className="px-6 pt-3 pb-3 flex-shrink-0 border-b border-border">
        <div className="max-w-3xl mx-auto">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-green-400"
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
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">
                {stats.accepted} Items Auto-Matched
              </h2>
              <p className="text-xs text-foreground/50">
                {stats.groups > 0 && (
                  <>
                    {stats.groups} Group{stats.groups !== 1 && "s"}{" "}
                    &middot;{" "}
                  </>
                )}
                {stats.models} Model{stats.models !== 1 && "s"}
                {stats.hdGroups > 0 && (
                  <>
                    {" "}
                    &middot; {stats.hdGroups} HD Group
                    {stats.hdGroups !== 1 && "s"}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Collapsible Summary Bar */}
          <button
            type="button"
            onClick={() => setSummaryOpen(!summaryOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-foreground/5 hover:bg-foreground/[0.07] rounded-lg transition-colors mb-2"
          >
            <div className="flex items-center gap-3 text-xs">
              <svg
                className={`w-3 h-3 text-foreground/40 transition-transform ${summaryOpen ? "rotate-90" : ""}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium text-foreground/60">
                Match Quality
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">
                {stats.greenAccepted} high
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                {stats.yellowAccepted} review
              </span>
              <span className="text-foreground/20">|</span>
              <span className="text-foreground/40 tabular-nums">
                {coveragePreview.display.percent}% display &middot;{" "}
                {coveragePreview.effects.percent}% effects
              </span>
            </div>
            <svg
              className={`w-3.5 h-3.5 text-foreground/30 transition-transform ${summaryOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Expanded Summary Details */}
          {summaryOpen && (
            <div className="mb-2 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Your Display */}
                <div
                  className={`rounded-lg border p-3 text-center ${
                    coveragePreview.display.percent >= 80
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-1">
                    Your Display
                  </div>
                  <div
                    className={`text-2xl font-bold mb-1 ${
                      coveragePreview.display.percent >= 80
                        ? "text-green-400"
                        : "text-amber-400"
                    }`}
                  >
                    {coveragePreview.display.percent}%
                  </div>
                  <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        coveragePreview.display.percent >= 80
                          ? "bg-green-500"
                          : "bg-amber-500"
                      }`}
                      style={{
                        width: `${Math.min(coveragePreview.display.percent, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-foreground/40">
                    {coveragePreview.display.covered} / {coveragePreview.display.total} models
                  </p>
                </div>

                {/* Sequence Effects */}
                <div
                  className={`rounded-lg border p-3 text-center ${
                    coveragePreview.effects.percent >= 70
                      ? "border-blue-500/30 bg-blue-500/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-1">
                    Sequence Effects
                  </div>
                  <div
                    className={`text-2xl font-bold mb-1 ${
                      coveragePreview.effects.percent >= 70
                        ? "text-blue-400"
                        : "text-amber-400"
                    }`}
                  >
                    {coveragePreview.effects.percent}%
                  </div>
                  <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        coveragePreview.effects.percent >= 70
                          ? "bg-blue-500"
                          : "bg-amber-500"
                      }`}
                      style={{
                        width: `${Math.min(coveragePreview.effects.percent, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-foreground/40">
                    {coveragePreview.effects.covered.toLocaleString()} / {coveragePreview.effects.total.toLocaleString()} effects
                  </p>
                </div>
              </div>

              {/* Match Quality Bar */}
              {stats.accepted > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] text-foreground/40 mb-1">
                    <span>Match Quality</span>
                    <span>
                      {stats.greenAccepted} high &middot;{" "}
                      {stats.yellowAccepted} review
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-foreground/10 flex">
                    {stats.greenAccepted > 0 && (
                      <div
                        className="bg-green-500 transition-all duration-500"
                        style={{
                          width: `${(stats.greenAccepted / stats.accepted) * 100}%`,
                        }}
                      />
                    )}
                    {stats.yellowAccepted > 0 && (
                      <div
                        className="bg-amber-400 transition-all duration-500"
                        style={{
                          width: `${(stats.yellowAccepted / stats.accepted) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optimized Assignment Trade-offs */}
          {interactive.sacrifices.length > 0 && (
            <div className="mb-2">
              <SacrificeSummary sacrifices={interactive.sacrifices} />
            </div>
          )}

          {/* Quick Type Filters */}
          <QuickFilterBar
            typeCounts={typeCounts}
            activeFilter={typeFilter}
            onSelect={setTypeFilter}
          />

          {/* Search + instruction inline */}
          <div className="flex items-center gap-3 mt-2">
            <p className="text-xs text-foreground/40 shrink-0">
              Uncheck to map manually:
            </p>
            <div className="relative flex-1">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30"
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
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Match List — fills remaining space ────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Yellow Section — Needs Review (default OPEN) */}
          {filteredYellow.length > 0 && (
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
          {filteredGreen.length > 0 && (
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
  suggestions: Map<
    string,
    {
      name: string;
      score: number;
      pixelCount: number | undefined;
      factors: ModelMapping["factors"];
    }
  >;
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
        className={`w-full px-3 py-2 ${headerBg} ${headerHover} flex items-center justify-between transition-colors`}
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
  suggestion:
    | {
        name: string;
        score: number;
        pixelCount: number | undefined;
        factors: ModelMapping["factors"];
      }
    | undefined;
  score: number;
  onToggle: () => void;
}) {
  const isAccepted = !isRejected;
  const typeLabel = getTypeLabel(item);
  const typeBadgeClass = getTypeBadgeClass(item);
  const reasoning = useMemo(
    () =>
      suggestion
        ? generateMatchReasoning(
            suggestion.factors,
            score,
            item.sourceModel.pixelCount && suggestion.pixelCount
              ? {
                  source: item.sourceModel.pixelCount,
                  dest: suggestion.pixelCount,
                }
              : undefined,
          )
        : undefined,
    [suggestion, score, item.sourceModel.pixelCount],
  );

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 min-h-[36px] transition-colors hover:bg-foreground/[0.02] ${
        isRejected ? "opacity-40" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isAccepted
            ? "bg-green-500 border-green-500"
            : "border-foreground/20 hover:border-foreground/40"
        }`}
      >
        {isAccepted && (
          <svg
            className="w-2.5 h-2.5 text-white"
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
      <span className="text-xs font-medium text-foreground truncate flex-1 min-w-0">
        {item.sourceModel.name}
      </span>

      {/* Arrow */}
      <svg
        className="w-3 h-3 text-foreground/20 flex-shrink-0"
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
      <span className="text-xs text-foreground/50 truncate flex-1 min-w-0 text-right">
        {suggestion?.name ?? "\u2014"}
      </span>

      {/* Type badge */}
      <span
        className={`text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${typeBadgeClass}`}
      >
        {typeLabel}
      </span>

      {/* Confidence */}
      <ConfidenceBadge score={score} reasoning={reasoning} size="sm" />
    </div>
  );
}

// ─── All Done View (user navigated back) ────────────────

function AllDoneView({
  items,
  scoreMap,
  suggestions,
  displayCoverage,
  effectsCoverage,
}: {
  items: SourceLayerMapping[];
  scoreMap: Map<string, number>;
  suggestions: Map<
    string,
    {
      name: string;
      score: number;
      pixelCount: number | undefined;
      factors: ModelMapping["factors"];
    }
  >;
  displayCoverage: { covered: number; total: number; percent: number };
  effectsCoverage: { covered: number; total: number; percent: number };
}) {
  const greenCount = items.filter(
    (i) => (scoreMap.get(i.sourceModel.name) ?? 0) >= GREEN_THRESHOLD,
  ).length;
  const yellowCount = items.length - greenCount;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-3 pb-3 flex-shrink-0 border-b border-border">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-green-400"
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
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">
                Auto-Matches Complete!
              </h2>
              <p className="text-xs text-foreground/50">
                {items.length} items confirmed
              </p>
            </div>
          </div>

          {/* Inline coverage + quality summary */}
          <div className="flex items-center gap-3 px-3 py-2 bg-foreground/5 rounded-lg text-xs mb-2">
            <span className="text-foreground/40 tabular-nums">
              {displayCoverage.percent}% display
            </span>
            <span className="text-foreground/20">&middot;</span>
            <span className="text-foreground/40 tabular-nums">
              {effectsCoverage.percent}% effects
            </span>
            <span className="text-foreground/20">|</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">
              {greenCount} high
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
              {yellowCount} review
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
        <div className="max-w-3xl mx-auto bg-surface rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border/30">
            {items.map((item) => {
              const score = scoreMap.get(item.sourceModel.name) ?? 0;
              const sugg = suggestions.get(item.sourceModel.name);
              const reasoning = sugg
                ? generateMatchReasoning(
                    sugg.factors,
                    score,
                    item.sourceModel.pixelCount && sugg.pixelCount
                      ? {
                          source: item.sourceModel.pixelCount,
                          dest: sugg.pixelCount,
                        }
                      : undefined,
                  )
                : undefined;
              return (
                <div
                  key={item.sourceModel.name}
                  className="px-3 py-1.5 min-h-[36px] flex items-center gap-2 hover:bg-foreground/[0.02]"
                >
                  <svg
                    className="w-3.5 h-3.5 text-green-400 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-xs text-foreground/70 truncate flex-1">
                    {item.sourceModel.name}
                  </span>
                  <span className="text-foreground/20 text-xs">&rarr;</span>
                  <span className="text-xs text-foreground/50 truncate flex-1 text-right">
                    {item.assignedUserModels[0]?.name}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${getTypeBadgeClass(item)}`}
                  >
                    {getTypeLabel(item)}
                  </span>
                  <ConfidenceBadge
                    score={score}
                    reasoning={reasoning}
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Filter Bar ────────────────────────────────────

interface TypeCounts {
  all: { total: number; high: number; review: number };
  groups: { total: number; high: number; review: number };
  models: { total: number; high: number; review: number };
  submodelGroups: { total: number; high: number; review: number };
}

const FILTER_OPTIONS: {
  key: ItemTypeFilter;
  label: string;
  color: string;
  activeColor: string;
}[] = [
  { key: "all", label: "All", color: "text-foreground/60", activeColor: "text-foreground" },
  { key: "groups", label: "Groups", color: "text-blue-400/60", activeColor: "text-blue-400" },
  { key: "models", label: "Models", color: "text-foreground/40", activeColor: "text-foreground/70" },
  { key: "submodelGroups", label: "HD Groups", color: "text-purple-400/60", activeColor: "text-purple-400" },
];

function QuickFilterBar({
  typeCounts,
  activeFilter,
  onSelect,
}: {
  typeCounts: TypeCounts;
  activeFilter: ItemTypeFilter;
  onSelect: (filter: ItemTypeFilter) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {FILTER_OPTIONS.map(({ key, label, color, activeColor }) => {
        const counts = typeCounts[key];
        if (key !== "all" && counts.total === 0) return null;
        const isActive = activeFilter === key;
        return (
          <QuickFilterButton
            key={key}
            label={label}
            total={counts.total}
            high={counts.high}
            review={counts.review}
            isActive={isActive}
            color={isActive ? activeColor : color}
            onClick={() => onSelect(isActive && key !== "all" ? "all" : key)}
          />
        );
      })}
    </div>
  );
}

function QuickFilterButton({
  label,
  total,
  high,
  review,
  isActive,
  color,
  onClick,
}: {
  label: string;
  total: number;
  high: number;
  review: number;
  isActive: boolean;
  color: string;
  onClick: () => void;
}) {
  const highPercent = total > 0 ? (high / total) * 100 : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center flex-1 px-2 py-1.5 rounded-lg border transition-all ${
        isActive
          ? "border-foreground/20 bg-foreground/[0.07] ring-1 ring-foreground/10"
          : "border-transparent hover:bg-foreground/[0.04]"
      }`}
    >
      <span className={`text-[10px] font-medium ${color}`}>{label}</span>
      <span className={`text-lg font-bold tabular-nums leading-tight ${color}`}>
        {total}
      </span>
      {/* Mini high/review progress bar */}
      <div className="w-full h-1 bg-foreground/10 rounded-full overflow-hidden mt-0.5 flex">
        {high > 0 && (
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${highPercent}%` }}
          />
        )}
        {review > 0 && (
          <div
            className="h-full bg-amber-400"
            style={{ width: `${100 - highPercent}%` }}
          />
        )}
      </div>
    </button>
  );
}
