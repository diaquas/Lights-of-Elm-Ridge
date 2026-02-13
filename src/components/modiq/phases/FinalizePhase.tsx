"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { PANEL_STYLES } from "../panelStyles";
import { UnlinkIcon } from "../MetadataBadges";
import { FilterPill } from "../SharedHierarchyComponents";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";
import type { ParsedModel } from "@/lib/modiq";

// ─── Types ──────────────────────────────────────────────

type StatusFilter = "all" | "mapped" | "unmapped";

interface DestItem {
  model: ParsedModel;
  sources: string[];
  isMapped: boolean;
  isGroup: boolean;
  isSuperGroup: boolean;
  /** True if this individual model's parent group has a source mapped (group-level coverage) */
  isCoveredByGroup: boolean;
  /** Best suggestion from mapped source layers */
  topSuggestion: { sourceName: string; score: number; effectCount: number } | null;
}

interface DestGroup {
  family: string;
  groupModel: DestItem | null;
  members: DestItem[];
  mappedCount: number;
  totalCount: number;
  /** True when unmapped members are irrelevant (group mapped or all sources accounted for) */
  membersEffectivelyCovered: boolean;
}

interface SourceSuggestion {
  sourceName: string;
  score: number;
  effectCount: number;
  isAlreadyLinked: boolean;
}

interface SourceHierarchyGroup {
  layer: SourceLayerMapping;
  members: SourceSuggestion[];
  isSuperGroup: boolean;
}

// ─── Helpers ────────────────────────────────────────────

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// ─── Component ──────────────────────────────────────────

