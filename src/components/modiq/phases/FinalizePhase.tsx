"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useMappingPhase, extractFamily } from "@/contexts/MappingPhaseContext";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

// ─── Types ──────────────────────────────────────────────

type Perspective = "display" | "source";
type TypeFilter = "all" | "groups" | "models" | "submodels";
type StatusFilter = "all" | "unmapped" | "suggested" | "mapped" | "multi-mapped";
type SortKey =
  | "unmapped-first"
  | "name-asc"
  | "name-desc"
  | "fx-desc"
  | "fx-asc"
  | "match-desc"
  | "dest-count-desc";

interface SuggestionHit {
  sourceName: string;
  score: number;
  effectCount: number;
}

interface GridRow {
  destName: string;
  isGroup: boolean;
  isSubmodel: boolean;
  sources: string[];
  isMapped: boolean;
  topSuggestion: SuggestionHit | null;
  topScore: number;
  effectCount: number;
}

interface SourceGridRow {
  sourceName: string;
  destinations: string[];
  isMapped: boolean;
  isSkipped: boolean;
  effectCount: number;
  destCount: number;
}

interface GridGroup {
  family: string;
  rows: GridRow[];
  mappedCount: number;
  unmappedCount: number;
}

interface AutoCompleteSuggestion {
  sourceBase: string;
  destBase: string;
  pairs: { sourceName: string; destName: string }[];
}

// ─── Helpers ────────────────────────────────────────────

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function extractNumberedName(name: string): { base: string; num: number } | null {
  const match = name.match(/^(.+?)\s*(\d+)\s*$/);
  if (!match) return null;
  return { base: match[1].trim(), num: parseInt(match[2], 10) };
}

// ─── Component ──────────────────────────────────────────

