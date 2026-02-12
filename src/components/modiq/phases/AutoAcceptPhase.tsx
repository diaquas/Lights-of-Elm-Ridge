"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { SortDropdown, sortItems, type SortOption } from "../SortDropdown";
import { generateMatchReasoning } from "@/lib/modiq/generateReasoning";
import type { ModelMapping } from "@/lib/modiq";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

const STRONG_THRESHOLD = 0.75;

// ─── Type helpers ────────────────────────────────────────

type ItemTypeFilter = "all" | "groups" | "models" | "submodelGroups";

function getItemTypeKey(
  layer: SourceLayerMapping,
): Exclude<ItemTypeFilter, "all"> {
  if (layer.sourceModel.groupType === "SUBMODEL_GROUP") return "submodelGroups";
  if (layer.isGroup) return "groups";
  return "models";
}

function getTypeLabel(layer: SourceLayerMapping): string {
  if (layer.sourceModel.groupType === "SUBMODEL_GROUP") return "Submodel";
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
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [sortVersion, setSortVersion] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(true);
  const [strongOpen, setStrongOpen] = useState(true);

  const stableOrderRef = useRef<Map<string, number>>(new Map());
  const lastSortRef = useRef({
    sortBy: "" as SortOption,
    sortVersion: -1,
    search: "",
    typeFilter: "" as string,
  });

  // Build top-suggestion map using two-pass greedy assignment.
  // Pass 1: Each dest claimed only once (highest-scoring source wins).
  // Pass 2: Items with no unique dest get their top suggestion for display,
  //   marked as "conflicted" so they're auto-rejected and sent to manual phases.
  const { suggestions, conflictedNames } = useMemo(() => {
    type Suggestion = {
      name: string;
      score: number;
      pixelCount: number | undefined;
      factors: ModelMapping["factors"];
    };
    const map = new Map<string, Suggestion>();
    const unique = new Set<string>();

    const sortedItems = [...phaseItems].sort((a, b) => {
      const sa = scoreMap.get(a.sourceModel.name) ?? 0;
      const sb = scoreMap.get(b.sourceModel.name) ?? 0;
      return sb - sa;
    });

    // Pass 1 — greedy unique assignment
    const usedDests = new Set<string>();
    for (const item of sortedItems) {
      const suggs = interactive.getSuggestionsForLayer(item.sourceModel);
      for (const sugg of suggs) {
        if (!usedDests.has(sugg.model.name)) {
          usedDests.add(sugg.model.name);
          map.set(item.sourceModel.name, {
            name: sugg.model.name,
            score: sugg.score,
            pixelCount: sugg.model.pixelCount,
            factors: sugg.factors,
          });
          unique.add(item.sourceModel.name);
          break;
        }
      }
    }

    // Pass 2 — fallback for items with no unique dest (display only)
    const conflicted = new Set<string>();
    for (const item of phaseItems) {
      if (map.has(item.sourceModel.name)) continue;
      const suggs = interactive.getSuggestionsForLayer(item.sourceModel);
      if (suggs.length > 0) {
        map.set(item.sourceModel.name, {
          name: suggs[0].model.name,
          score: suggs[0].score,
          pixelCount: suggs[0].model.pixelCount,
          factors: suggs[0].factors,
        });
      }
      conflicted.add(item.sourceModel.name);
    }

    return { suggestions: map, conflictedNames: conflicted };
  }, [phaseItems, interactive, scoreMap]);

  // Auto-reject conflicted items on first load so they go to manual phases
  const didAutoReject = useRef(false);
  useEffect(() => {
    if (didAutoReject.current || conflictedNames.size === 0) return;
    didAutoReject.current = true;
    setRejectedNames((prev) => {
      const next = new Set(prev);
      for (const name of conflictedNames) next.add(name);
      return next;
    });
  }, [conflictedNames]);

  // Compute stats for header
  const { stats, typeCounts } = useMemo(() => {
    const accepted = phaseItems.filter(
      (i) => !rejectedNames.has(i.sourceModel.name),
    );

    let strongCount = 0;
    let reviewCount = 0;
    for (const item of phaseItems) {
      if ((scoreMap.get(item.sourceModel.name) ?? 0) >= STRONG_THRESHOLD)
        strongCount++;
      else reviewCount++;
    }

    const groups = accepted.filter(
      (i) => i.isGroup && i.sourceModel.groupType !== "SUBMODEL_GROUP",
    );
    const submodels = accepted.filter(
      (i) => i.sourceModel.groupType === "SUBMODEL_GROUP",
    );
    const models = accepted.filter(
      (i) => !i.isGroup && i.sourceModel.groupType !== "SUBMODEL_GROUP",
    );

    const typeCounts = {
      all: { total: phaseItems.length, high: strongCount, review: reviewCount },
      groups: { total: 0, high: 0, review: 0 },
      models: { total: 0, high: 0, review: 0 },
      submodelGroups: { total: 0, high: 0, review: 0 },
    };
    for (const item of phaseItems) {
      const key = getItemTypeKey(item);
      const isStrong =
        (scoreMap.get(item.sourceModel.name) ?? 0) >= STRONG_THRESHOLD;
      typeCounts[key].total++;
      if (isStrong) typeCounts[key].high++;
      else typeCounts[key].review++;
    }

    return {
      stats: {
        total: phaseItems.length,
        accepted: accepted.length,
        strongCount,
        reviewCount,
        groups: groups.length,
        models: models.length,
        submodels: submodels.length,
      },
      typeCounts,
    };
  }, [phaseItems, rejectedNames, scoreMap]);

  // Coverage preview (promoted to inline header)
  const coveragePreview = useMemo(() => {
    const accepted = phaseItems.filter(
      (i) => !rejectedNames.has(i.sourceModel.name),
    );
    const acceptedEffects = accepted.reduce((sum, i) => sum + i.effectCount, 0);
    const totalEffects = interactive.effectsCoverage.total;
    const effectsPercent =
      totalEffects > 0
        ? Math.round((acceptedEffects / totalEffects) * 100)
        : 0;

    const uniqueDest = new Set<string>();
    for (const item of accepted) {
      const sugg = suggestions.get(item.sourceModel.name);
      if (sugg) uniqueDest.add(sugg.name);
    }
    const displayTotal = interactive.displayCoverage.total;
    const displayPercent =
      displayTotal > 0
        ? Math.round((uniqueDest.size / displayTotal) * 100)
        : 0;

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

  // Build a sortItems-compatible suggestions map for confidence sorting
  const sortSuggestionsMap = useMemo(() => {
    const m = new Map<
      string,
      { model: { name: string }; score: number } | null
    >();
    for (const [name, score] of scoreMap) {
      const sugg = suggestions.get(name);
      m.set(name, { model: { name: sugg?.name ?? "" }, score });
    }
    return m;
  }, [scoreMap, suggestions]);

  // Filtered + stably sorted items
  const filteredItems = useMemo(() => {
    let items = [...phaseItems];

    if (typeFilter !== "all") {
      items = items.filter((i) => getItemTypeKey(i) === typeFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => {
        const sugg = suggestions.get(i.sourceModel.name);
        return (
          i.sourceModel.name.toLowerCase().includes(q) ||
          (sugg && sugg.name.toLowerCase().includes(q))
        );
      });
    }

    const needsResort =
      sortBy !== lastSortRef.current.sortBy ||
      sortVersion !== lastSortRef.current.sortVersion ||
      search !== lastSortRef.current.search ||
      typeFilter !== lastSortRef.current.typeFilter;

    if (needsResort || stableOrderRef.current.size === 0) {
      const sorted = sortItems(items, sortBy, sortSuggestionsMap);
      stableOrderRef.current = new Map(
        sorted.map((r, i) => [r.sourceModel.name, i]),
      );
      lastSortRef.current = { sortBy, sortVersion, search, typeFilter };
      return sorted;
    }

    const order = stableOrderRef.current;
    return [...items].sort((a, b) => {
      const oa = order.get(a.sourceModel.name) ?? 999;
      const ob = order.get(b.sourceModel.name) ?? 999;
      return oa - ob;
    });
  }, [
    phaseItems,
    typeFilter,
    search,
    sortBy,
    sortVersion,
    sortSuggestionsMap,
    suggestions,
  ]);

  // Split filtered items into Strong / Needs Review sections
  const strongItems = useMemo(
    () =>
      filteredItems.filter(
        (i) =>
          (scoreMap.get(i.sourceModel.name) ?? 0) >= STRONG_THRESHOLD,
      ),
    [filteredItems, scoreMap],
  );
  const reviewItems = useMemo(
    () =>
      filteredItems.filter(
        (i) =>
          (scoreMap.get(i.sourceModel.name) ?? 0) < STRONG_THRESHOLD,
      ),
    [filteredItems, scoreMap],
  );

  const toggleReject = (name: string) => {
    setRejectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const rejectSection = (items: SourceLayerMapping[]) => {
    setRejectedNames((prev) => {
      const next = new Set(prev);
      for (const item of items) next.add(item.sourceModel.name);
      return next;
    });
  };

  const acceptSection = (items: SourceLayerMapping[]) => {
    setRejectedNames((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (!conflictedNames.has(item.sourceModel.name))
          next.delete(item.sourceModel.name);
      }
      return next;
    });
  };

  const handleContinue = useCallback(() => {
    const toReassign = new Set(rejectedNames);

    for (const item of phaseItems) {
      if (item.isMapped) continue;
      const name = item.sourceModel.name;

      if (conflictedNames.has(name)) {
        toReassign.add(name);
        continue;
      }

      if (rejectedNames.has(name)) continue;

      const sugg = suggestions.get(name);
      if (sugg) {
        interactive.assignUserModelToLayer(name, sugg.name);
      } else {
        toReassign.add(name);
      }
    }

    if (toReassign.size > 0) {
      reassignFromAutoAccept(toReassign);
    }
    registerOnContinue(null);
    goToNextPhase();
  }, [
    phaseItems,
    rejectedNames,
    conflictedNames,
    suggestions,
    interactive,
    reassignFromAutoAccept,
    registerOnContinue,
    goToNextPhase,
  ]);

  useEffect(() => {
    registerOnContinue(handleContinue);
    return () => registerOnContinue(null);
  }, [registerOnContinue, handleContinue]);

  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#128170;</span>}
        title="Manual Matching Mode"
        description="No 70%+ auto-matches this time — continue to map groups, models, and submodel groups manually."
      />
    );
  }

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

  // Section-level accepted counts (for section actions)
  const strongAccepted = strongItems.filter(
    (i) => !rejectedNames.has(i.sourceModel.name),
  ).length;
  const reviewAccepted = reviewItems.filter(
    (i) => !rejectedNames.has(i.sourceModel.name),
  ).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ────────────────────────────── */}
      <div className="px-6 pt-3 pb-3 flex-shrink-0 border-b border-border">
        <div className="max-w-4xl mx-auto">
          {/* Title + inline coverage */}
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
                {stats.accepted} of {stats.total} Auto-Matched
              </h2>
              <p className="text-xs text-foreground/50">
                {stats.groups > 0 && (
                  <>
                    {stats.groups} Group{stats.groups !== 1 && "s"} &middot;{" "}
                  </>
                )}
                {stats.models} Model{stats.models !== 1 && "s"}
                {stats.submodels > 0 && (
                  <>
                    {" "}
                    &middot; {stats.submodels} Submodel
                    {stats.submodels !== 1 && "s"}
                  </>
                )}
                {conflictedNames.size > 0 && (
                  <>
                    {" "}
                    &middot;{" "}
                    <span className="text-red-400">
                      {conflictedNames.size} manual
                    </span>
                  </>
                )}
              </p>
            </div>
            {/* Inline coverage preview */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <CoveragePill
                label="Display"
                percent={coveragePreview.display.percent}
                color={
                  coveragePreview.display.percent >= 80
                    ? "text-green-400"
                    : "text-amber-400"
                }
              />
              <CoveragePill
                label="Effects"
                percent={coveragePreview.effects.percent}
                color={
                  coveragePreview.effects.percent >= 70
                    ? "text-blue-400"
                    : "text-amber-400"
                }
              />
            </div>
          </div>

          {/* Quick Type Filters */}
          <QuickFilterBar
            typeCounts={typeCounts}
            activeFilter={typeFilter}
            onSelect={setTypeFilter}
          />

          {/* Search + sort toolbar */}
          <div className="flex items-center gap-2 mt-2">
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
            <SortDropdown
              value={sortBy}
              onChange={(v) => {
                setSortBy(v);
                setSortVersion((n) => n + 1);
              }}
            />
            <button
              type="button"
              onClick={() => setSortVersion((n) => n + 1)}
              className="px-2 py-1.5 text-xs text-foreground/40 hover:text-foreground/70 bg-background border border-border hover:border-foreground/20 rounded-lg transition-colors"
              title="Re-sort list"
            >
              &#8635;
            </button>
          </div>
        </div>
      </div>

      {/* ── Match sections (full width) ─────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">
        {filteredItems.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-foreground/30">
            No matches{search ? " matching your search" : ""}
          </div>
        ) : (
          <>
            {/* NEEDS REVIEW section */}
            {reviewItems.length > 0 && (
              <MatchSection
                title="NEEDS REVIEW"
                count={reviewItems.length}
                acceptedCount={reviewAccepted}
                isOpen={reviewOpen}
                onToggle={() => setReviewOpen((v) => !v)}
                onRejectAll={() => rejectSection(reviewItems)}
                onAcceptAll={() => acceptSection(reviewItems)}
                description="Matches below 75% — verify before accepting"
                borderColor="border-l-amber-400/50"
              >
                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/30">
                  {reviewItems.map((item) => (
                    <AutoMatchRow
                      key={item.sourceModel.name}
                      item={item}
                      isRejected={rejectedNames.has(item.sourceModel.name)}
                      isConflicted={conflictedNames.has(item.sourceModel.name)}
                      suggestion={suggestions.get(item.sourceModel.name)}
                      score={scoreMap.get(item.sourceModel.name) ?? 0}
                      onToggle={() => toggleReject(item.sourceModel.name)}
                    />
                  ))}
                </div>
              </MatchSection>
            )}

            {/* STRONG MATCH section */}
            {strongItems.length > 0 && (
              <MatchSection
                title="STRONG MATCH"
                count={strongItems.length}
                acceptedCount={strongAccepted}
                isOpen={strongOpen}
                onToggle={() => setStrongOpen((v) => !v)}
                onRejectAll={() => rejectSection(strongItems)}
                onAcceptAll={() => acceptSection(strongItems)}
                description="Matches at 75%+ confidence"
                borderColor="border-l-green-500/50"
              >
                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/30">
                  {strongItems.map((item) => (
                    <AutoMatchRow
                      key={item.sourceModel.name}
                      item={item}
                      isRejected={rejectedNames.has(item.sourceModel.name)}
                      isConflicted={conflictedNames.has(item.sourceModel.name)}
                      suggestion={suggestions.get(item.sourceModel.name)}
                      score={scoreMap.get(item.sourceModel.name) ?? 0}
                      onToggle={() => toggleReject(item.sourceModel.name)}
                    />
                  ))}
                </div>
              </MatchSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Coverage Pill (inline header) ───────────────────────

function CoveragePill({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-foreground/5 border border-border/50">
      <span className="text-[9px] font-semibold text-foreground/40 uppercase">
        {label}
      </span>
      <span className={`text-sm font-bold tabular-nums ${color}`}>
        {percent}%
      </span>
    </div>
  );
}

// ─── Match Section (collapsible) ─────────────────────────

function MatchSection({
  title,
  count,
  acceptedCount,
  isOpen,
  onToggle,
  onRejectAll,
  onAcceptAll,
  description,
  borderColor,
  children,
}: {
  title: string;
  count: number;
  acceptedCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onRejectAll: () => void;
  onAcceptAll: () => void;
  description: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mb-3 border-l-2 ${borderColor} pl-2`}>
      <div className="flex items-center gap-2 py-1.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <svg
            className={`w-3 h-3 text-foreground/40 transition-transform duration-150 flex-shrink-0 ${isOpen ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-[11px] font-bold text-foreground/50 uppercase tracking-wider">
            {title}
          </span>
          <span className="text-[11px] text-foreground/30 tabular-nums">
            ({acceptedCount}/{count})
          </span>
          <span className="text-[10px] text-foreground/25 hidden sm:inline">
            {description}
          </span>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {acceptedCount < count && (
            <button
              type="button"
              onClick={onAcceptAll}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
            >
              Accept All
            </button>
          )}
          {acceptedCount > 0 && (
            <button
              type="button"
              onClick={onRejectAll}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-foreground/5 text-foreground/40 hover:bg-foreground/10 transition-colors"
            >
              Reject All
            </button>
          )}
        </div>
      </div>
      {isOpen && children}
    </div>
  );
}

// ─── Match Row ──────────────────────────────────────────

function AutoMatchRow({
  item,
  isRejected,
  isConflicted,
  suggestion,
  score,
  onToggle,
}: {
  item: SourceLayerMapping;
  isRejected: boolean;
  isConflicted: boolean;
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
  const typeLabel = getTypeLabel(item);
  const typeBadgeClass = getTypeBadgeClass(item);
  const memberCount =
    item.isGroup || item.sourceModel.groupType === "SUBMODEL_GROUP"
      ? item.sourceModel.memberModels.length
      : 0;
  const fxCount = item.effectCount;
  const pct = Math.round(score * 100);
  const leftBorder = isConflicted
    ? "border-l-red-400/70"
    : score >= STRONG_THRESHOLD
      ? "border-l-green-500/70"
      : "border-l-amber-400/70";

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
      className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] border-l-[3px] ${leftBorder} transition-colors hover:bg-foreground/[0.02] ${
        isRejected ? "opacity-40" : ""
      }`}
    >
      {/* Source name + child count */}
      <span className="text-xs font-medium text-foreground truncate min-w-0 shrink">
        {item.sourceModel.name}
      </span>
      {memberCount > 0 && (
        <>
          <span className="text-foreground/15 flex-shrink-0">&middot;</span>
          <span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0 whitespace-nowrap">
            {memberCount} model{memberCount !== 1 && "s"}
          </span>
        </>
      )}

      {/* Arrow */}
      <span className="text-foreground/20 flex-shrink-0 mx-0.5">&rarr;</span>

      {/* Dest name */}
      <span
        className={`text-xs truncate min-w-0 shrink ${
          isConflicted
            ? "text-red-400/50 italic"
            : "text-foreground/60"
        }`}
      >
        {suggestion?.name ?? "\u2014"}
        {isConflicted && suggestion?.name && (
          <span
            className="text-[9px] ml-1 not-italic"
            title="Destination already claimed by a higher-scoring match"
          >
            (taken)
          </span>
        )}
      </span>

      {/* Metadata: type · fx · confidence */}
      <span className="text-foreground/15 flex-shrink-0">&middot;</span>
      <span
        className={`text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${typeBadgeClass}`}
      >
        {typeLabel}
      </span>
      <span className="text-foreground/15 flex-shrink-0">&middot;</span>
      <span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0 whitespace-nowrap">
        {fxCount >= 1000 ? `${(fxCount / 1000).toFixed(1)}k` : fxCount} fx
      </span>
      <span className="text-foreground/15 flex-shrink-0">&middot;</span>
      <ConfidenceBadge score={score} reasoning={reasoning} size="sm" />

      {/* ✕ / ↩ button */}
      {isConflicted ? (
        <span
          className="ml-auto flex-shrink-0 text-[9px] text-red-400/40 px-1"
          title="No unique destination — will be mapped manually"
        >
          manual
        </span>
      ) : isRejected ? (
        <button
          type="button"
          onClick={onToggle}
          className="ml-auto p-1 rounded-full hover:bg-green-500/10 text-foreground/20 hover:text-green-400 transition-colors flex-shrink-0"
          title="Restore auto-match"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4"
            />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="ml-auto p-1 rounded-full hover:bg-foreground/10 text-foreground/20 hover:text-foreground/50 transition-colors flex-shrink-0"
          title="Remove — map manually"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
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
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-3 pb-3 flex-shrink-0 border-b border-border">
        <div className="max-w-4xl mx-auto">
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
            <CoveragePill
              label="Display"
              percent={displayCoverage.percent}
              color={
                displayCoverage.percent >= 80
                  ? "text-green-400"
                  : "text-amber-400"
              }
            />
            <CoveragePill
              label="Effects"
              percent={effectsCoverage.percent}
              color={
                effectsCoverage.percent >= 70
                  ? "text-blue-400"
                  : "text-amber-400"
              }
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/30">
          {items.map((item) => {
            const score = scoreMap.get(item.sourceModel.name) ?? 0;
            const isStrong = score >= STRONG_THRESHOLD;
            const leftBorder = isStrong
              ? "border-l-green-500/70"
              : "border-l-amber-400/70";
            const sugg = suggestions.get(item.sourceModel.name);
            const memberCount =
              item.isGroup ||
              item.sourceModel.groupType === "SUBMODEL_GROUP"
                ? item.sourceModel.memberModels.length
                : 0;
            const fxCount = item.effectCount;
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
                className={`px-3 py-1.5 min-h-[36px] flex items-center gap-1.5 border-l-[3px] ${leftBorder} hover:bg-foreground/[0.02]`}
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
                <span className="text-xs text-foreground/70 truncate min-w-0 shrink">
                  {item.sourceModel.name}
                </span>
                {memberCount > 0 && (
                  <>
                    <span className="text-foreground/15 flex-shrink-0">
                      &middot;
                    </span>
                    <span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0 whitespace-nowrap">
                      {memberCount} model{memberCount !== 1 && "s"}
                    </span>
                  </>
                )}
                <span className="text-foreground/20 flex-shrink-0 mx-0.5">
                  &rarr;
                </span>
                <span className="text-xs text-foreground/50 truncate min-w-0 shrink">
                  {item.assignedUserModels[0]?.name}
                </span>
                <span className="text-foreground/15 flex-shrink-0">
                  &middot;
                </span>
                <span
                  className={`text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${getTypeBadgeClass(item)}`}
                >
                  {getTypeLabel(item)}
                </span>
                <span className="text-foreground/15 flex-shrink-0">
                  &middot;
                </span>
                <span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0 whitespace-nowrap">
                  {fxCount >= 1000
                    ? `${(fxCount / 1000).toFixed(1)}k`
                    : fxCount}{" "}
                  fx
                </span>
                <span className="text-foreground/15 flex-shrink-0">
                  &middot;
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
  {
    key: "all",
    label: "All",
    color: "text-foreground/60",
    activeColor: "text-foreground",
  },
  {
    key: "groups",
    label: "Groups",
    color: "text-blue-400/60",
    activeColor: "text-blue-400",
  },
  {
    key: "models",
    label: "Models",
    color: "text-foreground/40",
    activeColor: "text-foreground/70",
  },
  {
    key: "submodelGroups",
    label: "Submodels",
    color: "text-purple-400/60",
    activeColor: "text-purple-400",
  },
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
      <span
        className={`text-lg font-bold tabular-nums leading-tight ${color}`}
      >
        {total}
      </span>
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
