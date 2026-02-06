"use client";

import { useState, useMemo, useCallback, memo } from "react";
import type { ParsedModel } from "@/lib/modiq";
import type { DragItem, DragAndDropHandlers } from "@/hooks/useDragAndDrop";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { generateMatchReasoning } from "@/lib/modiq/generateReasoning";

// ─── Types ──────────────────────────────────────────────

interface SuggestionItem {
  model: ParsedModel;
  score: number;
  factors: {
    name: number;
    spatial: number;
    shape: number;
    type: number;
    pixels: number;
  };
}

export interface UniversalSourcePanelProps {
  /** All available user models to display */
  allModels: ParsedModel[];
  /** AI suggestions (ranked, for current selection) */
  suggestions?: SuggestionItem[];
  /** Filter which models to show (applied to allModels) */
  sourceFilter?: (model: ParsedModel) => boolean;
  /** Names of already-assigned user models */
  assignedNames?: Set<string>;
  /** Label for the current destination being mapped */
  selectedDestLabel?: string;
  /** Called when user clicks a model to accept it */
  onAccept: (userModelName: string) => void;
  /** Drag-and-drop handlers (optional — enables drag support) */
  dnd?: DragAndDropHandlers;
}

// ─── Component ──────────────────────────────────────────

export function UniversalSourcePanel({
  allModels,
  suggestions = [],
  sourceFilter,
  assignedNames,
  selectedDestLabel,
  onAccept,
  dnd,
}: UniversalSourcePanelProps) {
  const [search, setSearch] = useState("");

  // Available models = filtered + not already assigned
  const availableModels = useMemo(() => {
    let models = allModels;
    if (sourceFilter) models = models.filter(sourceFilter);
    return models;
  }, [allModels, sourceFilter]);

  // Suggestion model names (for deduplication in "all models" list)
  const suggestionNames = useMemo(
    () => new Set(suggestions.map((s) => s.model.name)),
    [suggestions],
  );

  // Filtered suggestions (when searching)
  const filteredSuggestions = useMemo(() => {
    if (!search) return suggestions;
    const q = search.toLowerCase();
    return suggestions.filter(
      (s) =>
        s.model.name.toLowerCase().includes(q) ||
        s.model.type.toLowerCase().includes(q),
    );
  }, [search, suggestions]);

  // Filtered all-models list (always computed from availableModels)
  const filteredModels = useMemo(() => {
    if (!search) return availableModels;
    const q = search.toLowerCase();
    return availableModels.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q),
    );
  }, [search, availableModels]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border flex-shrink-0">
        <h3 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wide">
          {selectedDestLabel
            ? `Match for: ${selectedDestLabel}`
            : "Available Models"}
        </h3>
        <div className="text-[11px] text-foreground/25 mt-0.5">
          {availableModels.length} available &middot; Drag to map or click to
          select
        </div>
      </div>

      {/* Search — ALWAYS visible, above suggestions */}
      <div className="px-6 py-2 border-b border-border flex-shrink-0">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30"
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
            placeholder="Search all models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[12px] pl-8 pr-8 py-1.5 h-8 rounded bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
          />
          {search && (
            <button
              type="button"
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
        {search && (
          <p className="text-[10px] text-foreground/30 mt-1">
            Showing {filteredSuggestions.length + filteredModels.length} of{" "}
            {suggestions.length + availableModels.length}
          </p>
        )}
      </div>

      {/* Scrollable area: Suggestions + All Models together */}
      <div className="flex-1 overflow-y-auto">
        {/* AI Suggestions section */}
        {filteredSuggestions.length > 0 && (
          <div className="px-6 py-3 border-b border-border bg-surface/50">
            <h4 className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wide mb-2">
              AI Suggestions ({filteredSuggestions.length})
            </h4>
            <div className="space-y-1.5">
              {filteredSuggestions.map((sugg, index) => (
                <SuggestionCard
                  key={sugg.model.name}
                  sugg={sugg}
                  isBest={index === 0 && !search}
                  onAccept={onAccept}
                  dnd={dnd}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Models section */}
        <div className="px-6 py-3">
          <div className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wide mb-2">
            All Models ({filteredModels.length})
          </div>
          {filteredModels.length === 0 ? (
            <div className="text-center py-8 text-foreground/30">
              <p className="text-sm">
                {search
                  ? <>No models matching &ldquo;{search}&rdquo;</>
                  : "No models available"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredModels.map((model) =>
                !search && suggestionNames.has(model.name) ? null : (
                  <ModelCard
                    key={model.name}
                    model={model}
                    isAssigned={assignedNames?.has(model.name) ?? false}
                    onAccept={onAccept}
                    dnd={dnd}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Suggestion Card ────────────────────────────────────

const SuggestionCard = memo(function SuggestionCard({
  sugg,
  isBest,
  onAccept,
  dnd,
}: {
  sugg: SuggestionItem;
  isBest: boolean;
  onAccept: (name: string) => void;
  dnd?: DragAndDropHandlers;
}) {
  const reasoning = useMemo(
    () => generateMatchReasoning(sugg.factors, sugg.score),
    [sugg.factors, sugg.score],
  );

  const dragItem = useMemo<DragItem>(
    () => ({ sourceModelName: sugg.model.name }),
    [sugg.model.name],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!dnd) return;
      e.dataTransfer.setData("text/plain", dnd.getDragDataTransfer(dragItem));
      e.dataTransfer.effectAllowed = "move";
      dnd.handleDragStart(dragItem);
    },
    [dnd, dragItem],
  );

  return (
    <button
      type="button"
      draggable={!!dnd}
      onDragStart={handleDragStart}
      onDragEnd={dnd?.handleDragEnd}
      onClick={() => onAccept(sugg.model.name)}
      className={`
        w-full p-2.5 rounded-lg text-left transition-all duration-200
        ${isBest
          ? "bg-accent/8 border border-accent/25 hover:border-accent/40"
          : "bg-foreground/3 border border-border hover:border-foreground/20"}
        ${dnd ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {isBest && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-accent/15 text-accent rounded flex-shrink-0">
              BEST
            </span>
          )}
          <span className="text-[13px] font-medium text-foreground truncate">
            {sugg.model.name}
          </span>
        </div>
        <ConfidenceBadge score={sugg.score} reasoning={reasoning} size="sm" />
      </div>
      {sugg.model.pixelCount ? (
        <div className="text-[11px] text-foreground/30 mt-0.5">
          {sugg.model.pixelCount}px &middot; {sugg.model.type}
        </div>
      ) : (
        <div className="text-[11px] text-foreground/30 mt-0.5">
          {sugg.model.type}
        </div>
      )}
    </button>
  );
});

// ─── Model Card ─────────────────────────────────────────

const ModelCard = memo(function ModelCard({
  model,
  isAssigned,
  onAccept,
  dnd,
}: {
  model: ParsedModel;
  isAssigned: boolean;
  onAccept: (name: string) => void;
  dnd?: DragAndDropHandlers;
}) {
  const dragItem = useMemo<DragItem>(
    () => ({ sourceModelName: model.name }),
    [model.name],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!dnd) return;
      e.dataTransfer.setData("text/plain", dnd.getDragDataTransfer(dragItem));
      e.dataTransfer.effectAllowed = "move";
      dnd.handleDragStart(dragItem);
    },
    [dnd, dragItem],
  );

  const typeLabel = model.isGroup
    ? model.groupType === "SUBMODEL_GROUP"
      ? "SUB"
      : model.groupType === "META_GROUP"
        ? "META"
        : model.groupType === "MIXED_GROUP"
          ? "MIX"
          : "GRP"
    : model.type.toUpperCase().slice(0, 6);

  return (
    <div
      draggable={!!dnd}
      onDragStart={handleDragStart}
      onDragEnd={dnd?.handleDragEnd}
      onClick={() => onAccept(model.name)}
      className={`
        flex items-center gap-2 rounded-lg min-h-[34px] px-2.5 py-1.5 transition-all duration-150
        border border-border bg-surface hover:border-foreground/20 hover:bg-foreground/[0.02]
        ${dnd ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
        ${isAssigned ? "opacity-50" : ""}
      `}
    >
      {/* Drag handle */}
      {dnd && (
        <span className="text-foreground/15 flex-shrink-0 w-3">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5" />
            <circle cx="15" cy="5" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="19" r="1.5" />
            <circle cx="15" cy="19" r="1.5" />
          </svg>
        </span>
      )}

      {/* Model name */}
      <span className="text-[12px] font-medium truncate flex-1 min-w-0 text-foreground/70">
        {model.name}
      </span>

      {/* Type badge */}
      <span className="text-[9px] px-1 py-0.5 rounded bg-foreground/5 text-foreground/30 flex-shrink-0 uppercase tracking-wide">
        {typeLabel}
      </span>

      {/* Pixel count */}
      {model.pixelCount ? (
        <span className="text-[10px] text-foreground/25 flex-shrink-0 tabular-nums">
          {model.pixelCount}px
        </span>
      ) : null}

      {/* In-use badge */}
      {isAssigned && (
        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold flex-shrink-0">
          IN USE
        </span>
      )}
    </div>
  );
});
