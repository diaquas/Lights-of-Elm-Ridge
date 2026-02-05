"use client";

import { useState, useCallback, useRef, memo, useMemo } from "react";
import type { ParsedModel, ModelMapping, Confidence } from "@/lib/modiq";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

interface Suggestion {
  model: ParsedModel;
  score: number;
  confidence: Confidence;
  factors: ModelMapping["factors"];
}

interface SourceLayerRowProps {
  layer: SourceLayerMapping;
  isFocused: boolean;
  onFocus: () => void;
  onDrop: (sourceLayerName: string, e: React.DragEvent) => void;
  onAcceptSuggestion: (sourceLayerName: string, userModelName: string) => void;
  onSkip: () => void;
  onClear: () => void;
  getSuggestions: () => Suggestion[];
  isDragActive: boolean;
  onDragEnter: (destModelName: string) => void;
  onDragLeave: (destModelName: string) => void;
}

export default memo(function SourceLayerRow({
  layer,
  isFocused,
  onFocus,
  onDrop,
  onAcceptSuggestion,
  onSkip,
  onClear,
  getSuggestions,
  isDragActive,
  onDragEnter,
  onDragLeave,
}: SourceLayerRowProps) {
  const [isDropOver, setIsDropOver] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const name = layer.sourceModel.name;

  // Lazily compute best suggestion only when focused or on first render
  const bestSuggestion = useMemo(() => {
    if (layer.isMapped) return null;
    const suggestions = getSuggestions();
    return suggestions.length > 0 ? suggestions[0] : null;
  }, [layer.isMapped, getSuggestions]);

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
      setIsDropOver(true);
      onDragEnter(name);
    },
    [name, onDragEnter],
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
      setIsDropOver(false);
      onDragLeave(name);
    },
    [name, onDragLeave],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDropOver(false);
      onDrop(name, e);
    },
    [name, onDrop],
  );

  const handleAcceptBest = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (bestSuggestion) {
        onAcceptSuggestion(name, bestSuggestion.model.name);
      }
    },
    [name, bestSuggestion, onAcceptSuggestion],
  );

  const handleSkip = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSkip();
    },
    [onSkip],
  );

  const scenarioLabel =
    layer.scenario === "A"
      ? "Group-only"
      : layer.scenario === "B"
        ? "Group + Individual"
        : null;

  const metaText = layer.isGroup
    ? `${layer.memberNames.length} members`
    : `${layer.sourceModel.pixelCount}px · ${layer.sourceModel.type}`;

  // ─── Mapped state (shown in MAPPED section, but also inline if mapped) ───
  if (layer.isMapped && layer.assignedUserModel) {
    return (
      <div
        ref={rowRef}
        id={`source-layer-${name}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative flex items-center gap-2 min-h-[44px] px-3 py-1.5 transition-all duration-150 ${
          isDropOver
            ? "bg-amber-500/5 ring-1 ring-amber-400/30 ring-inset"
            : isFocused
              ? "bg-accent/5"
              : ""
        }`}
      >
        <svg
          className="w-4 h-4 text-green-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {layer.isGroup && (
              <span className="text-[9px] font-bold text-teal-400/70 bg-teal-500/10 px-1 py-0.5 rounded">
                GRP
              </span>
            )}
            <span className="text-[13px] text-foreground truncate">
              {name}
            </span>
          </div>
          <div className="text-[11px] text-foreground/40 truncate">
            &rarr; Your &quot;{layer.assignedUserModel.name}&quot;
            {layer.coveredChildCount > 0 && (
              <span className="text-teal-400/60 ml-1">
                ({layer.coveredChildCount} resolved)
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="w-6 h-6 flex items-center justify-center rounded text-foreground/20 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
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
    );
  }

  // ─── Unmapped state (primary interactive row) ──────────────
  return (
    <div
      ref={rowRef}
      id={`source-layer-${name}`}
      onClick={onFocus}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative flex items-center gap-2 min-h-[44px] px-3 py-1.5 cursor-pointer border border-transparent rounded transition-all duration-150 ${
        isDropOver
          ? "border-green-500 bg-green-500/5"
          : isFocused
            ? "border-accent/40 bg-accent/5"
            : "hover:border-foreground/10 hover:bg-surface-light"
      }`}
    >
      {/* Status dot — hollow circle for unmapped */}
      <span className="w-2 h-2 rounded-full border-[1.5px] border-foreground/30 flex-shrink-0" />

      {/* Source layer name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {layer.isGroup && (
            <span className="text-[9px] font-bold text-teal-400/70 bg-teal-500/10 px-1 py-0.5 rounded">
              GRP
            </span>
          )}
          <span className="text-[13px] font-semibold text-foreground truncate">
            {name}
          </span>
        </div>

        {/* Meta line: type/pixels + scenario */}
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/30">
          {isDropOver ? (
            <span className="text-green-400">Release to assign</span>
          ) : (
            <>
              <span>{metaText}</span>
              {scenarioLabel && (
                <>
                  <span className="text-foreground/15">&middot;</span>
                  <span className="text-foreground/20">{scenarioLabel}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Best match suggestion pill */}
      {!isDropOver && bestSuggestion && bestSuggestion.score > 0 && (
        <button
          type="button"
          data-action="suggestion"
          onClick={handleAcceptBest}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 hover:bg-green-500/[0.18] hover:text-green-300 transition-colors text-[12px] flex-shrink-0 max-w-[200px]"
          title={`Apply best match: ${bestSuggestion.model.name}`}
        >
          <span className="truncate">{bestSuggestion.model.name}</span>
          <span className="text-green-400/60 text-[11px] flex-shrink-0">
            {(bestSuggestion.score * 100).toFixed(0)}%
          </span>
        </button>
      )}

      {/* No close matches */}
      {!isDropOver && (!bestSuggestion || bestSuggestion.score === 0) && (
        <span className="text-[11px] text-foreground/20 flex-shrink-0">
          No close matches
        </span>
      )}

      {/* Skip button — appears on hover */}
      <button
        type="button"
        data-action="skip"
        onClick={handleSkip}
        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground/20 opacity-0 group-hover:opacity-100 hover:text-foreground/60 hover:bg-foreground/5 transition-all flex-shrink-0"
        title="Skip this layer"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 4h4l10 8-10 8H5l10-8z" />
        </svg>
      </button>
    </div>
  );
});
