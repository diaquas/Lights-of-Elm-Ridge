/* eslint-disable react-hooks/refs -- Refs used as stable caches (sort order, scores); intentional lazy-init in useMemo. */
"use client";

import { useState, useMemo, useCallback, useRef, memo } from "react";
import {
  useMappingPhase,
  findNextUnmapped,
} from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { BulkActionBar } from "../BulkActionBar";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { UniversalSourcePanel } from "../UniversalSourcePanel";
import {
  MetadataBadges,
  HeroEffectBadge,
  InlineEffectBadge,
  EffectsCoverageBar,
  AutoMatchBanner,
  Link2Badge,
  UnlinkIcon,
} from "../MetadataBadges";
import { STRONG_THRESHOLD } from "@/types/mappingPhases";
import type { ModelMapping } from "@/lib/modiq/matcher";
import { SortDropdown, sortItems, type SortOption } from "../SortDropdown";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBulkInference } from "@/hooks/useBulkInference";
import { useItemFamilies } from "@/hooks/useItemFamilies";
import { BulkInferenceBanner } from "../BulkInferenceBanner";
import { FamilyAccordionHeader } from "../FamilyAccordionHeader";
import { PANEL_STYLES, TYPE_BADGE_COLORS } from "../panelStyles";
import {
  CurrentMappingCard,
  CollapsibleMembers,
} from "../SharedHierarchyComponents";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

