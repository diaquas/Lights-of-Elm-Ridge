"use client";

import { useState, useMemo, useCallback, useRef, useEffect, memo } from "react";
import {
  useMappingPhase,
  findNextUnmapped,
} from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { UniversalSourcePanel } from "../UniversalSourcePanel";
import {
  MetadataBadges,
  HeroEffectBadge,
  InlineEffectBadge,
  AutoMatchBanner,
  Link2Badge,
} from "../MetadataBadges";
import { STRONG_THRESHOLD } from "@/types/mappingPhases";
import { SortDropdown, sortItems, type SortOption } from "../SortDropdown";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBulkInference } from "@/hooks/useBulkInference";
import { BulkInferenceBanner } from "../BulkInferenceBanner";
import { PANEL_STYLES, TYPE_BADGE_COLORS } from "../panelStyles";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

type StatusFilter = "all" | "unmapped" | "auto-strong" | "auto-review" | "mapped";

export function IndividualsPhase() {
  const { phaseItems, goToNextPhase, interactive, autoMatchedNames, autoMatchStats, scoreMap } = useMappingPhase();
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
  const [bannerFilter, setBannerFilter] = useState<"auto-strong" | "auto-review" | null>(null);

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

  // Stable sort: rows don't move on map/unmap — only on explicit re-sort
  const [sortVersion, setSortVersion] = useState(0);
  const stableOrderRef = useRef<Map<string, number>>(new Map());
  const lastSortRef = useRef({ sortBy: "" as SortOption, sortVersion: -1, search: "", statusFilter: "" as string });

  const skippedItems = interactive.sourceLayerMappings.filter(
    (l) => l.isSkipped,
  );
  const unmappedCount = phaseItems.filter((item) => !item.isMapped && !item.isCoveredByMappedGroup).length;
  const mappedCount = phaseItems.filter((item) => item.isMapped || item.isCoveredByMappedGroup).length;

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
      { model: { name: string }; score: number } | null
    >();
    for (const item of phaseItems) {
      if (item.isMapped) continue;
      const suggs = interactive.getSuggestionsForLayer(item.sourceModel);
      map.set(item.sourceModel.name, suggs[0] ?? null);
    }
    return map;
  }, [phaseItems, interactive]);

  // Count auto-matched items in THIS phase for the banner
  const phaseAutoCount = useMemo(
    () => phaseItems.filter((i) => autoMatchedNames.has(i.sourceModel.name)).length,
    [phaseItems, autoMatchedNames],
  );

  // Filtered + stable-sorted items (single unified list)
  const filteredItems = useMemo(() => {
    let items = [...phaseItems];

    // Banner filter overrides status filter when active
    const activeFilter = bannerFilter ?? statusFilter;
    if (activeFilter === "unmapped") items = items.filter((i) => !i.isMapped);
    else if (activeFilter === "auto-strong") items = items.filter((i) => autoMatchedNames.has(i.sourceModel.name) && (scoreMap.get(i.sourceModel.name) ?? 0) >= STRONG_THRESHOLD);
    else if (activeFilter === "auto-review") items = items.filter((i) => autoMatchedNames.has(i.sourceModel.name) && (scoreMap.get(i.sourceModel.name) ?? 0) < STRONG_THRESHOLD);
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
      stableOrderRef.current = new Map(sorted.map((r, i) => [r.sourceModel.name, i]));
      lastSortRef.current = { sortBy, sortVersion, search, statusFilter };
      return sorted;
    }

    const order = stableOrderRef.current;
    return [...items].sort((a, b) => {
      const ai = order.get(a.sourceModel.name) ?? Infinity;
      const bi = order.get(b.sourceModel.name) ?? Infinity;
      if (ai !== bi) return ai - bi;
      return a.sourceModel.name.localeCompare(b.sourceModel.name, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [phaseItems, statusFilter, bannerFilter, search, sortBy, sortVersion, topSuggestionsMap]);

  // Build xLights group membership: memberName → most-specific parent group SourceLayerMapping
  // When a model belongs to multiple groups (e.g. "Arch 1" in both "All - Arches - GRP"
  // and "All - Pixels - GRP"), prefer the SMALLEST group (most specific parent).
  const sourceGroupMap = useMemo(() => {
    const map = new Map<string, SourceLayerMapping>();
    for (const layer of interactive.sourceLayerMappings) {
      if (layer.isGroup) {
        for (const member of layer.memberNames) {
          const existing = map.get(member);
          if (!existing || layer.memberNames.length < existing.memberNames.length) {
            map.set(member, layer);
          }
        }
      }
    }
    return map;
  }, [interactive.sourceLayerMappings]);

  // Level 2 split: xLights groups with child models, plus ungrouped individuals
  interface XLightsGroup { groupItem: SourceLayerMapping; members: SourceLayerMapping[] }
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
            groupMap.set(groupName, { groupItem: parentGroup, members: [item] });
            order.push(groupName);
          }
        } else {
          ungrouped.push(item);
        }
      }

      const groups = order.map((name) => groupMap.get(name)!);
      groups.sort((a, b) => a.groupItem.sourceModel.name.localeCompare(b.groupItem.sourceModel.name));
      return { groups, ungrouped };
    },
    [sourceGroupMap],
  );

  const itemsSplit = useMemo(() => {
    const split = splitByXLightsGroup(filteredItems);
    // Separate super groups from regular groups
    const superGroups = split.groups.filter((g) => g.groupItem.isSuperGroup);
    const regularGroups = split.groups.filter((g) => !g.groupItem.isSuperGroup);
    return { superGroups, regularGroups, ungrouped: split.ungrouped };
  }, [filteredItems, splitByXLightsGroup]);

  // Expand/collapse state for xLights groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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

  const renderItemCard = (item: SourceLayerMapping) => (
    <ItemCardMemo
      key={item.sourceModel.name}
      item={item}
      isSelected={selectedItemId === item.sourceModel.name}
      isDropTarget={dnd.state.activeDropTarget === item.sourceModel.name}
      isAutoMatched={autoMatchedNames.has(item.sourceModel.name)}
      topSuggestion={topSuggestionsMap.get(item.sourceModel.name) ?? null}
      onClick={() => setSelectedItemId(item.sourceModel.name)}
      onAccept={(userModelName) =>
        handleAccept(item.sourceModel.name, userModelName)
      }
      onSkip={() => handleSkip(item.sourceModel.name)}
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
          <h2 className={PANEL_STYLES.header.title}>
            <svg
              className="w-5 h-5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Groups &amp; Models
          </h2>
          {/* Status filter pills — own row below title */}
          <div className="flex items-center gap-1 mt-1.5">
            <TypeFilterPill label={`All (${phaseItems.length})`} color="blue" active={statusFilter === "all" && !bannerFilter} onClick={() => { setBannerFilter(null); setStatusFilter("all"); setSortVersion((v) => v + 1); }} />
            <TypeFilterPill label={`Mapped (${mappedCount})`} color="green" active={statusFilter === "mapped" && !bannerFilter} onClick={() => { setBannerFilter(null); setStatusFilter("mapped"); setSortVersion((v) => v + 1); }} />
            <TypeFilterPill label={`Unmapped (${unmappedCount})`} color="amber" active={statusFilter === "unmapped" && !bannerFilter} onClick={() => { setBannerFilter(null); setStatusFilter("unmapped"); setSortVersion((v) => v + 1); }} />
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
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <SortDropdown value={sortBy} onChange={(v) => { setSortBy(v); setSortVersion((sv) => sv + 1); }} />
            <button type="button" onClick={() => setSortVersion((v) => v + 1)} className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors px-1" title="Re-sort">&#x21bb;</button>
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
          onFilterStrong={() => { setBannerFilter("auto-strong"); setSortVersion((v) => v + 1); }}
          onFilterReview={() => { setBannerFilter("auto-review"); setSortVersion((v) => v + 1); }}
          onClearFilter={() => { setBannerFilter(null); setSortVersion((v) => v + 1); }}
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
          {(itemsSplit.superGroups.length + itemsSplit.regularGroups.length) > 0 && (
            <div className="flex items-center gap-3 px-4 pb-1.5 text-[10px] text-foreground/30">
              <button type="button" onClick={() => setExpandedGroups(new Set([...itemsSplit.superGroups, ...itemsSplit.regularGroups].map((g) => g.groupItem.sourceModel.name)))} className="hover:text-foreground/60 transition-colors">Expand All</button>
              <button type="button" onClick={() => setExpandedGroups(new Set())} className="hover:text-foreground/60 transition-colors">Collapse All</button>
            </div>
          )}
          <div className="px-4 pb-3 space-y-1">
            {/* Display-Wide Groups section */}
            {itemsSplit.superGroups.length > 0 && (
              <SuperGroupSection
                superGroups={itemsSplit.superGroups}
                expandedGroups={expandedGroups}
                selectedItemId={selectedItemId}
                autoMatchedNames={autoMatchedNames}
                topSuggestionsMap={topSuggestionsMap}
                onToggle={toggleGroup}
                onSelect={setSelectedItemId}
                onAccept={handleAccept}
                onSkipFamily={handleSkipFamily}
                renderItemCard={renderItemCard}
                phaseItemsByName={phaseItemsByName}
              />
            )}

            {/* Regular xLights Groups with child models */}
            {itemsSplit.regularGroups.map((group) => (
              <XLightsGroupCard
                key={group.groupItem.sourceModel.name}
                group={group.groupItem}
                members={group.members}
                isExpanded={expandedGroups.has(group.groupItem.sourceModel.name)}
                isSelected={selectedItemId === group.groupItem.sourceModel.name}
                isAutoMatched={autoMatchedNames.has(group.groupItem.sourceModel.name)}
                topSuggestion={topSuggestionsMap.get(group.groupItem.sourceModel.name) ?? null}
                onToggle={() => toggleGroup(group.groupItem.sourceModel.name)}
                onSelect={() => setSelectedItemId(group.groupItem.sourceModel.name)}
                onAccept={(userModelName) => handleAccept(group.groupItem.sourceModel.name, userModelName)}
                onSkip={() => handleSkipFamily([group.groupItem, ...group.members])}
                renderItemCard={renderItemCard}
              />
            ))}

            {/* Ungrouped individual models */}
            {itemsSplit.ungrouped.map((item) => renderItemCard(item))}

            {filteredItems.length === 0 && (
              <p className="py-6 text-center text-[12px] text-foreground/30">
                {search || statusFilter !== "all" || bannerFilter ? "No matches for current filters" : "No items"}
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
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-500/15 text-purple-400 rounded">SUPER</span>
                )}
                {selectedItem.isGroup && !selectedItem.isSuperGroup && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE_COLORS.GRP} rounded`}>GRP</span>
                )}
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {selectedItem.sourceModel.name}
                </h3>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-foreground/40">
                {selectedItem.isSuperGroup ? (
                  <span>{selectedItem.memberNames.length} models &middot; contains {selectedItem.containedGroupCount} groups &middot; Scenario {selectedItem.scenario || "A"}</span>
                ) : selectedItem.isGroup ? (
                  <span>{selectedItem.memberNames.length} members &middot; Scenario {selectedItem.scenario || "A"}</span>
                ) : (
                  <>
                    {selectedItem.sourceModel.pixelCount ? <span>{selectedItem.sourceModel.pixelCount}px</span> : null}
                    <span>{selectedItem.sourceModel.type}</span>
                    {selectedItem.superGroupLayers.length > 0 && (
                      <span className="text-purple-400/60">+{selectedItem.superGroupLayers.length} layer{selectedItem.superGroupLayers.length !== 1 ? "s" : ""}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Current Mapping Card (for mapped items) */}
            {selectedItem.isMapped && (
              <CurrentMappingCard
                item={selectedItem}
                onRemoveLink={(destName) =>
                  interactive.removeLinkFromLayer(selectedItem.sourceModel.name, destName)
                }
              />
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
                excludeNames={selectedItem.isMapped ? new Set(selectedItem.assignedUserModels.map((m) => m.name)) : undefined}
                destSuperGroupNames={interactive.destSuperGroupNames}
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
              <p className="text-sm">Select a group or model to see suggestions</p>
              <p className="text-xs text-foreground/20 mt-1.5">Already-mapped items can be clicked to review or swap</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── xLights Group Card (bordered container for model groups) ────────

function XLightsGroupCard({
  group,
  members,
  isExpanded,
  isSelected,
  isAutoMatched,
  topSuggestion,
  onToggle,
  onSelect,
  onAccept,
  onSkip,
  renderItemCard,
}: {
  group: SourceLayerMapping;
  members: SourceLayerMapping[];
  isExpanded: boolean;
  isSelected: boolean;
  isAutoMatched: boolean;
  topSuggestion: { model: { name: string }; score: number } | null;
  onToggle: () => void;
  onSelect: () => void;
  onAccept?: (userModelName: string) => void;
  onSkip?: () => void;
  renderItemCard: (item: SourceLayerMapping) => React.ReactNode;
}) {
  const mappedCount = members.filter((m) => m.isMapped).length;
  // Always show the FULL member count from the group definition, not just active members
  const fullMemberCount = group.memberNames.length;
  const activeMemberCount = members.length;
  const groupFxCount = group.effectCount + members.reduce((sum, m) => sum + m.effectCount, 0);
  const groupBorder = group.isMapped || (activeMemberCount > 0 && mappedCount === activeMemberCount) ? "border-l-green-500/70" : mappedCount > 0 ? "border-l-amber-400/70" : "border-l-amber-400/70";

  // Ghost members: names in the group definition but not in the active members list
  const activeMemberNames = useMemo(() => new Set(members.map((m) => m.sourceModel.name)), [members]);
  const ghostMembers = useMemo(
    () => group.memberNames
      .filter((name) => !activeMemberNames.has(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })),
    [group.memberNames, activeMemberNames],
  );

  const hasChildren = activeMemberCount > 0 || ghostMembers.length > 0;

  return (
    <div className={`rounded-lg border overflow-hidden transition-all border-l-[3px] ${groupBorder} ${isSelected ? "border-accent/30 ring-1 ring-accent/20 bg-accent/5" : "border-border/60 bg-foreground/[0.02]"}`}>
      {/* Group header: ▸ GRP  Name  (N)  ·  fx  ·  status  →dest  ★  ✕ */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer" onClick={onSelect}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(); }} className="flex-shrink-0 p-0.5">
          <svg className={`w-3 h-3 text-foreground/40 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className={`${PANEL_STYLES.card.badge} ${TYPE_BADGE_COLORS.GRP}`}>GRP</span>
        <span className="text-[12px] font-semibold text-foreground/70 truncate">{group.sourceModel.name}</span>
        <span className="text-[10px] text-foreground/40 font-semibold flex-shrink-0">({fullMemberCount})</span>
        <span className="text-foreground/15 flex-shrink-0">&middot;</span>
        <span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0 whitespace-nowrap">
          {groupFxCount >= 1000 ? `${(groupFxCount / 1000).toFixed(1)}k` : groupFxCount} fx
        </span>
        {activeMemberCount > 0 && (
          <span className="text-[10px] text-foreground/30 flex-shrink-0">
            &middot; {mappedCount > 0 && <span className="text-green-400/60">{mappedCount}</span>}
            {mappedCount > 0 && mappedCount < activeMemberCount && "/"}
            {mappedCount < activeMemberCount && <span className="text-amber-400/60">{activeMemberCount - mappedCount} unmapped</span>}
          </span>
        )}
        {/* Right-aligned destination / suggestion */}
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          {group.isMapped && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400/70 truncate max-w-[180px]">
              {isAutoMatched && <Link2Badge />}
              &rarr; {group.assignedUserModels[0]?.name}
            </span>
          )}
          {!group.isMapped && topSuggestion && (
            <>
              <span className="text-[11px] text-foreground/50 truncate max-w-[160px]">{topSuggestion.model.name}</span>
              <ConfidenceBadge score={topSuggestion.score} size="sm" />
            </>
          )}
          {topSuggestion && onAccept && !group.isMapped && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onAccept(topSuggestion.model.name); }}
              className="p-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors" title="Accept suggested match">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.77 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
              </svg>
            </button>
          )}
          {onSkip && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onSkip(); }}
              title={`Skip group and ${fullMemberCount} members`}
              className="p-1 text-foreground/20 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {/* Expanded children: active members + ghost members (0 fx) */}
      {isExpanded && hasChildren && (
        <div className="px-3 pb-2 pl-5 space-y-1 border-t border-border/30">
          <div className="pt-1">
            {/* Active members (have effects, in the phase) */}
            {members.map((item) => renderItemCard(item))}
            {/* Ghost members (0 effects or covered by group — shown for structural clarity) */}
            {ghostMembers.map((name) => (
              <GhostMemberRow key={name} name={name} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Item Card (Left Panel) ──────────────────────────

function ItemCard({
  item,
  isSelected,
  isDropTarget,
  isAutoMatched,
  topSuggestion,
  onClick,
  onAccept,
  onSkip,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  item: SourceLayerMapping;
  isSelected: boolean;
  isDropTarget: boolean;
  isAutoMatched: boolean;
  topSuggestion: { model: { name: string }; score: number } | null;
  onClick: () => void;
  onAccept: (userModelName: string) => void;
  onSkip: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const px = item.sourceModel.pixelCount;
  const leftBorder = item.isMapped ? "border-l-green-500/70" : topSuggestion ? "border-l-red-400/70" : "border-l-amber-400/70";

  return (
    <div
      className={`
        w-full px-3 py-1.5 rounded-lg text-left transition-all duration-200 cursor-pointer border-l-[3px] ${leftBorder}
        ${
          isDropTarget
            ? "bg-accent/10 border border-accent/50 ring-2 ring-accent/30"
            : isSelected
              ? "bg-accent/5 border border-accent/30 ring-1 ring-accent/20"
              : "bg-surface border border-border hover:border-foreground/20"
        }
      `}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-2 min-w-0">
        <InlineEffectBadge count={item.effectCount} />
        <span className="text-[12px] font-medium text-foreground truncate flex-shrink min-w-0">{item.sourceModel.name}</span>
        {px > 0 && (<><span className="text-foreground/15 flex-shrink-0">&middot;</span><span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0">{px}px</span></>)}
        <span className="text-foreground/15 flex-shrink-0">&middot;</span>
        <span className="text-[10px] text-foreground/25 flex-shrink-0">{item.sourceModel.type}</span>
        {/* Right-aligned destination / suggestion */}
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          {item.isMapped && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400/70 truncate max-w-[180px]">
              {isAutoMatched && <Link2Badge />}
              &rarr; {item.assignedUserModels[0]?.name}
            </span>
          )}
          {!item.isMapped && topSuggestion && (
            <>
              <span className="text-[11px] text-foreground/50 truncate max-w-[140px]">{topSuggestion.model.name}</span>
              <ConfidenceBadge score={topSuggestion.score} size="sm" />
            </>
          )}
          {!item.isMapped && topSuggestion && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onAccept(topSuggestion.model.name); }}
              className="p-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors" title="Accept suggested match">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.77 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
              </svg>
            </button>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); onSkip(); }}
            className="p-1 rounded-full hover:bg-foreground/10 text-foreground/20 hover:text-foreground/50 transition-colors" title="Skip this model">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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
    prev.isSelected === next.isSelected &&
    prev.isDropTarget === next.isDropTarget &&
    prev.isAutoMatched === next.isAutoMatched &&
    prev.topSuggestion?.model.name === next.topSuggestion?.model.name &&
    prev.topSuggestion?.score === next.topSuggestion?.score,
);

// ─── Current Mapping Card (Right Panel for mapped items) ────────

function CurrentMappingCard({
  item,
  onRemoveLink,
}: {
  item: SourceLayerMapping;
  onRemoveLink: (destName: string) => void;
}) {
  if (item.assignedUserModels.length === 0) return null;

  return (
    <div className="px-5 py-3 border-b border-border flex-shrink-0">
      <div className="rounded-lg border border-green-500/25 bg-green-500/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-[10px] font-semibold text-green-400/70 uppercase tracking-wider">Currently Mapped To</span>
        </div>
        <div className="space-y-1.5 ml-5.5">
          {item.assignedUserModels.map((m) => (
            <div key={m.name} className="flex items-center gap-2 group/dest">
              <span className="text-[13px] font-semibold text-foreground truncate flex-1">{m.name}</span>
              <button
                type="button"
                onClick={() => onRemoveLink(m.name)}
                className="w-5 h-5 flex items-center justify-center rounded text-foreground/20 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0 opacity-0 group-hover/dest:opacity-100"
                aria-label={`Remove ${m.name}`}
                title={`Remove ${m.name}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        {item.coveredChildCount > 0 && (
          <p className="text-[11px] text-teal-400/60 mt-1.5 ml-5.5">covers {item.coveredChildCount} children</p>
        )}
      </div>
    </div>
  );
}

// ─── Ghost Member Row (0-effect members shown for structural clarity) ────────

function GhostMemberRow({ name }: { name: string }) {
  return (
    <div className="w-full px-3 py-1 rounded-lg border-l-[3px] border-l-foreground/10 bg-foreground/[0.01] border border-border/30 opacity-40">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] text-foreground/25 tabular-nums flex-shrink-0">0 fx</span>
        <span className="text-[11px] text-foreground/30 truncate flex-shrink min-w-0">{name}</span>
        <span className="ml-auto text-[9px] text-foreground/20 flex-shrink-0">covered by group</span>
      </div>
    </div>
  );
}

// ─── Type Filter Pill ────────────────────────────────

const PILL_COLORS = {
  blue:  { active: "bg-blue-500/15 text-blue-400 border-blue-500/30", inactive: "text-foreground/40 border-border hover:text-foreground/60 hover:bg-foreground/5" },
  green: { active: "bg-green-500/15 text-green-400 border-green-500/30", inactive: "text-foreground/40 border-border hover:text-foreground/60 hover:bg-foreground/5" },
  amber: { active: "bg-amber-500/15 text-amber-400 border-amber-500/30", inactive: "text-foreground/40 border-border hover:text-foreground/60 hover:bg-foreground/5" },
} as const;

function TypeFilterPill({ label, active, color, onClick }: { label: string; active: boolean; color: keyof typeof PILL_COLORS; onClick: () => void }) {
  const c = PILL_COLORS[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${active ? c.active : c.inactive}`}
    >
      {label}
    </button>
  );
}

// ─── Display-Wide Super Group Section ────────────────

interface XLightsGroup { groupItem: SourceLayerMapping; members: SourceLayerMapping[] }

function SuperGroupSection({
  superGroups,
  expandedGroups,
  selectedItemId,
  autoMatchedNames,
  topSuggestionsMap,
  onToggle,
  onSelect,
  onAccept,
  onSkipFamily,
  renderItemCard,
  phaseItemsByName,
}: {
  superGroups: XLightsGroup[];
  expandedGroups: Set<string>;
  selectedItemId: string | null;
  autoMatchedNames: ReadonlySet<string>;
  topSuggestionsMap: Map<string, { model: { name: string }; score: number } | null>;
  onToggle: (name: string) => void;
  onSelect: (name: string) => void;
  onAccept: (sourceName: string, userModelName: string) => void;
  onSkipFamily: (items: SourceLayerMapping[]) => void;
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
        className="w-full flex items-center gap-2 px-1 py-1.5 text-left group"
      >
        <svg className={`w-3 h-3 text-purple-400/60 transition-transform duration-150 ${collapsed ? "" : "rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-[11px] font-bold text-purple-400/80 uppercase tracking-wider">
          Display-Wide Groups
        </span>
        <span className="text-[10px] text-purple-400/50">({superGroups.length})</span>
      </button>

      {!collapsed && (
        <>
          <p className="text-[10px] text-foreground/30 px-1 pb-2 leading-relaxed">
            These groups span your entire display or large sections. Mapping here applies broad effects that layer on top of individual group/model mappings.
          </p>
          <div className="space-y-1">
            {superGroups.map((group) => {
              // Show nested child groups inside super groups
              const childGroupNames = group.groupItem.memberNames.filter((name) => {
                const item = phaseItemsByName.get(name);
                return item?.isGroup && !item.isSuperGroup && item.parentSuperGroup === group.groupItem.sourceModel.name;
              });

              return (
                <SuperGroupCard
                  key={group.groupItem.sourceModel.name}
                  group={group.groupItem}
                  members={group.members}
                  childGroupNames={childGroupNames}
                  phaseItemsByName={phaseItemsByName}
                  isExpanded={expandedGroups.has(group.groupItem.sourceModel.name)}
                  isSelected={selectedItemId === group.groupItem.sourceModel.name}
                  isAutoMatched={autoMatchedNames.has(group.groupItem.sourceModel.name)}
                  topSuggestion={topSuggestionsMap.get(group.groupItem.sourceModel.name) ?? null}
                  onToggle={() => onToggle(group.groupItem.sourceModel.name)}
                  onSelect={() => onSelect(group.groupItem.sourceModel.name)}
                  onAccept={(userModelName) => onAccept(group.groupItem.sourceModel.name, userModelName)}
                  onSkip={() => onSkipFamily([group.groupItem, ...group.members])}
                  renderItemCard={renderItemCard}
                  expandedGroups={expandedGroups}
                  onToggleChild={onToggle}
                  onSelectChild={onSelect}
                  autoMatchedNames={autoMatchedNames}
                  topSuggestionsMap={topSuggestionsMap}
                  onAcceptChild={onAccept}
                  onSkipChild={(items) => onSkipFamily(items)}
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
  topSuggestion,
  onToggle,
  onSelect,
  onAccept,
  onSkip,
  renderItemCard,
  expandedGroups,
  onToggleChild,
  onSelectChild,
  autoMatchedNames,
  topSuggestionsMap,
  onAcceptChild,
  onSkipChild,
}: {
  group: SourceLayerMapping;
  members: SourceLayerMapping[];
  childGroupNames: string[];
  phaseItemsByName: Map<string, SourceLayerMapping>;
  isExpanded: boolean;
  isSelected: boolean;
  isAutoMatched: boolean;
  topSuggestion: { model: { name: string }; score: number } | null;
  onToggle: () => void;
  onSelect: () => void;
  onAccept: (userModelName: string) => void;
  onSkip: () => void;
  renderItemCard: (item: SourceLayerMapping) => React.ReactNode;
  expandedGroups: Set<string>;
  onToggleChild: (name: string) => void;
  onSelectChild: (name: string) => void;
  autoMatchedNames: ReadonlySet<string>;
  topSuggestionsMap: Map<string, { model: { name: string }; score: number } | null>;
  onAcceptChild: (sourceName: string, userModelName: string) => void;
  onSkipChild: (items: SourceLayerMapping[]) => void;
}) {
  const totalCount = group.memberNames.length;
  const groupFxCount = group.effectCount + members.reduce((sum, m) => sum + m.effectCount, 0);
  const groupBorder = group.isMapped ? "border-l-purple-500/70" : "border-l-purple-400/40";

  return (
    <div className={`rounded-lg border overflow-hidden transition-all border-l-[3px] ${groupBorder} ${isSelected ? "border-accent/30 ring-1 ring-accent/20 bg-accent/5" : "border-border/60 bg-purple-500/[0.03]"}`}>
      {/* Super group header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer" onClick={onSelect}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(); }} className="flex-shrink-0 p-0.5">
          <svg className={`w-3 h-3 text-purple-400/60 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="px-1 py-px text-[9px] font-bold bg-purple-500/15 text-purple-400 rounded">SUPER</span>
        <span className="text-[12px] font-semibold text-foreground/70 truncate">{group.sourceModel.name}</span>
        <span className="text-[10px] text-foreground/40 font-semibold flex-shrink-0">({totalCount})</span>
        <span className="text-foreground/15 flex-shrink-0">&middot;</span>
        <span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0 whitespace-nowrap">
          {groupFxCount >= 1000 ? `${(groupFxCount / 1000).toFixed(1)}k` : groupFxCount} fx
        </span>
        <span className="text-[10px] text-purple-400/40 flex-shrink-0">
          &middot; {group.containedGroupCount} groups
        </span>
        {/* Right-aligned destination */}
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          {group.isMapped && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400/70 truncate max-w-[180px]">
              {isAutoMatched && <Link2Badge />}
              &rarr; {group.assignedUserModels[0]?.name}
            </span>
          )}
          {!group.isMapped && topSuggestion && (
            <>
              <span className="text-[11px] text-foreground/50 truncate max-w-[160px]">{topSuggestion.model.name}</span>
              <ConfidenceBadge score={topSuggestion.score} size="sm" />
            </>
          )}
          {topSuggestion && !group.isMapped && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onAccept(topSuggestion.model.name); }}
              className="p-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors" title="Accept suggested match">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.77 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
              </svg>
            </button>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); onSkip(); }}
            title={`Skip group and ${totalCount} members`}
            className="p-1 text-foreground/20 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded: show child groups (hierarchy) or direct members */}
      {isExpanded && (
        <div className="px-3 pb-2 pl-5 space-y-1 border-t border-purple-400/10">
          <div className="pt-1">
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
                      topSuggestion={topSuggestionsMap.get(childName) ?? null}
                      onToggle={() => onToggleChild(childName)}
                      onSelect={() => onSelectChild(childName)}
                      onAccept={(userModelName) => onAcceptChild(childName, userModelName)}
                      onSkip={() => onSkipChild(childMembers.length > 0 ? [childItem, ...childMembers] : [childItem])}
                      renderItemCard={renderItemCard}
                    />
                  );
                })}
                {/* Individual members not in any child group */}
                {members.filter((m) => !childGroupNames.some((cn) => {
                  const cItem = phaseItemsByName.get(cn);
                  return cItem?.memberNames.includes(m.sourceModel.name);
                })).map((item) => renderItemCard(item))}
              </>
            ) : (
              members.map((item) => renderItemCard(item))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
