"use client";

import { useState, useMemo } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { BulkActionBar } from "../BulkActionBar";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { CelebrationToast } from "../CelebrationToast";
import { generateMatchReasoning } from "@/lib/modiq/generateReasoning";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export function AutoAcceptPhase() {
  const { phaseItems, goToNextPhase, interactive } =
    useMappingPhase();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);

  const unmappedItems = phaseItems.filter((item) => !item.isMapped);
  const mappedItems = phaseItems.filter((item) => item.isMapped);

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

  // Accept all unmapped high-confidence matches
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

  // Accept selected items
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

  // Accept a single item
  const handleAcceptOne = (item: SourceLayerMapping) => {
    const sugg = suggestions.get(item.sourceModel.name);
    if (sugg) {
      interactive.assignUserModelToLayer(item.sourceModel.name, sugg.model.name);
    }
  };

  // No high-confidence matches
  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#127919;</span>}
        title="No High-Confidence Matches"
        description="No automatic matches found with 85%+ confidence. Continue to the next phase to map groups manually."
        action={{ label: "Continue to Groups", onClick: goToNextPhase }}
      />
    );
  }

  // All done
  if (unmappedItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#9989;</span>}
        title="All Auto-Matches Accepted!"
        description={`${mappedItems.length} high-confidence matches have been mapped.`}
        action={{ label: "Continue to Groups", onClick: goToNextPhase }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Phase Header */}
      <div className="px-6 py-4 border-b border-border">
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

          {/* Accept All Button */}
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-green-600/20 hover:shadow-green-500/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Accept All {unmappedItems.length} Matches
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

            return (
              <AutoAcceptMatchCard
                key={item.sourceModel.name}
                layer={item}
                matchName={sugg.model.name}
                matchScore={sugg.score}
                matchPixels={sugg.model.pixelCount}
                reasoning={reasoning}
                isSelected={selectedIds.has(item.sourceModel.name)}
                onSelect={() => handleSelect(item.sourceModel.name)}
                onAccept={() => handleAcceptOne(item)}
              />
            );
          })}
        </div>

        {/* Already Mapped */}
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
  onSelect,
  onAccept,
}: {
  layer: SourceLayerMapping;
  matchName: string;
  matchScore: number;
  matchPixels: number | undefined;
  reasoning: ReturnType<typeof generateMatchReasoning>;
  isSelected: boolean;
  onSelect: () => void;
  onAccept: () => void;
}) {
  return (
    <div
      className={`
        flex items-center gap-4 p-4 rounded-lg border transition-all duration-200
        ${isSelected
          ? "bg-accent/5 border-accent/30"
          : "bg-surface border-border hover:border-foreground/20"}
      `}
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

      {/* Accept Button */}
      <button
        type="button"
        onClick={onAccept}
        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors flex-shrink-0"
        title="Accept match"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}
