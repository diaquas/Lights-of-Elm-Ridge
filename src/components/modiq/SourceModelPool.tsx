"use client";

import { useState, useMemo, useCallback, memo } from "react";
import type { ParsedModel, EffectTree } from "@/lib/modiq";
import DraggableSourceCard from "./DraggableSourceCard";
import type { DragItem } from "@/hooks/useDragAndDrop";

interface SourceModelPoolProps {
  allSourceModels: ParsedModel[];
  assignedSourceNames: Set<string>;
  /** Reverse map: source name → dest name */
  assignmentMap: Map<string, string>;
  onDragStart: (item: DragItem) => void;
  onDragEnd: () => void;
  getDragDataTransfer: (item: DragItem) => string;
  /** Mobile tap-to-select */
  selectedSourceModel: string | null;
  onTapSelect: (modelName: string) => void;
  /** Effect tree for effect-aware categorization */
  effectTree: EffectTree | null;
}

export default memo(function SourceModelPool({
  allSourceModels,
  assignedSourceNames,
  assignmentMap,
  onDragStart,
  onDragEnd,
  getDragDataTransfer,
  selectedSourceModel,
  onTapSelect,
  effectTree,
}: SourceModelPoolProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showMapped, setShowMapped] = useState(false);

  const unmappedModels = useMemo(
    () => allSourceModels.filter((m) => !assignedSourceNames.has(m.name)),
    [allSourceModels, assignedSourceNames],
  );

  const mappedModels = useMemo(
    () => allSourceModels.filter((m) => assignedSourceNames.has(m.name)),
    [allSourceModels, assignedSourceNames],
  );

  // Effect-aware categorization: groups vs individuals
  const { unmappedGroups, unmappedIndividuals, hasEffectCategories } =
    useMemo(() => {
      if (!effectTree) {
        return {
          unmappedGroups: [] as ParsedModel[],
          unmappedIndividuals: [] as ParsedModel[],
          hasEffectCategories: false,
        };
      }
      const groupNames = new Set(
        effectTree.groupsWithEffects
          .filter((g) => g.scenario !== "C")
          .map((g) => g.model.name),
      );
      const groups: ParsedModel[] = [];
      const individuals: ParsedModel[] = [];
      for (const m of unmappedModels) {
        if (groupNames.has(m.name)) {
          groups.push(m);
        } else {
          individuals.push(m);
        }
      }
      return {
        unmappedGroups: groups,
        unmappedIndividuals: individuals,
        hasEffectCategories: groups.length > 0 || individuals.length > 0,
      };
    }, [effectTree, unmappedModels]);

  // Collect unique types for filter
  const modelTypes = useMemo(() => {
    const types = new Set<string>();
    for (const m of allSourceModels) {
      if (!m.isGroup) types.add(m.type);
    }
    return Array.from(types).sort();
  }, [allSourceModels]);

  const applyFilters = useCallback(
    (models: ParsedModel[]) => {
      let filtered = models;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.type.toLowerCase().includes(q) ||
            String(m.pixelCount).includes(q),
        );
      }
      if (typeFilter !== "all") {
        filtered = filtered.filter(
          (m) => m.type === typeFilter || (m.isGroup && typeFilter === "Group"),
        );
      }
      return filtered;
    },
    [search, typeFilter],
  );

  const filteredUnmapped = useMemo(
    () => applyFilters(unmappedModels),
    [applyFilters, unmappedModels],
  );

  const filteredMapped = useMemo(
    () => applyFilters(mappedModels),
    [applyFilters, mappedModels],
  );

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden flex flex-col h-full">
      {/* Compact header */}
      <div className="px-3 py-2.5 border-b border-border flex-shrink-0">
        <h3 className="font-display font-bold text-[15px]">Source Models</h3>
        <p className="text-[11px] text-foreground/40 mt-0.5">
          {unmappedModels.length} available &middot; {mappedModels.length} mapped
          {effectTree && (
            <span className="text-cyan-400/60">
              {" "}&middot; {effectTree.summary.effectiveMappingItems} active layers
            </span>
          )}
        </p>
      </div>

      {/* Search + Type Filter — compact 32px inputs */}
      <div className="px-3 py-2 border-b border-border space-y-1.5 flex-shrink-0">
        <input
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-[12px] px-2.5 py-1.5 h-8 rounded bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
        />
        {modelTypes.length > 1 && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full text-[12px] px-2.5 py-1.5 h-8 rounded bg-background border border-border focus:border-accent focus:outline-none text-foreground/60"
          >
            <option value="all">All Types</option>
            {modelTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Source model cards — min 10 rows, fills remaining viewport height */}
      <div className="flex-1 min-h-[440px] overflow-y-auto">
        {filteredUnmapped.length > 0 ? (
          hasEffectCategories ? (
            <>
              {/* Groups with Effects section */}
              {applyFilters(unmappedGroups).length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400/70 bg-cyan-500/5 sticky top-0 z-10 flex items-center gap-1.5">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                    Groups with Effects ({applyFilters(unmappedGroups).length})
                  </div>
                  <div className="px-2 py-1.5">
                    {applyFilters(unmappedGroups).map((m) => (
                      <DraggableSourceCard
                        key={m.name}
                        model={m}
                        isMapped={false}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        getDragDataTransfer={getDragDataTransfer}
                        isSelected={selectedSourceModel === m.name}
                        onTap={onTapSelect}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Individual Models section */}
              {applyFilters(unmappedIndividuals).length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/40 bg-surface-light sticky top-0 z-10">
                    Individual Models ({applyFilters(unmappedIndividuals).length})
                  </div>
                  <div className="px-2 py-1.5">
                    {applyFilters(unmappedIndividuals).map((m) => (
                      <DraggableSourceCard
                        key={m.name}
                        model={m}
                        isMapped={false}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        getDragDataTransfer={getDragDataTransfer}
                        isSelected={selectedSourceModel === m.name}
                        onTap={onTapSelect}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/40 bg-surface-light sticky top-0 z-10">
                Unmapped ({filteredUnmapped.length})
              </div>
              <div className="px-2 py-1.5">
                {filteredUnmapped.map((m) => (
                  <DraggableSourceCard
                    key={m.name}
                    model={m}
                    isMapped={false}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    getDragDataTransfer={getDragDataTransfer}
                    isSelected={selectedSourceModel === m.name}
                    onTap={onTapSelect}
                  />
                ))}
              </div>
            </div>
          )
        ) : unmappedModels.length === 0 ? (
          <div className="px-3 py-4 text-center text-[13px] text-green-400/60">
            All source models mapped!
          </div>
        ) : (
          <div className="px-3 py-4 text-center text-[13px] text-foreground/30">
            No models match your search
          </div>
        )}

        {/* Mapped models section */}
        {mappedModels.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowMapped(!showMapped)}
              className="w-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/30 bg-surface-light hover:bg-surface-light/80 sticky top-0 z-10 flex items-center justify-between"
            >
              <span>Mapped ({filteredMapped.length})</span>
              <svg
                className={`w-3 h-3 transition-transform ${showMapped ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showMapped && (
              <div className="px-2 py-1.5">
                {filteredMapped.map((m) => (
                  <DraggableSourceCard
                    key={m.name}
                    model={m}
                    isMapped={true}
                    mappedToName={assignmentMap.get(m.name)}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    getDragDataTransfer={getDragDataTransfer}
                    isSelected={false}
                    onTap={onTapSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
