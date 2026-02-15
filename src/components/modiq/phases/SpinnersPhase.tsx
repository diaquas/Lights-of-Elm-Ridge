/* eslint-disable react-hooks/refs -- Refs used as stable caches (sort order, scores); intentional lazy-init in useMemo */
"use client";

import { useState, useMemo, useCallback, useRef, useEffect, memo } from "react";
import {
  useMappingPhase,
  findNextUnmapped,
} from "@/contexts/MappingPhaseContext";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { UniversalSourcePanel } from "../UniversalSourcePanel";
import {
  AutoMatchBanner,
  UnlinkIcon,
  StatusCheck,
  FxBadge,
  TypeBadge,
  HealthBar,
  DestinationPill,
  type StatusCheckStatus,
} from "../MetadataBadges";
import { STRONG_THRESHOLD, WEAK_THRESHOLD } from "@/types/mappingPhases";
import type { ModelMapping } from "@/lib/modiq/matcher";
import { sortItems, type SortOption } from "../SortDropdown";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBulkInference } from "@/hooks/useBulkInference";
import { BulkInferenceBanner } from "../BulkInferenceBanner";
import {
  PANEL_STYLES,
  TYPE_BADGE_COLORS,
  GROUP_GRID,
  SUB_GRID,
} from "../panelStyles";
import {
  CurrentMappingCard,
  NotMappedBanner,
  FilterPill,
} from "../SharedHierarchyComponents";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

type StatusFilter =
  | "all"
  | "unmapped"
  | "auto-strong"
  | "auto-review"
  | "mapped";

