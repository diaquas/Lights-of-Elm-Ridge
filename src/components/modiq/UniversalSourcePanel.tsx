"use client";

import { useState, useMemo, useCallback, memo } from "react";
import type { ParsedModel } from "@/lib/modiq";
import type { DragItem, DragAndDropHandlers } from "@/hooks/useDragAndDrop";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { UsageBadge } from "./UsageBadge";
import { generateMatchReasoning } from "@/lib/modiq/generateReasoning";
import { extractFamily } from "@/contexts/MappingPhaseContext";
import { PANEL_STYLES } from "./panelStyles";

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
    structure: number;
  };
}

interface ModelFamily {
  prefix: string;
  models: ParsedModel[];
  inUseCount: number;
  type: string;
  pixelCount: number;
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
  /** Label for the current destination being mapped (source item name on left panel) */
  selectedDestLabel?: string;
  /** Pixel count for the source model being mapped (for tooltip comparison) */
  sourcePixelCount?: number;
  /** Called when user clicks a model to accept it */
  onAccept: (userModelName: string) => void;
  /** Drag-and-drop handlers (optional — enables drag support) */
  dnd?: DragAndDropHandlers;
  /** Reverse mapping: dest model name → set of source layer names mapped to it */
  destToSourcesMap?: Map<string, Set<string>>;
  /** Remove a specific source→dest link (for inline de-map from tooltip) */
  onRemoveLink?: (sourceName: string, destName: string) => void;
  /** Effect counts per source model name (for usage tooltip display) */
  sourceEffectCounts?: Map<string, number>;
}

// ─── Component ──────────────────────────────────────────

