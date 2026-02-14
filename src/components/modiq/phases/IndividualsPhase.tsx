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
  HealthBar,
  DestinationPill,
  type StatusCheckStatus,
} from "../MetadataBadges";
import { STRONG_THRESHOLD, WEAK_THRESHOLD } from "@/types/mappingPhases";
import type { ModelMapping } from "@/lib/modiq/matcher";
import { SortDropdown, sortItems, type SortOption } from "../SortDropdown";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBulkInference } from "@/hooks/useBulkInference";
import { BulkInferenceBanner } from "../BulkInferenceBanner";
import {
  PANEL_STYLES,
  TYPE_BADGE_COLORS,
  GROUP_GRID,
  MODEL_GRID,
} from "../panelStyles";
import {
  CurrentMappingCard,
  NotMappedBanner,
  FilterPill,
  GhostMemberRow,
} from "../SharedHierarchyComponents";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

type StatusFilter =
  | "all"
  | "unmapped"
  | "auto-strong"
  | "auto-review"
  | "mapped"
  | "display-wide";

type ViewMode = "hierarchy" | "flat";

export function IndividualsPhase() {
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

  // Detect super groups for display-wide section
  const hasSuperGroups = useMemo(
    () => phaseItems.some((i) => i.isSuperGroup),
    [phaseItems],
  );
  const superGroupCount = useMemo(
    () => phaseItems.filter((i) => i.isSuperGroup).length,
    [phaseItems],
  );

  // View mode: hierarchy (default when super groups exist) vs flat
  const [viewMode, setViewMode] = useState<ViewMode>(
    hasSuperGroups ? "hierarchy" : "flat",
  );

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
  const unmappedCount = phaseItems.filter(
    (item) => !item.isMapped && !item.isCoveredByMappedGroup,
  ).length;
  const mappedCount = phaseItems.filter(
    (item) => item.isMapped || item.isCoveredByMappedGroup,
  ).length;

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

  // Count auto-matched items in THIS phase for the banner
  const phaseAutoCount = useMemo(
    () =>
      phaseItems.filter((i) => autoMatchedNames.has(i.sourceModel.name)).length,
    [phaseItems, autoMatchedNames],
  );

  // Filtered + stable-sorted items (single unified list)
  const filteredItems = useMemo(() => {
    let items = [...phaseItems];

    // Banner filter overrides status filter when active
    const activeFilter = bannerFilter ?? statusFilter;
    if (activeFilter === "unmapped") items = items.filter((i) => !i.isMapped);
    else if (activeFilter === "display-wide")
      items = items.filter((i) => i.isSuperGroup);
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
    phaseItems,
    statusFilter,
    bannerFilter,
    search,
    sortBy,
    sortVersion,
    topSuggestionsMap,
    approvedNames,
  ]);

  // Build xLights group membership: memberName → most-specific parent group SourceLayerMapping
  // When a model belongs to multiple groups (e.g. "Arch 1" in both "All - Arches - GRP"
  // and "All - Pixels - GRP"), prefer the SMALLEST group (most specific parent).
  const sourceGroupMap = useMemo(() => {
    const map = new Map<string, SourceLayerMapping>();
    for (const layer of interactive.sourceLayerMappings) {
      if (layer.isGroup) {
        for (const member of layer.memberNames) {
          const existing = map.get(member);
          if (
            !existing ||
            layer.memberNames.length < existing.memberNames.length
          ) {
            map.set(member, layer);
          }
        }
      }
    }
    return map;
  }, [interactive.sourceLayerMappings]);

  // Level 2 split: xLights groups with child models, plus ungrouped individuals
  interface XLightsGroup {
    groupItem: SourceLayerMapping;
    members: SourceLayerMapping[];
  }
  const splitByXLightsGroup = useCallback(
    (items: SourceLayerMapping[]) => {
      const groupMap = new Map<string, XLightsGroup>();
      const order: string[] = [];
      const ungrouped: SourceLayerMapping[] = [];

      // First pass: create group entries for any group items in the list
      for (const item of items) {
        if (item.isGroup) {
          groupMap.set(item.sourceModel.name, { groupItem: item, members: [] });
          order.push(item.sourceModel.name);
        }
      }

      // Second pass: assign non-group items to their parent group, or ungrouped
      for (const item of items) {
        if (item.isGroup) continue;
        const parentGroup = sourceGroupMap.get(item.sourceModel.name);
        if (parentGroup) {
          const groupName = parentGroup.sourceModel.name;
          if (groupMap.has(groupName)) {
            groupMap.get(groupName)!.members.push(item);
          } else {
            // Parent group exists but isn't in this filtered list — create it as virtual header
            groupMap.set(groupName, {
              groupItem: parentGroup,
              members: [item],
            });
            order.push(groupName);
          }
        } else {
          ungrouped.push(item);
        }
      }

      // Preserve insertion order (which comes from filtered/sorted items)
      const groups = order.map((name) => groupMap.get(name)!);
      return { groups, ungrouped };
    },
    [sourceGroupMap],
  );

  const itemsSplit = useMemo(() => {
    const split = splitByXLightsGroup(filteredItems);
    // Separate super groups from regular groups
    const superGroups = split.groups.filter((g) => g.groupItem.isSuperGroup);
    const regularGroups = split.groups.filter((g) => !g.groupItem.isSuperGroup);

    // Sort groups by the same sort key as the main list
    const sortGroups = (groups: XLightsGroup[]) => {
      const sorted = sortItems(
        groups.map((g) => g.groupItem),
        sortBy,
        topSuggestionsMap,
      );
      const orderMap = new Map(
        sorted.map((item, i) => [item.sourceModel.name, i]),
      );
      return [...groups].sort(
        (a, b) =>
          (orderMap.get(a.groupItem.sourceModel.name) ?? 0) -
          (orderMap.get(b.groupItem.sourceModel.name) ?? 0),
      );
    };

    return {
      superGroups: sortGroups(superGroups),
      regularGroups: sortGroups(regularGroups),
      ungrouped: split.ungrouped,
    };
  }, [filteredItems, splitByXLightsGroup, sortBy, topSuggestionsMap]);

  // Expand/collapse state for xLights groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [regularGroupsCollapsed, setRegularGroupsCollapsed] = useState(false);
  const [ungroupedCollapsed, setUngroupedCollapsed] = useState(false);
  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }, []);

  // Suggestions for selected item
  const suggestions = useMemo(() => {
    if (!selectedItem) return [];
    return interactive
      .getSuggestionsForLayer(selectedItem.sourceModel)
      .slice(0, 10);
  }, [interactive, selectedItem]);

  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#128077;</span>}
        title="Groups & Models All Set!"
        description="No groups or models need manual matching — they were auto-matched or covered."
      />
    );
  }

  const unmappedItems = phaseItems.filter((item) => !item.isMapped);

  const handleAccept = (sourceName: string, userModelName: string) => {
    interactive.assignUserModelToLayer(sourceName, userModelName);
    bulk.checkForPattern(sourceName, userModelName);
    const current = phaseItemsByName.get(sourceName);
    if (!current?.isMapped) {
      setSelectedItemId(findNextUnmapped(unmappedItems, sourceName));
    }
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

  const handleSkip = (sourceName: string) => {
    interactive.skipSourceLayer(sourceName);
    setSelectedItemId(findNextUnmapped(unmappedItems, sourceName));
  };

  const handleUnlink = (sourceName: string) => {
    interactive.clearLayerMapping(sourceName);
  };

  const handleSkipFamily = (familyItems: SourceLayerMapping[]) => {
    for (const item of familyItems) {
      interactive.skipSourceLayer(item.sourceModel.name);
    }
    const skippedNames = new Set(familyItems.map((i) => i.sourceModel.name));
    const remaining = unmappedItems.filter(
      (i) => !skippedNames.has(i.sourceModel.name),
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

  const renderGroupCard = (group: {
    groupItem: SourceLayerMapping;
    members: SourceLayerMapping[];
  }) => (
    <XLightsGroupCard
      key={group.groupItem.sourceModel.name}
      group={group.groupItem}
      members={group.members}
      isExpanded={expandedGroups.has(group.groupItem.sourceModel.name)}
      isSelected={selectedItemId === group.groupItem.sourceModel.name}
      isAutoMatched={autoMatchedNames.has(group.groupItem.sourceModel.name)}
      isApproved={approvedNames.has(group.groupItem.sourceModel.name)}
      matchScore={scoreMap.get(group.groupItem.sourceModel.name)}
      matchFactors={factorsMap.get(group.groupItem.sourceModel.name)}
      topSuggestion={
        topSuggestionsMap.get(group.groupItem.sourceModel.name) ?? null
      }
      scoreMap={scoreMap}
      autoMatchedNames={autoMatchedNames}
      approvedNames={approvedNames}
      onToggle={() => toggleGroup(group.groupItem.sourceModel.name)}
      onSelect={() => setSelectedItemId(group.groupItem.sourceModel.name)}
      onAccept={(userModelName) =>
        handleAccept(group.groupItem.sourceModel.name, userModelName)
      }
      onApprove={() => approveAutoMatch(group.groupItem.sourceModel.name)}
      onSkip={() => handleSkipFamily([group.groupItem, ...group.members])}
      onUnlink={() => handleUnlink(group.groupItem.sourceModel.name)}
      onMapChildren={() => {
        setExpandedGroups((prev) => {
          const next = new Set(prev);
          next.add(group.groupItem.sourceModel.name);
          return next;
        });
        const firstUnmapped = group.members.find((m) => !m.isMapped);
        if (firstUnmapped) {
          setSelectedItemId(firstUnmapped.sourceModel.name);
        }
      }}
      renderItemCard={renderItemCard}
    />
  );

  const renderItemCard = (item: SourceLayerMapping) => (
    <ItemCardMemo
      key={item.sourceModel.name}
      item={item}
      isSelected={selectedItemId === item.sourceModel.name}
      isDropTarget={dnd.state.activeDropTarget === item.sourceModel.name}
      isAutoMatched={autoMatchedNames.has(item.sourceModel.name)}
      isApproved={approvedNames.has(item.sourceModel.name)}
      matchScore={scoreMap.get(item.sourceModel.name)}
      matchFactors={factorsMap.get(item.sourceModel.name)}
      topSuggestion={topSuggestionsMap.get(item.sourceModel.name) ?? null}
      onClick={() => setSelectedItemId(item.sourceModel.name)}
      onAccept={(userModelName) =>
        handleAccept(item.sourceModel.name, userModelName)
      }
      onApprove={() => approveAutoMatch(item.sourceModel.name)}
      onSkip={() => handleSkip(item.sourceModel.name)}
      onUnlink={() => handleUnlink(item.sourceModel.name)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragEnter={() => dnd.handleDragEnter(item.sourceModel.name)}
      onDragLeave={() => dnd.handleDragLeave(item.sourceModel.name)}
      onDrop={(e) => handleDropOnItem(item.sourceModel.name, e)}
    />
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Model List */}
      <div className="w-1/2 flex flex-col border-r border-border overflow-hidden">
        <div className={PANEL_STYLES.header.wrapper}>
          <div className="flex items-center gap-2">
            <FilterPill
              label={`All (${phaseItems.length})`}
              color="blue"
              active={statusFilter === "all" && !bannerFilter}
              onClick={() => {
                setBannerFilter(null);
                setStatusFilter("all");
                setSortVersion((v) => v + 1);
              }}
            />
            {hasSuperGroups && (
              <FilterPill
                label={`Display-Wide (${superGroupCount})`}
                color="purple"
                active={statusFilter === "display-wide" && !bannerFilter}
                onClick={() => {
                  setBannerFilter(null);
                  setStatusFilter("display-wide");
                  setSortVersion((v) => v + 1);
                }}
              />
            )}
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
            {/* View toggle: Hierarchy / Flat */}
            {hasSuperGroups && (
              <div className="ml-auto flex items-center gap-0.5 bg-foreground/5 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("hierarchy")}
                  className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                    viewMode === "hierarchy"
                      ? "bg-background text-foreground/70 shadow-sm font-medium"
                      : "text-foreground/30 hover:text-foreground/50"
                  }`}
                  title="Hierarchy view — grouped by super groups"
                >
                  <svg
                    className="w-3 h-3 inline -mt-px mr-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v18M4 8h16M7 13h10" />
                  </svg>
                  Tree
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("flat")}
                  className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                    viewMode === "flat"
                      ? "bg-background text-foreground/70 shadow-sm font-medium"
                      : "text-foreground/30 hover:text-foreground/50"
                  }`}
                  title="Flat view — all groups as peers"
                >
                  <svg
                    className="w-3 h-3 inline -mt-px mr-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                  Flat
                </button>
              </div>
            )}
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
                placeholder="Search models..."
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

        {/* Unified list — super groups → groups → ungrouped, with left border visual state */}
        <div className={PANEL_STYLES.scrollArea}>
          {/* Expand/Collapse All (only if there are expandable groups) */}
          {itemsSplit.superGroups.length + itemsSplit.regularGroups.length >
            0 && (
            <div className="flex items-center gap-3 px-4 pb-1.5 text-[10px] text-foreground/30">
              <button
                type="button"
                onClick={() =>
                  setExpandedGroups(
                    new Set(
                      [
                        ...itemsSplit.superGroups,
                        ...itemsSplit.regularGroups,
                      ].map((g) => g.groupItem.sourceModel.name),
                    ),
                  )
                }
                className="hover:text-foreground/60 transition-colors"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={() => setExpandedGroups(new Set())}
                className="hover:text-foreground/60 transition-colors"
              >
                Collapse All
              </button>
            </div>
          )}
          <div className="px-4 pb-3 space-y-1">
            {viewMode === "hierarchy" ? (
              /* ── HIERARCHY VIEW: super groups → regular groups → ungrouped ── */
              <>
                {/* Display-Wide Groups section */}
                {itemsSplit.superGroups.length > 0 && (
                  <SuperGroupSection
                    superGroups={itemsSplit.superGroups}
                    expandedGroups={expandedGroups}
                    selectedItemId={selectedItemId}
                    autoMatchedNames={autoMatchedNames}
                    approvedNames={approvedNames}
                    scoreMap={scoreMap}
                    factorsMap={factorsMap}
                    topSuggestionsMap={topSuggestionsMap}
                    onToggle={toggleGroup}
                    onSelect={setSelectedItemId}
                    onAccept={handleAccept}
                    onApprove={approveAutoMatch}
                    onSkipFamily={handleSkipFamily}
                    onUnlink={handleUnlink}
                    renderItemCard={renderItemCard}
                    phaseItemsByName={phaseItemsByName}
                  />
                )}

                {/* Regular xLights Groups section */}
                {itemsSplit.regularGroups.length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setRegularGroupsCollapsed((v) => !v)}
                      className="flex items-center gap-2 w-full pt-3.5 pb-1.5 px-1 text-left group/section border-b border-border mb-1.5"
                    >
                      <svg
                        className={`w-3 h-3 text-green-400/60 transition-transform duration-150 ${regularGroupsCollapsed ? "" : "rotate-90"}`}
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
                      <span className="text-[10px] font-bold text-green-400 uppercase tracking-[0.1em] font-mono">
                        Groups &amp; Models
                      </span>
                      <span className="text-[10px] text-foreground/30 font-mono">
                        ({itemsSplit.regularGroups.length})
                      </span>
                      <span className="text-[10px] text-foreground/20 ml-auto opacity-0 group-hover/section:opacity-100 transition-opacity">
                        xLights model groups &mdash; matched as a unit with
                        their member models
                      </span>
                    </button>
                    {!regularGroupsCollapsed && (
                      <div className="space-y-1 mt-1">
                        {itemsSplit.regularGroups.map((group) =>
                          renderGroupCard(group),
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Ungrouped individual models section */}
                {itemsSplit.ungrouped.length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setUngroupedCollapsed((v) => !v)}
                      className="flex items-center gap-2 w-full pt-3.5 pb-1.5 px-1 text-left group/section border-b border-border mb-1.5"
                    >
                      <svg
                        className={`w-3 h-3 text-green-400/60 transition-transform duration-150 ${ungroupedCollapsed ? "" : "rotate-90"}`}
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
                      <span className="text-[10px] font-bold text-green-400 uppercase tracking-[0.1em] font-mono">
                        Ungrouped
                      </span>
                      <span className="text-[10px] text-foreground/30 font-mono">
                        ({itemsSplit.ungrouped.length})
                      </span>
                      <span className="text-[10px] text-foreground/20 ml-auto opacity-0 group-hover/section:opacity-100 transition-opacity">
                        Models not assigned to any xLights group
                      </span>
                    </button>
                    {!ungroupedCollapsed && (
                      <div className="space-y-1 mt-1">
                        {itemsSplit.ungrouped.map((item) =>
                          renderItemCard(item),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* ── FLAT VIEW: all groups as peers, no sections ── */
              <>
                {[...itemsSplit.superGroups, ...itemsSplit.regularGroups].map(
                  (group) => renderGroupCard(group),
                )}
                {itemsSplit.ungrouped.map((item) => renderItemCard(item))}
              </>
            )}

            {filteredItems.length === 0 && (
              <p className="py-6 text-center text-[12px] text-foreground/30">
                {search || statusFilter !== "all" || bannerFilter
                  ? "No matches for current filters"
                  : "No items"}
              </p>
            )}
          </div>

          {interactive.hiddenZeroEffectCount > 0 && (
            <p className="mt-4 text-[11px] text-foreground/25 text-center">
              {interactive.hiddenZeroEffectCount} model
              {interactive.hiddenZeroEffectCount === 1 ? "" : "s"} with 0
              effects not shown &mdash; no visual impact in this sequence
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
              {
                color: "bg-foreground/30",
                label: "Covered by group",
                dim: true,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div
                  className={`w-2.5 h-2.5 rounded-sm ${item.color}`}
                  style={{ opacity: "dim" in item ? 0.4 : 0.85 }}
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
                {selectedItem.isSuperGroup && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-500/15 text-purple-400 rounded">
                    SUPER
                  </span>
                )}
                {selectedItem.isGroup && !selectedItem.isSuperGroup && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE_COLORS.GRP} rounded`}
                  >
                    GRP
                  </span>
                )}
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {selectedItem.sourceModel.name}
                </h3>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-foreground/40">
                {selectedItem.isSuperGroup ? (
                  <span>
                    {selectedItem.memberNames.length} models &middot; contains{" "}
                    {selectedItem.containedGroupCount} groups &middot; Scenario{" "}
                    {selectedItem.scenario || "A"}
                  </span>
                ) : selectedItem.isGroup ? (
                  <span>
                    {selectedItem.memberNames.length} members &middot; Scenario{" "}
                    {selectedItem.scenario || "A"}
                  </span>
                ) : (
                  <>
                    {selectedItem.sourceModel.pixelCount ? (
                      <span>{selectedItem.sourceModel.pixelCount}px</span>
                    ) : null}
                    <span>{selectedItem.sourceModel.type}</span>
                    {selectedItem.superGroupLayers.length > 0 && (
                      <span className="text-purple-400/60">
                        +{selectedItem.superGroupLayers.length} layer
                        {selectedItem.superGroupLayers.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </>
                )}
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
                hierarchyMode
                sourceSortBy={sortBy}
              />
            </div>

            {/* Skip (only for unmapped) */}
            {!selectedItem.isMapped && (
              <div className="px-6 py-3 border-t border-border flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleSkip(selectedItem.sourceModel.name)}
                  className="w-full py-2 text-sm text-foreground/40 hover:text-foreground/60 border border-border hover:border-foreground/20 rounded-lg transition-colors"
                >
                  Skip This {selectedItem.isGroup ? "Group" : "Model"}
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
                Select a group or model to see suggestions
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

// ─── xLights Group Card — CSS Grid ────────────────────

function XLightsGroupCard({
  group,
  members,
  isExpanded,
  isSelected,
  isAutoMatched,
  isApproved,
  matchScore,
  matchFactors,
  topSuggestion,
  scoreMap,
  autoMatchedNames: amNames,
  approvedNames: apNames,
  onToggle,
  onSelect,
  onAccept,
  onApprove,
  onSkip,
  onUnlink,
  onMapChildren,
  renderItemCard,
}: {
  group: SourceLayerMapping;
  members: SourceLayerMapping[];
  isExpanded: boolean;
  isSelected: boolean;
  isAutoMatched: boolean;
  isApproved?: boolean;
  matchScore?: number;
  matchFactors?: ModelMapping["factors"];
  topSuggestion: {
    model: { name: string };
    score: number;
    factors?: ModelMapping["factors"];
  } | null;
  scoreMap?: Map<string, number>;
  autoMatchedNames?: ReadonlySet<string>;
  approvedNames?: ReadonlySet<string>;
  onToggle: () => void;
  onSelect: () => void;
  onAccept?: (userModelName: string) => void;
  onApprove?: () => void;
  onSkip?: () => void;
  onUnlink?: () => void;
  onMapChildren?: () => void;
  renderItemCard: (item: SourceLayerMapping) => React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [cascadeDismissed, setCascadeDismissed] = useState(false);
  const fullMemberCount = group.memberNames.length;
  const activeMemberCount = members.length;
  const groupFxCount =
    group.effectCount + members.reduce((sum, m) => sum + m.effectCount, 0);

  const groupStatus = getItemStatus(
    group.isMapped,
    false,
    isAutoMatched,
    isApproved ?? false,
    matchScore,
  );
  const leftBorder = getLeftBorderColor(groupStatus);
  const confidencePct =
    matchScore != null ? Math.round(matchScore * 100) : undefined;

  // Compute member match confidence breakdown for health bar
  const memberStats = useMemo(() => {
    let strong = 0;
    let review = 0;
    let weak = 0;
    let unmapped = 0;
    let covered = 0;
    for (const m of members) {
      if (!m.isMapped) {
        if (m.isCoveredByMappedGroup) covered++;
        else unmapped++;
      } else {
        const s = scoreMap?.get(m.sourceModel.name) ?? 0;
        const isAuto = amNames?.has(m.sourceModel.name);
        const isAppr = apNames?.has(m.sourceModel.name);
        if (!isAuto || isAppr || s >= STRONG_THRESHOLD) strong++;
        else if (s >= WEAK_THRESHOLD) review++;
        else weak++;
      }
    }
    const ghostCount = fullMemberCount - activeMemberCount;
    covered += ghostCount;
    return { strong, review, weak, unmapped, covered, total: fullMemberCount };
  }, [members, scoreMap, amNames, apNames, fullMemberCount, activeMemberCount]);

  // Ghost members: names in the group definition but not in the active members list
  const activeMemberNames = useMemo(
    () => new Set(members.map((m) => m.sourceModel.name)),
    [members],
  );
  const ghostMembers = useMemo(
    () =>
      group.memberNames
        .filter((name) => !activeMemberNames.has(name))
        .sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
        ),
    [group.memberNames, activeMemberNames],
  );

  const hasChildren = activeMemberCount > 0 || ghostMembers.length > 0;

  return (
    <div
      className={`rounded-md overflow-hidden transition-all border-l-[3px] ${leftBorder} mb-0.5 ${
        isSelected
          ? "ring-1 ring-accent/20 bg-accent/5"
          : "bg-foreground/[0.02]"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Group header row — CSS Grid */}
      <div
        className="cursor-pointer"
        style={{
          display: "grid",
          gridTemplateColumns: GROUP_GRID,
          alignItems: "center",
          padding: "6px 10px 6px 8px",
          gap: "0 6px",
          minHeight: 32,
        }}
        onClick={onSelect}
      >
        {/* Col 1: Status checkbox */}
        <StatusCheck
          status={groupStatus}
          onClick={
            groupStatus === "needsReview" || groupStatus === "weak"
              ? () => onApprove?.()
              : undefined
          }
        />
        {/* Col 2: FX badge */}
        <FxBadge count={groupFxCount} />
        {/* Col 3: Chevron */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex items-center justify-center cursor-pointer"
        >
          <svg
            className={`w-[13px] h-[13px] text-foreground/30 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
        {/* Col 4: Type badge */}
        <TypeBadge type="GRP" />
        {/* Col 5: Name */}
        <span className="text-[13px] font-semibold text-foreground truncate">
          {group.sourceModel.name}
        </span>
        {/* Col 6: Destination + inline unlink */}
        <div className="flex items-center justify-end gap-1">
          {group.isMapped ? (
            <>
              <DestinationPill
                name={group.assignedUserModels[0]?.name ?? ""}
                confidence={confidencePct}
                autoMatched={isAutoMatched}
                matchScore={matchScore}
                matchFactors={matchFactors}
              />
              {onUnlink && (
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
              )}
            </>
          ) : topSuggestion && onAccept ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAccept(topSuggestion.model.name);
              }}
              className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors whitespace-nowrap"
              title={`Accept: ${topSuggestion.model.name}`}
            >
              + Assign
            </button>
          ) : (
            <span className="text-[11px] text-foreground/20">+ Assign</span>
          )}
        </div>
        {/* Col 7: Health bar */}
        <div className="px-0.5">
          {activeMemberCount > 0 ? (
            <HealthBar
              strong={memberStats.strong}
              needsReview={memberStats.review}
              weak={memberStats.weak}
              unmapped={memberStats.unmapped}
              covered={memberStats.covered}
              totalModels={memberStats.total}
            />
          ) : (
            <div />
          )}
        </div>
        {/* Col 8: Skip only */}
        <div
          className="flex items-center justify-end"
          style={{
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.1s ease",
          }}
        >
          {onSkip && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSkip();
              }}
              className="w-[22px] h-[22px] flex items-center justify-center rounded hover:bg-red-500/15 transition-colors"
              title={`Skip group and ${fullMemberCount} members`}
            >
              <svg
                className="w-[10px] h-[10px] text-foreground/30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {/* Cascade prompt — map children inside this group */}
      {group.isMapped &&
        memberStats.unmapped > 0 &&
        onMapChildren &&
        !cascadeDismissed && (
          <div className="flex items-center gap-2 py-1.5 px-3 pl-10 bg-green-500/[0.04] border-t border-green-500/10">
            <span className="text-[11px] text-foreground/50">
              Map {memberStats.unmapped} model
              {memberStats.unmapped !== 1 ? "s" : ""} inside this group to
              matching models in the source?
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMapChildren();
              }}
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded border border-green-500/25 bg-green-500/8 text-green-400 hover:bg-green-500/15 transition-colors"
            >
              Yes, Map Models
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCascadeDismissed(true);
              }}
              className="text-[11px] font-medium px-2.5 py-0.5 rounded border border-border bg-transparent text-foreground/40 hover:text-foreground/60 transition-colors"
            >
              No thanks
            </button>
          </div>
        )}
      {/* Expanded children */}
      {isExpanded && hasChildren && (
        <div className="pl-5 pr-2 pb-2 pt-0.5 border-t border-border/20">
          {members.map((item) => renderItemCard(item))}
          {ghostMembers.map((name) => (
            <GhostMemberRow key={name} name={name} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Status helper ───────────────────────────────────

function getItemStatus(
  isMapped: boolean,
  isCovered: boolean | undefined,
  isAutoMatched: boolean,
  isApproved: boolean,
  score: number | undefined,
): StatusCheckStatus {
  if (isCovered) return "covered";
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
      return "border-l-blue-400/40";
    case "covered":
      return "border-l-foreground/15";
  }
}

// ─── Item Card (Left Panel) — CSS Grid ───────────────

function ItemCard({
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
    factors?: ModelMapping["factors"];
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
  const isCovered = item.isCoveredByMappedGroup && !item.isMapped;
  const status = getItemStatus(
    item.isMapped,
    isCovered,
    isAutoMatched,
    isApproved,
    matchScore,
  );
  const leftBorder = getLeftBorderColor(status);
  const confidencePct =
    matchScore != null ? Math.round(matchScore * 100) : undefined;

  // Covered-by-group rows: dimmed, non-interactive
  if (isCovered) {
    return (
      <div
        className="rounded border-l-[3px] border-l-foreground/15 mb-px"
        style={{
          display: "grid",
          gridTemplateColumns: MODEL_GRID,
          alignItems: "center",
          padding: "3px 10px 3px 8px",
          gap: "0 6px",
          minHeight: 26,
          opacity: 0.4,
        }}
      >
        <StatusCheck status="covered" />
        <FxBadge count={item.effectCount} />
        <span className="text-[12px] text-foreground/40 truncate">
          {item.sourceModel.name}
        </span>
        <span className="text-[11px] text-foreground/30 italic text-right whitespace-nowrap">
          covered by group
        </span>
        <div />
        <div style={{ width: 50 }} />
      </div>
    );
  }

  return (
    <div
      className={`rounded border-l-[3px] ${leftBorder} mb-px transition-all duration-100 cursor-pointer group/row ${
        isDropTarget
          ? "bg-accent/10 ring-2 ring-accent/30"
          : isSelected
            ? "bg-accent/5 ring-1 ring-accent/20"
            : "hover:bg-foreground/[0.02]"
      }`}
      style={{
        display: "grid",
        gridTemplateColumns: MODEL_GRID,
        alignItems: "center",
        padding: "3px 10px 3px 8px",
        gap: "0 6px",
        minHeight: 28,
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
      {/* Col 3: Name */}
      <span className="text-[12px] font-medium text-foreground truncate">
        {item.sourceModel.name}
      </span>
      {/* Col 4: Destination / suggestion + inline unlink */}
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
            {/* Unlink icon — inline with destination pill (hover-only) */}
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
            className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors whitespace-nowrap"
            title={`Accept: ${topSuggestion.model.name} (${Math.round(topSuggestion.score * 100)}%)`}
          >
            + Assign
          </button>
        ) : (
          <span className="text-[11px] text-foreground/20 whitespace-nowrap">
            + Assign
          </span>
        )}
      </div>
      {/* Col 5: Health bar (empty for model rows) */}
      <div />
      {/* Col 6: Skip action only (hover) */}
      <div
        className="flex items-center justify-end"
        style={{ opacity: hovered ? 1 : 0, transition: "opacity 0.1s ease" }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          className="w-[22px] h-[22px] flex items-center justify-center rounded hover:bg-red-500/15 transition-colors"
          title="Skip — remove from workflow"
        >
          <svg
            className="w-[10px] h-[10px] text-foreground/30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const ItemCardMemo = memo(
  ItemCard,
  (prev, next) =>
    prev.item.sourceModel === next.item.sourceModel &&
    prev.item.isMapped === next.item.isMapped &&
    prev.item.effectCount === next.item.effectCount &&
    prev.item.assignedUserModels === next.item.assignedUserModels &&
    prev.item.isCoveredByMappedGroup === next.item.isCoveredByMappedGroup &&
    prev.isSelected === next.isSelected &&
    prev.isDropTarget === next.isDropTarget &&
    prev.isAutoMatched === next.isAutoMatched &&
    prev.isApproved === next.isApproved &&
    prev.matchScore === next.matchScore &&
    prev.topSuggestion?.model.name === next.topSuggestion?.model.name &&
    prev.topSuggestion?.score === next.topSuggestion?.score &&
    prev.onUnlink === next.onUnlink,
);

// ─── Display-Wide Super Group Section ────────────────

interface XLightsGroup {
  groupItem: SourceLayerMapping;
  members: SourceLayerMapping[];
}

function SuperGroupSection({
  superGroups,
  expandedGroups,
  selectedItemId,
  autoMatchedNames,
  approvedNames,
  scoreMap,
  factorsMap,
  topSuggestionsMap,
  onToggle,
  onSelect,
  onAccept,
  onApprove,
  onSkipFamily,
  onUnlink,
  renderItemCard,
  phaseItemsByName,
}: {
  superGroups: XLightsGroup[];
  expandedGroups: Set<string>;
  selectedItemId: string | null;
  autoMatchedNames: ReadonlySet<string>;
  approvedNames: ReadonlySet<string>;
  scoreMap: Map<string, number>;
  factorsMap: Map<string, ModelMapping["factors"]>;
  topSuggestionsMap: Map<
    string,
    {
      model: { name: string };
      score: number;
      factors?: ModelMapping["factors"];
    } | null
  >;
  onToggle: (name: string) => void;
  onSelect: (name: string) => void;
  onAccept: (sourceName: string, userModelName: string) => void;
  onApprove: (name: string) => void;
  onSkipFamily: (items: SourceLayerMapping[]) => void;
  onUnlink: (sourceName: string) => void;
  renderItemCard: (item: SourceLayerMapping) => React.ReactNode;
  phaseItemsByName: Map<string, SourceLayerMapping>;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-3">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-1 pt-3.5 pb-1.5 text-left group border-b border-border mb-1.5"
      >
        <svg
          className={`w-3 h-3 text-green-400/60 transition-transform duration-150 ${collapsed ? "" : "rotate-90"}`}
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
        <span className="text-[10px] font-bold text-green-400 uppercase tracking-[0.1em] font-mono">
          Display-Wide Groups
        </span>
        <span className="text-[10px] text-foreground/30 font-mono">
          ({superGroups.length})
        </span>
      </button>

      {!collapsed && (
        <>
          <div className="space-y-1">
            {superGroups.map((group) => {
              // Show nested child groups inside super groups
              const childGroupNames = group.groupItem.memberNames.filter(
                (name) => {
                  const item = phaseItemsByName.get(name);
                  return (
                    item?.isGroup &&
                    !item.isSuperGroup &&
                    item.parentSuperGroup === group.groupItem.sourceModel.name
                  );
                },
              );

              return (
                <SuperGroupCard
                  key={group.groupItem.sourceModel.name}
                  group={group.groupItem}
                  members={group.members}
                  childGroupNames={childGroupNames}
                  phaseItemsByName={phaseItemsByName}
                  isExpanded={expandedGroups.has(
                    group.groupItem.sourceModel.name,
                  )}
                  isSelected={
                    selectedItemId === group.groupItem.sourceModel.name
                  }
                  isAutoMatched={autoMatchedNames.has(
                    group.groupItem.sourceModel.name,
                  )}
                  isApproved={approvedNames.has(
                    group.groupItem.sourceModel.name,
                  )}
                  matchScore={scoreMap.get(group.groupItem.sourceModel.name)}
                  matchFactors={factorsMap.get(
                    group.groupItem.sourceModel.name,
                  )}
                  topSuggestion={
                    topSuggestionsMap.get(group.groupItem.sourceModel.name) ??
                    null
                  }
                  onToggle={() => onToggle(group.groupItem.sourceModel.name)}
                  onSelect={() => onSelect(group.groupItem.sourceModel.name)}
                  onAccept={(userModelName) =>
                    onAccept(group.groupItem.sourceModel.name, userModelName)
                  }
                  onApprove={() => onApprove(group.groupItem.sourceModel.name)}
                  onSkip={() =>
                    onSkipFamily([group.groupItem, ...group.members])
                  }
                  onUnlink={() => onUnlink(group.groupItem.sourceModel.name)}
                  renderItemCard={renderItemCard}
                  expandedGroups={expandedGroups}
                  onToggleChild={onToggle}
                  onSelectChild={onSelect}
                  autoMatchedNames={autoMatchedNames}
                  approvedNames={approvedNames}
                  scoreMap={scoreMap}
                  factorsMap={factorsMap}
                  topSuggestionsMap={topSuggestionsMap}
                  onAcceptChild={onAccept}
                  onApproveChild={onApprove}
                  onSkipChild={(items) => onSkipFamily(items)}
                  onUnlinkChild={onUnlink}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Super Group Card ────────────────────────────────

function SuperGroupCard({
  group,
  members,
  childGroupNames,
  phaseItemsByName,
  isExpanded,
  isSelected,
  isAutoMatched,
  isApproved,
  matchScore,
  matchFactors,
  topSuggestion,
  onToggle,
  onSelect,
  onAccept,
  onApprove,
  onSkip,
  onUnlink,
  renderItemCard,
  expandedGroups,
  onToggleChild,
  onSelectChild,
  autoMatchedNames,
  approvedNames,
  scoreMap,
  factorsMap,
  topSuggestionsMap,
  onAcceptChild,
  onApproveChild,
  onSkipChild,
  onUnlinkChild,
}: {
  group: SourceLayerMapping;
  members: SourceLayerMapping[];
  childGroupNames: string[];
  phaseItemsByName: Map<string, SourceLayerMapping>;
  isExpanded: boolean;
  isSelected: boolean;
  isAutoMatched: boolean;
  isApproved?: boolean;
  matchScore?: number;
  matchFactors?: ModelMapping["factors"];
  topSuggestion: {
    model: { name: string };
    score: number;
    factors?: ModelMapping["factors"];
  } | null;
  onToggle: () => void;
  onSelect: () => void;
  onAccept: (userModelName: string) => void;
  onApprove: () => void;
  onSkip: () => void;
  onUnlink: () => void;
  renderItemCard: (item: SourceLayerMapping) => React.ReactNode;
  expandedGroups: Set<string>;
  onToggleChild: (name: string) => void;
  onSelectChild: (name: string) => void;
  autoMatchedNames: ReadonlySet<string>;
  approvedNames: ReadonlySet<string>;
  scoreMap: Map<string, number>;
  factorsMap: Map<string, ModelMapping["factors"]>;
  topSuggestionsMap: Map<
    string,
    {
      model: { name: string };
      score: number;
      factors?: ModelMapping["factors"];
    } | null
  >;
  onAcceptChild: (sourceName: string, userModelName: string) => void;
  onApproveChild: (name: string) => void;
  onSkipChild: (items: SourceLayerMapping[]) => void;
  onUnlinkChild: (sourceName: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const totalCount = group.memberNames.length;
  const groupFxCount =
    group.effectCount + members.reduce((sum, m) => sum + m.effectCount, 0);

  const superStatus = getItemStatus(
    group.isMapped,
    false,
    isAutoMatched,
    isApproved ?? false,
    matchScore,
  );
  const leftBorder = group.isMapped
    ? getLeftBorderColor(superStatus).replace("green-500", "purple-500")
    : "border-l-purple-400/40";
  const confidencePct =
    matchScore != null ? Math.round(matchScore * 100) : undefined;

  // Compute member stats for health bar
  const superMemberStats = useMemo(() => {
    let strong = 0;
    let review = 0;
    let weak = 0;
    let unmapped = 0;
    let covered = 0;
    for (const m of members) {
      if (!m.isMapped) {
        if (m.isCoveredByMappedGroup) covered++;
        else unmapped++;
      } else {
        const s = scoreMap.get(m.sourceModel.name) ?? 0;
        const isAuto = autoMatchedNames.has(m.sourceModel.name);
        const isAppr = approvedNames.has(m.sourceModel.name);
        if (!isAuto || isAppr || s >= STRONG_THRESHOLD) strong++;
        else if (s >= WEAK_THRESHOLD) review++;
        else weak++;
      }
    }
    const ghostCount = totalCount - members.length;
    covered += ghostCount;
    return { strong, review, weak, unmapped, covered, total: totalCount };
  }, [members, scoreMap, autoMatchedNames, approvedNames, totalCount]);

  return (
    <div
      className={`rounded-md overflow-hidden transition-all border-l-[3px] ${leftBorder} mb-0.5 ${
        isSelected
          ? "ring-1 ring-accent/20 bg-accent/5"
          : "bg-purple-500/[0.03]"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Super group header row — CSS Grid */}
      <div
        className="cursor-pointer"
        style={{
          display: "grid",
          gridTemplateColumns: GROUP_GRID,
          alignItems: "center",
          padding: "6px 10px 6px 8px",
          gap: "0 6px",
          minHeight: 32,
        }}
        onClick={onSelect}
      >
        {/* Col 1: Status checkbox */}
        <StatusCheck
          status={superStatus}
          onClick={
            superStatus === "needsReview" || superStatus === "weak"
              ? () => onApprove()
              : undefined
          }
        />
        {/* Col 2: FX badge */}
        <FxBadge count={groupFxCount} />
        {/* Col 3: Chevron */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex items-center justify-center cursor-pointer"
        >
          <svg
            className={`w-[13px] h-[13px] text-purple-400/50 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
        {/* Col 4: Type badge */}
        <TypeBadge type="SUPER" />
        {/* Col 5: Name */}
        <span className="text-[13px] font-semibold text-foreground truncate">
          {group.sourceModel.name}
        </span>
        {/* Col 6: Destination + inline unlink */}
        <div className="flex items-center justify-end gap-1">
          {group.isMapped ? (
            <>
              <DestinationPill
                name={group.assignedUserModels[0]?.name ?? ""}
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
              className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors whitespace-nowrap"
              title={`Accept: ${topSuggestion.model.name}`}
            >
              + Assign
            </button>
          ) : (
            <span className="text-[11px] text-foreground/20">+ Assign</span>
          )}
        </div>
        {/* Col 7: Health bar */}
        <div className="px-0.5">
          {members.length > 0 ? (
            <HealthBar
              strong={superMemberStats.strong}
              needsReview={superMemberStats.review}
              weak={superMemberStats.weak}
              unmapped={superMemberStats.unmapped}
              covered={superMemberStats.covered}
              totalModels={superMemberStats.total}
            />
          ) : (
            <div />
          )}
        </div>
        {/* Col 8: Skip only */}
        <div
          className="flex items-center justify-end"
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
            className="w-[22px] h-[22px] flex items-center justify-center rounded hover:bg-red-500/15 transition-colors"
            title={`Skip group and ${totalCount} members`}
          >
            <svg
              className="w-[10px] h-[10px] text-foreground/30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      {/* Expanded: show child groups (hierarchy) or direct members */}
      {isExpanded && (
        <div className="pl-5 pr-2 pb-2 pt-0.5 border-t border-purple-400/10">
          {childGroupNames.length > 0 ? (
            <>
              {childGroupNames.map((childName) => {
                const childItem = phaseItemsByName.get(childName);
                if (!childItem) return null;
                const childMembers = members.filter((m) =>
                  childItem.memberNames.includes(m.sourceModel.name),
                );
                return (
                  <XLightsGroupCard
                    key={childName}
                    group={childItem}
                    members={childMembers}
                    isExpanded={expandedGroups.has(childName)}
                    isSelected={false}
                    isAutoMatched={autoMatchedNames.has(childName)}
                    isApproved={approvedNames.has(childName)}
                    matchScore={scoreMap.get(childName)}
                    matchFactors={factorsMap.get(childName)}
                    topSuggestion={topSuggestionsMap.get(childName) ?? null}
                    scoreMap={scoreMap}
                    autoMatchedNames={autoMatchedNames}
                    approvedNames={approvedNames}
                    onToggle={() => onToggleChild(childName)}
                    onSelect={() => onSelectChild(childName)}
                    onAccept={(userModelName) =>
                      onAcceptChild(childName, userModelName)
                    }
                    onApprove={() => onApproveChild(childName)}
                    onSkip={() =>
                      onSkipChild(
                        childMembers.length > 0
                          ? [childItem, ...childMembers]
                          : [childItem],
                      )
                    }
                    onUnlink={() => onUnlinkChild(childName)}
                    renderItemCard={renderItemCard}
                  />
                );
              })}
              {/* Individual members not in any child group */}
              {members
                .filter(
                  (m) =>
                    !childGroupNames.some((cn) => {
                      const cItem = phaseItemsByName.get(cn);
                      return cItem?.memberNames.includes(m.sourceModel.name);
                    }),
                )
                .map((item) => renderItemCard(item))}
            </>
          ) : (
            members.map((item) => renderItemCard(item))
          )}
        </div>
      )}
    </div>
  );
}
