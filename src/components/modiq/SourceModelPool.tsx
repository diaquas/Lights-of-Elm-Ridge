"use client";

import { useState, useMemo } from "react";
import type { ParsedModel } from "@/lib/modiq";
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
}

export default function SourceModelPool({
  allSourceModels,
  assignedSourceNames,
  assignmentMap,
  onDragStart,
  onDragEnd,
  getDragDataTransfer,
  selectedSourceModel,
  onTapSelect,
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

  // Collect unique types for filter
  const modelTypes = useMemo(() => {
    const types = new Set<string>();
    for (const m of allSourceModels) {
      if (!m.isGroup) types.add(m.type);
    }
    return Array.from(types).sort();
  }, [allSourceModels]);

  const applyFilters = (models: ParsedModel[]) => {
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
  };

  const filteredUnmapped = useMemo(
    () => applyFilters(unmappedModels),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unmappedModels, search, typeFilter],
  );

  const filteredMapped = useMemo(
    () => applyFilters(mappedModels),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mappedModels, search, typeFilter],
  );

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-display font-semibold text-sm">Source Models</h3>
        <p className="text-xs text-foreground/40 mt-0.5">
          {unmappedModels.length} available &middot; {mappedModels.length} mapped
        </p>
      </div>

      {/* Search + Type Filter */}
      <div className="px-4 py-2 border-b border-border space-y-2">
        <input
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm px-3 py-1.5 rounded-lg bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
        />
        {modelTypes.length > 1 && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded-lg bg-background border border-border focus:border-accent focus:outline-none text-foreground/60"
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

      {/* Unmapped source models (draggable cards) */}
      <div className="max-h-[32rem] overflow-y-auto">
        {filteredUnmapped.length > 0 ? (
          <div>
            <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground/40 bg-surface-light sticky top-0 z-10">
              Unmapped ({filteredUnmapped.length})
            </div>
            <div className="px-3 py-2 space-y-1.5">
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
        ) : unmappedModels.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-green-400/60">
            All source models mapped!
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-foreground/30">
            No models match your search
          </div>
        )}

        {/* All Source Models (mapped, grayed) */}
        {mappedModels.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowMapped(!showMapped)}
              className="w-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground/30 bg-surface-light hover:bg-surface-light/80 sticky top-0 z-10 flex items-center justify-between"
            >
              <span>All Source Models ({filteredMapped.length})</span>
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
              <div className="px-3 py-2 space-y-1.5">
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
}
