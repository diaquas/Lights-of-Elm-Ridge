"use client";

import { useState, useCallback, useRef, memo, useMemo } from "react";
import type { ParsedModel, ModelMapping, Confidence } from "@/lib/modiq";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";
import type { EffectSuggestionContext } from "@/lib/modiq/effect-analysis";
import EffectContextBadge from "./EffectContextBadge";

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
  onRemoveLink: (sourceName: string, destName: string) => void;
  getSuggestions: () => Suggestion[];
  isDragActive: boolean;
  /** Currently dragged model name (for drop preview text) */
  draggedModelName?: string;
  onDragEnter: (destModelName: string) => void;
  onDragLeave: (destModelName: string) => void;
  /** Effect context for this source model (Ticket 44) */
  effectContext?: EffectSuggestionContext | null;
}

/** Teal destination count indicator badge */
function DestCountBadge({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-[9px] px-[5px] text-[11px] font-semibold tabular-nums flex-shrink-0 transition-all ${
        count <= 3
          ? "bg-teal-500/[0.08] text-teal-300 border border-teal-500/15"
          : "bg-teal-500/[0.12] text-teal-300 border border-teal-500/20"
      }`}
    >
      {count}
    </span>
  );
}

/** Effect count badge with color-coding by magnitude */
function EffectCountBadge({ count }: { count: number }) {
  if (count === 0) return null;

  // Color-code by magnitude: 100+ bright orange, 10-99 yellow, 1-9 dim gray
  const colorClass = count >= 100
    ? "text-orange-400"
    : count >= 10
      ? "text-yellow-500/70"
      : "text-foreground/30";

  return (
    <span
      className={`text-[10px] tabular-nums flex-shrink-0 ${colorClass}`}
      title={`${count} effects in this sequence`}
    >
      {count} fx
    </span>
  );
}

export default memo(function SourceLayerRow({
  layer,
  isFocused,
  onFocus,
  onDrop,
  onAcceptSuggestion,
  onSkip,
  onClear,
  onRemoveLink,
  getSuggestions,
  isDragActive,
  draggedModelName,
  onDragEnter,
  onDragLeave,
  effectContext,
}: SourceLayerRowProps) {
  const [isDropOver, setIsDropOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDropSuccess, setShowDropSuccess] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const name = layer.sourceModel.name;
  const destCount = layer.assignedUserModels.length;

  // Lazily compute best suggestion when unmapped or for "+ Add another"
  const bestSuggestion = useMemo(() => {
    if (layer.isMapped && !isExpanded) return null;
    const suggestions = getSuggestions();
    return suggestions.length > 0 ? suggestions[0] : null;
  }, [layer.isMapped, isExpanded, getSuggestions]);

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
      // Show success flash briefly
      setShowDropSuccess(true);
      setTimeout(() => setShowDropSuccess(false), 400);
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

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded((prev) => !prev);
      onFocus();
    },
    [onFocus],
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

  // ─── Mapped state ───────────────────────────────────────────
  if (layer.isMapped && destCount > 0) {
    const firstDest = layer.assignedUserModels[0];
    const extraCount = destCount - 1;

    return (
      <div
        ref={rowRef}
        id={`source-layer-${name}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group transition-all duration-150 ${
          isDropOver
            ? "bg-amber-500/5 ring-1 ring-amber-400/30 ring-inset"
            : isFocused
              ? "bg-accent/5"
              : ""
        }`}
      >
        {/* Collapsed row */}
        <div
          className="relative flex items-center gap-2 min-h-[44px] px-3 py-1.5 cursor-pointer"
          onClick={handleToggleExpand}
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
              <DestCountBadge count={destCount} />
              <EffectCountBadge count={layer.effectCount} />
              <EffectContextBadge context={effectContext ?? null} mode="inline" />
            </div>
            <div className="text-[11px] text-foreground/40 truncate">
              &rarr; Your &quot;{firstDest.name}&quot;
              {extraCount > 0 && (
                <span className="text-teal-400/60 ml-1">+{extraCount}</span>
              )}
              {layer.coveredChildCount > 0 && (
                <span className="text-teal-400/60 ml-1">
                  ({layer.coveredChildCount} resolved)
                </span>
              )}
            </div>
          </div>

          {/* Expand/collapse chevron */}
          <svg
            className={`w-3.5 h-3.5 text-foreground/30 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Expanded destination list */}
        {isExpanded && (
          <div className="px-3 pb-2 ml-6">
            <div className="text-[11px] text-foreground/40 mb-1.5">
              Mapped to {destCount} of your models:
            </div>
            {layer.assignedUserModels.map((m, i) => (
              <div
                key={m.name}
                className="flex items-center gap-2 py-1 pl-2 border-l-2 border-foreground/10"
              >
                <span className="text-[11px] text-foreground/30 w-4 flex-shrink-0 tabular-nums">
                  {i + 1}.
                </span>
                <span className="text-[12px] text-foreground/70 truncate flex-1">
                  {m.name}
                </span>
                <span className="text-[10px] text-foreground/30 flex-shrink-0">
                  {m.pixelCount}px
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveLink(name, m.name);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded text-foreground/20 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  aria-label={`Remove ${m.name}`}
                  title={`Remove ${m.name}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* + Add another suggestion */}
            {bestSuggestion && bestSuggestion.score > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAcceptSuggestion(name, bestSuggestion.model.name);
                }}
                className="flex items-center gap-1.5 mt-1.5 ml-2 px-2 py-1 rounded text-[11px] text-foreground/40 hover:text-green-400 hover:bg-green-500/5 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
                Add another
                <span className="text-green-400/50 ml-0.5 truncate max-w-[120px]">
                  {bestSuggestion.model.name}
                </span>
              </button>
            )}

            {destCount > 1 && (
              <div className="text-[10px] text-foreground/25 mt-1.5 ml-2 italic">
                Effects from this source will play on all {destCount} models.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Unmapped state (primary interactive row) ──────────────
  // For groups: show expandable cascade preview
  const hasGroupPreview = layer.isGroup && layer.memberNames.length > 0;
  const coveredCount = layer.membersWithoutEffects.length;
  const soloCount = layer.membersWithEffects.length;

  return (
    <div
      ref={rowRef}
      id={`source-layer-${name}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group transition-all duration-150 ${
        showDropSuccess
          ? "bg-green-500/20 ring-2 ring-green-500/50 ring-inset rounded"
          : isDropOver
            ? "bg-green-500/5 ring-1 ring-green-500/30 ring-inset rounded"
            : isFocused
              ? "bg-accent/5"
              : ""
      }`}
    >
      {/* Main row */}
      <div
        onClick={hasGroupPreview ? handleToggleExpand : onFocus}
        className={`relative flex items-center gap-2 min-h-[44px] px-3 py-1.5 cursor-pointer border border-transparent rounded transition-all duration-150 ${
          !isDropOver && !isFocused ? "hover:border-foreground/10 hover:bg-surface-light" : ""
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
            <EffectCountBadge count={layer.effectCount} />
            <EffectContextBadge context={effectContext ?? null} mode="inline" />
            {/* Expand chevron for groups */}
            {hasGroupPreview && (
              <svg
                className={`w-3 h-3 text-foreground/30 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>

          {/* Meta line: type/pixels + scenario */}
          <div className="flex items-center gap-1.5 text-[11px] text-foreground/30">
            {isDropOver ? (
              <span className="text-green-400">
                Drop to map &rarr; {draggedModelName || "your model"}
              </span>
            ) : (
              <>
                <span>{metaText}</span>
                {scenarioLabel && (
                  <>
                    <span className="text-foreground/15">&middot;</span>
                    <span className="text-foreground/20">{scenarioLabel}</span>
                  </>
                )}
                {/* Brief cascade hint for groups */}
                {hasGroupPreview && coveredCount > 0 && !isExpanded && (
                  <>
                    <span className="text-foreground/15">&middot;</span>
                    <span className="text-green-400/60">
                      resolves {coveredCount}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Best match suggestion pill with hover tooltip */}
        {!isDropOver && bestSuggestion && bestSuggestion.score > 0 && (
          <div className="relative flex-shrink-0 max-w-[200px] group/tooltip">
            <button
              type="button"
              data-action="suggestion"
              onClick={handleAcceptBest}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 hover:bg-green-500/[0.18] hover:text-green-300 transition-colors text-[12px]"
            >
              <span className="truncate">{bestSuggestion.model.name}</span>
              <span className="text-green-400/60 text-[11px] flex-shrink-0">
                {(bestSuggestion.score * 100).toFixed(0)}%
              </span>
            </button>
            {/* Match reasoning tooltip */}
            <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover/tooltip:block">
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2.5 text-[11px] w-52 animate-[fadeIn_0.1s_ease-out]">
                <div className="text-foreground/60 font-medium mb-2">Match factors:</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-foreground/40">Name</span>
                    <span className={`tabular-nums ${bestSuggestion.factors.name >= 0.7 ? "text-green-400" : bestSuggestion.factors.name >= 0.3 ? "text-amber-400" : "text-foreground/50"}`}>
                      {(bestSuggestion.factors.name * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/40">Pixels</span>
                    <span className="text-foreground/60 tabular-nums">
                      {layer.sourceModel.pixelCount} vs {bestSuggestion.model.pixelCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/40">Type</span>
                    <span className={`tabular-nums ${bestSuggestion.factors.type >= 0.7 ? "text-green-400" : bestSuggestion.factors.type >= 0.3 ? "text-amber-400" : "text-foreground/50"}`}>
                      {(bestSuggestion.factors.type * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/40">Shape</span>
                    <span className={`tabular-nums ${bestSuggestion.factors.shape >= 0.7 ? "text-green-400" : bestSuggestion.factors.shape >= 0.3 ? "text-amber-400" : "text-foreground/50"}`}>
                      {(bestSuggestion.factors.shape * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-700/50 text-[10px] text-foreground/30">
                  Click to apply this match
                </div>
              </div>
            </div>
          </div>
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
          aria-label="Skip this layer"
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

      {/* Expanded group cascade preview */}
      {hasGroupPreview && isExpanded && (
        <div className="px-3 pb-2.5 ml-6 animate-[slideDown_0.15s_ease-out]">
          <div className="text-[11px] text-foreground/50 mb-1.5">
            Mapping resolves {coveredCount} of {layer.memberNames.length} children:
          </div>

          {/* Children covered by group (no individual effects) */}
          {layer.membersWithoutEffects.map((child) => (
            <div
              key={child}
              className="flex items-center gap-2 py-0.5 text-[12px]"
            >
              <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-foreground/70 truncate">{child}</span>
              <span className="text-foreground/30 text-[10px]">— covered by group</span>
            </div>
          ))}

          {/* Children with individual effects (need own mapping) */}
          {layer.membersWithEffects.map((child) => (
            <div
              key={child}
              className="flex items-center gap-2 py-0.5 text-[12px]"
            >
              <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-foreground/70 truncate">{child}</span>
              <span className="text-amber-400/60 text-[10px]">— has solo effects, needs own mapping</span>
            </div>
          ))}

          {/* Summary */}
          {soloCount > 0 && (
            <div className="text-[10px] text-foreground/25 mt-1.5 italic">
              {soloCount} member{soloCount > 1 ? "s" : ""} with individual effects will still need separate mapping.
            </div>
          )}
        </div>
      )}
    </div>
  );
});
