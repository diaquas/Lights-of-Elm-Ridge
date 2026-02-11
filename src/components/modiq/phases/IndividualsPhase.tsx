"use client";

import { useState, useMemo, useCallback, memo } from "react";
import {
  useMappingPhase,
  findNextUnmapped,
  extractFamily,
} from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { UniversalSourcePanel } from "../UniversalSourcePanel";
import {
  MetadataBadges,
  HeroEffectBadge,
  EffectsCoverageBar,
} from "../MetadataBadges";
import { SortDropdown, sortItems, type SortOption } from "../SortDropdown";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBulkInference } from "@/hooks/useBulkInference";
import { useItemFamilies, type ItemFamily } from "@/hooks/useItemFamilies";
import { BulkInferenceBanner } from "../BulkInferenceBanner";
import { FamilyAccordionHeader } from "../FamilyAccordionHeader";
import { PANEL_STYLES } from "../panelStyles";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export function IndividualsPhase() {
  const { phaseItems, goToNextPhase, interactive } = useMappingPhase();
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
  const [sortBy, setSortBy] = useState<SortOption>("effects-desc");

  const unmappedItems = phaseItems.filter((item) => !item.isMapped);
  const skippedItems = interactive.sourceLayerMappings.filter(
    (l) => l.isSkipped,
  );
  const mappedItems = phaseItems.filter((item) => item.isMapped);

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

  const filteredUnmapped = useMemo(() => {
    let items = unmappedItems;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.sourceModel.name.toLowerCase().includes(q) ||
          item.sourceModel.type.toLowerCase().includes(q),
      );
    }
    return sortItems(items, sortBy, topSuggestionsMap);
  }, [unmappedItems, search, sortBy, topSuggestionsMap]);

  // Sorted + filtered mapped items (same Level 3 sort)
  const filteredMapped = useMemo(() => {
    let items = mappedItems;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.sourceModel.name.toLowerCase().includes(q) ||
          item.sourceModel.type.toLowerCase().includes(q),
      );
    }
    return sortItems(items, sortBy, topSuggestionsMap);
  }, [mappedItems, search, sortBy, topSuggestionsMap]);

  // Level 2 split: model groups (families with >1 item) vs individuals
  const splitByGroupType = useCallback(
    (items: SourceLayerMapping[]) => {
      const familyMap = new Map<string, SourceLayerMapping[]>();
      for (const item of items) {
        const prefix = extractFamily(item.sourceModel.name);
        const existing = familyMap.get(prefix);
        if (existing) existing.push(item);
        else familyMap.set(prefix, [item]);
      }
      const groups: ItemFamily[] = [];
      const singles: SourceLayerMapping[] = [];
      for (const [prefix, familyItems] of familyMap) {
        if (familyItems.length > 1) {
          groups.push({ prefix, items: familyItems });
        } else {
          singles.push(familyItems[0]);
        }
      }
      // Groups sorted A→Z by prefix (fixed Level 2)
      groups.sort((a, b) => a.prefix.localeCompare(b.prefix));
      return { groups, singles };
    },
    [],
  );

  const unmappedSplit = useMemo(
    () => splitByGroupType(filteredUnmapped),
    [filteredUnmapped, splitByGroupType],
  );
  const mappedSplit = useMemo(
    () => splitByGroupType(filteredMapped),
    [filteredMapped, splitByGroupType],
  );

  const { families, toggle, isExpanded } = useItemFamilies(
    filteredUnmapped,
    selectedItemId,
  );

  // Section collapse state
  const [unmappedOpen, setUnmappedOpen] = useState(true);
  const [mappedOpen, setMappedOpen] = useState(false);

  // Suggestions for selected item
  const suggestions = useMemo(() => {
    if (!selectedItem) return [];
    return interactive
      .getSuggestionsForLayer(selectedItem.sourceModel)
      .slice(0, 10);
  }, [interactive, selectedItem]);

  // Type filter: exclude all group types from Individuals source panel
  const individualSourceFilter = useCallback(
    (m: { isGroup?: boolean }) => !m.isGroup,
    [],
  );

  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#128077;</span>}
        title="Models All Set!"
        description="No individual models need manual matching — they were auto-matched or covered by groups."
      />
    );
  }

  if (unmappedItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#9989;</span>}
        title="All Models Mapped!"
        description={`${mappedItems.length} individual model${mappedItems.length === 1 ? "" : "s"} successfully matched. Nice work!`}
      />
    );
  }

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

  const renderItemCard = (item: (typeof filteredUnmapped)[0]) => (
    <ItemCardMemo
      key={item.sourceModel.name}
      item={item}
      isSelected={selectedItemId === item.sourceModel.name}
      isDropTarget={dnd.state.activeDropTarget === item.sourceModel.name}
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
              className="w-5 h-5 text-foreground/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            Individual Models
          </h2>
          <p className={PANEL_STYLES.header.subtitle}>
            {unmappedItems.length} models need matching
            {mappedItems.length > 0 && (
              <span> &middot; {mappedItems.length} already mapped</span>
            )}
          </p>
          <EffectsCoverageBar
            mappedEffects={mappedItems.reduce(
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
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>

        {bulk.suggestion && (
          <BulkInferenceBanner
            suggestion={bulk.suggestion}
            onAcceptAll={handleBulkInferenceAccept}
            onDismiss={bulk.dismiss}
          />
        )}

        {/* List — 3-tier: Unmapped/Mapped → Groups/Individuals → sort */}
        <div className={PANEL_STYLES.scrollArea}>
          {/* ── UNMAPPED section ── */}
          {filteredUnmapped.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setUnmappedOpen((p) => !p)}
                className="flex items-center gap-2 w-full px-4 py-2 text-left"
              >
                <svg
                  className={`w-3.5 h-3.5 text-foreground/40 transition-transform ${unmappedOpen ? "rotate-90" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[13px] font-semibold text-foreground/50 uppercase tracking-wider">
                  Unmapped
                </span>
                <span className="text-[12px] font-semibold text-foreground/35">
                  ({filteredUnmapped.length})
                </span>
              </button>
              {unmappedOpen && (
                <div className="px-4 pb-3 space-y-3">
                  {/* Level 2: Model Groups */}
                  {unmappedSplit.groups.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wide mb-1.5 px-1">
                        Model Groups ({unmappedSplit.groups.length})
                      </div>
                      <div className="space-y-2">
                        {unmappedSplit.groups.map((group) => (
                          <GroupCard
                            key={group.prefix}
                            family={group}
                            isExpanded={isExpanded(group.prefix)}
                            onToggle={() => toggle(group.prefix)}
                            onSkipFamily={() => handleSkipFamily(group.items)}
                            renderItemCard={renderItemCard}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Level 2: Individual Models */}
                  {unmappedSplit.singles.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wide mb-1.5 px-1">
                        Individual Models ({unmappedSplit.singles.length})
                      </div>
                      <div className="space-y-1.5">
                        {unmappedSplit.singles.map((item) => renderItemCard(item))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Divider ── */}
          {filteredUnmapped.length > 0 && filteredMapped.length > 0 && (
            <div className="border-t border-border/40 mx-4 my-1" />
          )}

          {/* ── MAPPED section ── */}
          {filteredMapped.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setMappedOpen((p) => !p)}
                className="flex items-center gap-2 w-full px-4 py-2 text-left"
              >
                <svg
                  className={`w-3.5 h-3.5 text-foreground/40 transition-transform ${mappedOpen ? "rotate-90" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[13px] font-semibold text-foreground/50 uppercase tracking-wider">
                  Mapped
                </span>
                <span className="text-[12px] font-semibold text-foreground/35">
                  ({filteredMapped.length})
                </span>
              </button>
              {mappedOpen && (
                <div className="px-4 pb-3 space-y-3">
                  {mappedSplit.groups.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wide mb-1.5 px-1">
                        Model Groups ({mappedSplit.groups.length})
                      </div>
                      <div className="space-y-2">
                        {mappedSplit.groups.map((group) => (
                          <GroupCard
                            key={group.prefix}
                            family={group}
                            isExpanded={isExpanded(group.prefix)}
                            onToggle={() => toggle(group.prefix)}
                            renderItemCard={renderItemCard}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {mappedSplit.singles.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wide mb-1.5 px-1">
                        Individual Models ({mappedSplit.singles.length})
                      </div>
                      <div className="space-y-1.5">
                        {mappedSplit.singles.map((item) => renderItemCard(item))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
        {selectedItem && !selectedItem.isMapped ? (
          <>
            {/* Item Info Header — compact, same height as left */}
            <div className={PANEL_STYLES.header.wrapper}>
              <h3 className="text-sm font-semibold text-foreground truncate">
                {selectedItem.sourceModel.name}
              </h3>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-foreground/40">
                {selectedItem.sourceModel.pixelCount ? (
                  <span>{selectedItem.sourceModel.pixelCount}px</span>
                ) : null}
                <span>{selectedItem.sourceModel.type}</span>
              </div>
            </div>

            {/* Universal Source Panel */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <UniversalSourcePanel
                allModels={interactive.allDestModels}
                suggestions={suggestions}
                sourceFilter={individualSourceFilter}
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
              />
            </div>

            {/* Skip */}
            <div className="px-6 py-3 border-t border-border flex-shrink-0">
              <button
                type="button"
                onClick={() => handleSkip(selectedItem.sourceModel.name)}
                className="w-full py-2 text-sm text-foreground/40 hover:text-foreground/60 border border-border hover:border-foreground/20 rounded-lg transition-colors"
              >
                Skip This Model
              </button>
            </div>
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
              <p className="text-sm">Select a model to see suggestions</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Group Card (bordered container for model families) ────────

function GroupCard({
  family,
  isExpanded,
  onToggle,
  onSkipFamily,
  renderItemCard,
}: {
  family: ItemFamily;
  isExpanded: boolean;
  onToggle: () => void;
  onSkipFamily?: () => void;
  renderItemCard: (item: SourceLayerMapping) => React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-foreground/[0.02] overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-1 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <svg
            className={`w-3.5 h-3.5 text-foreground/40 transition-transform duration-150 flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg
            className="w-3.5 h-3.5 text-foreground/30 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-[13px] font-semibold text-foreground/70 truncate">
            {family.prefix}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/8 text-foreground/40 font-semibold flex-shrink-0">
            &times;{family.items.length}
          </span>
        </button>
        {onSkipFamily && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSkipFamily();
            }}
            title={`Skip all ${family.items.length} in ${family.prefix}`}
            className="p-1 text-foreground/20 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {/* Expanded children */}
      {isExpanded && (
        <div className="px-3 pb-2 pl-5 space-y-1.5 border-t border-border/30">
          <div className="pt-1.5">
            {family.items.map((item) => renderItemCard(item))}
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
  topSuggestion: { model: { name: string }; score: number } | null;
  onClick: () => void;
  onAccept: (userModelName: string) => void;
  onSkip: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      className={`
        relative w-full p-3 rounded-lg text-left transition-all duration-200 cursor-pointer
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
      {/* Skip/X Button — top right */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSkip();
        }}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-foreground/10 text-foreground/20 hover:text-foreground/50 transition-colors"
        aria-label="Skip this model"
        title="Skip this model"
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

      <div className="flex items-start gap-2 pr-6">
        {/* Hero Effect Badge */}
        <HeroEffectBadge count={item.effectCount} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={PANEL_STYLES.card.title}>
              {item.sourceModel.name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <MetadataBadges item={item} />
            <span className="text-[10px] text-foreground/25">
              {item.sourceModel.type}
            </span>
          </div>

          {/* Best match preview */}
          {topSuggestion && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] text-foreground/40">Suggested:</span>
              <span className="text-[12px] text-foreground/60 truncate">
                {topSuggestion.model.name}
              </span>
              <ConfidenceBadge score={topSuggestion.score} size="sm" />
            </div>
          )}
        </div>

        {/* Quick Accept */}
        {topSuggestion && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAccept(topSuggestion.model.name);
            }}
            className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex-shrink-0"
            aria-label="Accept suggested match"
            title="Accept suggested match"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.77 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
            </svg>
          </button>
        )}
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
    prev.isSelected === next.isSelected &&
    prev.isDropTarget === next.isDropTarget &&
    prev.topSuggestion?.model.name === next.topSuggestion?.model.name &&
    prev.topSuggestion?.score === next.topSuggestion?.score,
);
