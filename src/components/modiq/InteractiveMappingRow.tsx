"use client";

import { useState, useCallback } from "react";
import type {
  ParsedModel,
  Confidence,
  SubmodelMapping,
  ModelMapping,
} from "@/lib/modiq";
import type { DragItem } from "@/hooks/useDragAndDrop";
import MappingDropdown from "./MappingDropdown";

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
  /** Drag and drop support */
  isDragActive: boolean;
  isDropTarget: boolean;
  onDragEnter: (destModelName: string) => void;
  onDragLeave: (destModelName: string) => void;
  onDrop: (destModelName: string, e: React.DragEvent) => void;
  /** Mobile tap-to-map */
  selectedSourceModel: string | null;
  onTapMap: (destModelName: string) => void;
  /** Best match suggestion for unmapped rows */
  bestMatch?: { name: string; score: number } | null;
}

const CONFIDENCE_STYLES: Record<
  Confidence,
  { bg: string; text: string; label: string; dot: string }
> = {
  high: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    label: "HIGH",
    dot: "bg-green-400",
  },
  medium: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    label: "MED",
    dot: "bg-amber-400",
  },
  low: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    label: "LOW",
    dot: "bg-red-400",
  },
  unmapped: {
    bg: "bg-foreground/5",
    text: "text-foreground/30",
    label: "NONE",
    dot: "bg-foreground/30",
  },
};

