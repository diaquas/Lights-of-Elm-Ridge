"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useMappingPhase, extractFamily } from "@/contexts/MappingPhaseContext";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

// ─── Types ──────────────────────────────────────────────

interface DestDisplayItem {
  model: { name: string; isGroup: boolean };
  sources: string[];
  isMapped: boolean;
}

interface SuggestionHit {
  sourceName: string;
  score: number;
  effectCount: number;
}

interface DarkGroup {
  family: string;
  items: DestDisplayItem[];
  /** Best suggestion across all items in this group */
  topSuggestion: SuggestionHit | null;
}

// ─── Helpers ────────────────────────────────────────────

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function coverageColor(pct: number): string {
  if (pct >= 90) return "text-green-400";
  if (pct >= 75) return "text-yellow-400";
  if (pct >= 50) return "text-orange-400";
  return "text-red-400";
}

function coverageBarColor(pct: number): string {
  if (pct >= 90) return "bg-green-500";
  if (pct >= 75) return "bg-yellow-500";
  if (pct >= 50) return "bg-orange-500";
  return "bg-red-500";
}

// ─── Component ──────────────────────────────────────────

export function FinalizePhase() {
  const { phaseItems, interactive } = useMappingPhase();

  const {
    displayCoverage,
    sourceLayerMappings,
    assignUserModelToLayer,
    removeLinkFromLayer,
    getSuggestionsForLayer,
    destToSourcesMap,
    allDestModels,
  } = interactive;

  // ── State ──
  const [search, setSearch] = useState("");
  const [needsAttentionOpen, setNeedsAttentionOpen] = useState(true);
  const [mappedOpen, setMappedOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [trayOpen, setTrayOpen] = useState(true);
  const [traySearch, setTraySearch] = useState("");
  const [inlinePicker, setInlinePicker] = useState<{ destName: string; anchorRect?: DOMRect } | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [batchPicker, setBatchPicker] = useState<{ family: string } | null>(null);

  // Coverage delta toast
  const [deltaToast, setDeltaToast] = useState<string | null>(null);
  const prevCoveredRef = useRef(displayCoverage.covered);

  useEffect(() => {
    const diff = displayCoverage.covered - prevCoveredRef.current;
    if (diff > 0) {
      setDeltaToast(`+${diff} model${diff > 1 ? "s" : ""} mapped`);
      const t = setTimeout(() => setDeltaToast(null), 2000);
      prevCoveredRef.current = displayCoverage.covered;
      return () => clearTimeout(t);
    }
    prevCoveredRef.current = displayCoverage.covered;
  }, [displayCoverage.covered]);

  // ══════════════════════════════════════════════════════
  // DATA
  // ══════════════════════════════════════════════════════

  // All dest models (non-DMX, non-group = physical props)
  const { darkItems, mappedItems } = useMemo(() => {
    const dark: DestDisplayItem[] = [];
    const mapped: DestDisplayItem[] = [];
    const displayModels = allDestModels.filter(
      (m) => !m.name.startsWith("DMX") && !m.isGroup,
    );
    for (const model of displayModels) {
      const srcs = destToSourcesMap.get(model.name);
      const sourceNames = srcs ? Array.from(srcs) : [];
      const item: DestDisplayItem = {
        model: { name: model.name, isGroup: model.isGroup },
        sources: sourceNames,
        isMapped: sourceNames.length > 0,
      };
      if (item.isMapped) mapped.push(item);
      else dark.push(item);
    }
    // Also include mapped groups
    for (const model of allDestModels.filter((m) => !m.name.startsWith("DMX") && m.isGroup)) {
      const srcs = destToSourcesMap.get(model.name);
      const sourceNames = srcs ? Array.from(srcs) : [];
      if (sourceNames.length > 0) {
        mapped.push({ model: { name: model.name, isGroup: true }, sources: sourceNames, isMapped: true });
      }
    }
    dark.sort((a, b) => naturalCompare(a.model.name, b.model.name));
    mapped.sort((a, b) => naturalCompare(a.model.name, b.model.name));
    return { darkItems: dark, mappedItems: mapped };
  }, [allDestModels, destToSourcesMap]);

  // ── Suggestions for dark items (cached) ──
  const darkSuggestions = useMemo(() => {
    const map = new Map<string, SuggestionHit[]>();
    for (const item of darkItems) {
      const hits: SuggestionHit[] = [];
      for (const layer of sourceLayerMappings) {
        if (layer.isSkipped || !layer.isMapped) continue;
        const suggestions = getSuggestionsForLayer(layer.sourceModel);
        const match = suggestions.find((s) => s.model.name === item.model.name);
        if (match && match.score >= 0.40) {
          hits.push({ sourceName: layer.sourceModel.name, score: match.score, effectCount: layer.effectCount });
        }
      }
      if (hits.length > 0) {
        hits.sort((a, b) => b.score - a.score);
        map.set(item.model.name, hits.slice(0, 5));
      }
    }
    return map;
  }, [darkItems, sourceLayerMappings, getSuggestionsForLayer]);

  // ── Smart grouping of dark items by family ──
  const darkGroups = useMemo((): DarkGroup[] => {
    const familyMap = new Map<string, DestDisplayItem[]>();
    for (const item of darkItems) {
      const family = extractFamily(item.model.name);
      const list = familyMap.get(family) ?? [];
      list.push(item);
      familyMap.set(family, list);
    }

    const groups: DarkGroup[] = [];
    const standaloneItems: DestDisplayItem[] = [];

    for (const [family, items] of familyMap) {
      if (items.length === 1) {
        standaloneItems.push(items[0]);
      } else {
        // Find top suggestion across group
        let topSugg: SuggestionHit | null = null;
        for (const item of items) {
          const suggs = darkSuggestions.get(item.model.name);
          if (suggs && suggs.length > 0) {
            if (!topSugg || suggs[0].score > topSugg.score) {
              topSugg = suggs[0];
            }
          }
        }
        groups.push({ family, items, topSuggestion: topSugg });
      }
    }

    groups.sort((a, b) => b.items.length - a.items.length);

    if (standaloneItems.length > 0) {
      groups.push({
        family: "Standalone Models",
        items: standaloneItems,
        topSuggestion: null,
      });
    }

    return groups;
  }, [darkItems, darkSuggestions]);

  // Items with suggestions for "Accept All"
  const suggestedCount = useMemo(() => {
    let count = 0;
    for (const item of darkItems) {
      if (darkSuggestions.has(item.model.name)) count++;
    }
    return count;
  }, [darkItems, darkSuggestions]);

  // Filtered groups by search
  const filteredDarkGroups = useMemo(() => {
    if (!search.trim()) return darkGroups;
    const q = search.toLowerCase();
    return darkGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.model.name.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [darkGroups, search]);

  const filteredMapped = useMemo(() => {
    if (!search.trim()) return mappedItems;
    const q = search.toLowerCase();
    return mappedItems.filter(
      (i) => i.model.name.toLowerCase().includes(q) || i.sources.some((s) => s.toLowerCase().includes(q)),
    );
  }, [mappedItems, search]);

  // ── Source tray data ──
  const sourceTrayItems = useMemo(() => {
    return sourceLayerMappings
      .filter((l) => !l.isSkipped && l.isMapped)
      .sort((a, b) => b.effectCount - a.effectCount); // highest effect count first
  }, [sourceLayerMappings]);

  const filteredTrayItems = useMemo(() => {
    if (!traySearch.trim()) return sourceTrayItems;
    const q = traySearch.toLowerCase();
    return sourceTrayItems.filter((l) => l.sourceModel.name.toLowerCase().includes(q));
  }, [sourceTrayItems, traySearch]);

  // ── Inline picker sources (with suggestions first) ──
  const pickerSources = useMemo(() => {
    if (!inlinePicker) return { suggested: [] as { name: string; effectCount: number; score: number; isSuggested: boolean }[], rest: [] as { name: string; effectCount: number; score: number; isSuggested: boolean }[] };
    const destName = inlinePicker.destName;
    const suggs = darkSuggestions.get(destName) ?? [];
    const suggNames = new Set(suggs.map((s) => s.sourceName));

    const allSources = sourceLayerMappings
      .filter((l) => !l.isSkipped && l.isMapped)
      .sort((a, b) => naturalCompare(a.sourceModel.name, b.sourceModel.name));

    const suggested = allSources.filter((l) => suggNames.has(l.sourceModel.name));
    const rest = allSources.filter((l) => !suggNames.has(l.sourceModel.name));

    const q = pickerSearch.toLowerCase();
    const filter = (l: SourceLayerMapping) =>
      !q || l.sourceModel.name.toLowerCase().includes(q);

    return {
      suggested: suggested.filter(filter).map((l) => ({
        name: l.sourceModel.name,
        effectCount: l.effectCount,
        score: suggs.find((s) => s.sourceName === l.sourceModel.name)?.score ?? 0,
        isSuggested: true,
      })),
      rest: rest.filter(filter).map((l) => ({
        name: l.sourceModel.name,
        effectCount: l.effectCount,
        score: 0,
        isSuggested: false,
      })),
    };
  }, [inlinePicker, darkSuggestions, sourceLayerMappings, pickerSearch]);

  // ── Batch picker sources ──
  const batchPickerSources = useMemo(() => {
    if (!batchPicker) return [];
    const group = darkGroups.find((g) => g.family === batchPicker.family);
    if (!group) return [];

    // Find suggestions that appear across multiple items in the group
    const scoreMap = new Map<string, number>();
    for (const item of group.items) {
      const suggs = darkSuggestions.get(item.model.name);
      if (suggs) {
        for (const s of suggs) {
          scoreMap.set(s.sourceName, Math.max(scoreMap.get(s.sourceName) ?? 0, s.score));
        }
      }
    }

    const ranked = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return ranked.map(([name, score]) => {
      const layer = sourceLayerMappings.find((l) => l.sourceModel.name === name);
      return { name, score, effectCount: layer?.effectCount ?? 0 };
    });
  }, [batchPicker, darkGroups, darkSuggestions, sourceLayerMappings]);

  // ── Handlers ──

  const handleAcceptSuggestion = useCallback(
    (sourceName: string, destName: string) => {
      assignUserModelToLayer(sourceName, destName);
    },
    [assignUserModelToLayer],
  );

  const handleAcceptAllSuggestions = useCallback(() => {
    for (const item of darkItems) {
      const suggs = darkSuggestions.get(item.model.name);
      if (suggs && suggs.length > 0) {
        assignUserModelToLayer(suggs[0].sourceName, item.model.name);
      }
    }
  }, [darkItems, darkSuggestions, assignUserModelToLayer]);

  const handleBatchAssign = useCallback(
    (family: string, sourceName: string) => {
      const group = darkGroups.find((g) => g.family === family);
      if (!group) return;
      for (const item of group.items) {
        assignUserModelToLayer(sourceName, item.model.name);
      }
      setBatchPicker(null);
    },
    [darkGroups, assignUserModelToLayer],
  );

  const handleRemoveLink = useCallback(
    (sourceName: string, destName: string) => {
      removeLinkFromLayer(sourceName, destName);
    },
    [removeLinkFromLayer],
  );

  const toggleGroup = useCallback((family: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return next;
    });
  }, []);

  const openInlinePicker = useCallback((destName: string) => {
    setInlinePicker({ destName });
    setPickerSearch("");
  }, []);

  const handleTrayAssign = useCallback(
    (sourceName: string, destName: string) => {
      assignUserModelToLayer(sourceName, destName);
    },
    [assignUserModelToLayer],
  );

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════

  const pct = displayCoverage.percent;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Coverage Bar Header ── */}
      <div className="px-6 py-3 border-b border-border flex-shrink-0 bg-surface">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-foreground/50">Display Coverage</span>
            <div className="flex items-center gap-2">
              <span className={`text-[15px] font-bold tabular-nums ${coverageColor(pct)}`}>
                {pct}%
              </span>
              <span className="text-[11px] text-foreground/35 tabular-nums">
                ({displayCoverage.covered}/{displayCoverage.total})
              </span>
              {pct >= 100 && (
                <span className="text-green-400 text-[12px]">&#10003;</span>
              )}
              {deltaToast && (
                <span className="text-[11px] text-green-400 font-medium animate-pulse">
                  {deltaToast}
                </span>
              )}
            </div>
          </div>
          <div className="w-full h-2.5 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${coverageBarColor(pct)}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      {darkItems.length > 0 && (
        <div className="px-6 py-2 border-b border-border/50 flex-shrink-0 flex items-center gap-3">
          {suggestedCount > 0 && (
            <button
              type="button"
              onClick={handleAcceptAllSuggestions}
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              Accept All Suggestions ({suggestedCount})
            </button>
          )}
          <span className="text-[11px] text-foreground/30">
            {darkItems.length} model{darkItems.length !== 1 ? "s" : ""} need attention
          </span>
        </div>
      )}

      {/* ── Search ── */}
      <div className="px-6 py-2 border-b border-border/50 flex-shrink-0">
        <div className="relative max-w-md">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[12px] pl-8 pr-7 py-1.5 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 text-sm"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* ── Main scrollable content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        {/* Full coverage banner */}
        {darkItems.length === 0 && (
          <div className="px-6 py-8 text-center">
            <div className="text-green-400 text-lg font-medium mb-1">
              All models in your display are receiving effects!
            </div>
            <p className="text-[12px] text-foreground/30">
              Nothing to fix. Review mapped models below or continue to Review.
            </p>
          </div>
        )}

        {/* ═══ NEEDS ATTENTION ═══ */}
        {darkItems.length > 0 && (
          <div className="border-b border-border/50">
            <button
              type="button"
              onClick={() => setNeedsAttentionOpen(!needsAttentionOpen)}
              className="w-full flex items-center justify-between px-6 py-2.5 text-left hover:bg-foreground/[0.02]"
            >
              <span className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider">
                Needs Attention ({darkItems.length})
              </span>
              <svg
                className={`w-4 h-4 text-foreground/30 transition-transform ${needsAttentionOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {needsAttentionOpen && (
              <div className="px-4 pb-3 space-y-2">
                {filteredDarkGroups.map((group) => (
                  <DarkGroupCard
                    key={group.family}
                    group={group}
                    isExpanded={expandedGroups.has(group.family)}
                    onToggle={() => toggleGroup(group.family)}
                    darkSuggestions={darkSuggestions}
                    onAcceptSuggestion={handleAcceptSuggestion}
                    onOpenPicker={openInlinePicker}
                    onBatchAssign={() => {
                      setBatchPicker({ family: group.family });
                    }}
                  />
                ))}
                {filteredDarkGroups.length === 0 && (
                  <div className="py-4 text-center text-[12px] text-foreground/30">
                    No matches
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ ALREADY MAPPED ═══ */}
        <div>
          <button
            type="button"
            onClick={() => setMappedOpen(!mappedOpen)}
            className="w-full flex items-center justify-between px-6 py-2.5 text-left hover:bg-foreground/[0.02]"
          >
            <span className="text-[11px] font-semibold text-green-400/80 uppercase tracking-wider">
              Already Mapped ({mappedItems.length})
            </span>
            <svg
              className={`w-4 h-4 text-foreground/30 transition-transform ${mappedOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {mappedOpen && (
            <div className="px-4 pb-3 divide-y divide-border/20">
              {filteredMapped.map((item) => (
                <MappedRow
                  key={item.model.name}
                  item={item}
                  onRemoveLink={handleRemoveLink}
                />
              ))}
              {filteredMapped.length === 0 && (
                <div className="py-4 text-center text-[12px] text-foreground/30">
                  {search ? "No matches" : "No mapped models"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Inline picker popover ── */}
        {inlinePicker && (
          <InlineSourcePicker
            destName={inlinePicker.destName}
            suggested={pickerSources.suggested}
            rest={pickerSources.rest}
            search={pickerSearch}
            onSearchChange={setPickerSearch}
            onSelect={(sourceName) => {
              handleTrayAssign(sourceName, inlinePicker.destName);
              setInlinePicker(null);
            }}
            onClose={() => setInlinePicker(null)}
          />
        )}

        {/* ── Batch assign picker ── */}
        {batchPicker && (
          <BatchAssignPicker
            family={batchPicker.family}
            groupSize={darkGroups.find((g) => g.family === batchPicker.family)?.items.length ?? 0}
            suggestions={batchPickerSources}
            onSelect={(sourceName) => handleBatchAssign(batchPicker.family, sourceName)}
            onClose={() => setBatchPicker(null)}
          />
        )}
      </div>

      {/* ═══ SOURCE TRAY (Bottom Dock) ═══ */}
      <div className="flex-shrink-0 border-t border-border bg-surface">
        <button
          type="button"
          onClick={() => setTrayOpen(!trayOpen)}
          className="w-full flex items-center justify-between px-4 py-1.5 text-left hover:bg-foreground/[0.02]"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">
              Source Tray
            </span>
            <span className="text-[10px] text-foreground/30">
              ({sourceTrayItems.length} sources)
            </span>
          </div>
          <svg
            className={`w-3.5 h-3.5 text-foreground/30 transition-transform ${trayOpen ? "" : "rotate-180"}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {trayOpen && (
          <div className="px-4 pb-3">
            {/* Tray search */}
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Search sources..."
                value={traySearch}
                onChange={(e) => setTraySearch(e.target.value)}
                className="w-full text-[11px] px-3 py-1 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
              />
              {traySearch && (
                <button
                  type="button"
                  onClick={() => setTraySearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 text-xs"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Horizontally scrollable source chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {filteredTrayItems.map((layer) => {
                const destCount = layer.assignedUserModels.length;
                return (
                  <button
                    key={layer.sourceModel.name}
                    type="button"
                    onClick={() => {
                      // If there's an inline picker open, assign to it
                      if (inlinePicker) {
                        handleTrayAssign(layer.sourceModel.name, inlinePicker.destName);
                        setInlinePicker(null);
                      }
                    }}
                    className="flex-shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-lg border border-border/50 bg-foreground/[0.03] hover:bg-foreground/[0.06] hover:border-accent/30 transition-colors min-w-[5rem] text-center"
                    title={`${layer.sourceModel.name} — ${layer.effectCount} effects, ${destCount} dest${destCount !== 1 ? "s" : ""}`}
                  >
                    <span className="text-[11px] font-medium text-foreground truncate max-w-[6rem]">
                      {layer.sourceModel.name}
                    </span>
                    <span className="text-[9px] text-foreground/30 tabular-nums">
                      {layer.effectCount} fx
                    </span>
                    {destCount > 0 && (
                      <span className="text-[8px] text-green-400/60 mt-0.5">
                        &rarr; {destCount}
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredTrayItems.length === 0 && (
                <span className="text-[11px] text-foreground/30 py-2">
                  {traySearch ? "No matches" : "No sources available"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dark Group Card ─────────────────────────────────────

function DarkGroupCard({
  group,
  isExpanded,
  onToggle,
  darkSuggestions,
  onAcceptSuggestion,
  onOpenPicker,
  onBatchAssign,
}: {
  group: DarkGroup;
  isExpanded: boolean;
  onToggle: () => void;
  darkSuggestions: Map<string, SuggestionHit[]>;
  onAcceptSuggestion: (sourceName: string, destName: string) => void;
  onOpenPicker: (destName: string) => void;
  onBatchAssign: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-foreground/[0.02]">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <svg
            className={`w-3.5 h-3.5 text-foreground/40 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[13px] font-medium text-foreground truncate">
            {group.family}
          </span>
          <span className="text-[10px] text-foreground/30 flex-shrink-0">
            ({group.items.length} model{group.items.length !== 1 ? "s" : ""})
          </span>
        </button>

        {/* Batch assign button */}
        {group.items.length > 1 && (
          <button
            type="button"
            onClick={onBatchAssign}
            className="text-[11px] font-medium px-2.5 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex-shrink-0"
          >
            Batch Assign
          </button>
        )}
      </div>

      {/* Expanded items */}
      {isExpanded && (
        <div className="divide-y divide-border/20">
          {group.items.map((item) => {
            const suggs = darkSuggestions.get(item.model.name);
            return (
              <div key={item.model.name} className="px-3 py-2 hover:bg-foreground/[0.02]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px] text-foreground/60 truncate flex-1">
                    {item.model.name}
                  </span>
                </div>

                {suggs && suggs.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {suggs.slice(0, 3).map((s) => (
                      <button
                        key={s.sourceName}
                        type="button"
                        onClick={() => onAcceptSuggestion(s.sourceName, item.model.name)}
                        className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-accent/8 text-accent/80 hover:bg-accent/15 hover:text-accent transition-colors"
                      >
                        <span className="text-[9px]">&#128161;</span>
                        {s.sourceName}
                        <span className="text-[9px] text-foreground/25 tabular-nums">
                          {Math.round(s.score * 100)}%
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-foreground/25 italic">No strong suggestions</span>
                )}

                <button
                  type="button"
                  onClick={() => onOpenPicker(item.model.name)}
                  className="mt-1 text-[10px] text-foreground/30 hover:text-foreground/50 transition-colors"
                >
                  Choose a source...
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Mapped Row ──────────────────────────────────────────

function MappedRow({
  item,
  onRemoveLink,
}: {
  item: DestDisplayItem;
  onRemoveLink: (sourceName: string, destName: string) => void;
}) {
  return (
    <div className="px-2 py-2 hover:bg-foreground/[0.02]">
      <div className="flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-green-400/60 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="text-[12px] text-foreground/60 truncate flex-1">
          {item.model.name}
        </span>
        {item.sources.map((srcName) => (
          <div key={srcName} className="flex items-center gap-1 group/link flex-shrink-0">
            <span className="text-[10px] text-foreground/30">&larr;</span>
            <span className="text-[11px] text-foreground/40 truncate max-w-[10rem]">{srcName}</span>
            <button
              type="button"
              onClick={() => onRemoveLink(srcName, item.model.name)}
              className="text-[10px] text-red-400/50 hover:text-red-400 opacity-0 group-hover/link:opacity-100 transition-opacity"
              title="Remove"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inline Source Picker (Popover) ──────────────────────

function InlineSourcePicker({
  destName,
  suggested,
  rest,
  search,
  onSearchChange,
  onSelect,
  onClose,
}: {
  destName: string;
  suggested: { name: string; effectCount: number; score: number }[];
  rest: { name: string; effectCount: number }[];
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (sourceName: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 bg-black/30 flex items-center justify-center">
      <div
        ref={ref}
        className="bg-surface border border-border rounded-xl shadow-xl w-[24rem] max-h-[22rem] flex flex-col overflow-hidden"
      >
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-foreground">Choose a source</div>
            <div className="text-[11px] text-foreground/40 truncate">for {destName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-3 py-2">
          <input
            type="text"
            placeholder="Search sources..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-[12px] px-3 py-1.5 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Suggested */}
          {suggested.length > 0 && (
            <>
              <div className="px-3 py-1 text-[9px] font-semibold text-foreground/30 uppercase tracking-wider">
                Suggested
              </div>
              {suggested.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => onSelect(s.name)}
                  className="w-full text-left px-3 py-2 hover:bg-accent/10 transition-colors flex items-center gap-2"
                >
                  <span className="text-[9px]">&#128161;</span>
                  <span className="text-[12px] text-foreground truncate flex-1">{s.name}</span>
                  <span className="text-[10px] text-foreground/25 tabular-nums flex-shrink-0">
                    {s.effectCount} fx
                  </span>
                  <span className="text-[10px] text-accent/60 tabular-nums flex-shrink-0">
                    {Math.round(s.score * 100)}%
                  </span>
                </button>
              ))}
              {rest.length > 0 && (
                <div className="mx-3 my-1 border-t border-border/30" />
              )}
            </>
          )}

          {/* All other sources */}
          {rest.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => onSelect(s.name)}
              className="w-full text-left px-3 py-2 hover:bg-accent/10 transition-colors flex items-center gap-2"
            >
              <span className="text-[12px] text-foreground truncate flex-1">{s.name}</span>
              <span className="text-[10px] text-foreground/25 tabular-nums flex-shrink-0">
                {s.effectCount} fx
              </span>
            </button>
          ))}

          {suggested.length === 0 && rest.length === 0 && (
            <div className="px-3 py-4 text-center text-[12px] text-foreground/30">
              {search ? "No matches" : "No sources available"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Batch Assign Picker ─────────────────────────────────

function BatchAssignPicker({
  family,
  groupSize,
  suggestions,
  onSelect,
  onClose,
}: {
  family: string;
  groupSize: number;
  suggestions: { name: string; score: number; effectCount: number }[];
  onSelect: (sourceName: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 bg-black/30 flex items-center justify-center">
      <div
        ref={ref}
        className="bg-surface border border-border rounded-xl shadow-xl w-[22rem] flex flex-col overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border">
          <div className="text-[13px] font-semibold text-foreground">
            Batch Assign: {family}
          </div>
          <div className="text-[11px] text-foreground/40 mt-0.5">
            Apply one source to all {groupSize} models
          </div>
        </div>

        <div className="py-1">
          {suggestions.length > 0 ? (
            suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => onSelect(s.name)}
                className="w-full text-left px-4 py-2.5 hover:bg-accent/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-foreground font-medium truncate flex-1">{s.name}</span>
                  <span className="text-[10px] text-foreground/30 tabular-nums">{s.effectCount} fx</span>
                  <span className="text-[10px] text-accent/60 tabular-nums">{Math.round(s.score * 100)}%</span>
                </div>
                <div className="text-[10px] text-foreground/30 mt-0.5">
                  All {groupSize} {family.toLowerCase()} models will receive effects from {s.name}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-4 text-center text-[12px] text-foreground/30">
              No suggestions for this group
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-foreground/40 hover:text-foreground/60 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
