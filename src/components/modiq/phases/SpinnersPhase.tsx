"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { useMappingPhase, findNextUnmapped } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { BulkActionBar } from "../BulkActionBar";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { UniversalSourcePanel } from "../UniversalSourcePanel";
import { MetadataBadges } from "../MetadataBadges";
import { SortDropdown, sortItems, type SortOption } from "../SortDropdown";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBulkInference } from "@/hooks/useBulkInference";
import { useItemFamilies } from "@/hooks/useItemFamilies";
import { BulkInferenceBanner } from "../BulkInferenceBanner";
import { FamilyAccordionHeader } from "../FamilyAccordionHeader";
import { PANEL_STYLES, TYPE_BADGE_COLORS } from "../panelStyles";
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

export function SpinnersPhase() {
  const { phaseItems, goToNextPhase, interactive } = useMappingPhase();
  const dnd = useDragAndDrop();

  const bulk = useBulkInference(interactive, phaseItems);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("effects-desc");

  const unmappedItems = phaseItems.filter((item) => !item.isMapped);
  const mappedItems = phaseItems.filter((item) => item.isMapped);

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

  const { families, toggle, isExpanded } = useItemFamilies(filteredUnmapped, selectedItemId);

  // Suggestions for selected item
  const suggestions = useMemo(() => {
    if (!selectedItem) return [];
    return interactive.getSuggestionsForLayer(selectedItem.sourceModel).slice(0, 8);
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

  // All done
  if (unmappedItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#9989;</span>}
        title="All Submodel Groups Mapped!"
        description={`${mappedItems.length} submodel group${mappedItems.length === 1 ? "" : "s"} successfully matched. Nice work!`}
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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Submodel Group List */}
      <div className="w-1/2 flex flex-col border-r border-border overflow-hidden">
        <div className={PANEL_STYLES.header.wrapper}>
          <h2 className={PANEL_STYLES.header.title}>
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Submodel Groups
          </h2>
          <p className={PANEL_STYLES.header.subtitle}>
            {unmappedItems.length} groups need matching &middot;{" "}
            {mappedItems.length} already mapped
          </p>
        </div>

        {/* Search + Sort */}
        <div className={PANEL_STYLES.search.wrapper}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg className={PANEL_STYLES.search.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Filter submodel groups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={PANEL_STYLES.search.input}
              />
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

        <div className={PANEL_STYLES.scrollArea}>
          <div className="space-y-2">
            {families.map((family) => {
              const renderSpinner = (item: SourceLayerMapping) => (
                <SpinnerListCardMemo
                  key={item.sourceModel.name}
                  item={item}
                  isSelected={selectedItemId === item.sourceModel.name}
                  isChecked={selectedIds.has(item.sourceModel.name)}
                  isDropTarget={dnd.state.activeDropTarget === item.sourceModel.name}
                  topSuggestion={topSuggestionsMap.get(item.sourceModel.name) ?? null}
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

          {mappedItems.length > 0 && (
            <details className="mt-6">
              <summary className="text-sm text-foreground/40 cursor-pointer hover:text-foreground/60">
                {mappedItems.length} submodel groups already mapped
              </summary>
              <div className="mt-3 space-y-2 opacity-50">
                {mappedItems.map((item) => (
                  <div
                    key={item.sourceModel.name}
                    className="p-3 rounded-lg bg-green-500/5 border border-green-500/15"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`${PANEL_STYLES.card.badge} ${TYPE_BADGE_COLORS.SUB}`}>
                        SUB
                      </span>
                      <span className="text-[13px] text-foreground/60 truncate">
                        {item.sourceModel.name}
                      </span>
                      <span className="text-foreground/20">&rarr;</span>
                      <span className="text-[13px] text-green-400/70 truncate">
                        {item.assignedUserModels[0]?.name}
                      </span>
                    </div>
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
                <span className={`px-1.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE_COLORS.SUB} rounded`}>
                  SUB
                </span>
                {selectedItem.sourceModel.semanticCategory && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-foreground/5 text-foreground/40 rounded">
                    {CATEGORY_LABELS[selectedItem.sourceModel.semanticCategory] ??
                      selectedItem.sourceModel.semanticCategory}
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

            {/* Universal Source Panel */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <UniversalSourcePanel
                allModels={interactive.allDestModels}
                suggestions={suggestions}
                sourceFilter={spinnerSourceFilter}
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
                onClick={() => handleSkipItem(selectedItem.sourceModel.name)}
                className="w-full py-2 text-sm text-foreground/40 hover:text-foreground/60 border border-border hover:border-foreground/20 rounded-lg transition-colors"
              >
                Skip This Group
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground/30">
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-foreground/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
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

// ─── Collapsible Member Pills ───────────────────────────

function CollapsibleMembers({ members }: { members: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (members.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] text-foreground/40 hover:text-foreground/60 flex items-center gap-1 transition-colors"
      >
        <span>{members.length} members</span>
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {members.map((member) => (
            <span
              key={member}
              className="px-1.5 py-0.5 text-[10px] bg-foreground/5 text-foreground/40 rounded"
            >
              {member}
            </span>
          ))}
        </div>
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
  topSuggestion,
  onClick,
  onCheck,
  onAccept,
  onSkip,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  item: SourceLayerMapping;
  isSelected: boolean;
  isChecked: boolean;
  isDropTarget: boolean;
  topSuggestion: { model: { name: string }; score: number } | null;
  onClick: () => void;
  onCheck: () => void;
  onAccept: (userModelName: string) => void;
  onSkip: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {

  const categoryLabel = item.sourceModel.semanticCategory
    ? CATEGORY_LABELS[item.sourceModel.semanticCategory] ?? item.sourceModel.semanticCategory
    : null;

  return (
    <div
      className={`
        relative p-3 rounded-lg border transition-all duration-200 cursor-pointer
        ${isDropTarget
          ? "bg-accent/10 border-accent/50 ring-2 ring-accent/30"
          : isSelected
            ? "bg-accent/5 border-accent/30 ring-1 ring-accent/20"
            : "bg-surface border-border hover:border-foreground/20"}
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
        title="Skip this group"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-2.5 pr-6">
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCheck();
          }}
          className={`
            mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
            transition-all duration-200
            ${isChecked ? "bg-accent border-accent" : "border-foreground/20 hover:border-foreground/40"}
          `}
        >
          {isChecked && (
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`${PANEL_STYLES.card.badge} ${TYPE_BADGE_COLORS.SUB}`}>
              <svg className="w-2.5 h-2.5 inline-block mr-0.5 -mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M9 3v12m0 0H5m4 0h4" />
              </svg>
              SUB
            </span>
            {categoryLabel && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-foreground/5 text-foreground/30 rounded">
                {categoryLabel}
              </span>
            )}
            <span className={PANEL_STYLES.card.title}>
              {item.sourceModel.name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <MetadataBadges item={item} />
          </div>

          {/* Best match preview */}
          {topSuggestion && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] text-foreground/30">Suggested:</span>
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
            title="Accept suggested match"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.77 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

const SpinnerListCardMemo = memo(SpinnerListCard, (prev, next) =>
  prev.item.sourceModel === next.item.sourceModel &&
  prev.item.isMapped === next.item.isMapped &&
  prev.isSelected === next.isSelected &&
  prev.isChecked === next.isChecked &&
  prev.isDropTarget === next.isDropTarget &&
  prev.topSuggestion?.model.name === next.topSuggestion?.model.name &&
  prev.topSuggestion?.score === next.topSuggestion?.score,
);
