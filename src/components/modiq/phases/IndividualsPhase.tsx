"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { useMappingPhase, findNextUnmapped } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { UniversalSourcePanel } from "../UniversalSourcePanel";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBulkInference } from "@/hooks/useBulkInference";
import { useItemFamilies } from "@/hooks/useItemFamilies";
import { BulkInferenceBanner } from "../BulkInferenceBanner";
import { FamilyAccordionHeader } from "../FamilyAccordionHeader";
import { PANEL_STYLES } from "../panelStyles";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export function IndividualsPhase() {
  const { phaseItems, goToNextPhase, interactive } = useMappingPhase();
  const dnd = useDragAndDrop();

  const bulk = useBulkInference(interactive, phaseItems);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const unmappedItems = phaseItems.filter((item) => !item.isMapped);
  const mappedItems = phaseItems.filter((item) => item.isMapped);

  const filteredUnmapped = useMemo(() => {
    if (!search) return unmappedItems;
    const q = search.toLowerCase();
    return unmappedItems.filter(
      (item) =>
        item.sourceModel.name.toLowerCase().includes(q) ||
        item.sourceModel.type.toLowerCase().includes(q),
    );
  }, [unmappedItems, search]);

  const { families, toggle, isExpanded } = useItemFamilies(filteredUnmapped, selectedItemId);

  // O(1) lookup map for phase items
  const phaseItemsByName = useMemo(() => {
    const map = new Map<string, SourceLayerMapping>();
    for (const item of phaseItems) map.set(item.sourceModel.name, item);
    return map;
  }, [phaseItems]);

  const selectedItem = selectedItemId
    ? phaseItemsByName.get(selectedItemId) ?? null
    : null;

  // Pre-compute top suggestion for each unmapped card (avoids per-card scoring)
  const topSuggestionsMap = useMemo(() => {
    const map = new Map<string, { model: { name: string }; score: number } | null>();
    for (const item of phaseItems) {
      if (item.isMapped) continue;
      const suggs = interactive.getSuggestionsForLayer(item.sourceModel);
      map.set(item.sourceModel.name, suggs[0] ?? null);
    }
    return map;
  }, [phaseItems, interactive]);

  // Suggestions for selected item
  const suggestions = useMemo(() => {
    if (!selectedItem) return [];
    return interactive.getSuggestionsForLayer(selectedItem.sourceModel).slice(0, 10);
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
            <svg className="w-5 h-5 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Individual Models
          </h2>
          <p className={PANEL_STYLES.header.subtitle}>
            {unmappedItems.length} models need matching &middot;{" "}
            {mappedItems.length} already mapped
          </p>
        </div>

        {/* Search */}
        <div className={PANEL_STYLES.search.wrapper}>
          <div className="relative">
            <svg className={PANEL_STYLES.search.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={PANEL_STYLES.search.input}
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

        {/* List */}
        <div className={PANEL_STYLES.scrollArea}>
          <div className="space-y-1.5">
            {families.map((family) => {
              if (family.items.length === 1) {
                return renderItemCard(family.items[0]);
              }
              return (
                <div key={family.prefix}>
                  <FamilyAccordionHeader
                    prefix={family.prefix}
                    count={family.items.length}
                    isExpanded={isExpanded(family.prefix)}
                    onToggle={() => toggle(family.prefix)}
                  />
                  {isExpanded(family.prefix) && (
                    <div className="space-y-1.5 pl-2 mt-1">
                      {family.items.map((item) => renderItemCard(item))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                onAccept={(userModelName) =>
                  handleAccept(selectedItem.sourceModel.name, userModelName)
                }
                dnd={dnd}
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
              <svg className="w-10 h-10 mx-auto mb-3 text-foreground/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              <p className="text-sm">Select a model to see suggestions</p>
            </div>
          </div>
        )}
      </div>
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
        ${isDropTarget
          ? "bg-accent/10 border border-accent/50 ring-2 ring-accent/30"
          : isSelected
            ? "bg-accent/5 border border-accent/30 ring-1 ring-accent/20"
            : "bg-surface border border-border hover:border-foreground/20"}
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
        title="Skip this model"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-center justify-between pr-6">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={PANEL_STYLES.card.title}>
            {item.sourceModel.name}
          </span>
        </div>
        {topSuggestion && (
          <ConfidenceBadge score={topSuggestion.score} size="sm" />
        )}
      </div>
      <div className="flex items-center gap-3 mt-1 text-[11px] text-foreground/30">
        {item.sourceModel.pixelCount ? (
          <span>{item.sourceModel.pixelCount}px</span>
        ) : null}
        <span>{item.sourceModel.type}</span>
      </div>
    </div>
  );
}

const ItemCardMemo = memo(ItemCard, (prev, next) =>
  prev.item.sourceModel === next.item.sourceModel &&
  prev.item.isMapped === next.item.isMapped &&
  prev.isSelected === next.isSelected &&
  prev.isDropTarget === next.isDropTarget &&
  prev.topSuggestion?.model.name === next.topSuggestion?.model.name &&
  prev.topSuggestion?.score === next.topSuggestion?.score,
);
