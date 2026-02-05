"use client";

import { useState, useCallback, useRef, memo } from "react";
import type {
  ParsedModel,
  Confidence,
  SubmodelMapping,
  ModelMapping,
} from "@/lib/modiq";
import PickMatchPopover from "./PickMatchPopover";

interface Suggestion {
  model: ParsedModel;
  score: number;
  confidence: Confidence;
  factors: ModelMapping["factors"];
}

interface InteractiveMappingRowProps {
  destModel: ParsedModel;
  sourceModel: ParsedModel | null;
  confidence: Confidence;
  reason: string;
  submodelMappings: SubmodelMapping[];
  isSkipped: boolean;
  isManualOverride: boolean;
  isFocused: boolean;
  onAssign: (sourceModelName: string) => void;
  onClear: () => void;
  onSkip: () => void;
  getSuggestions: () => Suggestion[];
  availableSourceModels: ParsedModel[];
  isDragActive: boolean;
  isDropTarget: boolean;
  onDragEnter: (destModelName: string) => void;
  onDragLeave: (destModelName: string) => void;
  onDrop: (destModelName: string, e: React.DragEvent) => void;
  selectedSourceModel: string | null;
  onTapMap: (destModelName: string) => void;
  bestMatch?: { name: string; score: number } | null;
}

const CONFIDENCE_DOT: Record<Confidence, string> = {
  high: "bg-green-500",
  medium: "bg-amber-400",
  low: "bg-red-400",
  unmapped: "bg-foreground/30",
};

