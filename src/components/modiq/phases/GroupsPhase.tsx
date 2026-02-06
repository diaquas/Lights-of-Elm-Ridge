"use client";

import { useState, useMemo } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { BulkActionBar } from "../BulkActionBar";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { generateMatchReasoning } from "@/lib/modiq/generateReasoning";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export function GroupsPhase() {
  const { phaseItems, goToNextPhase, interactive } = useMappingPhase();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const unmappedGroups = phaseItems.filter((item) => !item.isMapped);
  const mappedGroups = phaseItems.filter((item) => item.isMapped);

  const selectedGroup = phaseItems.find(
    (g) => g.sourceModel.name === selectedGroupId,
  );

  // No groups
  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#128193;</span>}
        title="No Model Groups Found"
        description="No model groups below auto-accept threshold. Continue to individual models."
        action={{ label: "Continue to Models", onClick: goToNextPhase }}
      />
    );
  }

  // All done
  if (unmappedGroups.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#9989;</span>}
        title="All Groups Mapped!"
        description={`${mappedGroups.length} model groups have been matched.`}
        action={{ label: "Continue to Models", onClick: goToNextPhase }}
      />
    );
  }

  const handleAcceptGroup = (
    groupName: string,
    userModelName: string,
  ) => {
    interactive.assignUserModelToLayer(groupName, userModelName);
    // Auto-select next
    const nextUnmapped = unmappedGroups.find(
      (g) => g.sourceModel.name !== groupName && !g.isMapped,
    );
    setSelectedGroupId(nextUnmapped?.sourceModel.name ?? null);
  };

  const handleBulkAccept = () => {
    for (const group of unmappedGroups) {
      if (!selectedIds.has(group.sourceModel.name)) continue;
      const suggs = interactive.getSuggestionsForLayer(group.sourceModel);
      if (suggs.length > 0) {
        interactive.assignUserModelToLayer(
          group.sourceModel.name,
          suggs[0].model.name,
        );
      }
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Group List */}
      <div className="w-1/2 flex flex-col border-r border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Model Groups
          </h2>
          <p className="text-sm text-foreground/50 mt-1">
            {unmappedGroups.length} groups need matching &middot;{" "}
            {mappedGroups.length} already mapped
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-2">
            {unmappedGroups.map((group) => (
              <GroupListCard
                key={group.sourceModel.name}
                group={group}
                isSelected={selectedGroupId === group.sourceModel.name}
                isChecked={selectedIds.has(group.sourceModel.name)}
                interactive={interactive}
                onClick={() => setSelectedGroupId(group.sourceModel.name)}
                onCheck={() => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.sourceModel.name))
                      next.delete(group.sourceModel.name);
                    else next.add(group.sourceModel.name);
                    return next;
                  });
                }}
                onAccept={(userModelName) =>
                  handleAcceptGroup(group.sourceModel.name, userModelName)
                }
              />
            ))}
          </div>

          {mappedGroups.length > 0 && (
            <details className="mt-6">
              <summary className="text-sm text-foreground/40 cursor-pointer hover:text-foreground/60">
                {mappedGroups.length} groups already mapped
              </summary>
              <div className="mt-3 space-y-2 opacity-50">
                {mappedGroups.map((group) => (
                  <div
                    key={group.sourceModel.name}
                    className="p-3 rounded-lg bg-green-500/5 border border-green-500/15"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 rounded">
                        GRP
                      </span>
                      <span className="text-[13px] text-foreground/60 truncate">
                        {group.sourceModel.name}
                      </span>
                      <span className="text-foreground/20">&rarr;</span>
                      <span className="text-[13px] text-green-400/70 truncate">
                        {group.assignedUserModels[0]?.name}
                      </span>
                    </div>
                    {group.coveredChildCount > 0 && (
                      <div className="text-[11px] text-green-400/50 mt-1 ml-6">
                        {group.coveredChildCount} children auto-resolved
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Right: Detail Panel */}
      <div className="w-1/2 flex flex-col bg-surface/50 overflow-hidden">
        {selectedGroup ? (
          <GroupDetailPanel
            group={selectedGroup}
            interactive={interactive}
            onAccept={(userModelName) =>
              handleAcceptGroup(selectedGroup.sourceModel.name, userModelName)
            }
            onSkip={() => {
              const next = unmappedGroups.find(
                (g) => g.sourceModel.name !== selectedGroup.sourceModel.name,
              );
              setSelectedGroupId(next?.sourceModel.name ?? null);
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground/30">
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-foreground/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              <p className="text-sm">Select a group to see suggestions</p>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={unmappedGroups.length}
          onSelectAll={() => {
            if (selectedIds.size === unmappedGroups.length) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(
                new Set(unmappedGroups.map((g) => g.sourceModel.name)),
              );
            }
          }}
          onAcceptSelected={handleBulkAccept}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}

// ─── Group Card (Left Panel) ──────────────────────────

function GroupListCard({
  group,
  isSelected,
  isChecked,
  interactive,
  onClick,
  onCheck,
  onAccept,
}: {
  group: SourceLayerMapping;
  isSelected: boolean;
  isChecked: boolean;
  interactive: ReturnType<typeof useMappingPhase>["interactive"];
  onClick: () => void;
  onCheck: () => void;
  onAccept: (userModelName: string) => void;
}) {
  const topSuggestion = useMemo(() => {
    const suggs = interactive.getSuggestionsForLayer(group.sourceModel);
    return suggs[0] ?? null;
  }, [interactive, group.sourceModel]);

  return (
    <div
      className={`
        p-3 rounded-lg border transition-all duration-200 cursor-pointer
        ${isSelected
          ? "bg-accent/5 border-accent/30 ring-1 ring-accent/20"
          : "bg-surface border-border hover:border-foreground/20"}
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-2.5">
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCheck();
          }}
          className={`
            mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
            transition-all duration-200
            ${isChecked ? "bg-accent border-accent" : "border-foreground/20 hover:border-foreground/40"}
          `}
        >
          {isChecked && (
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Group Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 rounded">
              GRP
            </span>
            <span className="text-[13px] font-medium text-foreground truncate">
              {group.sourceModel.name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-foreground/40">
            <span>{group.memberNames.length} members</span>
            {group.coveredChildCount > 0 && (
              <span className="text-teal-400/60">
                &middot; covers {group.coveredChildCount} children
              </span>
            )}
          </div>

          {/* Best match preview */}
          {topSuggestion && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] text-foreground/30">Suggested:</span>
              <span className="text-[12px] text-foreground/60 truncate">
                {topSuggestion.model.name}
              </span>
              <ConfidenceBadge score={topSuggestion.score} size="sm" />
            </div>
          )}
        </div>

        {/* Quick Accept */}
        {topSuggestion && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAccept(topSuggestion.model.name);
            }}
            className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex-shrink-0"
            title="Accept suggested match"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.77 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Group Detail Panel (Right) ───────────────────────

function GroupDetailPanel({
  group,
  interactive,
  onAccept,
  onSkip,
}: {
  group: SourceLayerMapping;
  interactive: ReturnType<typeof useMappingPhase>["interactive"];
  onAccept: (userModelName: string) => void;
  onSkip: () => void;
}) {
  const [search, setSearch] = useState("");

  const suggestions = useMemo(
    () => interactive.getSuggestionsForLayer(group.sourceModel).slice(0, 8),
    [interactive, group.sourceModel],
  );

  // When searching, filter all dest models by the query
  const searchResults = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    return interactive.allDestModels.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q),
    );
  }, [search, interactive.allDestModels]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 rounded">
            MODEL_GRP
          </span>
        </div>
        <h3 className="text-lg font-semibold text-foreground">{group.sourceModel.name}</h3>
        <p className="text-sm text-foreground/40 mt-1">
          {group.memberNames.length} members &middot;{" "}
          Scenario {group.scenario || "A"}
        </p>
      </div>

      {/* Members Preview */}
      {group.memberNames.length > 0 && (
        <div className="px-6 py-3 border-b border-border flex-shrink-0">
          <h4 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wide mb-2">
            Group Members
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {group.memberNames.slice(0, 8).map((member) => (
              <span
                key={member}
                className="px-2 py-0.5 text-[11px] bg-foreground/5 text-foreground/50 rounded"
              >
                {member}
              </span>
            ))}
            {group.memberNames.length > 8 && (
              <span className="px-2 py-0.5 text-[11px] bg-foreground/5 text-foreground/30 rounded">
                +{group.memberNames.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="px-6 py-2 border-b border-border flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search all user models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[12px] pl-8 pr-3 py-1.5 h-8 rounded bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content: Suggestions or Search Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {searchResults ? (
          <>
            <h4 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wide mb-3">
              Search Results ({searchResults.length})
            </h4>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-foreground/30">
                <p className="text-sm">No models matching &ldquo;{search}&rdquo;</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.slice(0, 20).map((model) => (
                  <button
                    key={model.name}
                    type="button"
                    onClick={() => onAccept(model.name)}
                    className="w-full p-3 rounded-lg text-left transition-all duration-200 bg-foreground/3 border border-border hover:border-foreground/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-foreground truncate">
                        {model.name}
                      </span>
                      {interactive.assignedUserModelNames.has(model.name) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold flex-shrink-0">
                          IN USE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-foreground/30">
                      {model.pixelCount ? <span>{model.pixelCount}px</span> : null}
                      <span>{model.type}</span>
                    </div>
                  </button>
                ))}
                {searchResults.length > 20 && (
                  <div className="text-center text-[11px] text-foreground/30 py-2">
                    +{searchResults.length - 20} more — refine your search
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <h4 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wide mb-3">
              Suggested Matches
            </h4>

            {suggestions.length === 0 ? (
              <div className="text-center py-8 text-foreground/30">
                <p className="text-sm">No good matches found. Try searching above.</p>
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
                          ? "bg-accent/8 border border-accent/25 hover:border-accent/40"
                          : "bg-foreground/3 border border-border hover:border-foreground/20"}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {index === 0 && (
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
                      {sugg.model.pixelCount ? (
                        <div className="text-[11px] text-foreground/30 mt-1">
                          {sugg.model.pixelCount}px
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Skip */}
      <div className="px-6 py-3 border-t border-border flex-shrink-0">
        <button
          type="button"
          onClick={onSkip}
          className="w-full py-2.5 text-sm text-foreground/40 hover:text-foreground/60 border border-border hover:border-foreground/20 rounded-lg transition-colors"
        >
          Skip This Group
        </button>
      </div>
    </div>
  );
}
