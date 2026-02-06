"use client";

import { useState, useMemo, useCallback } from "react";
import { useMappingPhase, findNextUnmapped } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { BulkActionBar } from "../BulkActionBar";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { UniversalSourcePanel } from "../UniversalSourcePanel";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBulkInference } from "@/hooks/useBulkInference";
import { useItemFamilies } from "@/hooks/useItemFamilies";
import { BulkInferenceBanner } from "../BulkInferenceBanner";
import { FamilyAccordionHeader } from "../FamilyAccordionHeader";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export function GroupsPhase() {
  const { phaseItems, goToNextPhase, interactive } = useMappingPhase();
  const dnd = useDragAndDrop();

  const bulk = useBulkInference(interactive, phaseItems);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const unmappedGroups = phaseItems.filter((item) => !item.isMapped);
  const mappedGroups = phaseItems.filter((item) => item.isMapped);

  const filteredUnmapped = useMemo(() => {
    if (!search) return unmappedGroups;
    const q = search.toLowerCase();
    return unmappedGroups.filter(
      (item) =>
        item.sourceModel.name.toLowerCase().includes(q) ||
        item.sourceModel.type.toLowerCase().includes(q),
    );
  }, [unmappedGroups, search]);

  const { families, toggle, isExpanded } = useItemFamilies(filteredUnmapped, selectedGroupId);

  const selectedGroup = phaseItems.find(
    (g) => g.sourceModel.name === selectedGroupId,
  );

  // Suggestions for selected group
  const suggestions = useMemo(() => {
    if (!selectedGroup) return [];
    return interactive.getSuggestionsForLayer(selectedGroup.sourceModel).slice(0, 8);
  }, [interactive, selectedGroup]);

  // Type filter: only show model-level groups (not individual models or submodel groups)
  const groupSourceFilter = useCallback(
    (m: { isGroup?: boolean; groupType?: string }) =>
      !!m.isGroup && m.groupType !== "SUBMODEL_GROUP",
    [],
  );

  // No groups
  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#128077;</span>}
        title="Groups All Set!"
        description="No model groups need manual matching — they were auto-matched or this sequence doesn't use groups."
      />
    );
  }

  // All done
  if (unmappedGroups.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#9989;</span>}
        title="All Groups Mapped!"
        description={`${mappedGroups.length} model group${mappedGroups.length === 1 ? "" : "s"} successfully matched. Nice work!`}
      />
    );
  }

  const handleAcceptGroup = (
    groupName: string,
    userModelName: string,
  ) => {
    interactive.assignUserModelToLayer(groupName, userModelName);
    bulk.checkForPattern(groupName, userModelName);
    setSelectedGroupId(findNextUnmapped(unmappedGroups, groupName));
  };

  const handleBulkInferenceAccept = () => {
    if (!bulk.suggestion) return;
    const bulkNames = new Set(bulk.suggestion.pairs.map((p) => p.sourceName));
    bulk.acceptAll();
    const remaining = unmappedGroups.filter(
      (g) => !bulkNames.has(g.sourceModel.name),
    );
    setSelectedGroupId(remaining[0]?.sourceModel.name ?? null);
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

  // Handle drops on left panel items
  const handleDropOnGroup = (groupName: string, e: React.DragEvent) => {
    e.preventDefault();
    const item = dnd.handleDrop({ destModelName: groupName, isMapped: false });
    if (item) {
      handleAcceptGroup(groupName, item.sourceModelName);
    }
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

        {/* Search */}
        <div className="px-4 py-2 border-b border-border flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[12px] pl-8 pr-3 py-1.5 h-8 rounded bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
            />
          </div>
        </div>

        {bulk.suggestion && (
          <BulkInferenceBanner
            suggestion={bulk.suggestion}
            onAcceptAll={handleBulkInferenceAccept}
            onDismiss={bulk.dismiss}
          />
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-2">
            {families.map((family) => {
              const renderGroup = (group: SourceLayerMapping) => (
                <GroupListCard
                  key={group.sourceModel.name}
                  group={group}
                  isSelected={selectedGroupId === group.sourceModel.name}
                  isChecked={selectedIds.has(group.sourceModel.name)}
                  isDropTarget={dnd.state.activeDropTarget === group.sourceModel.name}
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
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDragEnter={() => dnd.handleDragEnter(group.sourceModel.name)}
                  onDragLeave={() => dnd.handleDragLeave(group.sourceModel.name)}
                  onDrop={(e) => handleDropOnGroup(group.sourceModel.name, e)}
                />
              );

              if (family.items.length === 1) {
                return renderGroup(family.items[0]);
              }
              return (
                <div key={family.prefix}>
                  <FamilyAccordionHeader
                    prefix={family.prefix}
                    count={family.items.length}
                    isExpanded={isExpanded(family.prefix)}
                    onToggle={() => toggle(family.prefix)}
                  />
                  {isExpanded(family.prefix) && (
                    <div className="space-y-2 pl-2 mt-1">
                      {family.items.map(renderGroup)}
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* Right: Source Panel */}
      <div className="w-1/2 flex flex-col bg-surface/50 overflow-hidden">
        {selectedGroup ? (
          <>
            {/* Group Info Header */}
            <div className="px-6 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 rounded">
                  GROUP
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground truncate">
                {selectedGroup.sourceModel.name}
              </h3>
              <p className="text-[12px] text-foreground/40 mt-0.5">
                {selectedGroup.memberNames.length} members &middot; Scenario{" "}
                {selectedGroup.scenario || "A"}
              </p>
              {selectedGroup.memberNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedGroup.memberNames.slice(0, 6).map((member) => (
                    <span
                      key={member}
                      className="px-1.5 py-0.5 text-[10px] bg-foreground/5 text-foreground/40 rounded"
                    >
                      {member}
                    </span>
                  ))}
                  {selectedGroup.memberNames.length > 6 && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-foreground/5 text-foreground/25 rounded">
                      +{selectedGroup.memberNames.length - 6} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Universal Source Panel */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <UniversalSourcePanel
                allModels={interactive.allDestModels}
                suggestions={suggestions}
                sourceFilter={groupSourceFilter}
                assignedNames={interactive.assignedUserModelNames}
                selectedDestLabel={selectedGroup.sourceModel.name}
                onAccept={(userModelName) =>
                  handleAcceptGroup(selectedGroup.sourceModel.name, userModelName)
                }
                dnd={dnd}
              />
            </div>

            {/* Skip */}
            <div className="px-6 py-3 border-t border-border flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupId(findNextUnmapped(unmappedGroups, selectedGroup.sourceModel.name));
                }}
                className="w-full py-2 text-sm text-foreground/40 hover:text-foreground/60 border border-border hover:border-foreground/20 rounded-lg transition-colors"
              >
                Skip This Group
              </button>
            </div>
          </>
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
  isDropTarget,
  interactive,
  onClick,
  onCheck,
  onAccept,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  group: SourceLayerMapping;
  isSelected: boolean;
  isChecked: boolean;
  isDropTarget: boolean;
  interactive: ReturnType<typeof useMappingPhase>["interactive"];
  onClick: () => void;
  onCheck: () => void;
  onAccept: (userModelName: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const topSuggestion = useMemo(() => {
    const suggs = interactive.getSuggestionsForLayer(group.sourceModel);
    return suggs[0] ?? null;
  }, [interactive, group.sourceModel]);

  return (
    <div
      className={`
        p-3 rounded-lg border transition-all duration-200 cursor-pointer
        ${isDropTarget
          ? "bg-accent/10 border-accent/50 ring-2 ring-accent/30"
          : isSelected
            ? "bg-accent/5 border-accent/30 ring-1 ring-accent/20"
            : "bg-surface border-border hover:border-foreground/20"}
      `}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
