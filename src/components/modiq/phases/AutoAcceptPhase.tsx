"use client";

import { useState, useMemo, useCallback } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { BulkActionBar } from "../BulkActionBar";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { CelebrationToast } from "../CelebrationToast";
import { UniversalSourcePanel } from "../UniversalSourcePanel";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { generateMatchReasoning } from "@/lib/modiq/generateReasoning";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export function AutoAcceptPhase() {
  const { phaseItems, goToNextPhase, interactive } = useMappingPhase();
  const dnd = useDragAndDrop();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [overrideItemId, setOverrideItemId] = useState<string | null>(null);

  const unmappedItems = phaseItems.filter((item) => !item.isMapped);
  const mappedItems = phaseItems.filter((item) => item.isMapped);

  const overrideItem = phaseItems.find(
    (i) => i.sourceModel.name === overrideItemId,
  );

  // Suggestions for override item
  const overrideSuggestions = useMemo(() => {
    if (!overrideItem) return [];
    return interactive.getSuggestionsForLayer(overrideItem.sourceModel).slice(0, 10);
  }, [interactive, overrideItem]);

  // Get top suggestion for each unmapped item
  const suggestions = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof interactive.getSuggestionsForLayer>[number]
    >();
    for (const item of unmappedItems) {
      const suggs = interactive.getSuggestionsForLayer(item.sourceModel);
      if (suggs.length > 0) {
        map.set(item.sourceModel.name, suggs[0]);
      }
    }
    return map;
  }, [unmappedItems, interactive]);

  const handleAcceptAll = useCallback(() => {
    for (const item of unmappedItems) {
      const sugg = suggestions.get(item.sourceModel.name);
      if (sugg) {
        interactive.assignUserModelToLayer(item.sourceModel.name, sugg.model.name);
      }
    }
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      goToNextPhase();
    }, 1800);
  }, [unmappedItems, suggestions, interactive, goToNextPhase]);

  const handleAcceptSelected = useCallback(() => {
    for (const item of unmappedItems) {
      if (!selectedIds.has(item.sourceModel.name)) continue;
      const sugg = suggestions.get(item.sourceModel.name);
      if (sugg) {
        interactive.assignUserModelToLayer(item.sourceModel.name, sugg.model.name);
      }
    }
    setSelectedIds(new Set());
  }, [unmappedItems, selectedIds, suggestions, interactive]);

  const handleSelect = (name: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === unmappedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unmappedItems.map((i) => i.sourceModel.name)));
    }
  };

  const handleAcceptOne = (item: SourceLayerMapping) => {
    const sugg = suggestions.get(item.sourceModel.name);
    if (sugg) {
      interactive.assignUserModelToLayer(item.sourceModel.name, sugg.model.name);
    }
    if (overrideItemId === item.sourceModel.name) {
      setOverrideItemId(null);
    }
  };

  // Manual override: assign a different user model to this source layer
  const handleManualOverride = (sourceName: string, userModelName: string) => {
    interactive.assignUserModelToLayer(sourceName, userModelName);
    setOverrideItemId(null);
  };

  // Handle drops on left panel items
  const handleDropOnItem = (sourceName: string, e: React.DragEvent) => {
    e.preventDefault();
    const item = dnd.handleDrop({ destModelName: sourceName, isMapped: false });
    if (item) {
      handleManualOverride(sourceName, item.sourceModelName);
    }
  };

  // No high-confidence matches
  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#127919;</span>}
        title="No High-Confidence Matches"
        description="No automatic matches found with 85%+ confidence. Continue to the next phase to map groups manually."
      />
    );
  }

  // All done — show confidence insights + expandable review
  if (unmappedItems.length === 0) {
    const avgScore =
      mappedItems.length > 0
        ? mappedItems.reduce((sum, item) => {
            const suggs = interactive.getSuggestionsForLayer(item.sourceModel);
            const matched = suggs.find(
              (s) => s.model.name === item.assignedUserModels[0]?.name,
            );
            return sum + (matched?.score ?? 0);
          }, 0) / mappedItems.length
        : 0;

    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="text-center py-8 flex-shrink-0">
          <div className="text-5xl mb-3">&#9989;</div>
          <h2 className="text-xl font-bold text-foreground">
            All Auto-Matches Accepted!
          </h2>
          <p className="text-sm text-foreground/50 mt-2">
            {mappedItems.length} high-confidence matches mapped &middot;{" "}
            {Math.round(avgScore * 100)}% average confidence
          </p>
        </div>

        <div className="px-8 flex-shrink-0">
          <div className="max-w-lg mx-auto bg-green-500/5 border border-green-500/15 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground/70">Average Confidence</span>
              <span className="text-lg font-bold text-green-400">{Math.round(avgScore * 100)}%</span>
            </div>
            <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${avgScore * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-4">
          <details className="max-w-lg mx-auto">
            <summary className="text-sm font-medium text-foreground/50 cursor-pointer hover:text-foreground/70 mb-3">
              Review {mappedItems.length} accepted matches
            </summary>
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="divide-y divide-border/30">
                {mappedItems.map((item) => {
                  const suggs = interactive.getSuggestionsForLayer(item.sourceModel);
                  const matched = suggs.find(
                    (s) => s.model.name === item.assignedUserModels[0]?.name,
                  );
                  return (
                    <div
                      key={item.sourceModel.name}
                      className="px-4 py-2.5 flex items-center gap-3 hover:bg-foreground/[0.02]"
                    >
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-[13px] text-foreground/70 truncate flex-1">
                        {item.sourceModel.name}
                      </span>
                      <span className="text-foreground/20">&rarr;</span>
                      <span className="text-[13px] text-foreground/50 truncate flex-1 text-right">
                        {item.assignedUserModels[0]?.name}
                      </span>
                      {matched && (
                        <ConfidenceBadge score={matched.score} size="sm" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        </div>

      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Match List */}
      <div className={`${overrideItem ? "w-1/2" : "w-full"} flex flex-col overflow-hidden transition-all duration-300`}>
        {/* Phase Header */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                High-Confidence Matches
              </h2>
              <p className="text-sm text-foreground/50 mt-1">
                {unmappedItems.length} matches ready to accept (85%+ confidence)
              </p>
            </div>

            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-green-600/20 hover:shadow-green-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accept All {unmappedItems.length}
            </button>
          </div>
        </div>

        {/* Match List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {unmappedItems.map((item) => {
              const sugg = suggestions.get(item.sourceModel.name);
              if (!sugg) return null;

              const reasoning = generateMatchReasoning(sugg.factors, sugg.score);
              const isDropHover = dnd.state.activeDropTarget === item.sourceModel.name;

              return (
                <AutoAcceptMatchCard
                  key={item.sourceModel.name}
                  layer={item}
                  matchName={sugg.model.name}
                  matchScore={sugg.score}
                  matchPixels={sugg.model.pixelCount}
                  reasoning={reasoning}
                  isSelected={selectedIds.has(item.sourceModel.name)}
                  isOverrideActive={overrideItemId === item.sourceModel.name}
                  isDropTarget={isDropHover}
                  onSelect={() => handleSelect(item.sourceModel.name)}
                  onAccept={() => handleAcceptOne(item)}
                  onOverride={() =>
                    setOverrideItemId(
                      overrideItemId === item.sourceModel.name ? null : item.sourceModel.name,
                    )
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDragEnter={() => dnd.handleDragEnter(item.sourceModel.name)}
                  onDragLeave={() => dnd.handleDragLeave(item.sourceModel.name)}
                  onDrop={(e) => handleDropOnItem(item.sourceModel.name, e)}
                />
              );
            })}
          </div>

          {mappedItems.length > 0 && (
            <details className="mt-6">
              <summary className="text-sm text-foreground/40 cursor-pointer hover:text-foreground/60">
                {mappedItems.length} already mapped in this phase
              </summary>
              <div className="mt-3 space-y-2 opacity-60">
                {mappedItems.map((item) => (
                  <div
                    key={item.sourceModel.name}
                    className="flex items-center gap-4 p-3 rounded-lg bg-green-500/5 border border-green-500/15"
                  >
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-foreground/60 truncate flex-1">
                      {item.sourceModel.name}
                    </span>
                    <span className="text-sm text-foreground/30">&rarr;</span>
                    <span className="text-sm text-foreground/60 truncate flex-1 text-right">
                      {item.assignedUserModels[0]?.name}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Right: Override Panel (shows when an item is selected for override) */}
      {overrideItem && (
        <div className="w-1/2 flex flex-col border-l border-border bg-surface/50 overflow-hidden">
          {/* Override Header */}
          <div className="px-6 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide mb-1">
                  Manual Override
                </div>
                <h3 className="text-base font-semibold text-foreground truncate">
                  {overrideItem.sourceModel.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOverrideItemId(null)}
                className="p-1.5 rounded-lg text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Universal Source Panel */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <UniversalSourcePanel
              allModels={interactive.allDestModels}
              suggestions={overrideSuggestions}
              assignedNames={interactive.assignedUserModelNames}
              selectedDestLabel={overrideItem.sourceModel.name}
              onAccept={(userModelName) =>
                handleManualOverride(overrideItem.sourceModel.name, userModelName)
              }
              dnd={dnd}
            />
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={unmappedItems.length}
          onSelectAll={handleSelectAll}
          onAcceptSelected={handleAcceptSelected}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {/* Celebration Toast */}
      {showCelebration && (
        <CelebrationToast
          title="Auto-Matches Complete!"
          description={`${phaseItems.length} high-confidence matches accepted`}
        />
      )}
    </div>
  );
}

// ─── Match Card ────────────────────────────────────────

function AutoAcceptMatchCard({
  layer,
  matchName,
  matchScore,
  matchPixels,
  reasoning,
  isSelected,
  isOverrideActive,
  isDropTarget,
  onSelect,
  onAccept,
  onOverride,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  layer: SourceLayerMapping;
  matchName: string;
  matchScore: number;
  matchPixels: number | undefined;
  reasoning: ReturnType<typeof generateMatchReasoning>;
  isSelected: boolean;
  isOverrideActive: boolean;
  isDropTarget: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onOverride: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      className={`
        flex items-center gap-4 p-4 rounded-lg border transition-all duration-200
        ${isDropTarget
          ? "bg-accent/10 border-accent/50 ring-2 ring-accent/30"
          : isOverrideActive
            ? "bg-amber-500/5 border-amber-500/30"
            : isSelected
              ? "bg-accent/5 border-accent/30"
              : "bg-surface border-border hover:border-foreground/20"}
      `}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onSelect}
        className={`
          w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
          transition-all duration-200
          ${isSelected ? "bg-accent border-accent" : "border-foreground/20 hover:border-foreground/40"}
        `}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Source Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {layer.isGroup && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 rounded">
              GRP
            </span>
          )}
          <span className="text-[13px] font-medium text-foreground truncate">
            {layer.sourceModel.name}
          </span>
        </div>
        {layer.sourceModel.pixelCount ? (
          <div className="text-[11px] text-foreground/30 mt-0.5">
            {layer.sourceModel.pixelCount}px
          </div>
        ) : null}
      </div>

      {/* Arrow */}
      <svg className="w-5 h-5 text-foreground/20 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>

      {/* Match Info */}
      <div className="flex-1 min-w-0 text-right">
        <div className="text-[13px] font-medium text-foreground truncate">{matchName}</div>
        {matchPixels ? (
          <div className="text-[11px] text-foreground/30 mt-0.5">{matchPixels}px</div>
        ) : null}
      </div>

      {/* Confidence Badge */}
      <ConfidenceBadge score={matchScore} reasoning={reasoning} size="md" />

      {/* Override Button */}
      <button
        type="button"
        onClick={onOverride}
        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
          isOverrideActive
            ? "bg-amber-500/20 text-amber-400"
            : "bg-foreground/5 text-foreground/30 hover:text-foreground/50 hover:bg-foreground/10"
        }`}
        title="Choose different match"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      {/* Accept Button */}
      <button
        type="button"
        onClick={onAccept}
        className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex-shrink-0"
        title="Accept match"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.77 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
        </svg>
      </button>
    </div>
  );
}
