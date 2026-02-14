"use client";

import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import type { ParsedModel } from "@/lib/modiq";
import type { DragItem, DragAndDropHandlers } from "@/hooks/useDragAndDrop";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { UsageBadge } from "./UsageBadge";
import { generateMatchReasoning } from "@/lib/modiq/generateReasoning";
import { extractFamily } from "@/contexts/MappingPhaseContext";
import { PANEL_STYLES } from "./panelStyles";
import { FilterPill } from "./SharedHierarchyComponents";
import type { SortOption } from "./SortDropdown";

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

/** Hierarchy group definition for right panel display */
interface HierarchyGroup {
  model: ParsedModel;
  members: ParsedModel[];
  isSuperGroup: boolean;
  mappedCount: number;
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
  /** Set of destination model names that have been skipped */
  skippedDestModels?: Set<string>;
  /** Skip a destination model (hide from suggestions + all-models list) */
  onSkipDest?: (destName: string) => void;
  /** Restore a single skipped destination model */
  onUnskipDest?: (destName: string) => void;
  /** Restore all skipped destination models */
  onUnskipAllDest?: () => void;
  /** Exclude these model names from suggestions and all-models lists (already mapped to current source) */
  excludeNames?: Set<string>;
  /** Set of destination model names that are super groups (for SUPER badge) */
  destSuperGroupNames?: Set<string>;
  /** When true, organize models by xLights group hierarchy (super groups → groups → individuals) instead of family prefix */
  hierarchyMode?: boolean;
  /** Current sort option from the left (source) panel — drives default sort for right panel */
  sourceSortBy?: SortOption;
}

// ─── Sort helper for ParsedModel[] ───────────────────────

