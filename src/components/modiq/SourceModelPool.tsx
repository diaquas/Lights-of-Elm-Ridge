"use client";

import { useState, useMemo } from "react";
import type { ParsedModel } from "@/lib/modiq";

interface SourceModelPoolProps {
  allSourceModels: ParsedModel[];
  assignedSourceNames: Set<string>;
}

export default function SourceModelPool({
  allSourceModels,
  assignedSourceNames,
}: SourceModelPoolProps) {
  const [search, setSearch] = useState("");
  const [showMapped, setShowMapped] = useState(false);

  const unmappedModels = useMemo(
    () => allSourceModels.filter((m) => !assignedSourceNames.has(m.name)),
    [allSourceModels, assignedSourceNames],
  );

  const mappedModels = useMemo(
    () => allSourceModels.filter((m) => assignedSourceNames.has(m.name)),
    [allSourceModels, assignedSourceNames],
  );

  const filteredUnmapped = useMemo(() => {
    if (!search) return unmappedModels;
    const q = search.toLowerCase();
    return unmappedModels.filter((m) => m.name.toLowerCase().includes(q));
  }, [unmappedModels, search]);

  const filteredMapped = useMemo(() => {
    if (!search) return mappedModels;
    const q = search.toLowerCase();
    return mappedModels.filter((m) => m.name.toLowerCase().includes(q));
  }, [mappedModels, search]);

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-display font-semibold text-sm">
          Our Source Models
        </h3>
        <p className="text-xs text-foreground/40 mt-0.5">
          {unmappedModels.length} available &middot; {mappedModels.length}{" "}
          mapped
        </p>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-border">
        <input
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm px-3 py-1.5 rounded-lg bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
        />
      </div>

      {/* Unmapped source models */}
      <div className="max-h-[28rem] overflow-y-auto">
        {filteredUnmapped.length > 0 && (
          <div>
            <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground/40 bg-surface-light sticky top-0">
              Available ({filteredUnmapped.length})
            </div>
            <div className="divide-y divide-border/50">
              {filteredUnmapped.map((m, i) => (
                <div key={i} className="px-4 py-2">
                  <div className="text-sm font-medium text-foreground/80">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-foreground/40 mt-0.5">
                    {m.isGroup ? "Group" : `${m.pixelCount}px \u00B7 ${m.type}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toggle mapped models */}
        {mappedModels.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowMapped(!showMapped)}
              className="w-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground/30 bg-surface-light hover:bg-surface-light/80 sticky top-0 flex items-center justify-between"
            >
              <span>Mapped ({mappedModels.length})</span>
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
              <div className="divide-y divide-border/50">
                {filteredMapped.map((m, i) => (
                  <div key={i} className="px-4 py-2 opacity-40">
                    <div className="text-sm font-medium text-foreground/60">
                      {m.name}
                    </div>
                    <div className="text-[11px] text-foreground/40 mt-0.5">
                      {m.isGroup
                        ? "Group"
                        : `${m.pixelCount}px \u00B7 ${m.type}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {filteredUnmapped.length === 0 && !showMapped && (
          <div className="px-4 py-6 text-center text-sm text-foreground/30">
            {search ? "No models match your search" : "All models are mapped"}
          </div>
        )}
      </div>
    </div>
  );
}