export function UniversalSourcePanel({
  allModels,
  suggestions = [],
  sourceFilter,
  assignedNames,
  selectedDestLabel,
  sourcePixelCount,
  onAccept,
  dnd,
  destToSourcesMap,
  onRemoveLink,
  sourceEffectCounts,
}: UniversalSourcePanelProps) {
  const [search, setSearch] = useState("");
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [hiddenFamilies, setHiddenFamilies] = useState<Set<string>>(new Set());

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

  // Group models by family for collapsed display
  const modelFamilies = useMemo(() => {
    const modelsToGroup = search
      ? filteredModels // When searching, show individual matches (bypass grouping)
      : filteredModels.filter((m) => !suggestionNames.has(m.name));

    const familyMap = new Map<string, ParsedModel[]>();
    for (const model of modelsToGroup) {
      const prefix = extractFamily(model.name);
      const existing = familyMap.get(prefix);
      if (existing) existing.push(model);
      else familyMap.set(prefix, [model]);
    }

    const families: ModelFamily[] = [];
    for (const [prefix, models] of familyMap) {
      const inUseCount = models.filter((m) => assignedNames?.has(m.name)).length;
      families.push({
        prefix,
        models,
        inUseCount,
        type: models[0].type,
        pixelCount: models[0].pixelCount,
      });
    }
    return families;
  }, [filteredModels, search, suggestionNames, assignedNames]);

  const toggleFamily = useCallback((prefix: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }, []);

  const hideFamily = useCallback((prefix: string) => {
    setHiddenFamilies((prev) => new Set([...prev, prefix]));
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      next.delete(prefix);
      return next;
    });
  }, []);

  const hiddenCount = useMemo(() => {
    let count = 0;
    for (const f of modelFamilies) {
      if (hiddenFamilies.has(f.prefix)) count += f.models.length;
    }
    return count;
  }, [modelFamilies, hiddenFamilies]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search — aligned with left panel search row */}
      <div className={PANEL_STYLES.search.wrapper}>
        <div className="relative">
          <svg
            className={PANEL_STYLES.search.icon}
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
                  sourcePixelCount={sourcePixelCount}
                  onAccept={onAccept}
                  dnd={dnd}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Models section — grouped by family */}
        <div className="px-6 py-3">
          <div className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wide mb-2">
            All Models ({filteredModels.length}{hiddenCount > 0 ? `, ${hiddenCount} hidden` : ""})
          </div>
          {modelFamilies.length === 0 ? (
            <div className="text-center py-8 text-foreground/30">
              <p className="text-sm">
                {search
                  ? <>No models matching &ldquo;{search}&rdquo;</>
                  : "No models available"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {modelFamilies.map((family) => {
                // Hidden families — skip entirely
                if (!search && hiddenFamilies.has(family.prefix)) return null;

                // Single item or searching — render flat
                if (family.models.length === 1 || search) {
                  return family.models.map((model) => (
                    <ModelCard
                      key={model.name}
                      model={model}
                      isAssigned={assignedNames?.has(model.name) ?? false}
                      onAccept={onAccept}
                      dnd={dnd}
                      destToSourcesMap={destToSourcesMap}
                      onRemoveLink={onRemoveLink}
                      sourceEffectCounts={sourceEffectCounts}
                      currentSourceSelection={selectedDestLabel}
                    />
                  ));
                }

                // Multi-item family — collapsible group
                const isExpanded = expandedFamilies.has(family.prefix);
                return (
                  <div key={family.prefix}>
                    <FamilyRow
                      family={family}
                      isExpanded={isExpanded}
                      onToggle={() => toggleFamily(family.prefix)}
                      onHide={() => hideFamily(family.prefix)}
                    />
                    {isExpanded && (
                      <div className="space-y-0.5 pl-3 pb-1 ml-1 border-l border-border/30">
                        {family.models.map((model) => (
                          <ModelCard
                            key={model.name}
                            model={model}
                            isAssigned={assignedNames?.has(model.name) ?? false}
                            onAccept={onAccept}
                            dnd={dnd}
                            destToSourcesMap={destToSourcesMap}
                            onRemoveLink={onRemoveLink}
                            sourceEffectCounts={sourceEffectCounts}
                            currentSourceSelection={selectedDestLabel}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Show hidden families restore link */}
          {hiddenFamilies.size > 0 && !search && (
            <button
              type="button"
              onClick={() => setHiddenFamilies(new Set())}
              className="mt-3 text-[10px] text-foreground/25 hover:text-foreground/50 transition-colors"
            >
              Show {hiddenFamilies.size} hidden group{hiddenFamilies.size > 1 ? "s" : ""} ({hiddenCount} models)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Family Row (collapsed group header) ─────────────────

function FamilyRow({
  family,
  isExpanded,
  onToggle,
  onHide,
}: {
  family: ModelFamily;
  isExpanded: boolean;
  onToggle: () => void;
  onHide: () => void;
}) {
  return (
    <div
      className={`
        flex items-center gap-1.5 rounded-lg min-h-[34px] px-2.5 py-1.5 transition-all duration-150
        border bg-surface hover:border-foreground/20
        ${isExpanded ? "border-foreground/15 bg-foreground/[0.02]" : "border-border"}
      `}
    >
      {/* Expand/collapse toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
      >
        <svg
          className={`w-3 h-3 text-foreground/30 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        <span className="text-[12px] font-medium truncate text-foreground/70">
          {family.prefix}
        </span>

        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-foreground/8 text-foreground/40 font-semibold flex-shrink-0 tabular-nums">
          {family.models.length}
        </span>
      </button>

      {/* Type badge */}
      <span className="text-[9px] px-1 py-0.5 rounded bg-foreground/5 text-foreground/30 flex-shrink-0 uppercase tracking-wide">
        {family.type.toUpperCase().slice(0, 6)}
      </span>

      {/* Pixel count */}
      {family.pixelCount > 0 && (
        <span className="text-[10px] text-foreground/20 flex-shrink-0 tabular-nums">
          {family.pixelCount}px
        </span>
      )}

      {/* In-use count badge */}
      {family.inUseCount > 0 && (
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 tabular-nums border ${
          family.inUseCount >= 2
            ? "bg-red-500/10 text-red-400/70 border-red-500/20"
            : "bg-amber-500/10 text-amber-400/70 border-amber-500/20"
        }`}>
          {family.inUseCount}
        </span>
      )}

      {/* Hide/dismiss button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onHide();
        }}
        className="p-0.5 rounded text-foreground/15 hover:text-foreground/40 transition-colors flex-shrink-0"
        title={`Hide ${family.prefix} family`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Suggestion Card ────────────────────────────────────

const SuggestionCard = memo(function SuggestionCard({
  sugg,
  isBest,
  sourcePixelCount,
  onAccept,
  dnd,
}: {
  sugg: SuggestionItem;
  isBest: boolean;
  sourcePixelCount?: number;
  onAccept: (name: string) => void;
  dnd?: DragAndDropHandlers;
}) {
  const reasoning = useMemo(
    () =>
      generateMatchReasoning(
        sugg.factors,
        sugg.score,
        sourcePixelCount && sugg.model.pixelCount
          ? { source: sourcePixelCount, dest: sugg.model.pixelCount }
          : undefined,
      ),
    [sugg.factors, sugg.score, sourcePixelCount, sugg.model.pixelCount],
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

  const memberCount = sugg.model.memberModels?.length ?? 0;

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
      <div className="flex items-center gap-2 text-[11px] text-foreground/30 mt-0.5">
        {sugg.model.pixelCount ? (
          <span>{sugg.model.pixelCount}px</span>
        ) : null}
        <span>{sugg.model.type}</span>
        {memberCount > 0 && (
          <>
            <span className="text-foreground/15">&middot;</span>
            <span>{memberCount} members</span>
          </>
        )}
      </div>
    </button>
  );
});

// ─── Model Card ─────────────────────────────────────────

const ModelCard = memo(function ModelCard({
  model,
  isAssigned,
  onAccept,
  dnd,
  destToSourcesMap,
  onRemoveLink,
  sourceEffectCounts,
  currentSourceSelection,
}: {
  model: ParsedModel;
  isAssigned: boolean;
  onAccept: (name: string) => void;
  dnd?: DragAndDropHandlers;
  destToSourcesMap?: Map<string, Set<string>>;
  onRemoveLink?: (sourceName: string, destName: string) => void;
  sourceEffectCounts?: Map<string, number>;
  currentSourceSelection?: string;
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

  const memberCount = model.memberModels?.length ?? 0;

  // Usage data for this model
  const mappedSources = destToSourcesMap?.get(model.name);
  const usageCount = mappedSources?.size ?? 0;
  const mappedSourceNames = useMemo(
    () => (mappedSources ? Array.from(mappedSources) : []),
    [mappedSources],
  );

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

      {/* Member count for groups */}
      {memberCount > 0 && (
        <span className="text-[10px] text-foreground/25 flex-shrink-0">
          {memberCount}m
        </span>
      )}

      {/* Type badge — with hierarchy icon for SUB */}
      <span className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 uppercase tracking-wide ${
        typeLabel === "SUB"
          ? "bg-purple-500/10 text-purple-400"
          : typeLabel === "GRP"
            ? "bg-blue-500/10 text-blue-400"
            : "bg-foreground/5 text-foreground/30"
      }`}>
        {typeLabel === "SUB" && (
          <svg className="w-2 h-2 inline-block mr-0.5 -mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" d="M9 3v12m0 0H5m4 0h4" />
          </svg>
        )}
        {typeLabel}
      </span>

      {/* Pixel count */}
      {model.pixelCount ? (
        <span className="text-[10px] text-foreground/25 flex-shrink-0 tabular-nums">
          {model.pixelCount}px
        </span>
      ) : null}

      {/* Usage badge with tooltip (replaces old "IN USE" text) */}
      {usageCount > 0 ? (
        <UsageBadge
          count={usageCount}
          mappedSourceNames={mappedSourceNames}
          sourceEffectCounts={sourceEffectCounts}
          currentSourceSelection={currentSourceSelection}
          onRemoveLink={onRemoveLink ? (sourceName) => onRemoveLink(sourceName, model.name) : undefined}
          onAccept={() => onAccept(model.name)}
        />
      ) : null}
    </div>
  );
});