export function FinalizePhase() {
  const { phaseItems, interactive } = useMappingPhase();

  const {
    displayCoverage,
    effectsCoverage,
    sourceLayerMappings,
    assignUserModelToLayer,
    removeLinkFromLayer,
    getSuggestionsForLayer,
    destToSourcesMap,
    allDestModels,
  } = interactive;

  // ── State ──
  const [perspective, setPerspective] = useState<Perspective>("display");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("unmapped-first");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [gridDropdown, setGridDropdown] = useState<string | null>(null);
  const [gridDropdownSearch, setGridDropdownSearch] = useState("");
  const [expandedGridGroups, setExpandedGridGroups] = useState<Set<string>>(new Set());

  // Auto-complete
  const [autoComplete, setAutoComplete] = useState<AutoCompleteSuggestion | null>(null);

  // Drag state
  const [draggingSource, setDraggingSource] = useState<string | null>(null);

  // Coverage delta toast
  const [deltaToast, setDeltaToast] = useState<string | null>(null);
  const prevCoveredRef = useRef(displayCoverage.covered);

  // Ignore/dismiss
  const [ignoredDisplay, setIgnoredDisplay] = useState<Set<string>>(new Set());
  const [ignoredSource, setIgnoredSource] = useState<Set<string>>(new Set());
  const [undoToast, setUndoToast] = useState<{ name: string; kind: "display" | "source" } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [ignoredSectionOpen, setIgnoredSectionOpen] = useState(false);

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
  // DATA — DISPLAY PERSPECTIVE
  // ══════════════════════════════════════════════════════

  const { darkNames, allDisplayItems } = useMemo(() => {
    const items: { name: string; isGroup: boolean; sources: string[] }[] = [];
    const unmapped: string[] = [];
    for (const model of allDestModels) {
      if (model.name.startsWith("DMX")) continue;
      const srcs = destToSourcesMap.get(model.name);
      const sourceNames = srcs ? Array.from(srcs) : [];
      items.push({ name: model.name, isGroup: model.isGroup, sources: sourceNames });
      if (sourceNames.length === 0 && !model.isGroup) unmapped.push(model.name);
    }
    return { darkNames: unmapped, allDisplayItems: items };
  }, [allDestModels, destToSourcesMap]);

  // Suggestions for unmapped items
  const darkSuggestions = useMemo(() => {
    const map = new Map<string, SuggestionHit[]>();
    const darkSet = new Set(darkNames);
    for (const destName of darkSet) {
      const hits: SuggestionHit[] = [];
      for (const layer of sourceLayerMappings) {
        if (layer.isSkipped || !layer.isMapped) continue;
        const suggestions = getSuggestionsForLayer(layer.sourceModel);
        const match = suggestions.find((s) => s.model.name === destName);
        if (match && match.score >= 0.40) {
          hits.push({ sourceName: layer.sourceModel.name, score: match.score, effectCount: layer.effectCount });
        }
      }
      if (hits.length > 0) {
        hits.sort((a, b) => b.score - a.score);
        map.set(destName, hits.slice(0, 5));
      }
    }
    return map;
  }, [darkNames, sourceLayerMappings, getSuggestionsForLayer]);

  const suggestedCount = useMemo(() => {
    let count = 0;
    for (const name of darkNames) {
      if (darkSuggestions.has(name)) count++;
    }
    return count;
  }, [darkNames, darkSuggestions]);

  // All grid rows (unfiltered)
  const allGridRows = useMemo((): GridRow[] => {
    return allDisplayItems.map((item) => {
      const suggs = darkSuggestions.get(item.name);
      const topSugg = suggs && suggs.length > 0 ? suggs[0] : null;
      let effectCount = 0;
      if (item.sources.length > 0) {
        const layer = sourceLayerMappings.find((l) => l.sourceModel.name === item.sources[0]);
        effectCount = layer?.effectCount ?? 0;
      } else if (topSugg) {
        effectCount = topSugg.effectCount;
      }
      return {
        destName: item.name,
        isGroup: item.isGroup,
        isSubmodel: item.name.includes("/"),
        sources: item.sources,
        isMapped: item.sources.length > 0,
        topSuggestion: topSugg,
        topScore: topSugg?.score ?? 0,
        effectCount,
      };
    });
  }, [allDisplayItems, darkSuggestions, sourceLayerMappings]);

  // Type counts for filter pills (reflect active status filter)
  const typeCounts = useMemo(() => {
    let rows = allGridRows.filter((r) => !ignoredDisplay.has(r.destName));
    if (statusFilter === "unmapped") rows = rows.filter((r) => !r.isMapped);
    else if (statusFilter === "suggested") rows = rows.filter((r) => !r.isMapped && r.topSuggestion !== null);
    else if (statusFilter === "mapped") rows = rows.filter((r) => r.isMapped);
    else if (statusFilter === "multi-mapped") rows = rows.filter((r) => r.sources.length >= 2);
    return {
      all: rows.length,
      groups: rows.filter((r) => r.isGroup).length,
      models: rows.filter((r) => !r.isGroup && !r.isSubmodel).length,
      submodels: rows.filter((r) => r.isSubmodel).length,
    };
  }, [allGridRows, ignoredDisplay, statusFilter]);

  // Filtered + sorted grid rows
  const gridRows = useMemo(() => {
    let rows = allGridRows.filter((r) => !ignoredDisplay.has(r.destName));

    if (typeFilter === "groups") rows = rows.filter((r) => r.isGroup);
    else if (typeFilter === "models") rows = rows.filter((r) => !r.isGroup && !r.isSubmodel);
    else if (typeFilter === "submodels") rows = rows.filter((r) => r.isSubmodel);

    if (statusFilter === "unmapped") rows = rows.filter((r) => !r.isMapped);
    else if (statusFilter === "suggested") rows = rows.filter((r) => !r.isMapped && r.topSuggestion !== null);
    else if (statusFilter === "mapped") rows = rows.filter((r) => r.isMapped);
    else if (statusFilter === "multi-mapped") rows = rows.filter((r) => r.sources.length >= 2);

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.destName.toLowerCase().includes(q) || r.sources.some((s) => s.toLowerCase().includes(q)),
      );
    }

    const sorted = [...rows];
    switch (sortKey) {
      case "unmapped-first":
        sorted.sort((a, b) => {
          if (a.isMapped !== b.isMapped) return a.isMapped ? 1 : -1;
          return naturalCompare(a.destName, b.destName);
        });
        break;
      case "name-asc":
        sorted.sort((a, b) => naturalCompare(a.destName, b.destName));
        break;
      case "name-desc":
        sorted.sort((a, b) => naturalCompare(b.destName, a.destName));
        break;
      case "fx-desc":
        sorted.sort((a, b) => b.effectCount - a.effectCount || naturalCompare(a.destName, b.destName));
        break;
      case "fx-asc":
        sorted.sort((a, b) => a.effectCount - b.effectCount || naturalCompare(a.destName, b.destName));
        break;
      case "match-desc":
        sorted.sort((a, b) => b.topScore - a.topScore || naturalCompare(a.destName, b.destName));
        break;
    }
    return sorted;
  }, [allGridRows, ignoredDisplay, typeFilter, statusFilter, search, sortKey]);

  const ignoredDisplayRows = useMemo(() => {
    return allGridRows.filter((r) => ignoredDisplay.has(r.destName)).sort((a, b) => naturalCompare(a.destName, b.destName));
  }, [allGridRows, ignoredDisplay]);

  // Grouped grid rows
  const groupedGridRows = useMemo((): GridGroup[] => {
    const familyMap = new Map<string, GridRow[]>();
    const order: string[] = [];
    for (const row of gridRows) {
      const family = extractFamily(row.destName);
      if (!familyMap.has(family)) { familyMap.set(family, []); order.push(family); }
      familyMap.get(family)!.push(row);
    }
    return order.map((family) => {
      const rows = familyMap.get(family)!;
      return { family, rows, mappedCount: rows.filter((r) => r.isMapped).length, unmappedCount: rows.filter((r) => !r.isMapped).length };
    });
  }, [gridRows]);

  // Grid dropdown sources
  const gridDropdownSources = useMemo(() => {
    if (!gridDropdown || perspective !== "display")
      return { suggested: [] as { name: string; effectCount: number; score: number }[], rest: [] as { name: string; effectCount: number; score: number }[] };
    const suggs = darkSuggestions.get(gridDropdown) ?? [];
    const suggNames = new Set(suggs.map((s) => s.sourceName));
    const allSources = sourceLayerMappings.filter((l) => !l.isSkipped && l.isMapped).sort((a, b) => b.effectCount - a.effectCount);
    const q = gridDropdownSearch.toLowerCase();
    const filter = (l: SourceLayerMapping) => !q || l.sourceModel.name.toLowerCase().includes(q);
    return {
      suggested: allSources.filter((l) => suggNames.has(l.sourceModel.name)).filter(filter).map((l) => ({
        name: l.sourceModel.name, effectCount: l.effectCount, score: suggs.find((s) => s.sourceName === l.sourceModel.name)?.score ?? 0,
      })),
      rest: allSources.filter((l) => !suggNames.has(l.sourceModel.name)).filter(filter).map((l) => ({
        name: l.sourceModel.name, effectCount: l.effectCount, score: 0,
      })),
    };
  }, [gridDropdown, perspective, darkSuggestions, sourceLayerMappings, gridDropdownSearch]);

  // Grid summary (adjusted for ignored)
  const gridSummary = useMemo(() => {
    const rows = allGridRows.filter((r) => !ignoredDisplay.has(r.destName));
    const total = rows.length;
    const mapped = rows.filter((r) => r.isMapped).length;
    const suggested = rows.filter((r) => !r.isMapped && r.topSuggestion !== null).length;
    return { total, mapped, suggested, unmapped: total - mapped };
  }, [allGridRows, ignoredDisplay]);

  // ══════════════════════════════════════════════════════
  // DATA — SOURCE PERSPECTIVE
  // ══════════════════════════════════════════════════════

  const allSourceRows = useMemo((): SourceGridRow[] => {
    return sourceLayerMappings
      .filter((l) => !l.isSkipped && l.isMapped)
      .map((l) => ({
        sourceName: l.sourceModel.name,
        destinations: l.assignedUserModels.map((m) => m.name),
        isMapped: l.assignedUserModels.length > 0,
        isSkipped: l.isSkipped,
        effectCount: l.effectCount,
        destCount: l.assignedUserModels.length,
      }))
      .sort((a, b) => naturalCompare(a.sourceName, b.sourceName));
  }, [sourceLayerMappings]);

  const sourceGridRows = useMemo(() => {
    let rows = allSourceRows.filter((r) => !ignoredSource.has(r.sourceName));
    if (statusFilter === "unmapped") rows = rows.filter((r) => !r.isMapped);
    else if (statusFilter === "mapped") rows = rows.filter((r) => r.isMapped);
    else if (statusFilter === "multi-mapped") rows = rows.filter((r) => r.destCount >= 2);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.sourceName.toLowerCase().includes(q) || r.destinations.some((d) => d.toLowerCase().includes(q)));
    }
    const sorted = [...rows];
    switch (sortKey) {
      case "unmapped-first":
        sorted.sort((a, b) => { if (a.isMapped !== b.isMapped) return a.isMapped ? 1 : -1; return b.effectCount - a.effectCount || naturalCompare(a.sourceName, b.sourceName); });
        break;
      case "name-asc": sorted.sort((a, b) => naturalCompare(a.sourceName, b.sourceName)); break;
      case "name-desc": sorted.sort((a, b) => naturalCompare(b.sourceName, a.sourceName)); break;
      case "fx-desc": sorted.sort((a, b) => b.effectCount - a.effectCount || naturalCompare(a.sourceName, b.sourceName)); break;
      case "fx-asc": sorted.sort((a, b) => a.effectCount - b.effectCount || naturalCompare(a.sourceName, b.sourceName)); break;
      case "dest-count-desc": sorted.sort((a, b) => b.destCount - a.destCount || naturalCompare(a.sourceName, b.sourceName)); break;
    }
    return sorted;
  }, [allSourceRows, ignoredSource, statusFilter, search, sortKey]);

  const ignoredSourceRows = useMemo(() => {
    return allSourceRows.filter((r) => ignoredSource.has(r.sourceName)).sort((a, b) => naturalCompare(a.sourceName, b.sourceName));
  }, [allSourceRows, ignoredSource]);

  const sourceSummary = useMemo(() => {
    const rows = allSourceRows.filter((r) => !ignoredSource.has(r.sourceName));
    const total = rows.length;
    const mapped = rows.filter((r) => r.isMapped).length;
    return { total, mapped, unused: total - mapped };
  }, [allSourceRows, ignoredSource]);

  const sourceGridDropdownItems = useMemo(() => {
    if (!gridDropdown || perspective !== "source") return [];
    const q = gridDropdownSearch.toLowerCase();
    return allDestModels
      .filter((m) => !m.name.startsWith("DMX") && !m.isGroup)
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .sort((a, b) => naturalCompare(a.name, b.name))
      .map((m) => { const srcs = destToSourcesMap.get(m.name); return { name: m.name, isMapped: srcs ? srcs.size > 0 : false }; });
  }, [gridDropdown, perspective, allDestModels, destToSourcesMap, gridDropdownSearch]);

  // For batch dropdowns
  const sourceTrayItems = useMemo(() => {
    return sourceLayerMappings.filter((l) => !l.isSkipped && l.isMapped).sort((a, b) => b.effectCount - a.effectCount);
  }, [sourceLayerMappings]);

  const destTrayItems = useMemo(() => {
    return allDestModels
      .filter((m) => !m.name.startsWith("DMX") && !m.isGroup)
      .map((m) => { const srcs = destToSourcesMap.get(m.name); return { name: m.name, isMapped: srcs ? srcs.size > 0 : false }; })
      .sort((a, b) => { if (a.isMapped !== b.isMapped) return a.isMapped ? 1 : -1; return naturalCompare(a.name, b.name); });
  }, [allDestModels, destToSourcesMap]);

  // ── Handlers ──

  const handleSelectRow = useCallback((name: string) => {
    setSelectedRows((prev) => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next; });
  }, []);

  const toggleGridGroup = useCallback((family: string) => {
    setExpandedGridGroups((prev) => { const next = new Set(prev); if (next.has(family)) next.delete(family); else next.add(family); return next; });
  }, []);

  const handleSelectGroup = useCallback((family: string) => {
    const group = groupedGridRows.find((g) => g.family === family);
    if (!group) return;
    const names = group.rows.map((r) => r.destName);
    setSelectedRows((prev) => {
      const allSelected = names.every((n) => prev.has(n));
      const next = new Set(prev);
      if (allSelected) { for (const n of names) next.delete(n); } else { for (const n of names) next.add(n); }
      return next;
    });
  }, [groupedGridRows]);

  const handleSelectAll = useCallback(() => {
    if (perspective === "source") {
      setSelectedRows((prev) => prev.size === sourceGridRows.length ? new Set() : new Set(sourceGridRows.map((r) => r.sourceName)));
    } else {
      setSelectedRows((prev) => prev.size === gridRows.length ? new Set() : new Set(gridRows.map((r) => r.destName)));
    }
  }, [perspective, gridRows, sourceGridRows]);

  const handleBatchAssignSelected = useCallback((sourceName: string) => {
    for (const destName of selectedRows) assignUserModelToLayer(sourceName, destName);
    setSelectedRows(new Set());
  }, [selectedRows, assignUserModelToLayer]);

  const handleBatchAssignSelectedToDest = useCallback((destName: string) => {
    for (const sourceName of selectedRows) assignUserModelToLayer(sourceName, destName);
    setSelectedRows(new Set());
  }, [selectedRows, assignUserModelToLayer]);

  const detectAutoComplete = useCallback((sourceName: string, destName: string) => {
    const srcParsed = extractNumberedName(sourceName);
    const destParsed = extractNumberedName(destName);
    if (!srcParsed || !destParsed) return;
    if (srcParsed.num !== destParsed.num) return;
    const sourceFamily = sourceLayerMappings.filter((l) => !l.isSkipped && l.isMapped)
      .filter((l) => { const p = extractNumberedName(l.sourceModel.name); return p && p.base === srcParsed.base; })
      .map((l) => ({ name: l.sourceModel.name, num: extractNumberedName(l.sourceModel.name)!.num }));
    const destFamily = allDestModels.filter((m) => !m.name.startsWith("DMX") && !m.isGroup)
      .filter((m) => { const p = extractNumberedName(m.name); return p && p.base === destParsed.base; })
      .map((m) => ({ name: m.name, num: extractNumberedName(m.name)!.num }));
    const pairs: { sourceName: string; destName: string }[] = [];
    for (const src of sourceFamily) {
      if (src.name === sourceName) continue;
      const matchingDest = destFamily.find((d) => d.num === src.num);
      if (!matchingDest) continue;
      const existingLinks = destToSourcesMap.get(matchingDest.name);
      if (existingLinks && existingLinks.has(src.name)) continue;
      pairs.push({ sourceName: src.name, destName: matchingDest.name });
    }
    if (pairs.length > 0) {
      pairs.sort((a, b) => naturalCompare(a.destName, b.destName));
      setAutoComplete({ sourceBase: srcParsed.base, destBase: destParsed.base, pairs });
    }
  }, [sourceLayerMappings, allDestModels, destToSourcesMap]);

  const handleAcceptSuggestion = useCallback((sourceName: string, destName: string) => {
    assignUserModelToLayer(sourceName, destName);
    detectAutoComplete(sourceName, destName);
  }, [assignUserModelToLayer, detectAutoComplete]);

  const handleAcceptAllSuggestions = useCallback(() => {
    for (const name of darkNames) {
      const suggs = darkSuggestions.get(name);
      if (suggs && suggs.length > 0) assignUserModelToLayer(suggs[0].sourceName, name);
    }
  }, [darkNames, darkSuggestions, assignUserModelToLayer]);

  const handleRemoveLink = useCallback((sourceName: string, destName: string) => {
    removeLinkFromLayer(sourceName, destName);
  }, [removeLinkFromLayer]);

  const handleApplyAutoComplete = useCallback(() => {
    if (!autoComplete) return;
    for (const pair of autoComplete.pairs) assignUserModelToLayer(pair.sourceName, pair.destName);
    setAutoComplete(null);
  }, [autoComplete, assignUserModelToLayer]);

  // Ignore handlers
  const handleIgnoreDisplay = useCallback((destName: string) => {
    setIgnoredDisplay((prev) => { const next = new Set(prev); next.add(destName); return next; });
    setSelectedRows((prev) => { const next = new Set(prev); next.delete(destName); return next; });
    setUndoToast({ name: destName, kind: "display" });
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
  }, []);

  const handleRestoreDisplay = useCallback((destName: string) => {
    setIgnoredDisplay((prev) => { const next = new Set(prev); next.delete(destName); return next; });
  }, []);

  const handleIgnoreSource = useCallback((sourceName: string) => {
    setIgnoredSource((prev) => { const next = new Set(prev); next.add(sourceName); return next; });
    setSelectedRows((prev) => { const next = new Set(prev); next.delete(sourceName); return next; });
    setUndoToast({ name: sourceName, kind: "source" });
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
  }, []);

  const handleRestoreSource = useCallback((sourceName: string) => {
    setIgnoredSource((prev) => { const next = new Set(prev); next.delete(sourceName); return next; });
  }, []);

  const handleUndoIgnore = useCallback(() => {
    if (!undoToast) return;
    if (undoToast.kind === "display") handleRestoreDisplay(undoToast.name);
    else handleRestoreSource(undoToast.name);
    setUndoToast(null);
    clearTimeout(undoTimerRef.current);
  }, [undoToast, handleRestoreDisplay, handleRestoreSource]);

  const handleBatchIgnoreSelected = useCallback(() => {
    if (perspective === "display") {
      setIgnoredDisplay((prev) => { const next = new Set(prev); for (const name of selectedRows) next.add(name); return next; });
    } else {
      setIgnoredSource((prev) => { const next = new Set(prev); for (const name of selectedRows) next.add(name); return next; });
    }
    setSelectedRows(new Set());
  }, [perspective, selectedRows]);

  const isFiltered = typeFilter !== "all" || statusFilter !== "all" || search.trim() !== "";
  const clearFilters = useCallback(() => { setTypeFilter("all"); setStatusFilter("all"); setSearch(""); }, []);

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════

  const dispPct = displayCoverage.percent;
  const seqPct = effectsCoverage.percent;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Quick Actions + Perspective ── */}
      <div className="px-6 py-2 border-b border-border/50 flex-shrink-0 flex items-center gap-3">
        {deltaToast && <span className="text-[11px] text-green-400 font-medium animate-pulse">{deltaToast}</span>}
        {perspective === "display" && darkNames.length > 0 && suggestedCount > 0 && (
          <button type="button" onClick={handleAcceptAllSuggestions} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
            Accept All Suggestions ({suggestedCount})
          </button>
        )}
        {perspective === "display" && darkNames.length > 0 && (
          <span className="text-[11px] text-foreground/30">{darkNames.length} model{darkNames.length !== 1 ? "s" : ""} need attention</span>
        )}
        {perspective === "source" && sourceSummary.unused > 0 && (
          <span className="text-[11px] text-amber-400/60">{sourceSummary.unused} source{sourceSummary.unused !== 1 ? "s" : ""} unused</span>
        )}
        <div className="ml-auto flex items-center gap-1 bg-foreground/5 rounded-lg p-0.5">
          <button type="button" onClick={() => { setPerspective("display"); setSelectedRows(new Set()); }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${perspective === "display" ? "bg-accent/15 text-accent" : "text-foreground/40 hover:text-foreground/60"}`}>
            My Display
          </button>
          <button type="button" onClick={() => { setPerspective("source"); setSelectedRows(new Set()); }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${perspective === "source" ? "bg-accent/15 text-accent" : "text-foreground/40 hover:text-foreground/60"}`}>
            Source Sequence
          </button>
        </div>
      </div>

      {/* ── Quick Filter Pills (display perspective) ── */}
      {perspective === "display" && (
        <div className="px-6 py-2 border-b border-border/50 flex-shrink-0 flex items-center gap-2">
          {([
            { key: "all" as TypeFilter, label: "All", count: typeCounts.all },
            { key: "groups" as TypeFilter, label: "Groups", count: typeCounts.groups },
            { key: "models" as TypeFilter, label: "Models", count: typeCounts.models },
            { key: "submodels" as TypeFilter, label: "Submodels", count: typeCounts.submodels },
          ]).map((pill) => (
            <button key={pill.key} type="button" onClick={() => setTypeFilter(pill.key)}
              className={`text-[11px] font-medium px-3 py-1 rounded-full transition-colors tabular-nums ${
                typeFilter === pill.key
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-foreground/5 text-foreground/50 border border-transparent hover:bg-foreground/10 hover:text-foreground/70"
              }`}>
              {pill.label} ({pill.count})
            </button>
          ))}
        </div>
      )}

      {/* ── Auto-complete banner ── */}
      {autoComplete && (
        <div className="px-6 py-2 border-b border-accent/20 bg-accent/5 flex-shrink-0 flex items-center gap-3">
          <span className="text-[9px]">&#128161;</span>
          <span className="text-[12px] text-foreground/70 flex-1">
            Auto-complete: Map {autoComplete.destBase} {autoComplete.pairs[0] && extractNumberedName(autoComplete.pairs[0].destName)?.num}&ndash;{autoComplete.pairs[autoComplete.pairs.length - 1] && extractNumberedName(autoComplete.pairs[autoComplete.pairs.length - 1].destName)?.num} &rarr; {autoComplete.sourceBase} {autoComplete.pairs[0] && extractNumberedName(autoComplete.pairs[0].sourceName)?.num}&ndash;{autoComplete.pairs[autoComplete.pairs.length - 1] && extractNumberedName(autoComplete.pairs[autoComplete.pairs.length - 1].sourceName)?.num}?
          </span>
          <span className="text-[11px] text-foreground/40 tabular-nums">{autoComplete.pairs.length} mapping{autoComplete.pairs.length !== 1 ? "s" : ""}</span>
          <button type="button" onClick={handleApplyAutoComplete} className="text-[12px] font-medium px-3 py-1 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 transition-colors">Apply</button>
          <button type="button" onClick={() => setAutoComplete(null)} className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors">Dismiss</button>
        </div>
      )}

      {/* ── Undo ignore toast ── */}
      {undoToast && (
        <div className="px-6 py-2 border-b border-amber-500/20 bg-amber-500/5 flex-shrink-0 flex items-center gap-3">
          <span className="text-[12px] text-foreground/60">&ldquo;{undoToast.name}&rdquo; ignored</span>
          <button type="button" onClick={handleUndoIgnore} className="text-[12px] font-medium text-accent hover:text-accent/80 transition-colors">Undo</button>
          <button type="button" onClick={() => { setUndoToast(null); clearTimeout(undoTimerRef.current); }} className="text-[10px] text-foreground/30 hover:text-foreground/50 ml-auto">&times;</button>
        </div>
      )}

      {/* ── Search + Status + Sort ── */}
      <div className="px-6 py-2 border-b border-border/50 flex-shrink-0 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search models..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[12px] pl-8 pr-7 py-1.5 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30" />
          {search && <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 text-sm">&times;</button>}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="text-[11px] px-2 py-1.5 rounded bg-foreground/5 border border-border text-foreground/60 focus:outline-none focus:border-accent">
          <option value="all">Status: All</option>
          <option value="unmapped">Unmapped</option>
          <option value="suggested">Suggested</option>
          <option value="mapped">Mapped</option>
          <option value="multi-mapped">Multi-mapped</option>
        </select>
        {perspective === "display" ? (
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-[11px] px-2 py-1.5 rounded bg-foreground/5 border border-border text-foreground/60 focus:outline-none focus:border-accent">
            <option value="unmapped-first">Unmapped First</option>
            <option value="match-desc">Match High&#8594;Low</option>
            <option value="fx-desc">FX High&#8594;Low</option>
            <option value="fx-asc">FX Low&#8594;High</option>
            <option value="name-asc">Name A&#8594;Z</option>
            <option value="name-desc">Name Z&#8594;A</option>
          </select>
        ) : (
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-[11px] px-2 py-1.5 rounded bg-foreground/5 border border-border text-foreground/60 focus:outline-none focus:border-accent">
            <option value="unmapped-first">Unmapped First</option>
            <option value="fx-desc">FX High&#8594;Low</option>
            <option value="fx-asc">FX Low&#8594;High</option>
            <option value="name-asc">Name A&#8594;Z</option>
            <option value="name-desc">Name Z&#8594;A</option>
            <option value="dest-count-desc">Dest Count High&#8594;Low</option>
          </select>
        )}
        {isFiltered && (
          <button type="button" onClick={clearFilters} className="text-[11px] text-accent/60 hover:text-accent transition-colors">Clear filters</button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* GRID — DISPLAY PERSPECTIVE                            */}
      {/* ══════════════════════════════════════════════════════ */}
      {perspective === "display" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {selectedRows.size > 0 && (
            <div className="px-4 py-2 bg-accent/5 border-b border-accent/20 flex-shrink-0 flex items-center gap-3">
              <span className="text-[12px] font-medium text-accent">{selectedRows.size} selected</span>
              <GridBatchDropdown sources={sourceTrayItems} onSelect={handleBatchAssignSelected} />
              <button type="button" onClick={handleBatchIgnoreSelected} className="text-[11px] font-medium px-2.5 py-1 rounded bg-foreground/10 text-foreground/50 hover:bg-foreground/15 hover:text-foreground/70 transition-colors">Ignore selected</button>
              <button type="button" onClick={() => setSelectedRows(new Set())} className="text-[11px] text-foreground/40 hover:text-foreground/60 ml-auto">Clear selection</button>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border text-foreground/40">
                  <th className="w-8 px-2 py-2 text-center">
                    <input type="checkbox" checked={gridRows.length > 0 && selectedRows.size === gridRows.length} onChange={handleSelectAll} className="w-3.5 h-3.5 rounded border-border accent-accent" />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">My Display</th>
                  <th className="px-3 py-2 text-left font-medium w-[16rem]">Mapped To</th>
                  <th className="px-3 py-2 text-right font-medium w-16">Match</th>
                  <th className="px-3 py-2 text-right font-medium w-14">FX</th>
                  <th className="px-3 py-2 text-center font-medium w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {groupedGridRows.map((group) => {
                  if (group.rows.length === 1) {
                    const row = group.rows[0];
                    return (
                      <GridRowComponent key={row.destName} row={row} isSelected={selectedRows.has(row.destName)} isDropdownOpen={gridDropdown === row.destName}
                        dropdownSources={gridDropdown === row.destName ? gridDropdownSources : null} dropdownSearch={gridDropdown === row.destName ? gridDropdownSearch : ""}
                        draggingSource={draggingSource}
                        onToggleSelect={() => handleSelectRow(row.destName)}
                        onOpenDropdown={() => { setGridDropdown(row.destName); setGridDropdownSearch(""); }}
                        onCloseDropdown={() => setGridDropdown(null)} onDropdownSearchChange={setGridDropdownSearch}
                        onAssign={(s) => { assignUserModelToLayer(s, row.destName); setGridDropdown(null); }}
                        onAcceptSuggestion={(s) => handleAcceptSuggestion(s, row.destName)}
                        onRemoveLink={(s) => removeLinkFromLayer(s, row.destName)}
                        onIgnore={() => handleIgnoreDisplay(row.destName)} />
                    );
                  }
                  const isExpanded = expandedGridGroups.has(group.family);
                  const allSelected = group.rows.every((r) => selectedRows.has(r.destName));
                  const someSelected = !allSelected && group.rows.some((r) => selectedRows.has(r.destName));
                  const statusIcon = group.unmappedCount === 0
                    ? <span className="text-green-400 text-[11px]">&#10003;</span>
                    : <span className="text-amber-400 text-[11px]">&#9888;</span>;
                  return (
                    <React.Fragment key={group.family}>
                      <tr className="border-b border-border/30 bg-foreground/[0.02] cursor-pointer hover:bg-foreground/[0.04]" onClick={() => toggleGridGroup(group.family)}>
                        <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected; }} onChange={() => handleSelectGroup(group.family)} className="w-3.5 h-3.5 rounded border-border accent-accent" />
                        </td>
                        <td className="px-3 py-1.5" colSpan={3}>
                          <div className="flex items-center gap-2">
                            <svg className={`w-3 h-3 text-foreground/40 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-[12px] font-medium text-foreground/70">{group.family}</span>
                            <span className="text-[10px] text-foreground/30">({group.rows.length})</span>
                            <span className="text-[10px] text-foreground/30 ml-1">
                              {group.mappedCount > 0 && <span className="text-green-400/60">{group.mappedCount} mapped</span>}
                              {group.mappedCount > 0 && group.unmappedCount > 0 && " \u00b7 "}
                              {group.unmappedCount > 0 && <span className="text-amber-400/60">{group.unmappedCount} unmapped</span>}
                            </span>
                          </div>
                        </td>
                        <td />
                        <td className="px-3 py-1.5 text-center">{statusIcon}</td>
                      </tr>
                      {isExpanded && group.rows.map((row) => (
                        <GridRowComponent key={row.destName} row={row} indent isSelected={selectedRows.has(row.destName)} isDropdownOpen={gridDropdown === row.destName}
                          dropdownSources={gridDropdown === row.destName ? gridDropdownSources : null} dropdownSearch={gridDropdown === row.destName ? gridDropdownSearch : ""}
                          draggingSource={draggingSource}
                          onToggleSelect={() => handleSelectRow(row.destName)}
                          onOpenDropdown={() => { setGridDropdown(row.destName); setGridDropdownSearch(""); }}
                          onCloseDropdown={() => setGridDropdown(null)} onDropdownSearchChange={setGridDropdownSearch}
                          onAssign={(s) => { assignUserModelToLayer(s, row.destName); setGridDropdown(null); }}
                          onAcceptSuggestion={(s) => handleAcceptSuggestion(s, row.destName)}
                          onRemoveLink={(s) => removeLinkFromLayer(s, row.destName)}
                          onIgnore={() => handleIgnoreDisplay(row.destName)} />
                      ))}
                    </React.Fragment>
                  );
                })}
                {gridRows.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-foreground/30">{search ? "No matches" : "No models"}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {ignoredDisplayRows.length > 0 && (
            <div className="flex-shrink-0 border-t border-border/50">
              <button type="button" onClick={() => setIgnoredSectionOpen(!ignoredSectionOpen)} className="w-full flex items-center justify-between px-4 py-1.5 text-left hover:bg-foreground/[0.02]">
                <span className="text-[11px] font-semibold text-foreground/30 uppercase tracking-wider">Ignored ({ignoredDisplayRows.length})</span>
                <svg className={`w-3.5 h-3.5 text-foreground/30 transition-transform ${ignoredSectionOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {ignoredSectionOpen && (
                <div className="max-h-[10rem] overflow-y-auto">
                  <table className="w-full text-[12px]"><tbody>
                    {ignoredDisplayRows.map((row) => (
                      <tr key={row.destName} className="border-b border-border/10 text-foreground/30">
                        <td className="w-8" />
                        <td className="px-3 py-1.5">{row.destName}</td>
                        <td className="px-3 py-1.5 text-right">
                          <button type="button" onClick={() => handleRestoreDisplay(row.destName)} className="text-[10px] text-accent/50 hover:text-accent transition-colors">Restore</button>
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              )}
            </div>
          )}

          <div className="px-4 py-2 border-t border-border bg-surface flex-shrink-0 flex items-center gap-4 text-[11px] text-foreground/40">
            <span>{gridSummary.total} models</span>
            <span className="text-green-400/70">{gridSummary.mapped} mapped</span>
            <span className="text-accent/70">{gridSummary.suggested} suggested</span>
            <span className="text-amber-400/70">{gridSummary.unmapped} unmapped</span>
            {ignoredDisplay.size > 0 && <span className="text-foreground/25">{ignoredDisplay.size} ignored</span>}
            <span className="ml-auto text-foreground/25">Display Coverage: {dispPct}%</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* GRID — SOURCE PERSPECTIVE                             */}
      {/* ══════════════════════════════════════════════════════ */}
      {perspective === "source" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {selectedRows.size > 0 && (
            <div className="px-4 py-2 bg-accent/5 border-b border-accent/20 flex-shrink-0 flex items-center gap-3">
              <span className="text-[12px] font-medium text-accent">{selectedRows.size} selected</span>
              <DestBatchDropdown items={destTrayItems} onSelect={handleBatchAssignSelectedToDest} />
              <button type="button" onClick={handleBatchIgnoreSelected} className="text-[11px] font-medium px-2.5 py-1 rounded bg-foreground/10 text-foreground/50 hover:bg-foreground/15 hover:text-foreground/70 transition-colors">Ignore selected</button>
              <button type="button" onClick={() => setSelectedRows(new Set())} className="text-[11px] text-foreground/40 hover:text-foreground/60 ml-auto">Clear selection</button>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border text-foreground/40">
                  <th className="w-8 px-2 py-2 text-center">
                    <input type="checkbox" checked={sourceGridRows.length > 0 && selectedRows.size === sourceGridRows.length} onChange={handleSelectAll} className="w-3.5 h-3.5 rounded border-border accent-accent" />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Source Model</th>
                  <th className="px-3 py-2 text-left font-medium w-[16rem]">Sending To</th>
                  <th className="px-3 py-2 text-right font-medium w-14">FX</th>
                  <th className="px-3 py-2 text-right font-medium w-14">Dest#</th>
                  <th className="px-3 py-2 text-center font-medium w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {sourceGridRows.map((row) => (
                  <SourceGridRowComponent key={row.sourceName} row={row} isSelected={selectedRows.has(row.sourceName)} isDropdownOpen={gridDropdown === row.sourceName}
                    dropdownItems={gridDropdown === row.sourceName ? sourceGridDropdownItems : null} dropdownSearch={gridDropdown === row.sourceName ? gridDropdownSearch : ""}
                    onToggleSelect={() => handleSelectRow(row.sourceName)}
                    onOpenDropdown={() => { setGridDropdown(row.sourceName); setGridDropdownSearch(""); }}
                    onCloseDropdown={() => setGridDropdown(null)} onDropdownSearchChange={setGridDropdownSearch}
                    onAssign={(d) => { assignUserModelToLayer(row.sourceName, d); setGridDropdown(null); }}
                    onRemoveLink={(d) => removeLinkFromLayer(row.sourceName, d)}
                    onIgnore={() => handleIgnoreSource(row.sourceName)} />
                ))}
                {sourceGridRows.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-foreground/30">{search ? "No matches" : "No sources"}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {ignoredSourceRows.length > 0 && (
            <div className="flex-shrink-0 border-t border-border/50">
              <button type="button" onClick={() => setIgnoredSectionOpen(!ignoredSectionOpen)} className="w-full flex items-center justify-between px-4 py-1.5 text-left hover:bg-foreground/[0.02]">
                <span className="text-[11px] font-semibold text-foreground/30 uppercase tracking-wider">Ignored ({ignoredSourceRows.length})</span>
                <svg className={`w-3.5 h-3.5 text-foreground/30 transition-transform ${ignoredSectionOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {ignoredSectionOpen && (
                <div className="max-h-[10rem] overflow-y-auto">
                  <table className="w-full text-[12px]"><tbody>
                    {ignoredSourceRows.map((row) => (
                      <tr key={row.sourceName} className="border-b border-border/10 text-foreground/30">
                        <td className="w-8" />
                        <td className="px-3 py-1.5">{row.sourceName}</td>
                        <td className="px-3 py-1.5 text-right">
                          <button type="button" onClick={() => handleRestoreSource(row.sourceName)} className="text-[10px] text-accent/50 hover:text-accent transition-colors">Restore</button>
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              )}
            </div>
          )}

          <div className="px-4 py-2 border-t border-border bg-surface flex-shrink-0 flex items-center gap-4 text-[11px] text-foreground/40">
            <span>{sourceSummary.total} sources</span>
            <span className="text-green-400/70">{sourceSummary.mapped} mapped</span>
            <span className="text-amber-400/70">{sourceSummary.unused} unused</span>
            {ignoredSource.size > 0 && <span className="text-foreground/25">{ignoredSource.size} ignored</span>}
            <span className="ml-auto text-foreground/25">Sequence Coverage: {seqPct}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Grid Row Component (Display Perspective) ────────────

function GridRowComponent({ row, indent, isSelected, isDropdownOpen, dropdownSources, dropdownSearch, draggingSource, onToggleSelect, onOpenDropdown, onCloseDropdown, onDropdownSearchChange, onAssign, onAcceptSuggestion, onRemoveLink, onIgnore }: {
  row: GridRow; indent?: boolean; isSelected: boolean; isDropdownOpen: boolean;
  dropdownSources: { suggested: { name: string; effectCount: number; score: number }[]; rest: { name: string; effectCount: number; score: number }[] } | null;
  dropdownSearch: string; draggingSource: string | null;
  onToggleSelect: () => void; onOpenDropdown: () => void; onCloseDropdown: () => void; onDropdownSearchChange: (v: string) => void;
  onAssign: (sourceName: string) => void; onAcceptSuggestion: (sourceName: string) => void; onRemoveLink: (sourceName: string) => void; onIgnore: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropHover, setIsDropHover] = useState(false);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) onCloseDropdown(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isDropdownOpen, onCloseDropdown]);

  const statusIcon = row.isMapped
    ? <span className="text-green-400" title="Mapped">&#10003;</span>
    : row.topSuggestion ? <span title="AI suggestion available">&#128161;</span>
    : <span className="text-amber-400" title="Unmapped">&#9888;</span>;

  return (
    <tr className={`border-b border-border/20 hover:bg-foreground/[0.02] group/row ${isSelected ? "bg-accent/5" : ""} ${draggingSource && isDropHover ? "bg-accent/10 ring-1 ring-accent/40 ring-inset" : ""}`}
      onDragOver={(e) => { if (!draggingSource) return; e.preventDefault(); e.dataTransfer.dropEffect = "link"; setIsDropHover(true); }}
      onDragLeave={() => setIsDropHover(false)}
      onDrop={(e) => { e.preventDefault(); const src = e.dataTransfer.getData("text/plain"); if (src) onAssign(src); setIsDropHover(false); }}>
      <td className="px-2 py-2 text-center">
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="w-3.5 h-3.5 rounded border-border accent-accent" />
      </td>
      <td className={`py-2 ${indent ? "pl-8 pr-3" : "px-3"}`}>
        <span className="text-foreground/80 font-medium">{row.destName}</span>
      </td>
      <td className="px-3 py-2 relative">
        {row.isMapped ? (
          <div className="flex flex-col gap-0.5">
            {row.sources.map((src) => (
              <div key={src} className="flex items-center gap-1.5 group/src">
                <span className="text-foreground/60 truncate">{src}</span>
                <button type="button" onClick={() => onRemoveLink(src)} className="text-red-400/40 hover:text-red-400 opacity-0 group-hover/src:opacity-100 transition-opacity text-[10px] flex-shrink-0" title="Remove">&times;</button>
              </div>
            ))}
            <button type="button" onClick={onOpenDropdown} className="text-[10px] text-foreground/25 hover:text-foreground/50 transition-colors text-left mt-0.5 opacity-0 group-hover/row:opacity-100">+ add source</button>
          </div>
        ) : row.topSuggestion ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onAcceptSuggestion(row.topSuggestion!.sourceName)} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent/8 text-accent/80 hover:bg-accent/15 hover:text-accent transition-colors">
              <span className="text-[9px]">&#128161;</span>{row.topSuggestion.sourceName}
            </button>
            <button type="button" onClick={onOpenDropdown} className="text-[10px] text-foreground/25 hover:text-foreground/50 transition-colors">or choose...</button>
          </div>
        ) : (
          <button type="button" onClick={onOpenDropdown} className="text-foreground/25 hover:text-foreground/50 transition-colors">Choose a source...</button>
        )}
        {isDropdownOpen && dropdownSources && (
          <div ref={dropdownRef} className="absolute left-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-xl w-[20rem] max-h-[16rem] flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border/50">
              <input type="text" placeholder="Search sources..." value={dropdownSearch} onChange={(e) => onDropdownSearchChange(e.target.value)}
                className="w-full text-[11px] px-2 py-1 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30" autoFocus />
            </div>
            <div className="flex-1 overflow-y-auto">
              {dropdownSources.suggested.length > 0 && (<>
                <div className="px-3 py-1 text-[9px] font-semibold text-foreground/30 uppercase tracking-wider">Suggested</div>
                {dropdownSources.suggested.map((s) => (
                  <button key={s.name} type="button" onClick={() => onAssign(s.name)} className="w-full text-left px-3 py-1.5 hover:bg-accent/10 transition-colors flex items-center gap-2">
                    <span className="text-[9px]">&#128161;</span>
                    <span className="text-[11px] text-foreground truncate flex-1">{s.name}</span>
                    <span className="text-[9px] text-foreground/25 tabular-nums">{s.effectCount} fx</span>
                    <span className="text-[9px] text-accent/60 tabular-nums">{Math.round(s.score * 100)}%</span>
                  </button>
                ))}
                {dropdownSources.rest.length > 0 && <div className="mx-3 my-0.5 border-t border-border/30" />}
              </>)}
              {dropdownSources.rest.map((s) => (
                <button key={s.name} type="button" onClick={() => onAssign(s.name)} className="w-full text-left px-3 py-1.5 hover:bg-accent/10 transition-colors flex items-center gap-2">
                  <span className="text-[11px] text-foreground truncate flex-1">{s.name}</span>
                  <span className="text-[9px] text-foreground/25 tabular-nums">{s.effectCount} fx</span>
                </button>
              ))}
              {dropdownSources.suggested.length === 0 && dropdownSources.rest.length === 0 && (
                <div className="px-3 py-3 text-center text-[11px] text-foreground/30">No matches</div>
              )}
            </div>
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {row.topScore > 0 ? <span className="text-accent/70">{Math.round(row.topScore * 100)}%</span> : <span className="text-foreground/15">&mdash;</span>}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {row.effectCount > 0 ? <span className="text-foreground/50">{row.effectCount}</span> : <span className="text-foreground/15">&mdash;</span>}
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[13px]">{statusIcon}</span>
          <button type="button" onClick={onIgnore} className="text-[9px] text-foreground/20 hover:text-foreground/50 opacity-0 group-hover/row:opacity-100 transition-all" title="Ignore">&#10005;</button>
        </div>
      </td>
    </tr>
  );
}

// ─── Source Grid Row Component ────────────────────────────

function SourceGridRowComponent({ row, isSelected, isDropdownOpen, dropdownItems, dropdownSearch, onToggleSelect, onOpenDropdown, onCloseDropdown, onDropdownSearchChange, onAssign, onRemoveLink, onIgnore }: {
  row: SourceGridRow; isSelected: boolean; isDropdownOpen: boolean;
  dropdownItems: { name: string; isMapped: boolean }[] | null; dropdownSearch: string;
  onToggleSelect: () => void; onOpenDropdown: () => void; onCloseDropdown: () => void; onDropdownSearchChange: (v: string) => void;
  onAssign: (destName: string) => void; onRemoveLink: (destName: string) => void; onIgnore: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) onCloseDropdown(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isDropdownOpen, onCloseDropdown]);

  const statusIcon = row.isMapped ? <span className="text-green-400" title="Mapped">&#10003;</span> : <span className="text-amber-400" title="Unmapped">&#9888;</span>;
  const isHighFxUnmapped = !row.isMapped && row.effectCount > 50;

  return (
    <tr className={`border-b border-border/20 hover:bg-foreground/[0.02] group/row ${isSelected ? "bg-accent/5" : ""} ${isHighFxUnmapped ? "bg-amber-500/[0.03]" : ""}`}>
      <td className="px-2 py-2 text-center">
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="w-3.5 h-3.5 rounded border-border accent-accent" />
      </td>
      <td className="px-3 py-2"><span className="text-foreground/80 font-medium">{row.sourceName}</span></td>
      <td className="px-3 py-2 relative">
        {row.destinations.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {row.destinations.map((dest) => (
              <div key={dest} className="flex items-center gap-1.5 group/dest">
                <span className="text-foreground/60 truncate">{dest}</span>
                <button type="button" onClick={() => onRemoveLink(dest)} className="text-red-400/40 hover:text-red-400 opacity-0 group-hover/dest:opacity-100 transition-opacity text-[10px] flex-shrink-0" title="Remove">&times;</button>
              </div>
            ))}
            <button type="button" onClick={onOpenDropdown} className="text-[10px] text-foreground/25 hover:text-foreground/50 transition-colors text-left mt-0.5 opacity-0 group-hover/row:opacity-100">+ add destination</button>
          </div>
        ) : (
          <button type="button" onClick={onOpenDropdown} className="text-foreground/25 hover:text-foreground/50 transition-colors">Add destination...</button>
        )}
        {isDropdownOpen && dropdownItems && (
          <div ref={dropdownRef} className="absolute left-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-xl w-[20rem] max-h-[16rem] flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border/50">
              <input type="text" placeholder="Search display models..." value={dropdownSearch} onChange={(e) => onDropdownSearchChange(e.target.value)}
                className="w-full text-[11px] px-2 py-1 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30" autoFocus />
            </div>
            <div className="flex-1 overflow-y-auto">
              {dropdownItems.map((item) => (
                <button key={item.name} type="button" onClick={() => onAssign(item.name)} className="w-full text-left px-3 py-1.5 hover:bg-accent/10 transition-colors flex items-center gap-2">
                  <span className="text-[11px] text-foreground truncate flex-1">{item.name}</span>
                  {!item.isMapped && <span className="text-[9px] text-amber-400/60">&#9888; dark</span>}
                </button>
              ))}
              {dropdownItems.length === 0 && <div className="px-3 py-3 text-center text-[11px] text-foreground/30">No matches</div>}
            </div>
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        <span className={row.effectCount > 50 && !row.isMapped ? "text-amber-400/80 font-medium" : "text-foreground/50"}>{row.effectCount}</span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        <span className={row.destCount >= 3 ? "text-blue-400/70 font-medium" : "text-foreground/50"}>{row.destCount}</span>
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[13px]">{statusIcon}</span>
          <button type="button" onClick={onIgnore} className="text-[9px] text-foreground/20 hover:text-foreground/50 opacity-0 group-hover/row:opacity-100 transition-all" title="Ignore">&#10005;</button>
        </div>
      </td>
    </tr>
  );
}

// ─── Dest Batch Dropdown ─────────────────────────────────

function DestBatchDropdown({ items, onSelect }: { items: { name: string; isMapped: boolean }[]; onSelect: (destName: string) => void }) {
  const [open, setOpen] = useState(false);
  const [ddSearch, setDdSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", handler); return () => document.removeEventListener("mousedown", handler); }, [open]);
  const filtered = useMemo(() => { const q = ddSearch.toLowerCase(); return items.filter((m) => !q || m.name.toLowerCase().includes(q)).slice(0, 20); }, [items, ddSearch]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="text-[11px] font-medium px-2.5 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors">Send all to...</button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-xl w-[18rem] max-h-[14rem] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50">
            <input type="text" placeholder="Search display models..." value={ddSearch} onChange={(e) => setDdSearch(e.target.value)} className="w-full text-[11px] px-2 py-1 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30" autoFocus />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((m) => (
              <button key={m.name} type="button" onClick={() => { onSelect(m.name); setOpen(false); }} className="w-full text-left px-3 py-1.5 hover:bg-accent/10 transition-colors flex items-center gap-2">
                <span className="text-[11px] text-foreground truncate flex-1">{m.name}</span>
                {!m.isMapped && <span className="text-[9px] text-amber-400/60">&#9888; dark</span>}
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-3 text-center text-[11px] text-foreground/30">No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Grid Batch Dropdown ─────────────────────────────────

function GridBatchDropdown({ sources, onSelect }: { sources: SourceLayerMapping[]; onSelect: (sourceName: string) => void }) {
  const [open, setOpen] = useState(false);
  const [ddSearch, setDdSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", handler); return () => document.removeEventListener("mousedown", handler); }, [open]);
  const filtered = useMemo(() => { const q = ddSearch.toLowerCase(); return sources.filter((l) => !q || l.sourceModel.name.toLowerCase().includes(q)).sort((a, b) => b.effectCount - a.effectCount).slice(0, 20); }, [sources, ddSearch]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="text-[11px] font-medium px-2.5 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors">Assign all to...</button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-xl w-[18rem] max-h-[14rem] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50">
            <input type="text" placeholder="Search sources..." value={ddSearch} onChange={(e) => setDdSearch(e.target.value)} className="w-full text-[11px] px-2 py-1 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30" autoFocus />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((l) => (
              <button key={l.sourceModel.name} type="button" onClick={() => { onSelect(l.sourceModel.name); setOpen(false); }} className="w-full text-left px-3 py-1.5 hover:bg-accent/10 transition-colors flex items-center gap-2">
                <span className="text-[11px] text-foreground truncate flex-1">{l.sourceModel.name}</span>
                <span className="text-[9px] text-foreground/25 tabular-nums">{l.effectCount} fx</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-3 text-center text-[11px] text-foreground/30">No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}