export function FinalizePhase() {
  const { interactive, goToNextPhase } = useMappingPhase();

  const {
    displayCoverage,
    sourceLayerMappings,
    assignUserModelToLayer,
    removeLinkFromLayer,
    getSuggestionsForLayer,
    destToSourcesMap,
    allDestModels,
    destSuperGroupNames,
    unmappedLayerCount,
  } = interactive;

  // When all source models are accounted for, unmapped individuals inside
  // mapped groups become irrelevant — there's nothing left to assign them.
  const allSourcesAccountedFor = unmappedLayerCount === 0;

  // ── State ──
  const [selectedDestName, setSelectedDestName] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedSourceGroups, setExpandedSourceGroups] = useState<Set<string>>(new Set());

  // ── Auto-skip: if display coverage is 100%, show a completion message ──
  const isFullCoverage = displayCoverage.percent >= 100;

  // ── Build dest items ──
  const destItems = useMemo((): DestItem[] => {
    // First pass: identify which dest groups have sources mapped
    const mappedGroupNames = new Set<string>();
    for (const model of allDestModels) {
      if (model.isGroup) {
        const srcs = destToSourcesMap.get(model.name);
        if (srcs && srcs.size > 0) mappedGroupNames.add(model.name);
      }
    }

    return allDestModels
      .filter((m) => !m.name.startsWith("DMX"))
      .map((model) => {
        const srcs = destToSourcesMap.get(model.name);
        const sourceNames = srcs ? Array.from(srcs) : [];

        // Check if this individual model's parent group is mapped
        let isCoveredByGroup = false;
        if (!model.isGroup) {
          for (const destModel of allDestModels) {
            if (destModel.isGroup && mappedGroupNames.has(destModel.name) && destModel.memberModels?.includes(model.name)) {
              isCoveredByGroup = true;
              break;
            }
          }
        }

        // Find best suggestion from mapped source layers
        let topSugg: DestItem["topSuggestion"] = null;
        if (sourceNames.length === 0) {
          for (const layer of sourceLayerMappings) {
            if (layer.isSkipped || !layer.isMapped) continue;
            const suggestions = getSuggestionsForLayer(layer.sourceModel);
            const match = suggestions.find((s) => s.model.name === model.name);
            if (match && match.score >= 0.40 && (!topSugg || match.score > topSugg.score)) {
              topSugg = { sourceName: layer.sourceModel.name, score: match.score, effectCount: layer.effectCount };
            }
          }
        }
        return {
          model,
          sources: sourceNames,
          isMapped: sourceNames.length > 0,
          isGroup: model.isGroup,
          isSuperGroup: destSuperGroupNames.has(model.name),
          isCoveredByGroup,
          topSuggestion: topSugg,
        };
      });
  }, [allDestModels, destToSourcesMap, sourceLayerMappings, getSuggestionsForLayer, destSuperGroupNames]);

  // ── xLights group membership ──
  const destGroupMembership = useMemo(() => {
    const map = new Map<string, string>();
    for (const model of allDestModels) {
      if (model.isGroup && model.memberModels) {
        for (const member of model.memberModels) {
          map.set(member, model.name);
        }
      }
    }
    return map;
  }, [allDestModels]);

  // ── Counts for filter pills ──
  // An item is "effectively mapped" if: directly mapped, OR covered by its group's mapping,
  // OR all source models are accounted for and it sits inside a group
  const isEffectivelyMapped = useCallback((item: DestItem) => {
    if (item.isMapped) return true;
    if (item.isCoveredByGroup) return true;
    if (allSourcesAccountedFor && destGroupMembership.has(item.model.name)) return true;
    return false;
  }, [allSourcesAccountedFor, destGroupMembership]);

  const totalCount = destItems.filter((d) => !d.isGroup).length;
  const mappedCount = destItems.filter((d) => !d.isGroup && isEffectivelyMapped(d)).length;
  const unmappedCount = totalCount - mappedCount;

  // ── Filtered items ──
  const filteredItems = useMemo(() => {
    let items = destItems;
    if (statusFilter === "mapped") items = items.filter((d) => isEffectivelyMapped(d));
    else if (statusFilter === "unmapped") items = items.filter((d) => !isEffectivelyMapped(d));
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((d) =>
        d.model.name.toLowerCase().includes(q) || d.sources.some((s) => s.toLowerCase().includes(q)),
      );
    }
    // Sort: unmapped first, then alphabetical
    return [...items].sort((a, b) => {
      const aMapped = isEffectivelyMapped(a);
      const bMapped = isEffectivelyMapped(b);
      if (aMapped !== bMapped) return aMapped ? 1 : -1;
      return naturalCompare(a.model.name, b.model.name);
    });
  }, [destItems, statusFilter, search, isEffectivelyMapped]);

  // ── Grouped display ──
  const { superGroups, regularGroups, ungrouped } = useMemo(() => {
    const groupMap = new Map<string, DestItem[]>();
    const groupModels = new Map<string, DestItem>();
    const order: string[] = [];
    const ung: DestItem[] = [];

    for (const item of filteredItems) {
      if (item.isGroup) {
        groupModels.set(item.model.name, item);
        continue;
      }
      const parentGroup = destGroupMembership.get(item.model.name);
      if (parentGroup) {
        if (!groupMap.has(parentGroup)) { groupMap.set(parentGroup, []); order.push(parentGroup); }
        groupMap.get(parentGroup)!.push(item);
      } else {
        ung.push(item);
      }
    }

    const groups: DestGroup[] = order.map((family) => {
      const members = groupMap.get(family)!;
      const gm = groupModels.get(family) ?? null;
      const groupIsMapped = gm?.isMapped ?? false;
      // Members are effectively covered if the group itself is mapped
      // or all source models are already accounted for
      const membersEffectivelyCovered = groupIsMapped || allSourcesAccountedFor;
      return {
        family,
        groupModel: gm,
        members,
        mappedCount: membersEffectivelyCovered
          ? members.length // all count as mapped when covered
          : members.filter((m) => m.isMapped).length,
        totalCount: members.length,
        membersEffectivelyCovered,
      };
    });

    // Sort groups: groups with real unmapped members first
    groups.sort((a, b) => {
      const aAllCovered = a.mappedCount >= a.totalCount;
      const bAllCovered = b.mappedCount >= b.totalCount;
      if (aAllCovered !== bAllCovered) return aAllCovered ? 1 : -1;
      return naturalCompare(a.family, b.family);
    });

    // Separate super groups from regular groups
    const supers = groups.filter((g) => destSuperGroupNames.has(g.family));
    const regulars = groups.filter((g) => !destSuperGroupNames.has(g.family));

    return { superGroups: supers, regularGroups: regulars, ungrouped: ung };
  }, [filteredItems, destGroupMembership, destSuperGroupNames, allSourcesAccountedFor]);

  // ── Selected item ──
  const selectedItem = useMemo((): DestItem | null => {
    if (!selectedDestName) return null;
    return destItems.find((d) => d.model.name === selectedDestName) ?? null;
  }, [selectedDestName, destItems]);

  // ── Suggestions for selected dest item ──
  // In this phase, we show ALL mapped source layers as potential sources.
  // Many-to-one is allowed in source→dest direction (multiple dests can share a source).
  const suggestionsForSelected = useMemo((): SourceSuggestion[] => {
    if (!selectedItem) return [];
    const results: SourceSuggestion[] = [];
    const existingSources = new Set(selectedItem.sources);

    for (const layer of sourceLayerMappings) {
      if (layer.isSkipped) continue;
      if (layer.effectCount === 0) continue;

      // Get suggestion score for this dest from this source
      const suggestions = getSuggestionsForLayer(layer.sourceModel);
      const match = suggestions.find((s) => s.model.name === selectedItem.model.name);
      const score = match?.score ?? 0;

      results.push({
        sourceName: layer.sourceModel.name,
        score,
        effectCount: layer.effectCount,
        isAlreadyLinked: existingSources.has(layer.sourceModel.name),
      });
    }

    // Sort: already-linked first (for visibility), then by score desc, then by effect count
    results.sort((a, b) => {
      if (a.isAlreadyLinked !== b.isAlreadyLinked) return a.isAlreadyLinked ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return b.effectCount - a.effectCount;
    });

    return results;
  }, [selectedItem, sourceLayerMappings, getSuggestionsForLayer]);

  // Split suggestions into matched vs all
  const { matchedSuggestions, otherSources } = useMemo(() => {
    const matched = suggestionsForSelected.filter((s) => s.score >= 0.40 && !s.isAlreadyLinked);
    const others = suggestionsForSelected.filter((s) => (s.score < 0.40 || s.score === 0) && !s.isAlreadyLinked);
    return { matchedSuggestions: matched, otherSources: others };
  }, [suggestionsForSelected]);

  // ── Source hierarchy for "All Sources" section ──
  const sourceHierarchy = useMemo(() => {
    if (otherSources.length === 0) return null;

    // Build lookup from source name → layer
    const layerByName = new Map<string, SourceLayerMapping>();
    for (const layer of sourceLayerMappings) {
      layerByName.set(layer.sourceModel.name, layer);
    }

    // Build lookup from source name → SourceSuggestion
    const suggByName = new Map<string, SourceSuggestion>();
    for (const s of otherSources) suggByName.set(s.sourceName, s);

    // Build member→group mapping from source layers
    const memberToParent = new Map<string, string>();
    const groupLayers: SourceLayerMapping[] = [];
    for (const layer of sourceLayerMappings) {
      if (layer.isGroup && !layer.isSkipped && layer.effectCount > 0) {
        groupLayers.push(layer);
        for (const memberName of layer.memberNames) {
          // Prefer most-specific (smallest) group
          const existingParent = memberToParent.get(memberName);
          if (!existingParent) {
            memberToParent.set(memberName, layer.sourceModel.name);
          } else {
            const existingLayer = layerByName.get(existingParent);
            if (existingLayer && layer.memberNames.length < existingLayer.memberNames.length) {
              memberToParent.set(memberName, layer.sourceModel.name);
            }
          }
        }
      }
    }

    // Build hierarchy groups — only include groups that have at least one member in otherSources
    const groups: SourceHierarchyGroup[] = [];
    const groupedSourceNames = new Set<string>();

    for (const gl of groupLayers) {
      const members: SourceSuggestion[] = [];
      for (const memberName of gl.memberNames) {
        const sugg = suggByName.get(memberName);
        if (sugg) members.push(sugg);
      }
      // Also check if the group itself is in otherSources (it could be a suggestion)
      const groupSugg = suggByName.get(gl.sourceModel.name);

      if (members.length === 0 && !groupSugg) continue;

      for (const m of members) groupedSourceNames.add(m.sourceName);
      if (groupSugg) groupedSourceNames.add(groupSugg.sourceName);

      groups.push({
        layer: gl,
        members,
        isSuperGroup: gl.isSuperGroup,
      });
    }

    // Ungrouped: sources not claimed by any group
    const ungrouped = otherSources.filter((s) => !groupedSourceNames.has(s.sourceName));

    const superGroups = groups.filter((g) => g.isSuperGroup);
    const regularGroups = groups.filter((g) => !g.isSuperGroup);

    // Sort: groups with more members first, then alphabetical
    const sortFn = (a: SourceHierarchyGroup, b: SourceHierarchyGroup) =>
      naturalCompare(a.layer.sourceModel.name, b.layer.sourceModel.name);
    superGroups.sort(sortFn);
    regularGroups.sort(sortFn);

    return { superGroups, regularGroups, ungrouped };
  }, [otherSources, sourceLayerMappings]);

  // ── Handlers ──
  const handleAssign = useCallback((sourceName: string, destName: string) => {
    assignUserModelToLayer(sourceName, destName);
  }, [assignUserModelToLayer]);

  const handleRemoveLink = useCallback((sourceName: string, destName: string) => {
    removeLinkFromLayer(sourceName, destName);
  }, [removeLinkFromLayer]);

  const toggleGroup = useCallback((family: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return next;
    });
  }, []);

  const handleAcceptSuggestion = useCallback((destName: string, sourceName: string) => {
    assignUserModelToLayer(sourceName, destName);
  }, [assignUserModelToLayer]);

  const toggleSourceGroup = useCallback((name: string) => {
    setExpandedSourceGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // ── Full coverage state ──
  if (isFullCoverage && !selectedDestName) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-5">
            <span>&#127775;</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">100% Display Coverage!</h3>
          <p className="text-sm text-foreground/50 mt-2">
            Every model in your display has at least one source mapped to it.
            You can still review and adjust mappings, or proceed to the next step.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button type="button" onClick={() => setSelectedDestName(destItems[0]?.model.name ?? null)}
              className="px-5 py-2 text-sm text-foreground/60 border border-border hover:border-foreground/20 rounded-lg transition-colors">
              Review Mappings
            </button>
            <button type="button" onClick={goToNextPhase}
              className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-all duration-200">
              Continue to Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* LEFT PANEL: Destination (Display) Models               */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="w-1/2 flex flex-col border-r border-border overflow-hidden">
        {/* Header */}
        <div className={PANEL_STYLES.header.wrapper}>
          <h2 className={PANEL_STYLES.header.title}>
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Display Coverage
          </h2>
          <p className={PANEL_STYLES.header.subtitle}>
            {displayCoverage.covered}/{displayCoverage.total} models covered ({displayCoverage.percent}%)
          </p>
          {/* Filter pills */}
          <div className="flex items-center gap-1 mt-1.5">
            <FilterPill label={`All (${totalCount})`} color="blue" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
            <FilterPill label={`Mapped (${mappedCount})`} color="green" active={statusFilter === "mapped"} onClick={() => setStatusFilter("mapped")} />
            <FilterPill label={`Unmapped (${unmappedCount})`} color="amber" active={statusFilter === "unmapped"} onClick={() => setStatusFilter("unmapped")} />
          </div>
        </div>

        {/* Search */}
        <div className={PANEL_STYLES.search.wrapper}>
          <div className="relative">
            <svg className={PANEL_STYLES.search.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search display models..." value={search} onChange={(e) => setSearch(e.target.value)}
              className={`${PANEL_STYLES.search.input} ${search ? "pr-8" : ""}`} />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable list */}
        <div className={PANEL_STYLES.scrollArea}>
          <div className="px-4 pb-3 space-y-1">
            {/* Display-Wide Super Groups section */}
            {superGroups.length > 0 && (
              <DestSuperGroupSection
                superGroups={superGroups}
                expandedGroups={expandedGroups}
                selectedDestName={selectedDestName}
                onToggle={toggleGroup}
                onSelect={setSelectedDestName}
                onAcceptSuggestion={handleAcceptSuggestion}
              />
            )}

            {/* Regular grouped dest models */}
            {regularGroups.map((group) => (
              <DestGroupCard
                key={group.family}
                group={group}
                isExpanded={expandedGroups.has(group.family)}
                selectedDestName={selectedDestName}
                onToggle={() => toggleGroup(group.family)}
                onSelect={setSelectedDestName}
                onAcceptSuggestion={handleAcceptSuggestion}
              />
            ))}

            {/* Divider */}
            {(superGroups.length + regularGroups.length) > 0 && ungrouped.length > 0 && (
              <div className="flex items-center gap-2 py-1 text-[10px] text-foreground/25">
                <div className="flex-1 h-px bg-border/40" />
                <span className="uppercase tracking-wider font-semibold">Ungrouped</span>
                <div className="flex-1 h-px bg-border/40" />
              </div>
            )}

            {/* Ungrouped dest models */}
            {ungrouped.map((item) => (
              <DestItemCard
                key={item.model.name}
                item={item}
                isSelected={selectedDestName === item.model.name}
                onSelect={() => setSelectedDestName(item.model.name)}
                onAcceptSuggestion={handleAcceptSuggestion}
              />
            ))}

            {filteredItems.length === 0 && (
              <p className="py-6 text-center text-[12px] text-foreground/30">
                {search || statusFilter !== "all" ? "No matches for current filters" : "No display models"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* RIGHT PANEL: Source Suggestions for Selected Dest       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="w-1/2 flex flex-col bg-surface/50 overflow-hidden">
        {selectedItem ? (
          <>
            {/* Selected item header */}
            <div className={PANEL_STYLES.header.wrapper}>
              <div className="flex items-center gap-2">
                {selectedItem.isSuperGroup && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-500/15 text-purple-400 rounded">SUPER</span>
                )}
                {selectedItem.isGroup && !selectedItem.isSuperGroup && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 rounded">GRP</span>
                )}
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {selectedItem.model.name}
                </h3>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-foreground/40">
                {selectedItem.model.pixelCount ? <span>{selectedItem.model.pixelCount}px</span> : null}
                <span>{selectedItem.model.type}</span>
                {selectedItem.isMapped && (
                  <span className="text-green-400/70">{selectedItem.sources.length} source{selectedItem.sources.length !== 1 ? "s" : ""} mapped</span>
                )}
                {!selectedItem.isMapped && selectedItem.isCoveredByGroup && (
                  <span className="text-green-400/50">covered by group</span>
                )}
                {!selectedItem.isMapped && !selectedItem.isCoveredByGroup && (
                  <span className="text-amber-400/70">unmapped</span>
                )}
              </div>
            </div>

            {/* Current mappings (if any) */}
            {selectedItem.isMapped && (
              <div className="px-5 py-3 border-b border-border flex-shrink-0">
                <div className="rounded-lg border border-green-500/25 bg-green-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[10px] font-semibold text-green-400/70 uppercase tracking-wider">Currently Receiving From</span>
                  </div>
                  <div className="space-y-1.5 ml-5.5">
                    {selectedItem.sources.map((src) => {
                      const layer = sourceLayerMappings.find((l) => l.sourceModel.name === src);
                      return (
                        <div key={src} className="flex items-center gap-2 group/src">
                          <span className="text-[13px] font-semibold text-foreground truncate flex-1">{src}</span>
                          {layer && (
                            <span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0">{layer.effectCount} fx</span>
                          )}
                          <button type="button" onClick={() => handleRemoveLink(src, selectedItem.model.name)}
                            className="w-5 h-5 flex items-center justify-center rounded text-foreground/20 hover:text-amber-400 hover:bg-amber-500/10 transition-colors flex-shrink-0 opacity-0 group-hover/src:opacity-100"
                            aria-label={`Unlink ${src}`} title={`Unlink ${src}`}>
                            <UnlinkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Source suggestions panel */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* AI Suggestions (score >= 40%) */}
              {matchedSuggestions.length > 0 && (
                <div className="px-6 py-3 border-b border-border bg-surface/50">
                  <h4 className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide mb-2">
                    Suggested Sources ({matchedSuggestions.length})
                  </h4>
                  <div className="space-y-1.5">
                    {matchedSuggestions.slice(0, 5).map((sugg, index) => (
                      <button key={sugg.sourceName} type="button"
                        onClick={() => handleAssign(sugg.sourceName, selectedItem.model.name)}
                        className={`w-full p-2.5 rounded-lg text-left transition-all duration-200 ${
                          index === 0
                            ? "bg-accent/8 border border-accent/25 hover:border-accent/40"
                            : "bg-foreground/3 border border-border hover:border-foreground/20"
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            {index === 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-accent/15 text-accent rounded flex-shrink-0">BEST</span>
                            )}
                            <span className="text-[13px] font-medium text-foreground truncate">{sugg.sourceName}</span>
                          </div>
                          <span className={`text-[11px] font-semibold tabular-nums flex-shrink-0 px-1.5 py-0.5 rounded ${
                            sugg.score >= 0.70 ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"
                          }`}>
                            {Math.round(sugg.score * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-foreground/40 mt-0.5">
                          <span>{sugg.effectCount} effects</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All available sources — organized by hierarchy */}
              <div className="px-6 py-3">
                <h4 className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide mb-2">
                  All Sources ({otherSources.length})
                </h4>
                {otherSources.length === 0 && matchedSuggestions.length === 0 ? (
                  <p className="text-center py-6 text-[12px] text-foreground/30">No available sources</p>
                ) : sourceHierarchy ? (
                  <div className="space-y-1">
                    {/* Display-Wide Super Groups */}
                    {sourceHierarchy.superGroups.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-2 px-1 py-1 text-[10px] text-purple-400/60">
                          <span className="font-bold uppercase tracking-wider">Display-Wide</span>
                          <span>({sourceHierarchy.superGroups.length})</span>
                        </div>
                        <div className="space-y-1">
                          {sourceHierarchy.superGroups.map((group) => (
                            <SourceGroupRow
                              key={group.layer.sourceModel.name}
                              group={group}
                              isExpanded={expandedSourceGroups.has(group.layer.sourceModel.name)}
                              onToggle={() => toggleSourceGroup(group.layer.sourceModel.name)}
                              onAssign={(sourceName) => handleAssign(sourceName, selectedItem!.model.name)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regular Source Groups */}
                    {sourceHierarchy.regularGroups.map((group) => (
                      <SourceGroupRow
                        key={group.layer.sourceModel.name}
                        group={group}
                        isExpanded={expandedSourceGroups.has(group.layer.sourceModel.name)}
                        onToggle={() => toggleSourceGroup(group.layer.sourceModel.name)}
                        onAssign={(sourceName) => handleAssign(sourceName, selectedItem!.model.name)}
                      />
                    ))}

                    {/* Ungrouped divider */}
                    {(sourceHierarchy.superGroups.length + sourceHierarchy.regularGroups.length) > 0 && sourceHierarchy.ungrouped.length > 0 && (
                      <div className="flex items-center gap-2 py-1 text-[10px] text-foreground/25">
                        <div className="flex-1 h-px bg-border/40" />
                        <span className="uppercase tracking-wider font-semibold">Ungrouped</span>
                        <div className="flex-1 h-px bg-border/40" />
                      </div>
                    )}

                    {/* Ungrouped individual sources */}
                    {sourceHierarchy.ungrouped.map((sugg) => (
                      <SourceItemButton
                        key={sugg.sourceName}
                        sugg={sugg}
                        onAssign={(sourceName) => handleAssign(sourceName, selectedItem!.model.name)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {otherSources.map((sugg) => (
                      <SourceItemButton
                        key={sugg.sourceName}
                        sugg={sugg}
                        onAssign={(sourceName) => handleAssign(sourceName, selectedItem!.model.name)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground/30">
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-foreground/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              <p className="text-sm">Select a display model to assign sources</p>
              <p className="text-xs text-foreground/20 mt-1.5">
                {unmappedCount > 0
                  ? `${unmappedCount} model${unmappedCount !== 1 ? "s" : ""} still need sources`
                  : "All models have sources assigned"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Source Item Button (Right Panel — individual source) ────────

function SourceItemButton({ sugg, onAssign }: {
  sugg: SourceSuggestion;
  onAssign: (sourceName: string) => void;
}) {
  return (
    <button type="button"
      onClick={() => onAssign(sugg.sourceName)}
      className="w-full flex items-center gap-2 rounded-lg min-h-[34px] px-2.5 py-1.5 transition-all duration-150 border border-border bg-surface hover:border-foreground/20 hover:bg-foreground/[0.02] cursor-pointer">
      <span className="text-[12px] font-medium truncate flex-1 min-w-0 text-foreground/70">{sugg.sourceName}</span>
      <span className="text-[10px] text-foreground/25 flex-shrink-0 tabular-nums">{sugg.effectCount} fx</span>
      {sugg.score > 0 && (
        <span className="text-[10px] text-foreground/30 flex-shrink-0 tabular-nums">{Math.round(sugg.score * 100)}%</span>
      )}
    </button>
  );
}

// ─── Source Group Row (Right Panel — collapsible group) ────────

function SourceGroupRow({ group, isExpanded, onToggle, onAssign }: {
  group: SourceHierarchyGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onAssign: (sourceName: string) => void;
}) {
  const groupBorder = group.isSuperGroup
    ? "border-l-purple-400/40"
    : "border-l-blue-400/40";
  const bgClass = group.isSuperGroup
    ? "border-border/60 bg-purple-500/[0.03]"
    : "border-border/60 bg-foreground/[0.02]";

  return (
    <div className={`rounded-lg border overflow-hidden transition-all border-l-[3px] ${groupBorder} ${bgClass}`}>
      {/* Group header — clicking assigns the group itself */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <button type="button" onClick={onToggle} className="flex-shrink-0 p-0.5">
          <svg
            className={`w-3 h-3 ${group.isSuperGroup ? "text-purple-400/60" : "text-foreground/40"} transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {group.isSuperGroup
          ? <span className="px-1 py-px text-[9px] font-bold bg-purple-500/15 text-purple-400 rounded flex-shrink-0">SUPER</span>
          : <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 rounded flex-shrink-0">GRP</span>
        }
        <button type="button" onClick={() => onAssign(group.layer.sourceModel.name)}
          className="text-[12px] font-semibold text-foreground/70 truncate hover:text-foreground transition-colors text-left flex-1 min-w-0">
          {group.layer.sourceModel.name}
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-foreground/25 tabular-nums">{group.layer.effectCount} fx</span>
          <span className="text-[10px] text-foreground/30 tabular-nums">{group.members.length}m</span>
        </div>
      </div>

      {/* Expanded members */}
      {isExpanded && group.members.length > 0 && (
        <div className={`px-2.5 pb-2 pl-5 space-y-0.5 border-t ${group.isSuperGroup ? "border-purple-400/10" : "border-border/30"}`}>
          <div className="pt-1">
            {group.members.map((sugg) => (
              <SourceItemButton key={sugg.sourceName} sugg={sugg} onAssign={onAssign} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dest Item Card (Left Panel) ─────────────────────────

function DestItemCard({ item, isSelected, indent, onSelect, onAcceptSuggestion }: {
  item: DestItem;
  isSelected: boolean;
  indent?: boolean;
  onSelect: () => void;
  onAcceptSuggestion: (destName: string, sourceName: string) => void;
}) {
  const leftBorder = item.isMapped
    ? "border-l-green-500/70"
    : item.isCoveredByGroup
      ? "border-l-green-500/30"
      : item.topSuggestion
        ? "border-l-red-400/70"
        : "border-l-amber-400/70";

  return (
    <div
      className={`
        w-full px-3 py-1.5 rounded-lg text-left transition-all duration-200 cursor-pointer border-l-[3px] ${leftBorder}
        ${isSelected
          ? "bg-accent/5 border border-accent/30 ring-1 ring-accent/20"
          : "bg-surface border border-border hover:border-foreground/20"
        }
        ${indent ? "ml-4" : ""}
      `}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[12px] font-medium text-foreground truncate flex-shrink min-w-0">{item.model.name}</span>
        {item.model.pixelCount > 0 && (
          <>
            <span className="text-foreground/15 flex-shrink-0">&middot;</span>
            <span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0">{item.model.pixelCount}px</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          {item.isMapped && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400/70 truncate max-w-[180px]">
              &larr; {item.sources[0]}{item.sources.length > 1 ? ` +${item.sources.length - 1}` : ""}
            </span>
          )}
          {!item.isMapped && item.isCoveredByGroup && (
            <span className="text-[10px] text-green-400/40 italic">via group</span>
          )}
          {!item.isMapped && !item.isCoveredByGroup && item.topSuggestion && (
            <>
              <span className="text-[11px] text-foreground/50 truncate max-w-[140px]">{item.topSuggestion.sourceName}</span>
              <span className={`text-[10px] font-semibold tabular-nums px-1 py-0.5 rounded ${
                item.topSuggestion.score >= 0.70 ? "bg-green-500/10 text-green-400/70" : "bg-amber-500/10 text-amber-400/70"
              }`}>
                {Math.round(item.topSuggestion.score * 100)}%
              </span>
              <button type="button" onClick={(e) => { e.stopPropagation(); onAcceptSuggestion(item.model.name, item.topSuggestion!.sourceName); }}
                className="p-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors" title="Accept suggested match">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.77 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dest Super Group Section ────────────────────────────

function DestSuperGroupSection({ superGroups, expandedGroups, selectedDestName, onToggle, onSelect, onAcceptSuggestion }: {
  superGroups: DestGroup[];
  expandedGroups: Set<string>;
  selectedDestName: string | null;
  onToggle: (name: string) => void;
  onSelect: (name: string) => void;
  onAcceptSuggestion: (destName: string, sourceName: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-3">
      <button type="button" onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-1 py-1.5 text-left group">
        <svg className={`w-3 h-3 text-purple-400/60 transition-transform duration-150 ${collapsed ? "" : "rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-[11px] font-bold text-purple-400/80 uppercase tracking-wider">
          Display-Wide Groups
        </span>
        <span className="text-[10px] text-purple-400/50">({superGroups.length})</span>
      </button>

      {!collapsed && (
        <>
          <p className="text-[10px] text-foreground/30 px-1 pb-2 leading-relaxed">
            These groups span your entire display or large sections. They will only be suggested for matching with equivalent display-wide source groups.
          </p>
          <div className="space-y-1">
            {superGroups.map((group) => (
              <DestGroupCard
                key={group.family}
                group={group}
                isSuperGroup
                isExpanded={expandedGroups.has(group.family)}
                selectedDestName={selectedDestName}
                onToggle={() => onToggle(group.family)}
                onSelect={onSelect}
                onAcceptSuggestion={onAcceptSuggestion}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Dest Group Card (Left Panel) ────────────────────────

function DestGroupCard({ group, isSuperGroup, isExpanded, selectedDestName, onToggle, onSelect, onAcceptSuggestion }: {
  group: DestGroup;
  isSuperGroup?: boolean;
  isExpanded: boolean;
  selectedDestName: string | null;
  onToggle: () => void;
  onSelect: (name: string) => void;
  onAcceptSuggestion: (destName: string, sourceName: string) => void;
}) {
  const allCovered = group.mappedCount >= group.totalCount;
  const groupBorder = isSuperGroup
    ? (allCovered ? "border-l-purple-500/70" : "border-l-purple-400/40")
    : (allCovered ? "border-l-green-500/70" : "border-l-amber-400/70");
  const isGroupSelected = selectedDestName === group.family;
  const bgClass = isSuperGroup
    ? (isGroupSelected ? "border-accent/30 ring-1 ring-accent/20 bg-accent/5" : "border-border/60 bg-purple-500/[0.03]")
    : (isGroupSelected ? "border-accent/30 ring-1 ring-accent/20 bg-accent/5" : "border-border/60 bg-foreground/[0.02]");

  return (
    <div className={`rounded-lg border overflow-hidden transition-all border-l-[3px] ${groupBorder} ${bgClass}`}>
      {/* Group header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer" onClick={() => group.groupModel ? onSelect(group.family) : onToggle()}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(); }} className="flex-shrink-0 p-0.5">
          <svg className={`w-3 h-3 ${isSuperGroup ? "text-purple-400/60" : "text-foreground/40"} transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {isSuperGroup
          ? <span className="px-1 py-px text-[9px] font-bold bg-purple-500/15 text-purple-400 rounded">SUPER</span>
          : <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 rounded">GRP</span>
        }
        <span className="text-[12px] font-semibold text-foreground/70 truncate">{group.family}</span>
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-semibold tabular-nums flex-shrink-0 ${allCovered ? "text-green-400/60" : "text-foreground/40"}`}>
            {group.mappedCount}/{group.totalCount}
          </span>
          {group.membersEffectivelyCovered && !allCovered && (
            <span className="text-[9px] text-foreground/25 italic">covered</span>
          )}
          {group.groupModel?.isMapped && (
            <span className="text-[10px] text-green-400/70 truncate max-w-[120px]">
              &larr; {group.groupModel.sources[0]}
            </span>
          )}
        </div>
      </div>
      {/* Expanded children */}
      {isExpanded && (
        <div className={`px-3 pb-2 pl-5 space-y-1 border-t ${isSuperGroup ? "border-purple-400/10" : "border-border/30"}`}>
          <div className="pt-1">
            {group.members.map((item) => (
              <DestItemCard
                key={item.model.name}
                item={item}
                isSelected={selectedDestName === item.model.name}
                onSelect={() => onSelect(item.model.name)}
                onAcceptSuggestion={onAcceptSuggestion}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