export function SpinnersPhase() {
  const {
    phaseItems,
    interactive,
    autoMatchedNames,
    approvedNames,
    approveAutoMatch,
    approveAllReviewItems,
    autoMatchStats,
    scoreMap,
    factorsMap,
  } = useMappingPhase();
  const dnd = useDragAndDrop();

  const bulk = useBulkInference(interactive, phaseItems);

  // Source effect counts for UsageBadge tooltip
  const sourceEffectCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of interactive.sourceLayerMappings) {
      map.set(item.sourceModel.name, item.effectCount);
    }
    return map;
  }, [interactive.sourceLayerMappings]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sortBy] = useState<SortOption>("name-asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Expand/collapse state for spinner cards (default: all expanded)
  const [expandedSpinners, setExpandedSpinners] = useState<
    Record<string, boolean>
  >({});

  // Banner filter: set by auto-match banner to show strong/review items (overrides statusFilter)
  const [bannerFilter, setBannerFilter] = useState<
    "auto-strong" | "auto-review" | null
  >(null);

  // Auto-start with "needs review" filter when there are review items
  const didAutoStartRef = useRef(false);
  useEffect(() => {
    if (didAutoStartRef.current) return;
    if (autoMatchStats.reviewCount > 0) {
      setBannerFilter("auto-review");
      didAutoStartRef.current = true;
    } else if (autoMatchStats.total > 0) {
      didAutoStartRef.current = true;
    }
  }, [autoMatchStats]);

  // Auto-clear banner filter when all review items are resolved
  const [reviewClearToast, setReviewClearToast] = useState(false);
  useEffect(() => {
    if (bannerFilter === "auto-review" && autoMatchStats.reviewCount === 0) {
      setBannerFilter(null);
      setReviewClearToast(true);
      const t = setTimeout(() => setReviewClearToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [bannerFilter, autoMatchStats.reviewCount]);

  // Stable sort: rows don't move on map/unmap — only on explicit re-sort
  const [sortVersion, setSortVersion] = useState(0);
  const stableOrderRef = useRef<Map<string, number>>(new Map());
  const lastSortRef = useRef({
    sortBy: "" as SortOption,
    sortVersion: -1,
    statusFilter: "" as string,
  });

  const skippedItems = interactive.sourceLayerMappings.filter(
    (l) => l.isSkipped,
  );
  // Build parent model index: group submodel groups by their parent model
  const parentModelIndex = useMemo(() => {
    const index = new Map<
      string,
      { items: SourceLayerMapping[]; mapped: number; total: number }
    >();
    for (const item of phaseItems) {
      const parents = item.sourceModel.parentModels ?? ["Unknown"];
      for (const parent of parents) {
        const entry = index.get(parent) ?? { items: [], mapped: 0, total: 0 };
        entry.items.push(item);
        entry.total++;
        if (item.isMapped) entry.mapped++;
        index.set(parent, entry);
      }
    }
    return index;
  }, [phaseItems]);

  // Per-model health bar stats (strong/needsReview/weakReview/unmapped)
  const parentModelStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        strong: number;
        needsReview: number;
        weakReview: number;
        unmapped: number;
        total: number;
      }
    >();
    for (const [name, data] of parentModelIndex) {
      let strong = 0;
      let needsReview = 0;
      let weakReview = 0;
      let unmapped = 0;
      for (const item of data.items) {
        // Skip section header markers
        if (item.sourceModel.name.startsWith("**")) continue;
        const status = getItemStatus(
          item.isMapped,
          autoMatchedNames.has(item.sourceModel.name),
          approvedNames.has(item.sourceModel.name),
          scoreMap.get(item.sourceModel.name),
        );
        if (status === "approved" || status === "strong" || status === "manual")
          strong++;
        else if (status === "needsReview") needsReview++;
        else if (status === "weak") weakReview++;
        else unmapped++;
      }
      stats.set(name, {
        strong,
        needsReview,
        weakReview,
        unmapped,
        total: strong + needsReview + weakReview + unmapped,
      });
    }
    return stats;
  }, [parentModelIndex, scoreMap, autoMatchedNames, approvedNames]);

  // Sorted parent model list
  const parentModelList = useMemo(() => {
    const list = Array.from(parentModelIndex.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => {
        // Unmapped first (models with gaps)
        const aComplete = a.mapped >= a.total;
        const bComplete = b.mapped >= b.total;
        if (aComplete !== bComplete) return aComplete ? 1 : -1;
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
    return list;
  }, [parentModelIndex]);

  // ── Spinner Monogamy: Pair dest HD props with exactly one source HD prop ──
  // Build list of dest HD props (unique parent models from dest side submodel groups)
  const destHDProps = useMemo(() => {
    const destParents = new Map<
      string,
      { name: string; subGroups: string[] }
    >();
    for (const model of interactive.allDestModels) {
      if (model.groupType === "SUBMODEL_GROUP" && model.parentModels) {
        for (const parent of model.parentModels) {
          const entry = destParents.get(parent) ?? {
            name: parent,
            subGroups: [],
          };
          entry.subGroups.push(model.name);
          destParents.set(parent, entry);
        }
      }
    }
    return Array.from(destParents.values());
  }, [interactive.allDestModels]);

  // Compute pairing scores: each dest HD prop scored against each source HD prop
  const pairings = useMemo(() => {
    if (parentModelList.length === 0 || destHDProps.length === 0) return [];

    const results: {
      sourceProp: string;
      destProp: string;
      score: number;
      overlapCount: number;
      destTotal: number;
    }[] = [];

    for (const dest of destHDProps) {
      for (const src of parentModelList) {
        // Count how many source submodel groups have a name match in dest
        const srcNames = src.items.map((i) => i.sourceModel.name.toLowerCase());
        const destNames = new Set(dest.subGroups.map((n) => n.toLowerCase()));
        let overlap = 0;
        for (const srcName of srcNames) {
          // Simple fuzzy: check if any dest name contains or is contained by src name
          for (const destName of destNames) {
            if (
              srcName === destName ||
              srcName.includes(destName) ||
              destName.includes(srcName)
            ) {
              overlap++;
              break;
            }
          }
        }
        const coverage =
          dest.subGroups.length > 0 ? overlap / dest.subGroups.length : 0;
        // Family bonus: same name gets +0.2
        const familyBonus =
          src.name.toLowerCase() === dest.name.toLowerCase() ? 0.2 : 0;
        const score = Math.min(1, coverage + familyBonus);
        results.push({
          sourceProp: src.name,
          destProp: dest.name,
          score,
          overlapCount: overlap,
          destTotal: dest.subGroups.length,
        });
      }
    }
    return results;
  }, [parentModelList, destHDProps]);

  // Greedy optimal assignment: each dest gets exactly one source
  const [pairingOverrides] = useState<Map<string, string>>(new Map());

  const activePairings = useMemo(() => {
    // Start with greedy assignment
    const assigned = new Map<string, string>(); // dest → source

    // Sort dests by "neediness" (fewest good options first)
    const destsByNeed = [...destHDProps].sort((a, b) => {
      const aScores = pairings.filter((p) => p.destProp === a.name);
      const bScores = pairings.filter((p) => p.destProp === b.name);
      const aMax = Math.max(...aScores.map((s) => s.score), 0);
      const bMax = Math.max(...bScores.map((s) => s.score), 0);
      return aMax - bMax;
    });

    for (const dest of destsByNeed) {
      // Check for manual override
      const override = pairingOverrides.get(dest.name);
      if (override) {
        assigned.set(dest.name, override);
        continue;
      }
      // Pick highest-scoring source
      const candidates = pairings
        .filter((p) => p.destProp === dest.name)
        .sort((a, b) => b.score - a.score);
      if (candidates.length > 0 && candidates[0].score > 0) {
        assigned.set(dest.name, candidates[0].sourceProp);
      }
    }

    return assigned;
  }, [destHDProps, pairings, pairingOverrides]);

  // Phase-wide counts for filter pills
  const mappedCount = phaseItems.filter(
    (i) => i.isMapped && !i.sourceModel.name.startsWith("**"),
  ).length;
  const unmappedCount = phaseItems.filter(
    (i) => !i.isMapped && !i.sourceModel.name.startsWith("**"),
  ).length;

  // Per-spinner section groups: detect **SECTION_NAME patterns in each model's items
  const spinnerSections = useMemo(() => {
    const result = new Map<
      string,
      { header: string | null; items: SourceLayerMapping[] }[]
    >();
    for (const [name, group] of parentModelIndex) {
      const sections: {
        header: string | null;
        items: SourceLayerMapping[];
      }[] = [];
      let currentSection: {
        header: string | null;
        items: SourceLayerMapping[];
      } = { header: null, items: [] };

      for (const item of group.items) {
        if (item.sourceModel.name.startsWith("**")) {
          if (currentSection.items.length > 0 || currentSection.header) {
            sections.push(currentSection);
          }
          const header = item.sourceModel.name.replace(/^\*+\s*/, "").trim();
          currentSection = { header, items: [] };
        } else {
          currentSection.items.push(item);
        }
      }
      if (currentSection.items.length > 0 || currentSection.header) {
        sections.push(currentSection);
      }
      result.set(name, sections);
    }
    return result;
  }, [parentModelIndex]);

  // O(1) lookup map for phase items
  const phaseItemsByName = useMemo(() => {
    const map = new Map<string, SourceLayerMapping>();
    for (const item of phaseItems) map.set(item.sourceModel.name, item);
    return map;
  }, [phaseItems]);

  const selectedItem = selectedItemId
    ? (phaseItemsByName.get(selectedItemId) ?? null)
    : null;

  // Pre-compute top suggestion for each unmapped card (avoids per-card scoring)
  const topSuggestionsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        model: { name: string };
        score: number;
        factors?: ModelMapping["factors"];
      } | null
    >();
    for (const item of phaseItems) {
      if (item.isMapped) continue;
      const suggs = interactive.getSuggestionsForLayer(item.sourceModel);
      map.set(
        item.sourceModel.name,
        suggs[0]
          ? {
              model: suggs[0].model,
              score: suggs[0].score,
              factors: suggs[0].factors,
            }
          : null,
      );
    }
    return map;
  }, [phaseItems, interactive]);

  // Count auto-matched items in this phase for the banner
  const phaseAutoCount = useMemo(
    () =>
      phaseItems.filter((i) => autoMatchedNames.has(i.sourceModel.name)).length,
    [phaseItems, autoMatchedNames],
  );

  // Filtered + stable-sorted items (all submodel groups across all spinners)
  const filteredItems = useMemo(() => {
    let items = phaseItems.filter((i) => !i.sourceModel.name.startsWith("**"));

    // Banner filter overrides status filter when active
    const activeFilter = bannerFilter ?? statusFilter;
    if (activeFilter === "unmapped") items = items.filter((i) => !i.isMapped);
    else if (activeFilter === "auto-strong")
      items = items.filter(
        (i) =>
          autoMatchedNames.has(i.sourceModel.name) &&
          (scoreMap.get(i.sourceModel.name) ?? 0) >= STRONG_THRESHOLD,
      );
    else if (activeFilter === "auto-review")
      items = items.filter(
        (i) =>
          autoMatchedNames.has(i.sourceModel.name) &&
          !approvedNames.has(i.sourceModel.name) &&
          (scoreMap.get(i.sourceModel.name) ?? 0) < STRONG_THRESHOLD,
      );
    else if (activeFilter === "mapped") items = items.filter((i) => i.isMapped);

    const needsResort =
      sortBy !== lastSortRef.current.sortBy ||
      sortVersion !== lastSortRef.current.sortVersion ||
      statusFilter !== lastSortRef.current.statusFilter ||
      stableOrderRef.current.size === 0;

    if (needsResort) {
      const sorted = sortItems(items, sortBy, topSuggestionsMap);
      stableOrderRef.current = new Map(
        sorted.map((r, i) => [r.sourceModel.name, i]),
      );
      lastSortRef.current = { sortBy, sortVersion, statusFilter };
      return sorted;
    }

    const order = stableOrderRef.current;
    return [...items].sort((a, b) => {
      const ai = order.get(a.sourceModel.name) ?? Infinity;
      const bi = order.get(b.sourceModel.name) ?? Infinity;
      if (ai !== bi) return ai - bi;
      return a.sourceModel.name.localeCompare(b.sourceModel.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [
    phaseItems,
    statusFilter,
    bannerFilter,
    sortBy,
    sortVersion,
    topSuggestionsMap,
    approvedNames,
  ]);

  // Set of names passing current filter — used for section rendering
  const filteredNameSet = useMemo(
    () => new Set(filteredItems.map((i) => i.sourceModel.name)),
    [filteredItems],
  );

  // Suggestions for selected item
  const suggestions = useMemo(() => {
    if (!selectedItem) return [];
    return interactive
      .getSuggestionsForLayer(selectedItem.sourceModel)
      .slice(0, 10);
  }, [interactive, selectedItem]);

  // Compute the paired source for the selected item's parent model
  const selectedPairedSource = useMemo(() => {
    if (!selectedItem) return null;
    const parents = selectedItem.sourceModel.parentModels;
    if (!parents || parents.length === 0) return null;
    return activePairings.get(parents[0]) ?? null;
  }, [selectedItem, activePairings]);

  const spinnerSourceFilter = useCallback(
    (m: { groupType?: string; parentModels?: string[] }) => {
      if (m.groupType !== "SUBMODEL_GROUP") return false;
      // Filter to dest submodel groups from the paired source's family
      if (selectedPairedSource && m.parentModels) {
        return m.parentModels.includes(selectedPairedSource);
      }
      return true;
    },
    [selectedPairedSource],
  );

  // No spinners
  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#128077;</span>}
        title="Submodel Groups All Set!"
        description="No submodel groups need matching in this sequence."
      />
    );
  }

  const unmappedItems = phaseItems.filter((item) => !item.isMapped);

  const handleAccept = (sourceName: string, userModelName: string) => {
    interactive.assignUserModelToLayer(sourceName, userModelName);
    bulk.checkForPattern(sourceName, userModelName);
    setSelectedItemId(findNextUnmapped(unmappedItems, sourceName));
  };

  const handleBulkInferenceAccept = () => {
    if (!bulk.suggestion) return;
    const bulkNames = new Set(bulk.suggestion.pairs.map((p) => p.sourceName));
    bulk.acceptAll();
    const remaining = unmappedItems.filter(
      (i) => !bulkNames.has(i.sourceModel.name),
    );
    setSelectedItemId(remaining[0]?.sourceModel.name ?? null);
  };

  // Handle drops on left panel items
  const handleDropOnItem = (sourceName: string, e: React.DragEvent) => {
    e.preventDefault();
    const item = dnd.handleDrop({ destModelName: sourceName, isMapped: false });
    if (item) {
      handleAccept(sourceName, item.sourceModelName);
    }
  };

  const handleSkipItem = (sourceName: string) => {
    interactive.skipSourceLayer(sourceName);
    setSelectedItemId(findNextUnmapped(unmappedItems, sourceName));
  };

  const handleUnlink = (sourceName: string) => {
    interactive.clearLayerMapping(sourceName);
  };

  // Compute spinner-level border color from subgroup health
  const getSpinnerBorderClass = (stats: {
    strong: number;
    needsReview: number;
    weakReview: number;
    unmapped: number;
  }) => {
    if (stats.unmapped > stats.strong) return "border-l-blue-400/50";
    if (stats.needsReview + stats.weakReview > 0)
      return "border-l-amber-400/70";
    return "border-l-green-500/70";
  };

  // Compute spinner-level status from pairing confidence
  const getSpinnerStatus = (
    dest: string | undefined,
    score: number | undefined,
  ): StatusCheckStatus => {
    if (!dest) return "unmapped";
    const pct = score != null ? Math.round(score * 100) : 0;
    if (pct >= 60) return "approved";
    if (pct >= 40) return "needsReview";
    return "weak";
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Spinner Cards with nested Submodel Groups */}
      <div className="w-1/2 flex flex-col border-r border-border overflow-hidden">
        {/* Header bar with progress stats */}
        <div className="flex items-center gap-4 px-4 py-2.5 bg-surface/80 border-b border-border flex-shrink-0">
          <span className="text-[11px] text-foreground/50 font-mono">
            SUB-GROUPS{" "}
            <span className="text-accent font-bold">
              {mappedCount}/{mappedCount + unmappedCount}
            </span>
          </span>
          <div className="w-24 h-1 bg-foreground/10 rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm"
              style={{
                width: `${mappedCount + unmappedCount > 0 ? (mappedCount / (mappedCount + unmappedCount)) * 100 : 0}%`,
                background: "linear-gradient(90deg, #4ade80, #facc15)",
              }}
            />
          </div>
          <span className="text-[11px] text-foreground/50 font-mono">
            Mapped:{" "}
            <span className="text-green-400 font-semibold">{mappedCount}</span>
          </span>
          <span className="text-[11px] text-foreground/50 font-mono">
            Unmapped:{" "}
            <span className="text-blue-400 font-semibold">{unmappedCount}</span>
          </span>
        </div>

        {/* Title + Continue */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
          <h1 className="text-lg font-bold text-foreground">Submodel Groups</h1>
          <button
            type="button"
            onClick={goToNextPhase}
            className="text-[13px] font-semibold px-5 py-2 rounded-md border-none bg-accent text-white cursor-pointer hover:brightness-110 transition-all"
          >
            Continue to Finalize &rarr;
          </button>
        </div>

        {/* Filter pills */}
        <div className={PANEL_STYLES.header.wrapper}>
          <div className="flex items-center gap-2">
            <FilterPill
              label={`All (${mappedCount + unmappedCount})`}
              color="blue"
              active={statusFilter === "all" && !bannerFilter}
              onClick={() => {
                setBannerFilter(null);
                setStatusFilter("all");
                setSortVersion((v) => v + 1);
              }}
            />
            <FilterPill
              label={`Mapped (${mappedCount})`}
              color="green"
              active={statusFilter === "mapped" && !bannerFilter}
              onClick={() => {
                setBannerFilter(null);
                setStatusFilter("mapped");
                setSortVersion((v) => v + 1);
              }}
            />
            <FilterPill
              label={`Unmapped (${unmappedCount})`}
              color="amber"
              active={statusFilter === "unmapped" && !bannerFilter}
              onClick={() => {
                setBannerFilter(null);
                setStatusFilter("unmapped");
                setSortVersion((v) => v + 1);
              }}
            />
          </div>
        </div>

        {bulk.suggestion && (
          <BulkInferenceBanner
            suggestion={bulk.suggestion}
            onAcceptAll={handleBulkInferenceAccept}
            onDismiss={bulk.dismiss}
          />
        )}

        <AutoMatchBanner
          stats={autoMatchStats}
          phaseAutoCount={phaseAutoCount}
          bannerFilter={bannerFilter}
          onFilterStrong={() => {
            setBannerFilter("auto-strong");
            setSortVersion((v) => v + 1);
          }}
          onFilterReview={() => {
            setBannerFilter("auto-review");
            setSortVersion((v) => v + 1);
          }}
          onClearFilter={() => {
            setBannerFilter(null);
            setSortVersion((v) => v + 1);
          }}
          onApproveAllReview={approveAllReviewItems}
        />

        {/* "All reviews complete" toast */}
        {reviewClearToast && (
          <div className="mx-4 mt-2 mb-1 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-[12px] text-green-400 font-medium flex-shrink-0 animate-pulse">
            All reviews complete
          </div>
        )}

        <div className={PANEL_STYLES.scrollArea}>
          {/* ── Spinner Cards (GroupCard pattern) ── */}
          <div className="px-4 pb-3 space-y-0.5">
            {parentModelList.map((spinner) => {
              const stats = parentModelStats.get(spinner.name);
              const pairedSrc = activePairings.get(spinner.name);
              const sections = spinnerSections.get(spinner.name) ?? [];
              const isExpanded = expandedSpinners[spinner.name] !== false;
              const allSubItems = sections.flatMap((s) => s.items);
              const totalFx = allSubItems.reduce(
                (sum, i) => sum + i.effectCount,
                0,
              );
              const hasVisibleItems = allSubItems.some((i) =>
                filteredNameSet.has(i.sourceModel.name),
              );
              const activeFilter = bannerFilter ?? statusFilter;
              if (!hasVisibleItems && activeFilter !== "all") return null;

              // Pairing confidence for this spinner
              const pairingEntry = pairedSrc
                ? pairings.find(
                    (p) =>
                      p.sourceProp === spinner.name && p.destProp === pairedSrc,
                  )
                : undefined;
              const pairingPct = pairingEntry
                ? Math.round(pairingEntry.score * 100)
                : undefined;
              const spinnerStatus = getSpinnerStatus(
                pairedSrc,
                pairingEntry?.score,
              );
              const borderClass = stats
                ? getSpinnerBorderClass(stats)
                : "border-l-foreground/15";

              return (
                <div key={spinner.name} className="mb-0.5">
                  {/* Spinner Card Header */}
                  <div
                    className={`rounded-md border-l-[3px] ${borderClass} bg-surface/80 cursor-pointer transition-all hover:bg-foreground/[0.03]`}
                    onClick={() =>
                      setExpandedSpinners((prev) => ({
                        ...prev,
                        [spinner.name]: !isExpanded,
                      }))
                    }
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: GROUP_GRID,
                        alignItems: "center",
                        padding: "6px 10px 6px 8px",
                        gap: "0 6px",
                        minHeight: 32,
                      }}
                    >
                      {/* Status */}
                      <StatusCheck status={spinnerStatus} />
                      {/* FX */}
                      <FxBadge count={totalFx} />
                      {/* Chevron */}
                      <div className="flex items-center justify-center">
                        <svg
                          className={`w-3 h-3 text-foreground/40 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
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
                      </div>
                      {/* Type */}
                      <TypeBadge type="GRP" />
                      {/* Name */}
                      <span className="text-[13px] font-semibold text-foreground truncate">
                        {spinner.name}
                      </span>
                      {/* Destination / + Assign */}
                      <div className="flex items-center justify-end gap-1.5">
                        {pairedSrc ? (
                          <DestinationPill
                            name={pairedSrc}
                            confidence={pairingPct}
                            autoMatched={true}
                          />
                        ) : (
                          <span className="text-[12px] text-foreground/20">
                            + Assign
                          </span>
                        )}
                      </div>
                      {/* Actions placeholder */}
                      <div />
                    </div>
                    {/* Health bar below grid */}
                    {stats && (
                      <div className="px-3 pb-1.5 -mt-0.5">
                        <HealthBar
                          strong={stats.strong}
                          needsReview={stats.needsReview}
                          weak={stats.weakReview}
                          unmapped={stats.unmapped}
                          totalModels={stats.total}
                        />
                      </div>
                    )}
                  </div>

                  {/* Expanded: nested submodel groups with section dividers */}
                  {isExpanded && (
                    <div className="pl-5 pt-0.5 pb-1">
                      {sections.map((section, si) => {
                        const visibleItems = section.items.filter((i) =>
                          filteredNameSet.has(i.sourceModel.name),
                        );
                        if (visibleItems.length === 0 && section.header)
                          return null;
                        return (
                          <SectionDivider
                            key={section.header ?? `section-${si}`}
                            header={section.header}
                            items={visibleItems}
                            selectedItemId={selectedItemId}
                            dndState={dnd.state}
                            autoMatchedNames={autoMatchedNames}
                            approvedNames={approvedNames}
                            scoreMap={scoreMap}
                            factorsMap={factorsMap}
                            topSuggestionsMap={topSuggestionsMap}
                            onSelect={setSelectedItemId}
                            onAccept={handleAccept}
                            onApprove={approveAutoMatch}
                            onSkip={handleSkipItem}
                            onUnlink={handleUnlink}
                            onDragEnter={dnd.handleDragEnter}
                            onDragLeave={dnd.handleDragLeave}
                            onDrop={handleDropOnItem}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {interactive.hiddenZeroEffectCount > 0 && (
            <p className="mt-4 text-[11px] text-foreground/25 text-center">
              {interactive.hiddenZeroEffectCount} model
              {interactive.hiddenZeroEffectCount === 1 ? "" : "s"} with 0
              effects not shown &mdash; no visual impact in this sequence
            </p>
          )}

          {filteredItems.length === 0 && (
            <p className="py-6 text-center text-[12px] text-foreground/30">
              {statusFilter !== "all" || bannerFilter
                ? "No matches for current filters"
                : "No items"}
            </p>
          )}

          {skippedItems.length > 0 && (
            <details className="mt-4 px-4">
              <summary className="text-[11px] text-foreground/25 cursor-pointer hover:text-foreground/40">
                {skippedItems.length} skipped
              </summary>
              <div className="mt-2 space-y-1">
                {skippedItems.map((item) => (
                  <div
                    key={item.sourceModel.name}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/[0.02] border border-border/50 opacity-60"
                  >
                    <span className="text-[12px] text-foreground/40 truncate flex-1 min-w-0">
                      {item.sourceModel.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        interactive.unskipSourceLayer(item.sourceModel.name)
                      }
                      className="text-[10px] text-accent/50 hover:text-accent transition-colors flex-shrink-0"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Color legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 mt-3 border-t border-border">
            {[
              { color: "bg-green-400", label: "Mapped (60%+ / manual)" },
              { color: "bg-amber-400", label: "Review (40-59%)" },
              { color: "bg-red-400", label: "Weak (<40%)" },
              { color: "bg-blue-400", label: "Unmapped" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div
                  className={`w-2.5 h-2.5 rounded-sm ${item.color}`}
                  style={{ opacity: 0.85 }}
                />
                <span className="text-[11px] text-foreground/40">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Source Panel */}
      <div className="w-1/2 flex flex-col bg-surface/50 overflow-hidden">
        {selectedItem ? (
          <>
            {/* Item Info Header — compact, same height as left */}
            <div className={PANEL_STYLES.header.wrapper}>
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE_COLORS.SUB} rounded`}
                >
                  SUB
                </span>
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {selectedItem.sourceModel.name}
                </h3>
                <span className="text-[11px] text-foreground/30 ml-auto flex-shrink-0">
                  {selectedItem.effectCount} fx &middot;{" "}
                  {selectedItem.memberNames.length} members
                </span>
              </div>
            </div>

            {/* Mapping state card: SUGGESTED MATCH / MAPPED TO / NOT MAPPED */}
            {selectedItem.isMapped ? (
              <CurrentMappingCard
                item={selectedItem}
                matchScore={scoreMap.get(selectedItem.sourceModel.name)}
                matchFactors={factorsMap.get(selectedItem.sourceModel.name)}
                isNeedsReview={
                  autoMatchedNames.has(selectedItem.sourceModel.name) &&
                  !approvedNames.has(selectedItem.sourceModel.name) &&
                  (scoreMap.get(selectedItem.sourceModel.name) ?? 1) <
                    STRONG_THRESHOLD
                }
                onApprove={() =>
                  approveAutoMatch(selectedItem.sourceModel.name)
                }
                onRemoveLink={(destName) =>
                  interactive.removeLinkFromLayer(
                    selectedItem.sourceModel.name,
                    destName,
                  )
                }
              />
            ) : (
              <NotMappedBanner />
            )}

            {/* Universal Source Panel — always visible for suggestions + add another */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <UniversalSourcePanel
                allModels={interactive.allDestModels}
                suggestions={suggestions}
                sourceFilter={spinnerSourceFilter}
                assignedNames={interactive.assignedUserModelNames}
                selectedDestLabel={selectedItem.sourceModel.name}
                sourcePixelCount={selectedItem.sourceModel.pixelCount}
                onAccept={(userModelName) =>
                  handleAccept(selectedItem.sourceModel.name, userModelName)
                }
                dnd={dnd}
                destToSourcesMap={interactive.destToSourcesMap}
                onRemoveLink={interactive.removeLinkFromLayer}
                sourceEffectCounts={sourceEffectCounts}
                skippedDestModels={interactive.skippedDestModels}
                onSkipDest={interactive.skipDestModel}
                onUnskipDest={interactive.unskipDestModel}
                onUnskipAllDest={interactive.unskipAllDestModels}
                excludeNames={
                  selectedItem.isMapped
                    ? new Set(
                        selectedItem.assignedUserModels.map((m) => m.name),
                      )
                    : undefined
                }
                destSuperGroupNames={interactive.destSuperGroupNames}
              />
            </div>

            {/* Skip (only for unmapped) */}
            {!selectedItem.isMapped && (
              <div className="px-6 py-3 border-t border-border flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleSkipItem(selectedItem.sourceModel.name)}
                  className="w-full py-2 text-sm text-foreground/40 hover:text-foreground/60 border border-border hover:border-foreground/20 rounded-lg transition-colors"
                >
                  Skip This Group
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground/30">
            <div className="text-center">
              <svg
                className="w-10 h-10 mx-auto mb-3 text-foreground/15"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
              <p className="text-sm">
                Select a submodel group to see suggestions
              </p>
              <p className="text-xs text-foreground/20 mt-1.5">
                Already-mapped items can be clicked to review or swap
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status helpers (matching IndividualsPhase) ─────────

function getItemStatus(
  isMapped: boolean,
  isAutoMatched: boolean,
  isApproved: boolean,
  score: number | undefined,
): StatusCheckStatus {
  if (!isMapped) return "unmapped";
  if (!isAutoMatched) return "manual";
  if (isApproved) return "approved";
  if (score != null && score >= STRONG_THRESHOLD) return "strong";
  if (score != null && score >= WEAK_THRESHOLD) return "needsReview";
  if (score != null) return "weak";
  return "manual";
}

function getLeftBorderColor(status: StatusCheckStatus): string {
  switch (status) {
    case "approved":
    case "strong":
    case "manual":
      return "border-l-green-500/70";
    case "needsReview":
      return "border-l-amber-400/70";
    case "weak":
      return "border-l-red-400/70";
    case "unmapped":
      return "border-l-blue-400/50";
    case "covered":
      return "border-l-foreground/15";
    default:
      return "border-l-foreground/15";
  }
}

// ─── Submodel Card (Left Panel) — SUB_GRID layout ───────

function SubmodelCard({
  item,
  isSelected,
  isDropTarget,
  isAutoMatched,
  isApproved,
  matchScore,
  matchFactors,
  topSuggestion,
  onClick,
  onAccept,
  onApprove,
  onSkip,
  onUnlink,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  item: SourceLayerMapping;
  isSelected: boolean;
  isDropTarget: boolean;
  isAutoMatched: boolean;
  isApproved: boolean;
  matchScore?: number;
  matchFactors?: ModelMapping["factors"];
  topSuggestion: {
    model: { name: string };
    score: number;
  } | null;
  onClick: () => void;
  onAccept: (userModelName: string) => void;
  onApprove: () => void;
  onSkip: () => void;
  onUnlink: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const status = getItemStatus(
    item.isMapped,
    isAutoMatched,
    isApproved,
    matchScore,
  );
  const leftBorder = getLeftBorderColor(status);
  const confidencePct =
    matchScore != null ? Math.round(matchScore * 100) : undefined;

  return (
    <div
      className={`rounded border-l-[3px] ${leftBorder} mb-px cursor-pointer transition-all ${
        isDropTarget
          ? "bg-accent/10 ring-2 ring-accent/30"
          : isSelected
            ? "bg-teal-500/[0.06] ring-1 ring-teal-500/20"
            : "hover:bg-foreground/[0.02]"
      }`}
      style={{
        display: "grid",
        gridTemplateColumns: SUB_GRID,
        alignItems: "center",
        padding: "4px 10px 4px 8px",
        gap: "0 6px",
        minHeight: 30,
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Col 1: Status checkbox */}
      <StatusCheck
        status={status}
        onClick={
          status === "needsReview" || status === "weak"
            ? () => onApprove()
            : undefined
        }
      />
      {/* Col 2: FX badge */}
      <FxBadge count={item.effectCount} />
      {/* Col 3: Type badge (SUB) */}
      <TypeBadge type="SUB" />
      {/* Col 4: Name */}
      <span className="text-[12px] font-medium text-foreground truncate">
        {item.sourceModel.name}
      </span>
      {/* Col 5: Destination pill / + Assign */}
      <div className="flex items-center justify-end gap-1">
        {item.isMapped ? (
          <>
            <DestinationPill
              name={item.assignedUserModels[0]?.name ?? ""}
              confidence={confidencePct}
              autoMatched={isAutoMatched}
              matchScore={matchScore}
              matchFactors={matchFactors}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUnlink();
              }}
              className="w-[18px] h-[18px] flex items-center justify-center rounded hover:bg-amber-500/15 transition-all flex-shrink-0"
              title="Remove mapping"
              style={{
                opacity: hovered ? 0.6 : 0,
                transition: "opacity 0.1s ease",
              }}
            >
              <UnlinkIcon className="w-[11px] h-[11px]" />
            </button>
          </>
        ) : topSuggestion ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAccept(topSuggestion.model.name);
            }}
            className="text-[11px] text-foreground/30 hover:text-accent transition-colors"
            title={`Accept: ${topSuggestion.model.name}`}
          >
            + Assign
          </button>
        ) : (
          <span className="text-[11px] text-foreground/20">+ Assign</span>
        )}
      </div>
      {/* Col 6: Row actions (hover) */}
      <div
        className="flex items-center justify-end gap-0.5"
        style={{
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.1s ease",
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          className="w-[22px] h-[22px] flex items-center justify-center rounded text-foreground/20 hover:text-foreground/50 hover:bg-foreground/10 transition-colors"
          title="Skip"
        >
          <svg
            className="w-[11px] h-[11px]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const SubmodelCardMemo = memo(
  SubmodelCard,
  (prev, next) =>
    prev.item.sourceModel === next.item.sourceModel &&
    prev.item.isMapped === next.item.isMapped &&
    prev.item.effectCount === next.item.effectCount &&
    prev.item.assignedUserModels === next.item.assignedUserModels &&
    prev.isSelected === next.isSelected &&
    prev.isDropTarget === next.isDropTarget &&
    prev.isAutoMatched === next.isAutoMatched &&
    prev.isApproved === next.isApproved &&
    prev.matchScore === next.matchScore &&
    prev.matchFactors === next.matchFactors &&
    prev.topSuggestion?.model.name === next.topSuggestion?.model.name &&
    prev.topSuggestion?.score === next.topSuggestion?.score,
);

// ─── Section Divider (collapsible section from **HEADER markers) ─────

function SectionDivider({
  header,
  items,
  selectedItemId,
  dndState,
  autoMatchedNames,
  approvedNames,
  scoreMap,
  factorsMap,
  topSuggestionsMap,
  onSelect,
  onAccept,
  onApprove,
  onSkip,
  onUnlink,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  header: string | null;
  items: SourceLayerMapping[];
  selectedItemId: string | null;
  dndState: { activeDropTarget: string | null };
  autoMatchedNames: ReadonlySet<string>;
  approvedNames: ReadonlySet<string>;
  scoreMap: Map<string, number>;
  factorsMap: Map<string, ModelMapping["factors"]>;
  topSuggestionsMap: Map<
    string,
    {
      model: { name: string };
      score: number;
    } | null
  >;
  onSelect: (name: string) => void;
  onAccept: (sourceName: string, destName: string) => void;
  onApprove: (name: string) => void;
  onSkip: (name: string) => void;
  onUnlink: (name: string) => void;
  onDragEnter: (name: string) => void;
  onDragLeave: (name: string) => void;
  onDrop: (name: string, e: React.DragEvent) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const mappedInSection = items.filter((i) => i.isMapped).length;

  return (
    <div>
      {header && (
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 w-full pt-3.5 pb-1.5 px-1 text-left group/section border-b border-border mb-1.5"
        >
          <svg
            className={`w-3 h-3 text-teal-400/60 transition-transform duration-150 ${collapsed ? "" : "rotate-90"}`}
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
          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-[0.1em] font-mono">
            {header}
          </span>
          <span className="text-[10px] text-foreground/30 font-mono">
            ({items.length})
          </span>
          <span
            className={`text-[10px] tabular-nums flex-shrink-0 ${mappedInSection >= items.length ? "text-teal-400/50" : "text-foreground/30"}`}
          >
            {mappedInSection}/{items.length}
          </span>
        </button>
      )}
      {!collapsed && (
        <div className={`space-y-0.5 ${header ? "pl-2 mt-0.5 mb-2" : ""}`}>
          {items.map((item) => (
            <SubmodelCardMemo
              key={item.sourceModel.name}
              item={item}
              isSelected={selectedItemId === item.sourceModel.name}
              isDropTarget={dndState.activeDropTarget === item.sourceModel.name}
              isAutoMatched={autoMatchedNames.has(item.sourceModel.name)}
              isApproved={approvedNames.has(item.sourceModel.name)}
              matchScore={scoreMap.get(item.sourceModel.name)}
              matchFactors={factorsMap.get(item.sourceModel.name)}
              topSuggestion={
                topSuggestionsMap.get(item.sourceModel.name) ?? null
              }
              onClick={() => onSelect(item.sourceModel.name)}
              onAccept={(userModelName) =>
                onAccept(item.sourceModel.name, userModelName)
              }
              onApprove={() => onApprove(item.sourceModel.name)}
              onSkip={() => onSkip(item.sourceModel.name)}
              onUnlink={() => onUnlink(item.sourceModel.name)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDragEnter={() => onDragEnter(item.sourceModel.name)}
              onDragLeave={() => onDragLeave(item.sourceModel.name)}
              onDrop={(e) => onDrop(item.sourceModel.name, e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