const CATEGORY_LABELS: Record<string, string> = {
  spokes: "Spokes",
  rings: "Rings",
  florals: "Florals",
  scallops: "Scallops",
  spirals: "Spirals",
  triangles: "Triangles",
  effects: "Effects",
  outline: "Outline",
};

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedParentModel, setSelectedParentModel] = useState<string | null>(
    null,
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
  const unmappedCount = phaseItems.filter((item) => !item.isMapped).length;
  const mappedCount = phaseItems.filter((item) => item.isMapped).length;

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

  // Auto-select first parent model
  const activeParent = selectedParentModel ?? parentModelList[0]?.name ?? null;

  // Items scoped to selected parent model
  const scopedItems = useMemo(() => {
    if (!activeParent) return phaseItems;
    return parentModelIndex.get(activeParent)?.items ?? phaseItems;
  }, [activeParent, parentModelIndex, phaseItems]);

  // Section headers: detect **SECTION_NAME patterns in scoped items
  const sectionGroups = useMemo(() => {
    const sections: { header: string | null; items: SourceLayerMapping[] }[] =
      [];
    let currentSection: { header: string | null; items: SourceLayerMapping[] } =
      { header: null, items: [] };

    // Sort items by name to group sections together
    const sorted = [...scopedItems].sort((a, b) =>
      a.sourceModel.name.localeCompare(b.sourceModel.name, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

    for (const item of sorted) {
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

  // Count auto-matched items in THIS phase for the banner
  const phaseAutoCount = useMemo(
    () =>
      phaseItems.filter((i) => autoMatchedNames.has(i.sourceModel.name)).length,
    [phaseItems, autoMatchedNames],
  );

  // Filtered + stable-sorted items (single unified list, scoped to parent model)
  const filteredItems = useMemo(() => {
    let items = [...scopedItems];
    if (statusFilter === "unmapped") items = items.filter((i) => !i.isMapped);
    else if (statusFilter === "auto-strong")
      items = items.filter(
        (i) =>
          autoMatchedNames.has(i.sourceModel.name) &&
          (scoreMap.get(i.sourceModel.name) ?? 0) >= STRONG_THRESHOLD,
      );
    else if (statusFilter === "auto-review")
      items = items.filter(
        (i) =>
          autoMatchedNames.has(i.sourceModel.name) &&
          !approvedNames.has(i.sourceModel.name) &&
          (scoreMap.get(i.sourceModel.name) ?? 0) < STRONG_THRESHOLD,
      );
    else if (statusFilter === "mapped")
      items = items.filter(
        (i) => i.isMapped && !autoMatchedNames.has(i.sourceModel.name),
      );
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
    search,
    sortBy,
    sortVersion,
    topSuggestionsMap,
  ]);

  const { families, toggle, isExpanded } = useItemFamilies(
    filteredItems,
    selectedItemId,
  );

  // Suggestions for selected item
  const suggestions = useMemo(() => {
    if (!selectedItem) return [];
    return interactive
      .getSuggestionsForLayer(selectedItem.sourceModel)
      .slice(0, 10);
  }, [interactive, selectedItem]);

  // Type filter: only show SUBMODEL_GROUP in Spinners source panel
  const spinnerSourceFilter = useCallback(
    (m: { groupType?: string }) => m.groupType === "SUBMODEL_GROUP",
    [],
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

  const handleBulkAccept = () => {
    for (const item of unmappedItems) {
      if (!selectedIds.has(item.sourceModel.name)) continue;
      const suggs = interactive.getSuggestionsForLayer(item.sourceModel);
      if (suggs.length > 0) {
        interactive.assignUserModelToLayer(
          item.sourceModel.name,
          suggs[0].model.name,
        );
      }
    }
    setSelectedIds(new Set());
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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Submodel Group List */}
      <div className="w-1/2 flex flex-col border-r border-border overflow-hidden">
        <div className={PANEL_STYLES.header.wrapper}>
          <h2 className={PANEL_STYLES.header.title}>
            <svg
              className="w-5 h-5 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Submodel Groups
          </h2>
          <p className={PANEL_STYLES.header.subtitle}>
            {phaseItems.length} group{phaseItems.length !== 1 ? "s" : ""}
            {mappedCount > 0 && (
              <span>
                {" "}
                &middot;{" "}
                <span className="text-green-400/60">{mappedCount} mapped</span>
              </span>
            )}
            {unmappedCount > 0 && (
              <span>
                {" "}
                &middot;{" "}
                <span className="text-amber-400/60">
                  {unmappedCount} unmapped
                </span>
              </span>
            )}
          </p>
          <EffectsCoverageBar
            mappedEffects={phaseItems
              .filter((i) => i.isMapped)
              .reduce((sum, i) => sum + i.effectCount, 0)}
            totalEffects={phaseItems.reduce((sum, i) => sum + i.effectCount, 0)}
          />
        </div>

        {/* Model selector — pick a parent model to scope submodel groups */}
        {parentModelList.length > 1 && (
          <div className="px-4 py-2 border-b border-border flex-shrink-0">
            <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5">
              Select Model
            </div>
            <div className="space-y-1">
              {parentModelList.map((pm) => {
                const isActive = pm.name === activeParent;
                const allMapped = pm.mapped >= pm.total;
                return (
                  <button
                    key={pm.name}
                    type="button"
                    onClick={() => setSelectedParentModel(pm.name)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all ${
                      isActive
                        ? "bg-accent/8 border border-accent/25"
                        : "bg-foreground/[0.02] border border-border/50 hover:border-foreground/15"
                    }`}
                  >
                    <span
                      className={`text-[12px] font-medium truncate flex-1 min-w-0 ${isActive ? "text-foreground" : "text-foreground/60"}`}
                    >
                      {pm.name}
                    </span>
                    <span className="text-[10px] text-foreground/30 flex-shrink-0 tabular-nums">
                      {pm.total} sub-groups
                    </span>
                    {/* Mini progress bar */}
                    <div className="w-16 h-1.5 bg-foreground/5 rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className={`h-full rounded-full transition-all ${allMapped ? "bg-green-500/50" : "bg-accent/40"}`}
                        style={{
                          width: `${pm.total > 0 ? (pm.mapped / pm.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-semibold tabular-nums flex-shrink-0 ${allMapped ? "text-green-400/60" : "text-foreground/40"}`}
                    >
                      {pm.mapped}/{pm.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                placeholder="Filter submodel groups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={PANEL_STYLES.search.input}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setSortVersion((v) => v + 1);
              }}
              className="text-[11px] px-2 py-1.5 rounded bg-foreground/5 border border-border text-foreground/60 focus:outline-none focus:border-accent"
            >
              <option value="all">All</option>
              <option value="unmapped">Unmapped</option>
              {phaseAutoCount > 0 && (
                <option value="auto-strong">Auto: Strong (&ge;75%)</option>
              )}
              {phaseAutoCount > 0 && (
                <option value="auto-review">Auto: Review (&lt;75%)</option>
              )}
              <option value="mapped">Mapped (manual)</option>
            </select>
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
          onApproveAllReview={approveAllReviewItems}
        />

        <div className={PANEL_STYLES.scrollArea}>
          <div className="space-y-2">
            {/* Section-based rendering when sections detected */}
            {sectionGroups.some((s) => s.header)
              ? sectionGroups.map((section, si) => (
                  <SectionDivider
                    key={section.header ?? `section-${si}`}
                    header={section.header}
                    items={section.items}
                    selectedItemId={selectedItemId}
                    selectedIds={selectedIds}
                    dndState={dnd.state}
                    autoMatchedNames={autoMatchedNames}
                    approvedNames={approvedNames}
                    scoreMap={scoreMap}
                    factorsMap={factorsMap}
                    topSuggestionsMap={topSuggestionsMap}
                    onSelect={setSelectedItemId}
                    onCheck={(name) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(name)) next.delete(name);
                        else next.add(name);
                        return next;
                      });
                    }}
                    onAccept={handleAccept}
                    onApprove={approveAutoMatch}
                    onSkip={handleSkipItem}
                    onUnlink={handleUnlink}
                    onDragEnter={dnd.handleDragEnter}
                    onDragLeave={dnd.handleDragLeave}
                    onDrop={handleDropOnItem}
                  />
                ))
              : /* Family-based rendering (no sections) */
                families.map((family) => {
                  const renderSpinner = (item: SourceLayerMapping) => (
                    <SpinnerListCardMemo
                      key={item.sourceModel.name}
                      item={item}
                      isSelected={selectedItemId === item.sourceModel.name}
                      isChecked={selectedIds.has(item.sourceModel.name)}
                      isDropTarget={
                        dnd.state.activeDropTarget === item.sourceModel.name
                      }
                      isAutoMatched={autoMatchedNames.has(
                        item.sourceModel.name,
                      )}
                      isApproved={approvedNames.has(item.sourceModel.name)}
                      matchScore={scoreMap.get(item.sourceModel.name)}
                      matchFactors={factorsMap.get(item.sourceModel.name)}
                      topSuggestion={
                        topSuggestionsMap.get(item.sourceModel.name) ?? null
                      }
                      onClick={() => setSelectedItemId(item.sourceModel.name)}
                      onCheck={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.sourceModel.name))
                            next.delete(item.sourceModel.name);
                          else next.add(item.sourceModel.name);
                          return next;
                        });
                      }}
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
                  );

                  if (family.items.length === 1) {
                    return renderSpinner(family.items[0]);
                  }
                  return (
                    <div key={family.prefix}>
                      <FamilyAccordionHeader
                        prefix={family.prefix}
                        count={family.items.length}
                        isExpanded={isExpanded(family.prefix)}
                        onToggle={() => toggle(family.prefix)}
                        onSkipFamily={() => handleSkipFamily(family.items)}
                      />
                      {isExpanded(family.prefix) && (
                        <div className="space-y-2 pl-2 mt-1">
                          {family.items.map(renderSpinner)}
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
              {search || statusFilter !== "all"
                ? "No matches for current filters"
                : "No items"}
            </p>
          )}

          {skippedItems.length > 0 && (
            <details className="mt-4">
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
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE_COLORS.SUB} rounded`}
                >
                  SUB
                </span>
                {selectedItem.sourceModel.semanticCategory && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-foreground/5 text-foreground/40 rounded">
                    {CATEGORY_LABELS[
                      selectedItem.sourceModel.semanticCategory
                    ] ?? selectedItem.sourceModel.semanticCategory}
                  </span>
                )}
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {selectedItem.sourceModel.name}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-foreground/40">
                  {selectedItem.memberNames.length} members
                </span>
                <CollapsibleMembers members={selectedItem.memberNames} />
              </div>
            </div>

            {/* Current Mapping Card (for mapped items) */}
            {selectedItem.isMapped && (
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
              <p className="text-sm">Select a group to see suggestions</p>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={unmappedItems.length}
          onSelectAll={() => {
            if (selectedIds.size === unmappedItems.length) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(
                new Set(unmappedItems.map((i) => i.sourceModel.name)),
              );
            }
          }}
          onAcceptSelected={handleBulkAccept}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}

// ─── Spinner Card (Left Panel) ──────────────────────────

function SpinnerListCard({
  item,
  isSelected,
  isChecked,
  isDropTarget,
  isAutoMatched,
  isApproved,
  matchScore,
  matchFactors,
  topSuggestion,
  onClick,
  onCheck,
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
  isChecked: boolean;
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
  onCheck: () => void;
  onAccept: (userModelName: string) => void;
  onApprove: () => void;
  onSkip: () => void;
  onUnlink: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const categoryLabel = item.sourceModel.semanticCategory
    ? (CATEGORY_LABELS[item.sourceModel.semanticCategory] ??
      item.sourceModel.semanticCategory)
    : null;
  const px = item.sourceModel.pixelCount;
  const isNeedsReview =
    item.isMapped &&
    isAutoMatched &&
    !isApproved &&
    matchScore != null &&
    matchScore < STRONG_THRESHOLD;
  const leftBorder = item.isMapped
    ? isNeedsReview
      ? "border-l-amber-400/70"
      : "border-l-green-500/70"
    : topSuggestion
      ? "border-l-red-400/70"
      : "border-l-amber-400/70";

  return (
    <div
      className={`
        px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer border-l-[3px] ${leftBorder}
        ${
          isDropTarget
            ? "bg-accent/10 border-accent/50 ring-2 ring-accent/30"
            : isSelected
              ? "bg-accent/5 border-accent/30 ring-1 ring-accent/20"
              : "bg-surface border-border hover:border-foreground/20"
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
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCheck();
          }}
          className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isChecked ? "bg-accent border-accent" : "border-foreground/20 hover:border-foreground/40"}`}
        >
          {isChecked && (
            <svg
              className="w-2 h-2 text-white"
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
        <span className={`${PANEL_STYLES.card.badge} ${TYPE_BADGE_COLORS.SUB}`}>
          <svg
            className="w-2.5 h-2.5 inline-block mr-0.5 -mt-px"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" d="M9 3v12m0 0H5m4 0h4" />
          </svg>
          SUB
        </span>
        {categoryLabel && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-foreground/5 text-foreground/30 rounded flex-shrink-0">
            {categoryLabel}
          </span>
        )}
        <span className="text-[12px] font-medium text-foreground truncate flex-shrink min-w-0">
          {item.sourceModel.name}
        </span>
        {px > 0 && (
          <>
            <span className="text-foreground/15 flex-shrink-0">&middot;</span>
            <span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0">
              {px}px
            </span>
          </>
        )}
        {item.isMapped && (
          <>
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] truncate max-w-[180px] ml-auto flex-shrink-0 ${isNeedsReview ? "text-amber-400/70" : "text-green-400/70"}`}
            >
              {isAutoMatched && <Link2Badge />}
              &rarr; {item.assignedUserModels[0]?.name}
            </span>
            {matchScore != null && matchScore > 0 && (
              <ConfidenceBadge
                score={matchScore}
                factors={matchFactors}
                size="sm"
              />
            )}
            {isNeedsReview && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
                className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors flex-shrink-0"
                title="Approve this match"
              >
                Approve
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUnlink();
              }}
              className="p-1 rounded-full text-foreground/15 hover:text-amber-400 hover:bg-amber-500/10 transition-colors flex-shrink-0"
              title="Remove mapping (keep item)"
            >
              <UnlinkIcon className="w-3 h-3" />
            </button>
          </>
        )}
        {!item.isMapped && topSuggestion && (
          <>
            <span className="text-foreground/15 flex-shrink-0">&middot;</span>
            <span className="text-[10px] text-foreground/40 flex-shrink-0">
              Suggested:
            </span>
            <span className="text-[11px] text-foreground/60 truncate">
              {topSuggestion.model.name}
            </span>
            <ConfidenceBadge
              score={topSuggestion.score}
              factors={topSuggestion.factors}
              size="sm"
            />
          </>
        )}
        <div
          className={`${!item.isMapped ? "ml-auto" : ""} flex items-center gap-1 flex-shrink-0`}
        >
          {topSuggestion && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAccept(topSuggestion.model.name);
              }}
              className="p-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              title="Accept suggested match"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.77 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="p-1 rounded-full hover:bg-foreground/10 text-foreground/20 hover:text-foreground/50 transition-colors"
            title="Skip — dismiss from workflow"
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
        </div>
      </div>
    </div>
  );
}

const SpinnerListCardMemo = memo(
  SpinnerListCard,
  (prev, next) =>
    prev.item.sourceModel === next.item.sourceModel &&
    prev.item.isMapped === next.item.isMapped &&
    prev.item.effectCount === next.item.effectCount &&
    prev.item.assignedUserModels === next.item.assignedUserModels &&
    prev.isSelected === next.isSelected &&
    prev.isChecked === next.isChecked &&
    prev.isDropTarget === next.isDropTarget &&
    prev.isAutoMatched === next.isAutoMatched &&
    prev.isApproved === next.isApproved &&
    prev.matchScore === next.matchScore &&
    prev.topSuggestion?.model.name === next.topSuggestion?.model.name &&
    prev.topSuggestion?.score === next.topSuggestion?.score &&
    prev.onUnlink === next.onUnlink,
);

// ─── Section Divider (collapsible section from **HEADER markers) ─────

function SectionDivider({
  header,
  items,
  selectedItemId,
  selectedIds,
  dndState,
  autoMatchedNames,
  approvedNames,
  scoreMap,
  factorsMap,
  topSuggestionsMap,
  onSelect,
  onCheck,
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
  selectedIds: Set<string>;
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
      factors?: ModelMapping["factors"];
    } | null
  >;
  onSelect: (name: string) => void;
  onCheck: (name: string) => void;
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
          className="flex items-center gap-2 w-full py-1.5 px-1 text-left group/section"
        >
          <svg
            className={`w-3 h-3 text-purple-400/50 transition-transform duration-150 ${collapsed ? "" : "rotate-90"}`}
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
          <span className="text-[11px] font-bold text-purple-400/70 uppercase tracking-wider">
            {header}
          </span>
          <span className="text-[10px] text-foreground/30">
            ({items.length})
          </span>
          <span
            className={`text-[10px] tabular-nums flex-shrink-0 ${mappedInSection >= items.length ? "text-green-400/50" : "text-foreground/30"}`}
          >
            {mappedInSection}/{items.length}
          </span>
        </button>
      )}
      {!collapsed && (
        <div className={`space-y-1 ${header ? "pl-2 mt-0.5 mb-2" : ""}`}>
          {items.map((item) => (
            <SpinnerListCardMemo
              key={item.sourceModel.name}
              item={item}
              isSelected={selectedItemId === item.sourceModel.name}
              isChecked={selectedIds.has(item.sourceModel.name)}
              isDropTarget={dndState.activeDropTarget === item.sourceModel.name}
              isAutoMatched={autoMatchedNames.has(item.sourceModel.name)}
              isApproved={approvedNames.has(item.sourceModel.name)}
              matchScore={scoreMap.get(item.sourceModel.name)}
              matchFactors={factorsMap.get(item.sourceModel.name)}
              topSuggestion={
                topSuggestionsMap.get(item.sourceModel.name) ?? null
              }
              onClick={() => onSelect(item.sourceModel.name)}
              onCheck={() => onCheck(item.sourceModel.name)}
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