export default memo(function InteractiveMappingRow({
  destModel,
  sourceModel,
  confidence,
  reason,
  submodelMappings,
  isSkipped,
  isManualOverride,
  isFocused,
  onAssign,
  onClear,
  onSkip,
  getSuggestions,
  availableSourceModels,
  isDragActive,
  isDropTarget,
  onDragEnter,
  onDragLeave,
  onDrop,
  selectedSourceModel,
  onTapMap,
  bestMatch,
}: InteractiveMappingRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const hasSubmodels = submodelMappings.length > 0;
  const isMapped = sourceModel !== null;

  const handleClosePopover = useCallback(() => {
    setPopoverOpen(false);
  }, []);

  // Drag-and-drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isDragActive) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    [isDragActive],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDragEnter(destModel.name);
    },
    [destModel.name, onDragEnter],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (
        relatedTarget &&
        e.currentTarget instanceof HTMLElement &&
        e.currentTarget.contains(relatedTarget)
      ) {
        return;
      }
      onDragLeave(destModel.name);
    },
    [destModel.name, onDragLeave],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDrop(destModel.name, e);
    },
    [destModel.name, onDrop],
  );

  const handleTapMap = useCallback(() => {
    if (selectedSourceModel) {
      onTapMap(destModel.name);
    }
  }, [selectedSourceModel, destModel.name, onTapMap]);

  // ─── Skipped row ───────────────────────────────────
  if (isSkipped) {
    return (
      <div className="px-3 py-1.5 flex items-center justify-between opacity-40">
        <span className="text-[13px] text-foreground/40 line-through truncate">
          {destModel.name}
        </span>
        <button
          type="button"
          onClick={() => onAssign("")}
          className="text-[10px] text-accent/60 hover:text-accent px-2 py-0.5 rounded"
        >
          unskip
        </button>
      </div>
    );
  }

  // ─── Unmapped row — 44px single line ─────────────────
  if (!isMapped) {
    const metaText = destModel.isGroup
      ? "Group"
      : `${destModel.pixelCount}px · ${destModel.type}`;

    return (
      <div
        ref={rowRef}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={
          selectedSourceModel
            ? handleTapMap
            : (e) => {
                const target = e.target as HTMLElement;
                if (target.closest("[data-action]")) return;
                setPopoverOpen(true);
              }
        }
        className={`group relative flex items-center gap-2.5 min-h-[44px] px-3 py-1.5 cursor-pointer border border-transparent rounded transition-all duration-150 ${
          isDropTarget
            ? "border-green-500 bg-green-500/5"
            : isFocused
              ? "border-accent/40 bg-accent/5"
              : selectedSourceModel
                ? "border-accent/30 bg-accent/5 hover:border-accent"
                : "hover:border-foreground/10 hover:bg-surface-light"
        }`}
      >
        {/* Status dot — hollow circle */}
        <span className="w-2 h-2 rounded-full border-[1.5px] border-foreground/30 flex-shrink-0" />

        {/* Model name */}
        <span className="text-[13px] font-semibold text-foreground truncate max-w-[240px]">
          {destModel.name}
        </span>

        {/* Metadata */}
        <span className="text-[11px] text-foreground/30 flex-shrink-0">
          {isDropTarget
            ? "Release to map"
            : selectedSourceModel
              ? `Tap to map`
              : metaText}
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Suggestion pill — green, clickable */}
        {!isDropTarget &&
          !selectedSourceModel &&
          bestMatch &&
          bestMatch.score > 0 && (
            <button
              type="button"
              data-action="suggestion"
              onClick={(e) => {
                e.stopPropagation();
                onAssign(bestMatch.name);
              }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 hover:bg-green-500/[0.18] hover:text-green-300 transition-colors text-[12px] flex-shrink-0 max-w-[240px]"
              title={`Apply best match: ${bestMatch.name}`}
            >
              <span className="truncate">{bestMatch.name}</span>
              <span className="text-green-400/60 text-[11px] flex-shrink-0">
                {(bestMatch.score * 100).toFixed(0)}%
              </span>
            </button>
          )}

        {/* No close matches indicator */}
        {!isDropTarget &&
          !selectedSourceModel &&
          (!bestMatch || bestMatch.score === 0) && (
            <span className="text-[11px] text-foreground/20 flex-shrink-0">
              No close matches
            </span>
          )}

        {/* Pick trigger — appears on hover */}
        <button
          type="button"
          data-action="pick"
          aria-haspopup="listbox"
          onClick={(e) => {
            e.stopPropagation();
            setPopoverOpen(true);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground/20 opacity-0 group-hover:opacity-100 hover:text-foreground/60 hover:bg-foreground/5 transition-all flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Popover */}
        {popoverOpen && (
          <PickMatchPopover
            anchorRef={rowRef}
            suggestions={getSuggestions()}
            availableSourceModels={availableSourceModels}
            onSelect={(name) => onAssign(name)}
            onSkip={onSkip}
            onClose={handleClosePopover}
          />
        )}
      </div>
    );
  }

  // ─── Mapped row — 44px ─────────────────────────────
  return (
    <div
      ref={rowRef}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${isFocused ? "ring-1 ring-accent/40 ring-inset" : ""} ${isDropTarget ? "bg-amber-500/5 ring-1 ring-amber-400/30 ring-inset" : ""}`}
    >
      <div
        className={`group flex items-center gap-2 min-h-[44px] px-3 py-1.5 rounded transition-all duration-150 ${
          hasSubmodels ? "cursor-pointer hover:bg-surface-light" : ""
        }`}
        onClick={(e) => {
          // Click row to open popover (remap), or toggle submodels
          const target = e.target as HTMLElement;
          if (target.closest("[data-action]")) return;
          if (hasSubmodels) {
            setIsExpanded(!isExpanded);
          } else {
            setPopoverOpen(true);
          }
        }}
      >
        {/* Confidence dot — filled */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${CONFIDENCE_DOT[confidence]}`}
        />

        {/* Dest name */}
        <span className="text-[13px] font-medium text-foreground truncate">
          {destModel.name}
        </span>

        {/* Arrow */}
        <span className="text-foreground/20 text-[11px] flex-shrink-0">
          &rarr;
        </span>

        {/* Source name */}
        <span className="text-[13px] text-foreground/50 truncate">
          {sourceModel.name}
        </span>

        {/* Manual tag */}
        {isManualOverride && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent/60 font-medium flex-shrink-0">
            manual
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Pixel comparison + type (compact) */}
        {!destModel.isGroup && (
          <span className="text-[10px] text-foreground/25 tabular-nums flex-shrink-0 font-mono">
            {destModel.pixelCount}&rarr;{sourceModel.pixelCount}px
          </span>
        )}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/30 uppercase tracking-wide flex-shrink-0">
          {destModel.isGroup ? "GRP" : destModel.type}
        </span>

        {/* Submodel indicator */}
        {hasSubmodels && (
          <span className="text-[10px] text-accent/50 flex-shrink-0">
            {submodelMappings.length} sub
          </span>
        )}

        {/* Clear button — hover only */}
        <button
          type="button"
          data-action="clear"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="w-6 h-6 flex items-center justify-center rounded text-foreground/20 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
          title="Clear mapping"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Popover for remap */}
      {popoverOpen && (
        <PickMatchPopover
          anchorRef={rowRef}
          suggestions={getSuggestions()}
          availableSourceModels={availableSourceModels}
          onSelect={(name) => onAssign(name)}
          onSkip={onSkip}
          onClose={handleClosePopover}
        />
      )}

      {/* Expanded submodel view */}
      {isExpanded && hasSubmodels && (
        <div className="border-t border-border/50">
          {submodelMappings.map((sub, i) => (
            <div
              key={i}
              className="flex items-center gap-2 pl-10 pr-3 h-8 text-[12px] text-foreground/40 border-b border-foreground/5 last:border-b-0"
            >
              <span className="flex-1 truncate">
                {sub.sourceName} ({sub.pixelDiff})
              </span>
              <span className="text-foreground/20">&rarr;</span>
              <span className="flex-1 truncate">
                {sub.destName || (
                  <span className="italic text-foreground/20">unmapped</span>
                )}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CONFIDENCE_DOT[sub.confidence]}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
