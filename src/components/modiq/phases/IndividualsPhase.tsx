"use client";

import { useState, useMemo } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { generateMatchReasoning } from "@/lib/modiq/generateReasoning";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export function IndividualsPhase() {
  const { phaseItems, goToNextPhase, interactive } = useMappingPhase();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const unmappedItems = phaseItems.filter((item) => !item.isMapped);
  const mappedItems = phaseItems.filter((item) => item.isMapped);

  const filteredUnmapped = useMemo(() => {
    if (!search) return unmappedItems;
    const q = search.toLowerCase();
    return unmappedItems.filter(
      (item) =>
        item.sourceModel.name.toLowerCase().includes(q) ||
        item.sourceModel.type.toLowerCase().includes(q),
    );
  }, [unmappedItems, search]);

  const selectedItem = phaseItems.find(
    (i) => i.sourceModel.name === selectedItemId,
  );

  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#128203;</span>}
        title="No Individual Models"
        description="No individual models need manual matching. Continue to spinners."
        action={{ label: "Continue to Spinners", onClick: goToNextPhase }}
      />
    );
  }

  if (unmappedItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#9989;</span>}
        title="All Models Mapped!"
        description={`${mappedItems.length} individual models have been matched.`}
        action={{ label: "Continue to Spinners", onClick: goToNextPhase }}
      />
    );
  }

  const handleAccept = (sourceName: string, userModelName: string) => {
    interactive.assignUserModelToLayer(sourceName, userModelName);
    // Select next unmapped
    const next = unmappedItems.find(
      (i) => i.sourceModel.name !== sourceName && !i.isMapped,
    );
    setSelectedItemId(next?.sourceModel.name ?? null);
  };

  const handleSkip = (sourceName: string) => {
    interactive.skipSourceLayer(sourceName);
    const next = unmappedItems.find(
      (i) => i.sourceModel.name !== sourceName && !i.isMapped,
    );
    setSelectedItemId(next?.sourceModel.name ?? null);
  };

  return (
    <div className="flex h-full">
      {/* Left: Model List */}
      <div className="w-1/2 flex flex-col border-r border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Individual Models
          </h2>
          <p className="text-sm text-foreground/50 mt-1">
            {unmappedItems.length} models need matching &middot;{" "}
            {mappedItems.length} already mapped
          </p>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[12px] pl-8 pr-3 py-1.5 h-8 rounded bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-1.5">
            {filteredUnmapped.map((item) => {
              const topSugg = interactive.getSuggestionsForLayer(item.sourceModel)[0];
              return (
                <button
                  key={item.sourceModel.name}
                  type="button"
                  onClick={() => setSelectedItemId(item.sourceModel.name)}
                  className={`
                    w-full p-3 rounded-lg text-left transition-all duration-200
                    ${selectedItemId === item.sourceModel.name
                      ? "bg-accent/5 border border-accent/30 ring-1 ring-accent/20"
                      : "bg-surface border border-border hover:border-foreground/20"}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[13px] font-medium text-foreground truncate">
                        {item.sourceModel.name}
                      </span>
                    </div>
                    {topSugg && (
                      <ConfidenceBadge score={topSugg.score} size="sm" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-foreground/30">
                    {item.sourceModel.pixelCount ? (
                      <span>{item.sourceModel.pixelCount}px</span>
                    ) : null}
                    <span>{item.sourceModel.type}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Detail / Suggestion Panel */}
      <div className="w-1/2 flex flex-col bg-surface/50">
        {selectedItem && !selectedItem.isMapped ? (
          <IndividualDetailPanel
            item={selectedItem}
            interactive={interactive}
            onAccept={(userModelName) =>
              handleAccept(selectedItem.sourceModel.name, userModelName)
            }
            onSkip={() => handleSkip(selectedItem.sourceModel.name)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground/30">
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-foreground/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              <p className="text-sm">Select a model to see suggestions</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IndividualDetailPanel({
  item,
  interactive,
  onAccept,
  onSkip,
}: {
  item: SourceLayerMapping;
  interactive: ReturnType<typeof useMappingPhase>["interactive"];
  onAccept: (userModelName: string) => void;
  onSkip: () => void;
}) {
  const suggestions = useMemo(
    () => interactive.getSuggestionsForLayer(item.sourceModel).slice(0, 10),
    [interactive, item.sourceModel],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">{item.sourceModel.name}</h3>
        <div className="flex items-center gap-3 mt-1 text-sm text-foreground/40">
          {item.sourceModel.pixelCount ? (
            <span>{item.sourceModel.pixelCount}px</span>
          ) : null}
          <span>{item.sourceModel.type}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <h4 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wide mb-3">
          Suggested Matches
        </h4>

        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-foreground/30">
            <p className="text-sm">No matches found. Try drag-and-drop or skip.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((sugg, index) => {
              const reasoning = generateMatchReasoning(sugg.factors, sugg.score);
              return (
                <button
                  key={sugg.model.name}
                  type="button"
                  onClick={() => onAccept(sugg.model.name)}
                  className={`
                    w-full p-3 rounded-lg text-left transition-all duration-200
                    ${index === 0
                      ? "bg-green-500/8 border border-green-500/25 hover:border-green-500/40"
                      : "bg-foreground/3 border border-border hover:border-foreground/20"}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500/15 text-green-400 rounded flex-shrink-0">
                          BEST
                        </span>
                      )}
                      <span className="text-[13px] font-medium text-foreground truncate">
                        {sugg.model.name}
                      </span>
                    </div>
                    <ConfidenceBadge score={sugg.score} reasoning={reasoning} size="sm" />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-foreground/30">
                    {sugg.model.pixelCount ? <span>{sugg.model.pixelCount}px</span> : null}
                    <span>{sugg.model.type}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-border">
        <button
          type="button"
          onClick={onSkip}
          className="w-full py-2.5 text-sm text-foreground/40 hover:text-foreground/60 border border-border hover:border-foreground/20 rounded-lg transition-colors"
        >
          Skip This Model
        </button>
      </div>
    </div>
  );
}