export default function InteractiveMappingRow({
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showRemapConfirm, setShowRemapConfirm] = useState<string | null>(null);

  const hasSubmodels = submodelMappings.length > 0;
  const style = CONFIDENCE_STYLES[confidence];
  const isMapped = sourceModel !== null;

  const handleOpenDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(true);
  }, []);

  const handleClearClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClear();
    },
    [onClear],
  );

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

  // Tap-to-map handler (mobile)
  const handleTapMap = useCallback(() => {
    if (selectedSourceModel) {
      onTapMap(destModel.name);
    }
  }, [selectedSourceModel, destModel.name, onTapMap]);

  if (isSkipped) {
    return (
      <div className="px-4 sm:px-6 py-2 flex items-center justify-between opacity-40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-foreground/40 line-through truncate">
            {destModel.name}
          </span>
          <span className="text-[10px] text-foreground/30 italic">skipped</span>
        </div>
        <button
          type="button"
          onClick={() => onAssign("")}
          className="text-[10px] text-accent/60 hover:text-accent px-2 py-0.5 rounded"
          title="Unskip"
        >
          unskip
        </button>
      </div>
    );
  }

  // Unmapped row with drop zone
  if (!isMapped) {
    return (
      <div
        className={`transition-all ${isFocused ? "ring-1 ring-accent/40 ring-inset" : ""}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="px-4 sm:px-6 py-4 space-y-3">
          {/* Model info */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">{destModel.name}</span>
              {!destModel.isGroup && (
                <span className="text-xs text-foreground/40 ml-2">
                  {destModel.type} &middot; {destModel.pixelCount}px
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Drop zone */}
          <div
            onClick={selectedSourceModel ? handleTapMap : handleOpenDropdown}
            className={`relative w-full rounded-lg border-2 border-dashed px-4 py-3 text-center cursor-pointer transition-all ${
              isDropTarget
                ? "border-green-400 bg-green-500/10 shadow-[0_0_12px_rgba(74,222,128,0.15)]"
                : selectedSourceModel
                  ? "border-accent/40 bg-accent/5 hover:border-accent"
                  : "border-foreground/15 hover:border-foreground/30 hover:bg-surface-light"
            }`}
          >
            {isDropTarget ? (
              <span className="text-sm text-green-400 font-medium">
                Release to map
              </span>
            ) : selectedSourceModel ? (
              <span className="text-sm text-accent">
                Tap to map <strong>{selectedSourceModel}</strong> here
              </span>
            ) : (
              <span className="text-sm text-foreground/30">
                Drop a source model here or{" "}
                <span className="text-foreground/50 underline">
                  pick match
                </span>
              </span>
            )}
          </div>

          {/* Best match suggestion */}
          {bestMatch && bestMatch.score > 0 && (
            <div className="flex items-center gap-2 text-xs text-foreground/40">
              <span className="text-amber-400/70">Best match:</span>
              <button
                type="button"
                onClick={() => onAssign(bestMatch.name)}
                className="text-foreground/60 hover:text-foreground hover:underline transition-colors"
              >
                {bestMatch.name}{" "}
                <span className="text-foreground/30">
                  ({(bestMatch.score * 100).toFixed(0)}%)
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="relative px-4 sm:px-6 pb-4">
            <MappingDropdown
              destModel={destModel}
              suggestions={getSuggestions()}
              availableSourceModels={availableSourceModels}
              onSelect={(name) => onAssign(name)}
              onClear={onClear}
              onSkip={onSkip}
              onClose={() => setDropdownOpen(false)}
              hasCurrent={false}
            />
          </div>
        )}
      </div>
    );
  }

  // Mapped row with DnD remap support
  return (
    <div
      className={`${isFocused ? "ring-1 ring-accent/40 ring-inset" : ""} transition-all ${
        isDropTarget ? "bg-amber-500/5 ring-1 ring-amber-400/30 ring-inset" : ""
      }`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Remap confirmation inline */}
      {showRemapConfirm && (
        <div className="px-4 sm:px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-2 text-sm">
          <span className="text-amber-400">
            Replace <strong>{sourceModel.name}</strong> with{" "}
            <strong>{showRemapConfirm}</strong>?
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onAssign(showRemapConfirm);
                setShowRemapConfirm(null);
              }}
              className="text-xs px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-600"
            >
              Yes
            </button>
            <button
              onClick={() => setShowRemapConfirm(null)}
              className="text-xs px-2 py-1 rounded text-foreground/50 hover:text-foreground"
            >
              No
            </button>
          </div>
        </div>
      )}

      <div
        className={`px-4 sm:px-6 py-3 sm:grid sm:grid-cols-[1fr_24px_1fr_28px] sm:gap-2 items-center ${
          hasSubmodels ? "cursor-pointer hover:bg-surface-light" : ""
        }`}
        onClick={hasSubmodels ? () => setIsExpanded(!isExpanded) : undefined}
      >
        {/* User's model (dest) */}
        <div className="mb-1 sm:mb-0 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${style.bg} ${style.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>
            <span className="text-sm font-medium truncate">
              {destModel.name}
            </span>
          </div>
          {!destModel.isGroup && (
            <span className="text-xs text-foreground/40 ml-7">
              {destModel.pixelCount}px &middot; {destModel.type}
            </span>
          )}
        </div>

        {/* Arrow */}
        <div className="hidden sm:flex items-center justify-center text-foreground/20">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </div>

        {/* Mapped source */}
        <div className="relative min-w-0">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">
                {sourceModel.name}
              </span>
              {isManualOverride && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent/60 font-medium flex-shrink-0">
                  manual
                </span>
              )}
            </div>
            {!sourceModel.isGroup && (
              <span className="text-xs text-foreground/40">
                {sourceModel.pixelCount}px &middot; {sourceModel.type}
              </span>
            )}
            {reason && (
              <p className="text-[11px] text-foreground/40 mt-0.5 truncate">
                {reason}
              </p>
            )}
            {hasSubmodels && (
              <span className="text-[11px] text-accent/60 mt-0.5 inline-block">
                {submodelMappings.length} submodels{" "}
                {isExpanded ? "\u25B2" : "\u25BC"}
              </span>
            )}
          </div>

          {/* Dropdown */}
          {dropdownOpen && (
            <MappingDropdown
              destModel={destModel}
              suggestions={getSuggestions()}
              availableSourceModels={availableSourceModels}
              onSelect={(name) => onAssign(name)}
              onClear={onClear}
              onSkip={onSkip}
              onClose={() => setDropdownOpen(false)}
              hasCurrent={true}
            />
          )}
        </div>

        {/* Actions: remap / clear */}
        <div className="hidden sm:flex items-center justify-center">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleOpenDropdown}
              className="p-1 rounded text-foreground/20 hover:text-accent hover:bg-accent/10 transition-colors"
              title="Remap"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleClearClick}
              className="p-1 rounded text-foreground/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Clear mapping"
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
          </div>
        </div>
      </div>

      {/* Expanded submodel view */}
      {isExpanded && hasSubmodels && (
        <div className="px-6 pb-4 bg-background/50 border-t border-border/50">
          <div className="py-2 space-y-1">
            {submodelMappings.map((sub, i) => {
              const subStyle = CONFIDENCE_STYLES[sub.confidence];
              return (
                <div
                  key={i}
                  className="grid grid-cols-[60px_1fr_24px_1fr] gap-2 items-center text-xs py-1"
                >
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${subStyle.bg} ${subStyle.text}`}
                  >
                    <span className={`w-1 h-1 rounded-full ${subStyle.dot}`} />
                    {subStyle.label}
                  </span>
                  <span className="text-foreground/70 truncate">
                    {sub.sourceName}
                  </span>
                  <span className="text-foreground/20 text-center">&rarr;</span>
                  <span className="text-foreground/70">
                    {sub.destName || (
                      <span className="text-foreground/30 italic">
                        unmapped
                      </span>
                    )}
                    <span className="text-foreground/30 ml-1">
                      ({sub.pixelDiff})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