function sortParsedModels(
  models: ParsedModel[],
  sort: SortOption,
  assignedNames?: Set<string>,
): ParsedModel[] {
  switch (sort) {
    case "name-asc":
      return models.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    case "name-desc":
      return models.sort((a, b) =>
        b.name.localeCompare(a.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    case "effects-desc":
    case "effects-asc":
      // ParsedModel doesn't have effectCount — fall back to name sort
      return models.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    case "pixels-desc":
      return models.sort((a, b) => (b.pixelCount ?? 0) - (a.pixelCount ?? 0));
    case "pixels-asc":
      return models.sort((a, b) => (a.pixelCount ?? 0) - (b.pixelCount ?? 0));
    case "status":
      return models.sort((a, b) => {
        const aM = assignedNames?.has(a.name) ? 1 : 0;
        const bM = assignedNames?.has(b.name) ? 1 : 0;
        if (aM !== bM) return aM - bM;
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
    case "confidence-desc":
    case "confidence-asc":
      // No confidence data on dest side — fall back to name sort
      return models.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    default:
      return models;
  }
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
  skippedDestModels,
  onSkipDest,
  onUnskipDest,
  onUnskipAllDest,
  excludeNames,
  destSuperGroupNames,
  hierarchyMode,
  sourceSortBy,
}: UniversalSourcePanelProps) {
  const [search, setSearch] = useState("");
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(
    new Set(),
  );
  const [expandedHierarchyGroups, setExpandedHierarchyGroups] = useState<
    Set<string>
  >(new Set());
  const [unmappedOpen, setUnmappedOpen] = useState(true);
  const [mappedOpen, setMappedOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "unmapped" | "mapped"
  >("all");

  // Right panel sort: follows left panel by default, breaks link on manual change
  const [destSortOverride, setDestSortOverride] = useState<SortOption | null>(
    null,
  );
  const sortLinked = destSortOverride === null;
  const destSortBy = sortLinked
    ? (sourceSortBy ?? "name-asc")
    : destSortOverride;

  // Available models = filtered + not skipped + not excluded
  const availableModels = useMemo(() => {
    let models = allModels;
    if (sourceFilter) models = models.filter(sourceFilter);
    if (skippedDestModels && skippedDestModels.size > 0) {
      models = models.filter((m) => !skippedDestModels.has(m.name));
    }
    if (excludeNames && excludeNames.size > 0) {
      models = models.filter((m) => !excludeNames.has(m.name));
    }
    return models;
  }, [allModels, sourceFilter, skippedDestModels, excludeNames]);

  // Skipped models list (for the restore section)
  const skippedModels = useMemo(() => {
    if (!skippedDestModels || skippedDestModels.size === 0) return [];
    let models = allModels;
    if (sourceFilter) models = models.filter(sourceFilter);
    return models.filter((m) => skippedDestModels.has(m.name));
  }, [allModels, sourceFilter, skippedDestModels]);

  // Suggestion model names (for deduplication in "all models" list)
  const suggestionNames = useMemo(
    () => new Set(suggestions.map((s) => s.model.name)),
    [suggestions],
  );

  // Filtered suggestions (when searching + exclude already-mapped)
  const filteredSuggestions = useMemo(() => {
    let result = suggestions;
    if (excludeNames && excludeNames.size > 0) {
      result = result.filter((s) => !excludeNames.has(s.model.name));
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (s) =>
        s.model.name.toLowerCase().includes(q) ||
        s.model.type.toLowerCase().includes(q),
    );
  }, [search, suggestions, excludeNames]);

  // Counts for status filter pills
  const allModelCount = availableModels.length;
  const mappedModelCount = useMemo(
    () => availableModels.filter((m) => assignedNames?.has(m.name)).length,
    [availableModels, assignedNames],
  );
  const unmappedModelCount = allModelCount - mappedModelCount;

  // Filtered all-models list (search + status filter + sort)
  const filteredModels = useMemo(() => {
    let models = availableModels;
    if (statusFilter === "unmapped")
      models = models.filter((m) => !assignedNames?.has(m.name));
    else if (statusFilter === "mapped")
      models = models.filter((m) => assignedNames?.has(m.name));
    if (search) {
      const q = search.toLowerCase();
      models = models.filter(
        (m) =>
          m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q),
      );
    }
    // Apply dest sort
    return sortParsedModels([...models], destSortBy, assignedNames);
  }, [search, availableModels, statusFilter, assignedNames, destSortBy]);

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
      const inUseCount = models.filter((m) =>
        assignedNames?.has(m.name),
      ).length;
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

  // Split families into unmapped / mapped, sorted A→Z
  const { unmappedFamilies, mappedFamilies } = useMemo(() => {
    const unmapped: ModelFamily[] = [];
    const mapped: ModelFamily[] = [];
    for (const family of modelFamilies) {
      const allAssigned =
        assignedNames != null &&
        assignedNames.size > 0 &&
        family.models.every((m) => assignedNames.has(m.name));
      if (allAssigned) mapped.push(family);
      else unmapped.push(family);
    }
    const sortFn = (a: ModelFamily, b: ModelFamily) =>
      a.prefix.localeCompare(b.prefix);
    unmapped.sort(sortFn);
    mapped.sort(sortFn);
    return { unmappedFamilies: unmapped, mappedFamilies: mapped };
  }, [modelFamilies, assignedNames]);

  const toggleFamily = useCallback((prefix: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }, []);

  const skipFamily = useCallback(
    (familyModels: ParsedModel[]) => {
      if (!onSkipDest) return;
      for (const m of familyModels) onSkipDest(m.name);
    },
    [onSkipDest],
  );

  // ── Hierarchy-aware grouping (when hierarchyMode=true) ──
  const hierarchyData = useMemo(() => {
    if (!hierarchyMode) return null;

    const modelsToOrganize = search
      ? filteredModels
      : filteredModels.filter((m) => !suggestionNames.has(m.name));

    const modelsByName = new Map<string, ParsedModel>();
    for (const m of modelsToOrganize) modelsByName.set(m.name, m);

    // Build group membership: member name → parent group name
    const memberToGroup = new Map<string, string>();
    const groupModels: ParsedModel[] = [];
    for (const m of modelsToOrganize) {
      if (m.isGroup && m.groupType !== "SUBMODEL_GROUP") {
        groupModels.push(m);
        if (m.memberModels) {
          for (const member of m.memberModels) {
            // Prefer smallest group (most specific parent)
            const existing = memberToGroup.get(member);
            if (!existing) {
              memberToGroup.set(member, m.name);
            } else {
              const existingModel = modelsByName.get(existing);
              if (
                existingModel &&
                m.memberModels &&
                existingModel.memberModels &&
                m.memberModels.length < existingModel.memberModels.length
              ) {
                memberToGroup.set(member, m.name);
              }
            }
          }
        }
      }
    }

    // Build hierarchy groups
    const groups: HierarchyGroup[] = [];
    const groupedMemberNames = new Set<string>();

    for (const gm of groupModels) {
      const members = (gm.memberModels ?? [])
        .map((name) => modelsByName.get(name))
        .filter((m): m is ParsedModel => m != null && !m.isGroup);

      for (const m of members) groupedMemberNames.add(m.name);

      const mappedCount = members.filter((m) =>
        assignedNames?.has(m.name),
      ).length;
      groups.push({
        model: gm,
        members,
        isSuperGroup: destSuperGroupNames?.has(gm.name) ?? false,
        mappedCount,
      });
    }

    // Ungrouped individuals
    const ungrouped = modelsToOrganize.filter(
      (m) => !m.isGroup && !groupedMemberNames.has(m.name),
    );

    // Separate super groups from regular groups
    const superGroups = groups.filter((g) => g.isSuperGroup);
    const regularGroups = groups.filter((g) => !g.isSuperGroup);

    // Sort: unmapped first, then alphabetical
    const sortGroups = (a: HierarchyGroup, b: HierarchyGroup) => {
      const aAll = a.mappedCount >= a.members.length;
      const bAll = b.mappedCount >= b.members.length;
      if (aAll !== bAll) return aAll ? 1 : -1;
      return a.model.name.localeCompare(b.model.name);
    };
    superGroups.sort(sortGroups);
    regularGroups.sort(sortGroups);

    return { superGroups, regularGroups, ungrouped };
  }, [
    hierarchyMode,
    filteredModels,
    search,
    suggestionNames,
    assignedNames,
    destSuperGroupNames,
  ]);

  const toggleHierarchyGroup = useCallback((name: string) => {
    setExpandedHierarchyGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Shared renderer for a family (used in both unmapped + mapped sections)
  const renderFamily = (family: ModelFamily) => {
    // Single item or searching — render flat
    if (family.models.length === 1 || search) {
      return family.models.map((model) => (
        <ModelCard
          key={model.name}
          model={model}
          isAssigned={assignedNames?.has(model.name) ?? false}
          onAccept={onAccept}
          onSkip={onSkipDest}
          dnd={dnd}
          destToSourcesMap={destToSourcesMap}
          onRemoveLink={onRemoveLink}
          sourceEffectCounts={sourceEffectCounts}
          currentSourceSelection={selectedDestLabel}
          isSuperGroup={destSuperGroupNames?.has(model.name) ?? false}
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
          onSkipFamily={
            onSkipDest ? () => skipFamily(family.models) : undefined
          }
        />
        {isExpanded && (
          <div className="space-y-0.5 pl-3 pb-1 ml-1 border-l border-border/30">
            {family.models.map((model) => (
              <ModelCard
                key={model.name}
                model={model}
                isAssigned={assignedNames?.has(model.name) ?? false}
                onAccept={onAccept}
                onSkip={onSkipDest}
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
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search + Sort — aligned with left panel search row */}
      <div className={PANEL_STYLES.search.wrapper}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
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
                aria-label="Clear search"
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
          <DestSortDropdown
            value={destSortBy}
            linked={sortLinked}
            onChange={(v) => {
              setDestSortOverride(v);
            }}
            onResetLink={() => {
              setDestSortOverride(null);
            }}
          />
        </div>
        {search && (
          <p className="text-[10px] text-foreground/30 mt-1">
            Showing {filteredSuggestions.length + filteredModels.length} of{" "}
            {suggestions.length + availableModels.length}
          </p>
        )}
        {/* Status filter pills */}
        {allModelCount > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <FilterPill
              label={`All (${allModelCount})`}
              color="blue"
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
            <FilterPill
              label={`Mapped (${mappedModelCount})`}
              color="green"
              active={statusFilter === "mapped"}
              onClick={() => setStatusFilter("mapped")}
            />
            <FilterPill
              label={`Unmapped (${unmappedModelCount})`}
              color="amber"
              active={statusFilter === "unmapped"}
              onClick={() => setStatusFilter("unmapped")}
            />
          </div>
        )}
      </div>

      {/* Scrollable area: Suggestions + All Models together */}
      <div className="flex-1 overflow-y-auto">
        {/* Swap source label when re-mapping an already-mapped item */}
        {excludeNames && excludeNames.size > 0 && (
          <div className="px-6 py-2 border-b border-border/50">
            <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider">
              Swap Source
            </span>
          </div>
        )}
        {/* AI Suggestions section */}
        {filteredSuggestions.length > 0 && (
          <div className="px-6 py-3 border-b border-border bg-surface/50">
            <h4 className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide mb-2">
              AI Suggestions ({Math.min(filteredSuggestions.length, 5)})
            </h4>
            <div className="space-y-1.5">
              {filteredSuggestions.slice(0, 5).map((sugg, index) => (
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

        {/* All Models */}
        <div className="px-6 py-3">
          {hierarchyMode && hierarchyData ? (
            /* ── Hierarchy Mode: super groups → groups → individuals ── */
            <>
              {hierarchyData.superGroups.length === 0 &&
              hierarchyData.regularGroups.length === 0 &&
              hierarchyData.ungrouped.length === 0 ? (
                <div className="text-center py-8 text-foreground/40">
                  <p className="text-sm">
                    {search ? (
                      <>No models matching &ldquo;{search}&rdquo;</>
                    ) : (
                      "No models available"
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Display-Wide Super Groups */}
                  {hierarchyData.superGroups.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 px-1 py-1 text-[10px] text-purple-400/60">
                        <span className="font-bold uppercase tracking-wider">
                          Display-Wide
                        </span>
                        <span>({hierarchyData.superGroups.length})</span>
                      </div>
                      <div className="space-y-1">
                        {hierarchyData.superGroups.map((group) => (
                          <HierarchyGroupRow
                            key={group.model.name}
                            group={group}
                            isExpanded={expandedHierarchyGroups.has(
                              group.model.name,
                            )}
                            onToggle={() =>
                              toggleHierarchyGroup(group.model.name)
                            }
                            onAccept={onAccept}
                            onSkip={onSkipDest}
                            dnd={dnd}
                            destToSourcesMap={destToSourcesMap}
                            onRemoveLink={onRemoveLink}
                            sourceEffectCounts={sourceEffectCounts}
                            currentSourceSelection={selectedDestLabel}
                            assignedNames={assignedNames}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular xLights Groups */}
                  {hierarchyData.regularGroups.map((group) => (
                    <HierarchyGroupRow
                      key={group.model.name}
                      group={group}
                      isExpanded={expandedHierarchyGroups.has(group.model.name)}
                      onToggle={() => toggleHierarchyGroup(group.model.name)}
                      onAccept={onAccept}
                      onSkip={onSkipDest}
                      dnd={dnd}
                      destToSourcesMap={destToSourcesMap}
                      onRemoveLink={onRemoveLink}
                      sourceEffectCounts={sourceEffectCounts}
                      currentSourceSelection={selectedDestLabel}
                      assignedNames={assignedNames}
                    />
                  ))}

                  {/* Ungrouped divider */}
                  {hierarchyData.superGroups.length +
                    hierarchyData.regularGroups.length >
                    0 &&
                    hierarchyData.ungrouped.length > 0 && (
                      <div className="flex items-center gap-2 py-1 text-[10px] text-foreground/25">
                        <div className="flex-1 h-px bg-border/40" />
                        <span className="uppercase tracking-wider font-semibold">
                          Ungrouped
                        </span>
                        <div className="flex-1 h-px bg-border/40" />
                      </div>
                    )}

                  {/* Ungrouped individuals */}
                  {hierarchyData.ungrouped.map((model) => (
                    <ModelCard
                      key={model.name}
                      model={model}
                      isAssigned={assignedNames?.has(model.name) ?? false}
                      onAccept={onAccept}
                      onSkip={onSkipDest}
                      dnd={dnd}
                      destToSourcesMap={destToSourcesMap}
                      onRemoveLink={onRemoveLink}
                      sourceEffectCounts={sourceEffectCounts}
                      currentSourceSelection={selectedDestLabel}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ── Family Mode (default): Unmapped / Mapped sections ── */
            <>
              {unmappedFamilies.length === 0 && mappedFamilies.length === 0 ? (
                <div className="text-center py-8 text-foreground/40">
                  <p className="text-sm">
                    {search ? (
                      <>No models matching &ldquo;{search}&rdquo;</>
                    ) : (
                      "No models available"
                    )}
                  </p>
                </div>
              ) : (
                <>
                  {/* ── UNMAPPED section ── */}
                  {unmappedFamilies.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setUnmappedOpen((p) => !p)}
                        className="flex items-center gap-2 w-full py-2 text-left group"
                      >
                        <svg
                          className={`w-3.5 h-3.5 text-foreground/40 transition-transform ${unmappedOpen ? "rotate-90" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        <span className="text-[13px] font-semibold text-foreground/50 uppercase tracking-wider">
                          Unmapped
                        </span>
                        <span className="text-[12px] font-semibold text-foreground/35">
                          (
                          {unmappedFamilies.reduce(
                            (n, f) => n + f.models.length,
                            0,
                          )}
                          )
                        </span>
                      </button>
                      {unmappedOpen && (
                        <div className="space-y-1 pb-2">
                          {unmappedFamilies.map((family) =>
                            renderFamily(family),
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Divider between sections ── */}
                  {unmappedFamilies.length > 0 && mappedFamilies.length > 0 && (
                    <div className="border-t border-border/40 my-1" />
                  )}

                  {/* ── MAPPED section ── */}
                  {mappedFamilies.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setMappedOpen((p) => !p)}
                        className="flex items-center gap-2 w-full py-2 text-left group"
                      >
                        <svg
                          className={`w-3.5 h-3.5 text-foreground/40 transition-transform ${mappedOpen ? "rotate-90" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        <span className="text-[13px] font-semibold text-foreground/50 uppercase tracking-wider">
                          Mapped
                        </span>
                        <span className="text-[12px] font-semibold text-foreground/35">
                          (
                          {mappedFamilies.reduce(
                            (n, f) => n + f.models.length,
                            0,
                          )}
                          )
                        </span>
                      </button>
                      {mappedOpen && (
                        <div className="space-y-1 pb-2">
                          {mappedFamilies.map((family) => renderFamily(family))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Skipped Items section */}
          {skippedModels.length > 0 && !search && (
            <SkippedDestSection
              skippedModels={skippedModels}
              onRestore={onUnskipDest}
              onRestoreAll={onUnskipAllDest}
            />
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
  onSkipFamily,
}: {
  family: ModelFamily;
  isExpanded: boolean;
  onToggle: () => void;
  onSkipFamily?: () => void;
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
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
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 tabular-nums border ${
            family.inUseCount >= 2
              ? "bg-red-500/10 text-red-400/70 border-red-500/20"
              : "bg-amber-500/10 text-amber-400/70 border-amber-500/20"
          }`}
        >
          {family.inUseCount}
        </span>
      )}

      {/* Skip family button */}
      {onSkipFamily && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSkipFamily();
          }}
          className="p-0.5 rounded text-foreground/15 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
          aria-label={`Skip all ${family.models.length} in ${family.prefix}`}
          title={`Skip all ${family.models.length} in ${family.prefix}`}
        >
          <svg
            className="w-3 h-3"
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
        ${
          isBest
            ? "bg-accent/8 border border-accent/25 hover:border-accent/40"
            : "bg-foreground/3 border border-border hover:border-foreground/20"
        }
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
      <div className="flex items-center gap-2 text-[11px] text-foreground/40 mt-0.5">
        {sugg.model.pixelCount ? <span>{sugg.model.pixelCount}px</span> : null}
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
  onSkip,
  dnd,
  destToSourcesMap,
  onRemoveLink,
  sourceEffectCounts,
  currentSourceSelection,
  isSuperGroup,
}: {
  model: ParsedModel;
  isAssigned: boolean;
  onAccept: (name: string) => void;
  onSkip?: (name: string) => void;
  dnd?: DragAndDropHandlers;
  destToSourcesMap?: Map<string, Set<string>>;
  onRemoveLink?: (sourceName: string, destName: string) => void;
  sourceEffectCounts?: Map<string, number>;
  currentSourceSelection?: string;
  isSuperGroup?: boolean;
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

  const typeLabel = isSuperGroup
    ? "SUPER"
    : model.isGroup
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

  const leftBorder = isAssigned
    ? "border-l-green-500/70"
    : usageCount > 0
      ? "border-l-green-500/40"
      : "border-l-amber-400/70";

  return (
    <div
      draggable={!!dnd}
      onDragStart={handleDragStart}
      onDragEnd={dnd?.handleDragEnd}
      onClick={() => onAccept(model.name)}
      className={`
        flex items-center gap-2 rounded-lg min-h-[34px] px-2.5 py-1.5 transition-all duration-150
        border border-border bg-surface hover:border-foreground/20 hover:bg-foreground/[0.02]
        border-l-[3px] ${leftBorder}
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

      {/* Type badge — with hierarchy icon for SUB, purple for SUPER */}
      <span
        className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 uppercase tracking-wide ${
          typeLabel === "SUPER"
            ? "bg-purple-500/15 text-purple-400 font-bold"
            : typeLabel === "SUB"
              ? "bg-purple-500/10 text-purple-400"
              : typeLabel === "GRP"
                ? "bg-blue-500/10 text-blue-400"
                : "bg-foreground/5 text-foreground/30"
        }`}
      >
        {typeLabel === "SUB" && (
          <svg
            className="w-2 h-2 inline-block mr-0.5 -mt-px"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          >
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

      {/* Usage badge with popover */}
      {usageCount > 0 ? (
        <UsageBadge
          count={usageCount}
          mappedSourceNames={mappedSourceNames}
          sourceEffectCounts={sourceEffectCounts}
          currentSourceSelection={currentSourceSelection}
          onRemoveLink={
            onRemoveLink
              ? (sourceName) => onRemoveLink(sourceName, model.name)
              : undefined
          }
          onAccept={() => onAccept(model.name)}
        />
      ) : null}

      {/* Skip button */}
      {onSkip && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSkip(model.name);
          }}
          className="p-0.5 rounded text-foreground/15 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
          aria-label={`Skip ${model.name}`}
          title={`Skip ${model.name}`}
        >
          <svg
            className="w-3 h-3"
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
  );
});

// ─── Hierarchy Group Row (for hierarchyMode) ─────────────

function HierarchyGroupRow({
  group,
  isExpanded,
  onToggle,
  onAccept,
  onSkip,
  dnd,
  destToSourcesMap,
  onRemoveLink,
  sourceEffectCounts,
  currentSourceSelection,
  assignedNames,
}: {
  group: HierarchyGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onAccept: (name: string) => void;
  onSkip?: (name: string) => void;
  dnd?: DragAndDropHandlers;
  destToSourcesMap?: Map<string, Set<string>>;
  onRemoveLink?: (sourceName: string, destName: string) => void;
  sourceEffectCounts?: Map<string, number>;
  currentSourceSelection?: string;
  assignedNames?: Set<string>;
}) {
  const allMapped =
    group.mappedCount >= group.members.length && group.members.length > 0;
  const groupBorder = group.isSuperGroup
    ? allMapped
      ? "border-l-purple-500/70"
      : "border-l-purple-400/40"
    : allMapped
      ? "border-l-green-500/70"
      : "border-l-amber-400/70";
  const bgClass = group.isSuperGroup
    ? "border-border/60 bg-purple-500/[0.03]"
    : "border-border/60 bg-foreground/[0.02]";

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all border-l-[3px] ${groupBorder} ${bgClass}`}
    >
      {/* Group header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2.5 py-1.5 w-full text-left"
      >
        <svg
          className={`w-3 h-3 ${group.isSuperGroup ? "text-purple-400/60" : "text-foreground/40"} transition-transform duration-150 ${isExpanded ? "rotate-90" : ""} flex-shrink-0`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        {group.isSuperGroup ? (
          <span className="px-1 py-px text-[9px] font-bold bg-purple-500/15 text-purple-400 rounded flex-shrink-0">
            SUPER
          </span>
        ) : (
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 rounded flex-shrink-0">
            GRP
          </span>
        )}
        <span className="text-[12px] font-semibold text-foreground/70 truncate">
          {group.model.name}
        </span>
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          <span
            className={`text-[10px] font-semibold tabular-nums ${allMapped ? "text-green-400/60" : "text-foreground/40"}`}
          >
            {group.mappedCount}/{group.members.length}
          </span>
        </div>
      </button>

      {/* Expanded members */}
      {isExpanded && group.members.length > 0 && (
        <div
          className={`px-2.5 pb-2 pl-5 space-y-0.5 border-t ${group.isSuperGroup ? "border-purple-400/10" : "border-border/30"}`}
        >
          <div className="pt-1">
            {group.members.map((model) => (
              <ModelCard
                key={model.name}
                model={model}
                isAssigned={assignedNames?.has(model.name) ?? false}
                onAccept={onAccept}
                onSkip={onSkip}
                dnd={dnd}
                destToSourcesMap={destToSourcesMap}
                onRemoveLink={onRemoveLink}
                sourceEffectCounts={sourceEffectCounts}
                currentSourceSelection={currentSourceSelection}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Destination Sort Dropdown ─────────────────────────────

const DEST_SORT_LABELS: Partial<Record<SortOption, string>> = {
  "name-asc": "Name A\u2192Z",
  "name-desc": "Name Z\u2192A",
  "pixels-desc": "Pixels: High",
  "pixels-asc": "Pixels: Low",
  status: "Unmapped First",
};
const DEST_SORT_OPTIONS: SortOption[] = [
  "name-asc",
  "name-desc",
  "pixels-desc",
  "pixels-asc",
  "status",
];

function DestSortDropdown({
  value,
  linked,
  onChange,
  onResetLink,
}: {
  value: SortOption;
  linked: boolean;
  onChange: (option: SortOption) => void;
  onResetLink: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
          linked
            ? "text-foreground/40 bg-background border-border hover:border-foreground/20"
            : "text-accent/70 bg-accent/5 border-accent/20 hover:border-accent/30"
        }`}
        title={
          linked
            ? "Sort linked to source panel"
            : "Sort overridden (click to re-link)"
        }
      >
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
          />
        </svg>
        {DEST_SORT_LABELS[value] ?? "Sort"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-lg shadow-xl z-30 py-1 overflow-hidden">
          {DEST_SORT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                value === option
                  ? "text-accent bg-accent/5 font-medium"
                  : "text-foreground/60 hover:bg-foreground/5"
              }`}
            >
              {DEST_SORT_LABELS[option]}
            </button>
          ))}
          {!linked && (
            <>
              <div className="border-t border-border/40 my-1" />
              <button
                type="button"
                onClick={() => {
                  onResetLink();
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-[11px] text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5 transition-colors"
              >
                Re-link to source sort
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skipped Destination Items Section ───────────────────

function SkippedDestSection({
  skippedModels,
  onRestore,
  onRestoreAll,
}: {
  skippedModels: ParsedModel[];
  onRestore?: (name: string) => void;
  onRestoreAll?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 border-t border-border/50 pt-3">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-2 text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        Skipped Items ({skippedModels.length})
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          {skippedModels.map((model) => (
            <div
              key={model.name}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-foreground/[0.02] border border-border/50 opacity-60"
            >
              <span className="text-[12px] text-foreground/50 truncate flex-1 min-w-0">
                {model.name}
              </span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-foreground/5 text-foreground/20 flex-shrink-0 uppercase">
                {model.type.toUpperCase().slice(0, 6)}
              </span>
              {onRestore && (
                <button
                  type="button"
                  onClick={() => onRestore(model.name)}
                  className="text-[10px] text-accent/60 hover:text-accent transition-colors flex-shrink-0"
                >
                  Restore
                </button>
              )}
            </div>
          ))}

          {onRestoreAll && skippedModels.length > 1 && (
            <button
              type="button"
              onClick={onRestoreAll}
              className="mt-1 text-[10px] text-accent/40 hover:text-accent/70 transition-colors"
            >
              Restore all {skippedModels.length} skipped items
            </button>
          )}
        </div>
      )}
    </div>
  );
}
