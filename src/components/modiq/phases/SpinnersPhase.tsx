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
import { SortDropdown, sortItems, type SortOption } from "../SortDropdown";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBulkInference } from "@/hooks/useBulkInference";
import { useItemFamilies } from "@/hooks/useItemFamilies";
import { BulkInferenceBanner } from "../BulkInferenceBanner";
import { FamilyAccordionHeader } from "../FamilyAccordionHeader";
import { PANEL_STYLES, TYPE_BADGE_COLORS } from "../panelStyles";
import { CurrentMappingCard, CollapsibleMembers } from "../SharedHierarchyComponents";
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

type StatusFilter = "all" | "unmapped" | "auto-strong" | "auto-review" | "mapped";

export function SpinnersPhase() {
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Stable sort: rows don't move on map/unmap — only on explicit re-sort
  const [sortVersion, setSortVersion] = useState(0);
  const stableOrderRef = useRef<Map<string, number>>(new Map());
  const lastSortRef = useRef({ sortBy: "" as SortOption, sortVersion: -1, search: "", statusFilter: "" as string });

  const skippedItems = interactive.sourceLayerMappings.filter(
    (l) => l.isSkipped,
  );
  const unmappedCount = phaseItems.filter((item) => !item.isMapped).length;
  const mappedCount = phaseItems.filter((item) => item.isMapped).length;

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
    if (statusFilter === "unmapped") items = items.filter((i) => !i.isMapped);
    else if (statusFilter === "auto-strong") items = items.filter((i) => autoMatchedNames.has(i.sourceModel.name) && (scoreMap.get(i.sourceModel.name) ?? 0) >= STRONG_THRESHOLD);
    else if (statusFilter === "auto-review") items = items.filter((i) => autoMatchedNames.has(i.sourceModel.name) && (scoreMap.get(i.sourceModel.name) ?? 0) < STRONG_THRESHOLD);
    else if (statusFilter === "mapped") items = items.filter((i) => i.isMapped && !autoMatchedNames.has(i.sourceModel.name));
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
  }, [phaseItems, statusFilter, search, sortBy, sortVersion, topSuggestionsMap]);

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
            {mappedCount > 0 && <span> &middot; <span className="text-green-400/60">{mappedCount} mapped</span></span>}
            {unmappedCount > 0 && <span> &middot; <span className="text-amber-400/60">{unmappedCount} unmapped</span></span>}
          </p>
          <EffectsCoverageBar
            mappedEffects={phaseItems.filter((i) => i.isMapped).reduce(
              (sum, i) => sum + i.effectCount,
              0,
            )}
            totalEffects={phaseItems.reduce((sum, i) => sum + i.effectCount, 0)}
          />
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
                placeholder="Filter submodel groups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={PANEL_STYLES.search.input}
              />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setSortVersion((v) => v + 1); }}
              className="text-[11px] px-2 py-1.5 rounded bg-foreground/5 border border-border text-foreground/60 focus:outline-none focus:border-accent">
              <option value="all">All</option>
              <option value="unmapped">Unmapped</option>
              {phaseAutoCount > 0 && <option value="auto-strong">Auto: Strong (&ge;75%)</option>}
              {phaseAutoCount > 0 && <option value="auto-review">Auto: Review (&lt;75%)</option>}
              <option value="mapped">Mapped (manual)</option>
            </select>
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
        />

        <div className={PANEL_STYLES.scrollArea}>
          <div className="space-y-2">
            {families.map((family) => {
              const renderSpinner = (item: SourceLayerMapping) => (
                <SpinnerListCardMemo
                  key={item.sourceModel.name}
                  item={item}
                  isSelected={selectedItemId === item.sourceModel.name}
                  isChecked={selectedIds.has(item.sourceModel.name)}
                  isDropTarget={
                    dnd.state.activeDropTarget === item.sourceModel.name
                  }
                  isAutoMatched={autoMatchedNames.has(item.sourceModel.name)}
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
                  onSkip={() => handleSkipItem(item.sourceModel.name)}
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
              {search || statusFilter !== "all" ? "No matches for current filters" : "No items"}
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
                excludeNames={selectedItem.isMapped ? new Set(selectedItem.assignedUserModels.map((m) => m.name)) : undefined}
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
  topSuggestion,
  onClick,
  onCheck,
  onAccept,
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
  topSuggestion: { model: { name: string }; score: number } | null;
  onClick: () => void;
  onCheck: () => void;
  onAccept: (userModelName: string) => void;
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
  const leftBorder = item.isMapped ? "border-l-green-500/70" : topSuggestion ? "border-l-red-400/70" : "border-l-amber-400/70";

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
        <button type="button" onClick={(e) => { e.stopPropagation(); onCheck(); }}
          className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isChecked ? "bg-accent border-accent" : "border-foreground/20 hover:border-foreground/40"}`}>
          {isChecked && (
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        <span className={`${PANEL_STYLES.card.badge} ${TYPE_BADGE_COLORS.SUB}`}>
          <svg className="w-2.5 h-2.5 inline-block mr-0.5 -mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M9 3v12m0 0H5m4 0h4" />
          </svg>
          SUB
        </span>
        {categoryLabel && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-foreground/5 text-foreground/30 rounded flex-shrink-0">{categoryLabel}</span>
        )}
        <span className="text-[12px] font-medium text-foreground truncate flex-shrink min-w-0">{item.sourceModel.name}</span>
        {px > 0 && (<><span className="text-foreground/15 flex-shrink-0">&middot;</span><span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0">{px}px</span></>)}
        {item.isMapped && (
          <>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400/70 truncate max-w-[180px] ml-auto flex-shrink-0">
              {isAutoMatched && <Link2Badge />}
              &rarr; {item.assignedUserModels[0]?.name}
            </span>
            <button type="button" onClick={(e) => { e.stopPropagation(); onUnlink(); }}
              className="p-1 rounded-full text-foreground/15 hover:text-amber-400 hover:bg-amber-500/10 transition-colors flex-shrink-0" title="Remove mapping (keep item)">
              <UnlinkIcon className="w-3 h-3" />
            </button>
          </>
        )}
        {!item.isMapped && topSuggestion && (
          <>
            <span className="text-foreground/15 flex-shrink-0">&middot;</span>
            <span className="text-[10px] text-foreground/40 flex-shrink-0">Suggested:</span>
            <span className="text-[11px] text-foreground/60 truncate">{topSuggestion.model.name}</span>
            <ConfidenceBadge score={topSuggestion.score} size="sm" />
          </>
        )}
        <div className={`${!item.isMapped ? "ml-auto" : ""} flex items-center gap-1 flex-shrink-0`}>
          {topSuggestion && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onAccept(topSuggestion.model.name); }}
              className="p-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors" title="Accept suggested match">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.77 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
              </svg>
            </button>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); onSkip(); }}
            className="p-1 rounded-full hover:bg-foreground/10 text-foreground/20 hover:text-foreground/50 transition-colors" title="Skip — dismiss from workflow">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
    prev.topSuggestion?.model.name === next.topSuggestion?.model.name &&
    prev.topSuggestion?.score === next.topSuggestion?.score &&
    prev.onUnlink === next.onUnlink,
);
