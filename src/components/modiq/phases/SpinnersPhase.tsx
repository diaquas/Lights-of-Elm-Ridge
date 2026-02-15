/* eslint-disable react-hooks/refs -- Refs used as stable caches (sort order, scores); intentional lazy-init in useMemo. */
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
  DestinationPill,
  type StatusCheckStatus,
} from "../MetadataBadges";
import { STRONG_THRESHOLD, WEAK_THRESHOLD } from "@/types/mappingPhases";
import type { ModelMapping } from "@/lib/modiq/matcher";
import { SortDropdown, sortItems, type SortOption } from "../SortDropdown";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBulkInference } from "@/hooks/useBulkInference";
import { BulkInferenceBanner } from "../BulkInferenceBanner";
import { PANEL_STYLES, TYPE_BADGE_COLORS, SUB_GRID } from "../panelStyles";
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
    goToNextPhase,
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
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedParentModel, setSelectedParentModel] = useState<string | null>(
    null,
  );

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

  // Pairing review state
  const [pairingConfirmed, setPairingConfirmed] = useState(false);
  const [pairingExpanded, setPairingExpanded] = useState(false);

  // Stable sort: rows don't move on map/unmap — only on explicit re-sort
  const [sortVersion, setSortVersion] = useState(0);
  const stableOrderRef = useRef<Map<string, number>>(new Map());
  const lastSortRef = useRef({
    sortBy: "" as SortOption,
    sortVersion: -1,
    search: "",
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

  // Per-model health bar stats (depends on score/approval state)
  const parentModelStats = useMemo(() => {
    const stats = new Map<
      string,
      { mapped: number; review: number; unmapped: number; total: number }
    >();
    for (const [name, data] of parentModelIndex) {
      let mapped = 0;
      let review = 0;
      let unmapped = 0;
      for (const item of data.items) {
        if (!item.isMapped) {
          unmapped++;
        } else {
          const score = scoreMap.get(item.sourceModel.name) ?? 0;
          const isAuto = autoMatchedNames.has(item.sourceModel.name);
          const isAppr = approvedNames.has(item.sourceModel.name);
          if (isAuto && !isAppr && score < STRONG_THRESHOLD) {
            review++;
          } else {
            mapped++;
          }
        }
      }
      stats.set(name, { mapped, review, unmapped, total: data.total });
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
  const [pairingOverrides, setPairingOverrides] = useState<Map<string, string>>(
    new Map(),
  );

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

  // Auto-select first parent model
  const activeParent = selectedParentModel ?? parentModelList[0]?.name ?? null;

  // Look up which source is paired with the active parent model
  const pairedSource = activeParent ? activePairings.get(activeParent) : null;

  // Items scoped to selected parent model
  const scopedItems = useMemo(() => {
    if (!activeParent) return phaseItems;
    return parentModelIndex.get(activeParent)?.items ?? phaseItems;
  }, [activeParent, parentModelIndex, phaseItems]);

  // Scoped counts for filter pills (reflect selected model, not entire phase)
  const scopedMappedCount = scopedItems.filter((i) => i.isMapped).length;
  const scopedUnmappedCount = scopedItems.filter((i) => !i.isMapped).length;

  // Section headers: detect **SECTION_NAME patterns in scoped items.
  // Preserve source order — sorting by name would move all ** markers to the
  // front, destroying the section → items grouping.
  const sectionGroups = useMemo(() => {
    const sections: { header: string | null; items: SourceLayerMapping[] }[] =
      [];
    let currentSection: { header: string | null; items: SourceLayerMapping[] } =
      { header: null, items: [] };

    for (const item of scopedItems) {
      // Check if this item's name looks like a section header marker
      // e.g., "**OUTER", "**WHOLE SPINNER", "**CENTER"
      if (item.sourceModel.name.startsWith("**")) {
        // Push current section if it has items
        if (currentSection.items.length > 0 || currentSection.header) {
          sections.push(currentSection);
        }
        // Clean up section name — remove ** prefix
        const header = item.sourceModel.name.replace(/^\*+\s*/, "").trim();
        currentSection = { header, items: [] };
      } else {
        currentSection.items.push(item);
      }
    }
    // Push last section
    if (currentSection.items.length > 0 || currentSection.header) {
      sections.push(currentSection);
    }
    return sections;
  }, [scopedItems]);

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

  // Count auto-matched items scoped to selected model for the banner
  const phaseAutoCount = useMemo(
    () =>
      scopedItems.filter((i) => autoMatchedNames.has(i.sourceModel.name))
        .length,
    [scopedItems, autoMatchedNames],
  );

  // Scoped auto-match stats (selected model only, not entire phase)
  const scopedAutoMatchStats = useMemo(() => {
    let total = 0,
      strongCount = 0,
      reviewCount = 0;
    for (const item of scopedItems) {
      const name = item.sourceModel.name;
      if (!autoMatchedNames.has(name)) continue;
      total++;
      const score = scoreMap.get(name) ?? 0;
      if (approvedNames.has(name) || score >= STRONG_THRESHOLD) {
        strongCount++;
      } else {
        reviewCount++;
      }
    }
    return { total, strongCount, reviewCount };
  }, [scopedItems, autoMatchedNames, scoreMap, approvedNames]);

  // Filtered + stable-sorted items (single unified list, scoped to parent model)
  const filteredItems = useMemo(() => {
    let items = [...scopedItems];

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
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.sourceModel.name.toLowerCase().includes(q) ||
          item.sourceModel.type.toLowerCase().includes(q),
      );
    }

    const needsResort =
      sortBy !== lastSortRef.current.sortBy ||
      sortVersion !== lastSortRef.current.sortVersion ||
      search !== lastSortRef.current.search ||
      statusFilter !== lastSortRef.current.statusFilter ||
      stableOrderRef.current.size === 0;

    if (needsResort) {
      const sorted = sortItems(items, sortBy, topSuggestionsMap);
      stableOrderRef.current = new Map(
        sorted.map((r, i) => [r.sourceModel.name, i]),
      );
      lastSortRef.current = { sortBy, sortVersion, search, statusFilter };
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
    scopedItems,
    statusFilter,
    bannerFilter,
    search,
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

  const spinnerSourceFilter = useCallback(
    (m: { groupType?: string; parentModels?: string[] }) => {
      if (m.groupType !== "SUBMODEL_GROUP") return false;
      // If we have a paired source, only show dest models from that source's family
      if (pairedSource && m.parentModels) {
        return m.parentModels.includes(pairedSource);
      }
      return true;
    },
    [pairedSource],
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

  const unmappedItems = scopedItems.filter((item) => !item.isMapped);

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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Submodel Group List */}
      <div className="w-1/2 flex flex-col border-r border-border overflow-hidden">
        <div className={PANEL_STYLES.header.wrapper}>
          <div className="flex items-center gap-2">
            <FilterPill
              label={`All (${scopedItems.length})`}
              color="blue"
              active={statusFilter === "all" && !bannerFilter}
              onClick={() => {
                setBannerFilter(null);
                setStatusFilter("all");
                setSortVersion((v) => v + 1);
              }}
            />
            <FilterPill
              label={`Mapped (${scopedMappedCount})`}
              color="green"
              active={statusFilter === "mapped" && !bannerFilter}
              onClick={() => {
                setBannerFilter(null);
                setStatusFilter("mapped");
                setSortVersion((v) => v + 1);
              }}
            />
            <FilterPill
              label={`Unmapped (${scopedUnmappedCount})`}
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

        {/* Search + Sort */}
        <div className={PANEL_STYLES.search.wrapper}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg
                className={PANEL_STYLES.search.icon}
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
                placeholder="Search submodel groups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${PANEL_STYLES.search.input} ${search ? "pr-8" : ""}`}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
            <SortDropdown
              value={sortBy}
              onChange={(v) => {
                setSortBy(v);
                setSortVersion((sv) => sv + 1);
              }}
            />
            <button
              type="button"
              onClick={() => setSortVersion((v) => v + 1)}
              className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors px-1"
              title="Re-sort"
            >
              &#x21bb;
            </button>
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
          stats={scopedAutoMatchStats}
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
          {/* ── HD Prop Pairings Review ── */}
          {activePairings.size > 0 && (
            <div className="px-4 pb-3">
              {!pairingConfirmed ? (
                /* Full pairing review — shown on first load */
                <div className="rounded-lg border border-teal-500/20 bg-teal-500/[0.03] p-4">
                  <div className="text-[10px] font-bold text-teal-400 uppercase tracking-[0.1em] font-mono mb-3">
                    HD Prop Pairings
                  </div>
                  {/* Column headers */}
                  <div
                    className="grid gap-1 mb-1.5"
                    style={{ gridTemplateColumns: "1fr 20px 1fr 50px 24px" }}
                  >
                    <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider font-mono">
                      Your Display
                    </span>
                    <span />
                    <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider font-mono">
                      Source
                    </span>
                    <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider font-mono text-right">
                      Score
                    </span>
                    <span />
                  </div>
                  {/* Pairing rows */}
                  {Array.from(activePairings.entries()).map(([dest, src]) => {
                    const pairing = pairings.find(
                      (p) => p.destProp === dest && p.sourceProp === src,
                    );
                    const scorePercent = pairing
                      ? Math.round(pairing.score * 100)
                      : 0;
                    return (
                      <div
                        key={dest}
                        className="grid gap-1 py-1.5 items-center"
                        style={{
                          gridTemplateColumns: "1fr 20px 1fr 50px 24px",
                        }}
                      >
                        <span className="text-[12px] text-foreground/80 truncate">
                          {dest}
                        </span>
                        <span className="text-[11px] text-foreground/20 text-center">
                          &rarr;
                        </span>
                        <span className="text-[12px] text-green-400 font-medium truncate">
                          {src}
                        </span>
                        <span
                          className={`text-[10px] font-semibold tabular-nums font-mono text-right ${
                            scorePercent >= 70
                              ? "text-green-400/80"
                              : scorePercent >= 40
                                ? "text-amber-400/80"
                                : "text-red-400/80"
                          }`}
                        >
                          {scorePercent}%
                        </span>
                        <select
                          value={src}
                          onChange={(e) => {
                            setPairingOverrides((prev) => {
                              const next = new Map(prev);
                              next.set(dest, e.target.value);
                              return next;
                            });
                          }}
                          className="text-[10px] w-[22px] h-[22px] rounded bg-foreground/5 border border-border text-foreground/40 focus:outline-none cursor-pointer appearance-none text-center"
                          title="Change source pairing"
                        >
                          {parentModelList.map((pm) => (
                            <option key={pm.name} value={pm.name}>
                              {pm.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setPairingConfirmed(true)}
                      className="text-[11px] font-semibold px-3.5 py-1.5 rounded border-none bg-teal-500 text-black cursor-pointer"
                    >
                      Looks Good
                    </button>
                    <button
                      type="button"
                      onClick={() => setPairingConfirmed(true)}
                      className="text-[11px] font-medium px-3.5 py-1.5 rounded border border-border bg-transparent text-foreground/50 hover:text-foreground/70 cursor-pointer transition-colors"
                    >
                      Let Me Adjust Later
                    </button>
                  </div>
                </div>
              ) : (
                /* Collapsed pairing review — show "View Pairings" toggle */
                <div>
                  <button
                    type="button"
                    onClick={() => setPairingExpanded(!pairingExpanded)}
                    className="text-[11px] text-teal-400/60 hover:text-teal-400 transition-colors flex items-center gap-1.5"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${pairingExpanded ? "rotate-90" : ""}`}
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
                    View HD Prop Pairings
                  </button>
                  {pairingExpanded && (
                    <div className="mt-2 space-y-1 pl-4">
                      {Array.from(activePairings.entries()).map(
                        ([dest, src]) => {
                          const pairing = pairings.find(
                            (p) => p.destProp === dest && p.sourceProp === src,
                          );
                          const scorePercent = pairing
                            ? Math.round(pairing.score * 100)
                            : 0;
                          return (
                            <div
                              key={dest}
                              className="flex items-center gap-2 text-[11px]"
                            >
                              <span className="text-foreground/50 truncate">
                                {dest}
                              </span>
                              <span className="text-foreground/20">&rarr;</span>
                              <span className="text-green-400/70 truncate">
                                {src}
                              </span>
                              <span
                                className={`font-mono tabular-nums ${
                                  scorePercent >= 70
                                    ? "text-green-400/60"
                                    : "text-amber-400/60"
                                }`}
                              >
                                {scorePercent}%
                              </span>
                              <select
                                value={src}
                                onChange={(e) => {
                                  setPairingOverrides((prev) => {
                                    const next = new Map(prev);
                                    next.set(dest, e.target.value);
                                    return next;
                                  });
                                }}
                                className="text-[10px] px-1 py-0.5 rounded bg-foreground/5 border border-border text-foreground/40 focus:outline-none flex-shrink-0"
                                title="Change source pairing"
                              >
                                {parentModelList.map((pm) => (
                                  <option key={pm.name} value={pm.name}>
                                    {pm.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Model Selector ── */}
          {parentModelList.length > 1 && (
            <div className="px-4 pb-3">
              <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.1em] font-mono mb-2">
                Select Model
              </div>
              <div className="space-y-1">
                {parentModelList.map((pm) => {
                  const isActive = pm.name === activeParent;
                  const stats = parentModelStats.get(pm.name);
                  const pSource = activePairings.get(pm.name);
                  return (
                    <button
                      key={pm.name}
                      type="button"
                      onClick={() => {
                        setSelectedParentModel(pm.name);
                        setSelectedItemId(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                        isActive
                          ? "bg-teal-500/[0.06] border border-teal-500/30"
                          : "bg-foreground/[0.02] border border-border/50 hover:border-foreground/15"
                      }`}
                    >
                      {/* Radio button */}
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? "border-teal-400 bg-teal-400"
                            : "border-foreground/20 bg-transparent"
                        }`}
                      >
                        {isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      {/* Name + sub-count */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[13px] font-semibold truncate ${isActive ? "text-foreground" : "text-foreground/60"}`}
                        >
                          {pm.name}
                        </div>
                        <div className="text-[10px] text-foreground/30 font-mono mt-0.5">
                          {pm.total} sub-groups
                          {pSource ? ` · paired with ${pSource}` : ""}
                        </div>
                      </div>
                      {/* Mini health bar */}
                      {stats && (
                        <MiniHealthBar
                          mapped={stats.mapped}
                          review={stats.review}
                          unmapped={stats.unmapped}
                        />
                      )}
                      {/* Mapped / total */}
                      <span
                        className={`text-[11px] font-semibold tabular-nums font-mono flex-shrink-0 ${
                          stats && stats.mapped + stats.review >= stats.total
                            ? "text-green-400/60"
                            : "text-foreground/40"
                        }`}
                      >
                        {stats ? stats.mapped + stats.review : pm.mapped}/
                        {pm.total}
                      </span>
                    </button>
                  );
                })}
              </div>
              {pairedSource && (
                <p className="text-[10px] text-foreground/25 mt-2 pl-1">
                  Paired source: {pairedSource}
                </p>
              )}
            </div>
          )}

          {/* ── Submodel Group List with Section Dividers ── */}
          <div className="px-4 pb-3 space-y-1">
            {/* Section-based rendering when sections detected */}
            {sectionGroups.some((s) => s.header)
              ? sectionGroups.map((section, si) => {
                  // Apply current filters to section items
                  const visibleItems = section.items.filter((i) =>
                    filteredNameSet.has(i.sourceModel.name),
                  );
                  if (visibleItems.length === 0 && section.header) return null;
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
                })
              : /* Flat rendering (no sections) */
                filteredItems.map((item) => (
                  <SubmodelCardMemo
                    key={item.sourceModel.name}
                    item={item}
                    isSelected={selectedItemId === item.sourceModel.name}
                    isDropTarget={
                      dnd.state.activeDropTarget === item.sourceModel.name
                    }
                    isAutoMatched={autoMatchedNames.has(item.sourceModel.name)}
                    isApproved={approvedNames.has(item.sourceModel.name)}
                    matchScore={scoreMap.get(item.sourceModel.name)}
                    matchFactors={factorsMap.get(item.sourceModel.name)}
                    topSuggestion={
                      topSuggestionsMap.get(item.sourceModel.name) ?? null
                    }
                    onClick={() => setSelectedItemId(item.sourceModel.name)}
                    onAccept={(userModelName) =>
                      handleAccept(item.sourceModel.name, userModelName)
                    }
                    onApprove={() => approveAutoMatch(item.sourceModel.name)}
                    onSkip={() => handleSkipItem(item.sourceModel.name)}
                    onUnlink={() => handleUnlink(item.sourceModel.name)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDragEnter={() =>
                      dnd.handleDragEnter(item.sourceModel.name)
                    }
                    onDragLeave={() =>
                      dnd.handleDragLeave(item.sourceModel.name)
                    }
                    onDrop={(e) => handleDropOnItem(item.sourceModel.name, e)}
                  />
                ))}
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
              {search || statusFilter !== "all" || bannerFilter
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

            {/* Mapping state card: SUGGESTED MATCH / ✓ MAPPED TO / NOT MAPPED */}
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

// ─── Mini Health Bar (Model Selector cards) ───────────

function MiniHealthBar({
  mapped = 0,
  review = 0,
  unmapped = 0,
}: {
  mapped?: number;
  review?: number;
  unmapped?: number;
}) {
  const total = mapped + review + unmapped;
  if (total === 0) return null;

  return (
    <div className="flex w-20 h-1 rounded-sm overflow-hidden gap-px bg-foreground/10 flex-shrink-0">
      {mapped > 0 && (
        <div
          className="bg-green-400"
          style={{ width: `${(mapped / total) * 100}%`, opacity: 0.85 }}
        />
      )}
      {review > 0 && (
        <div
          className="bg-amber-400"
          style={{ width: `${(review / total) * 100}%`, opacity: 0.85 }}
        />
      )}
      {unmapped > 0 && (
        <div
          className="bg-blue-400"
          style={{ width: `${(unmapped / total) * 100}%`, opacity: 0.85 }}
        />
      )}
    </div>
  );
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
