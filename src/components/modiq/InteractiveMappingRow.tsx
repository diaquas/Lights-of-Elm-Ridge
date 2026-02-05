"use client";

import { useState, useCallback, memo } from "react";
import type {
  ParsedModel,
  Confidence,
  SubmodelMapping,
  ModelMapping,
} from "@/lib/modiq";
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

const CONFIDENCE_DOT: Record<Confidence, string> = {
  high: "bg-green-500",
  medium: "bg-amber-400",
  low: "bg-red-400",
  unmapped: "bg-foreground/30",
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
  unmapped: "NONE",
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showRemapConfirm, setShowRemapConfirm] = useState<string | null>(null);

  const hasSubmodels = submodelMappings.length > 0;
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

  // ─── Unmapped row — compact 56px, entire row is drop target ───
  if (!isMapped) {
    const metaText = destModel.isGroup
      ? "Group"
      : `${destModel.type} \u00B7 ${destModel.pixelCount}px`;

    return (
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={selectedSourceModel ? handleTapMap : handleOpenDropdown}
        className={`grid grid-cols-[20px_1fr_auto_auto] items-center gap-x-2 px-3 py-2.5 min-h-[56px] border border-dashed rounded-md cursor-pointer transition-[border-color,background] duration-150 ${
          isDropTarget
            ? "border-green-500 bg-green-500/5"
            : isFocused
              ? "border-accent/40 bg-accent/5"
              : selectedSourceModel
                ? "border-accent/30 bg-accent/5 hover:border-accent"
                : "border-foreground/15 hover:border-foreground/30 hover:bg-surface-light"
        }`}
      >
        {/* Col 1: status dot */}
        <span className="w-2 h-2 rounded-full bg-foreground/20 flex-shrink-0" />

        {/* Col 2: model name + meta */}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-foreground truncate">
            {destModel.name}
          </div>
          <div className="text-[11px] text-foreground/40 truncate">
            {isDropTarget
              ? "Release to map"
              : selectedSourceModel
                ? `Tap to map ${selectedSourceModel}`
                : metaText}
          </div>
        </div>

        {/* Col 3: best match inline */}
        {bestMatch && bestMatch.score > 0 && !isDropTarget && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAssign(bestMatch.name);
            }}
            className="text-[11px] text-amber-400/70 hover:text-amber-400 truncate max-w-[180px] flex-shrink-0 transition-colors"
            title={`Apply best match: ${bestMatch.name}`}
          >
            <span className="mr-1">&#x1F4A1;</span>
            {bestMatch.name} {(bestMatch.score * 100).toFixed(0)}%
          </button>
        )}

        {/* Col 4: pick + skip buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleOpenDropdown}
            className="text-[12px] px-2 py-0.5 rounded bg-foreground/5 text-foreground/40 border border-foreground/10 hover:text-foreground/70 hover:bg-foreground/10 transition-colors"
          >
            &#9662;
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="text-[11px] text-foreground/20 hover:text-foreground/50 px-1.5 py-0.5 transition-colors"
          >
            &#8856;
          </button>
        </div>

        {/* Dropdown (spans full width below grid) */}
        {dropdownOpen && (
          <div className="col-span-full mt-2">
            <div className="relative">
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
          </div>
        )}
      </div>
    );
  }

  // ─── Mapped row — compact 48px ─────────────────────
  return (
    <div
      className={`transition-[border-color] duration-150 ${
        isFocused ? "ring-1 ring-accent/40 ring-inset" : ""
      } ${isDropTarget ? "bg-amber-500/5 ring-1 ring-amber-400/30 ring-inset" : ""}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Remap confirmation inline */}
      {showRemapConfirm && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-2 text-[13px]">
          <span className="text-amber-400 truncate">
            Replace <strong>{sourceModel.name}</strong> with{" "}
            <strong>{showRemapConfirm}</strong>?
          </span>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => {
                onAssign(showRemapConfirm);
                setShowRemapConfirm(null);
              }}
              className="text-xs px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600"
            >
              Yes
            </button>
            <button
              onClick={() => setShowRemapConfirm(null)}
              className="text-xs px-2 py-0.5 rounded text-foreground/50 hover:text-foreground"
            >
              No
            </button>
          </div>
        </div>
      )}

      <div
        className={`group grid grid-cols-[20px_1fr_auto_auto_auto] items-center gap-x-1.5 px-3 py-2 min-h-[48px] rounded ${
          hasSubmodels ? "cursor-pointer hover:bg-surface-light" : ""
        }`}
        onClick={hasSubmodels ? () => setIsExpanded(!isExpanded) : undefined}
      >
        {/* Col 1: confidence dot */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${CONFIDENCE_DOT[confidence]}`}
        />

        {/* Col 2: mapping pair + meta */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="font-medium truncate">{destModel.name}</span>
            <span className="text-foreground/20 text-[11px] flex-shrink-0">&rarr;</span>
            <span className="font-medium truncate">{sourceModel.name}</span>
            {isManualOverride && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent/60 font-medium flex-shrink-0">
                manual
              </span>
            )}
          </div>
          <div className="text-[11px] text-foreground/40 flex items-center gap-1.5">
            {!destModel.isGroup && (
              <span className="tabular-nums">
                {destModel.pixelCount}&rarr;{sourceModel.pixelCount}px
              </span>
            )}
            <span>{destModel.isGroup ? "Group" : destModel.type}</span>
            {hasSubmodels && (
              <span className="text-accent/60">
                &#9656; {submodelMappings.length} sub
              </span>
            )}
            {reason && !hasSubmodels && (
              <span className="truncate">{reason}</span>
            )}
          </div>
        </div>

        {/* Col 3: confidence label */}
        <span
          className={`text-[10px] font-bold tracking-wider flex-shrink-0 ${
            confidence === "high"
              ? "text-green-400"
              : confidence === "medium"
                ? "text-amber-400"
                : "text-red-400"
          }`}
        >
          {CONFIDENCE_LABEL[confidence]}
        </span>

        {/* Col 4+5: action buttons — visible on hover */}
        <button
          type="button"
          onClick={handleOpenDropdown}
          className="w-6 h-6 flex items-center justify-center rounded text-foreground/20 opacity-0 group-hover:opacity-100 hover:text-accent hover:bg-accent/10 transition-all"
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
          className="w-6 h-6 flex items-center justify-center rounded text-foreground/20 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
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

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="col-span-full relative mt-1">
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
          </div>
        )}
      </div>

      {/* Expanded submodel view — compact 32px per row */}
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
