"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useMappingPhase, extractFamily } from "@/contexts/MappingPhaseContext";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

// ─── Types ──────────────────────────────────────────────

type ViewMode = "card" | "grid";
type Perspective = "display" | "source";
type SortKey = "unmapped-first" | "name-asc" | "name-desc" | "fx-desc" | "match-desc" | "dest-count-desc";
type FilterMode = "all" | "unmapped" | "suggested" | "mapped" | "many-to-one";

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

/** A flat row for grid view — combines dark + mapped items (display perspective) */
interface GridRow {
  destName: string;
  isGroup: boolean;
  sources: string[];
  isMapped: boolean;
  topSuggestion: SuggestionHit | null;
  topScore: number; // 0-1 for sorting
  effectCount: number; // from best source
}

/** Source-perspective row for grid view */
interface SourceGridRow {
  sourceName: string;
  destinations: string[];
  isMapped: boolean;
  isSkipped: boolean;
  effectCount: number;
  destCount: number;
}

/** Source-perspective card group */
interface SourceCardGroup {
  label: string;
  kind: "unmapped" | "single" | "multi";
  items: SourceGridRow[];
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
    effectsCoverage,
    sourceLayerMappings,
    assignUserModelToLayer,
    removeLinkFromLayer,
    getSuggestionsForLayer,
    destToSourcesMap,
    allDestModels,
  } = interactive;

  // ── State ──
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [perspective, setPerspective] = useState<Perspective>("display");
  const [search, setSearch] = useState("");
  const [needsAttentionOpen, setNeedsAttentionOpen] = useState(true);
  const [mappedOpen, setMappedOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [trayOpen, setTrayOpen] = useState(true);
  const [traySearch, setTraySearch] = useState("");
  const [inlinePicker, setInlinePicker] = useState<{ destName: string; anchorRect?: DOMRect } | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [batchPicker, setBatchPicker] = useState<{ family: string } | null>(null);

  // Grid-specific state
  const [sortKey, setSortKey] = useState<SortKey>("unmapped-first");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [gridDropdown, setGridDropdown] = useState<string | null>(null);
  const [gridDropdownSearch, setGridDropdownSearch] = useState("");

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

  // ── Grid rows (flat list of all dest models) ──
  const allGridRows = useMemo((): GridRow[] => {
    const allItems = [...darkItems, ...mappedItems];
    return allItems.map((item) => {
      const suggs = darkSuggestions.get(item.model.name);
      const topSugg = suggs && suggs.length > 0 ? suggs[0] : null;
      // For mapped items, find effect count from source layer
      let effectCount = 0;
      if (item.sources.length > 0) {
        const layer = sourceLayerMappings.find((l) => l.sourceModel.name === item.sources[0]);
        effectCount = layer?.effectCount ?? 0;
      } else if (topSugg) {
        effectCount = topSugg.effectCount;
      }
      return {
        destName: item.model.name,
        isGroup: item.model.isGroup,
        sources: item.sources,
        isMapped: item.isMapped,
        topSuggestion: topSugg,
        topScore: topSugg?.score ?? 0,
        effectCount,
      };
    });
  }, [darkItems, mappedItems, darkSuggestions, sourceLayerMappings]);

  // Filtered + sorted grid rows
  const gridRows = useMemo(() => {
    let rows = allGridRows;

    // Filter
    if (filterMode === "unmapped") rows = rows.filter((r) => !r.isMapped);
    else if (filterMode === "suggested") rows = rows.filter((r) => r.topSuggestion !== null);
    else if (filterMode === "mapped") rows = rows.filter((r) => r.isMapped);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.destName.toLowerCase().includes(q) ||
          r.sources.some((s) => s.toLowerCase().includes(q)),
      );
    }

    // Sort
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
      case "match-desc":
        sorted.sort((a, b) => b.topScore - a.topScore || naturalCompare(a.destName, b.destName));
        break;
    }

    return sorted;
  }, [allGridRows, filterMode, search, sortKey]);

  // Grid dropdown sources (for inline cell dropdown)
  const gridDropdownSources = useMemo(() => {
    if (!gridDropdown) return { suggested: [] as { name: string; effectCount: number; score: number }[], rest: [] as { name: string; effectCount: number; score: number }[] };
    const suggs = darkSuggestions.get(gridDropdown) ?? [];
    const suggNames = new Set(suggs.map((s) => s.sourceName));

    const allSources = sourceLayerMappings
      .filter((l) => !l.isSkipped && l.isMapped)
      .sort((a, b) => b.effectCount - a.effectCount);

    const q = gridDropdownSearch.toLowerCase();
    const filter = (l: SourceLayerMapping) => !q || l.sourceModel.name.toLowerCase().includes(q);

    const suggested = allSources.filter((l) => suggNames.has(l.sourceModel.name)).filter(filter);
    const rest = allSources.filter((l) => !suggNames.has(l.sourceModel.name)).filter(filter);

    return {
      suggested: suggested.map((l) => ({
        name: l.sourceModel.name,
        effectCount: l.effectCount,
        score: suggs.find((s) => s.sourceName === l.sourceModel.name)?.score ?? 0,
      })),
      rest: rest.map((l) => ({
        name: l.sourceModel.name,
        effectCount: l.effectCount,
        score: 0,
      })),
    };
  }, [gridDropdown, darkSuggestions, sourceLayerMappings, gridDropdownSearch]);

  // Grid summary counts (display perspective)
  const gridSummary = useMemo(() => {
    const total = allGridRows.length;
    const mapped = allGridRows.filter((r) => r.isMapped).length;
    const suggested = allGridRows.filter((r) => !r.isMapped && r.topSuggestion !== null).length;
    const unmapped = total - mapped;
    return { total, mapped, suggested, unmapped };
  }, [allGridRows]);

  // ══════════════════════════════════════════════════════
  // SOURCE PERSPECTIVE DATA
  // ══════════════════════════════════════════════════════

  // All source rows (flat list of source layers)
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

  // Filtered + sorted source rows
  const sourceGridRows = useMemo(() => {
    let rows = allSourceRows;

    // Filter
    if (filterMode === "unmapped") rows = rows.filter((r) => !r.isMapped);
    else if (filterMode === "mapped") rows = rows.filter((r) => r.isMapped);
    else if (filterMode === "many-to-one") rows = rows.filter((r) => r.destCount >= 2);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.sourceName.toLowerCase().includes(q) ||
          r.destinations.some((d) => d.toLowerCase().includes(q)),
      );
    }

    // Sort
    const sorted = [...rows];
    switch (sortKey) {
      case "unmapped-first":
        sorted.sort((a, b) => {
          if (a.isMapped !== b.isMapped) return a.isMapped ? 1 : -1;
          return b.effectCount - a.effectCount || naturalCompare(a.sourceName, b.sourceName);
        });
        break;
      case "name-asc":
        sorted.sort((a, b) => naturalCompare(a.sourceName, b.sourceName));
        break;
      case "name-desc":
        sorted.sort((a, b) => naturalCompare(b.sourceName, a.sourceName));
        break;
      case "fx-desc":
        sorted.sort((a, b) => b.effectCount - a.effectCount || naturalCompare(a.sourceName, b.sourceName));
        break;
      case "dest-count-desc":
        sorted.sort((a, b) => b.destCount - a.destCount || naturalCompare(a.sourceName, b.sourceName));
        break;
      default:
        break;
    }

    return sorted;
  }, [allSourceRows, filterMode, search, sortKey]);

  // Source card groups
  const sourceCardGroups = useMemo((): SourceCardGroup[] => {
    const unmapped = allSourceRows.filter((r) => !r.isMapped);
    const single = allSourceRows.filter((r) => r.destCount === 1);
    const multi = allSourceRows.filter((r) => r.destCount >= 2);

    const groups: SourceCardGroup[] = [];
    if (unmapped.length > 0) {
      groups.push({ label: "Needs Destinations", kind: "unmapped", items: unmapped.sort((a, b) => b.effectCount - a.effectCount) });
    }
    if (multi.length > 0) {
      groups.push({ label: `Sending to 2+ Destinations (${multi.length})`, kind: "multi", items: multi });
    }
    if (single.length > 0) {
      groups.push({ label: `Sending to 1 Destination (${single.length})`, kind: "single", items: single });
    }
    return groups;
  }, [allSourceRows]);

  // Source summary
  const sourceSummary = useMemo(() => {
    const total = allSourceRows.length;
    const mapped = allSourceRows.filter((r) => r.isMapped).length;
    const unused = total - mapped;
    return { total, mapped, unused };
  }, [allSourceRows]);

  // Source grid dropdown: show destination models to pick from
  const sourceGridDropdownItems = useMemo(() => {
    if (!gridDropdown || perspective !== "source") return [];
    const q = gridDropdownSearch.toLowerCase();
    return allDestModels
      .filter((m) => !m.name.startsWith("DMX") && !m.isGroup)
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .sort((a, b) => naturalCompare(a.name, b.name))
      .map((m) => {
        const srcs = destToSourcesMap.get(m.name);
        const isMapped = srcs ? srcs.size > 0 : false;
        return { name: m.name, isMapped };
      });
  }, [gridDropdown, perspective, allDestModels, destToSourcesMap, gridDropdownSearch]);

  // Display tray items for source perspective (dest models as chips)
  const destTrayItems = useMemo(() => {
    return allDestModels
      .filter((m) => !m.name.startsWith("DMX") && !m.isGroup)
      .map((m) => {
        const srcs = destToSourcesMap.get(m.name);
        return { name: m.name, isMapped: srcs ? srcs.size > 0 : false };
      })
      .sort((a, b) => {
        // Dark first, then alphabetical
        if (a.isMapped !== b.isMapped) return a.isMapped ? 1 : -1;
        return naturalCompare(a.name, b.name);
      });
  }, [allDestModels, destToSourcesMap]);

  const filteredDestTrayItems = useMemo(() => {
    if (!traySearch.trim()) return destTrayItems;
    const q = traySearch.toLowerCase();
    return destTrayItems.filter((m) => m.name.toLowerCase().includes(q));
  }, [destTrayItems, traySearch]);

  // ── Handlers ──

  const handleSelectRow = useCallback((destName: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(destName)) next.delete(destName);
      else next.add(destName);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (perspective === "source") {
      if (selectedRows.size === sourceGridRows.length) {
        setSelectedRows(new Set());
      } else {
        setSelectedRows(new Set(sourceGridRows.map((r) => r.sourceName)));
      }
    } else {
      if (selectedRows.size === gridRows.length) {
        setSelectedRows(new Set());
      } else {
        setSelectedRows(new Set(gridRows.map((r) => r.destName)));
      }
    }
  }, [perspective, gridRows, sourceGridRows, selectedRows.size]);

  const handleBatchAssignSelected = useCallback(
    (sourceName: string) => {
      for (const destName of selectedRows) {
        assignUserModelToLayer(sourceName, destName);
      }
      setSelectedRows(new Set());
    },
    [selectedRows, assignUserModelToLayer],
  );

  // Source perspective: batch assign selected sources to one dest
  const handleBatchAssignSelectedToDest = useCallback(
    (destName: string) => {
      for (const sourceName of selectedRows) {
        assignUserModelToLayer(sourceName, destName);
      }
      setSelectedRows(new Set());
    },
    [selectedRows, assignUserModelToLayer],
  );

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

  const dispPct = displayCoverage.percent;
  const seqPct = effectsCoverage.percent;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Dual Coverage Bars ── */}
      <div className="px-6 py-3 border-b border-border flex-shrink-0 bg-surface">
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-6">
          {/* Display Coverage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-foreground/50">Display Coverage</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-bold tabular-nums ${coverageColor(dispPct)}`}>{dispPct}%</span>
                <span className="text-[10px] text-foreground/30 tabular-nums">({displayCoverage.covered}/{displayCoverage.total})</span>
                {dispPct >= 100 && <span className="text-green-400 text-[11px]">&#10003;</span>}
              </div>
            </div>
            <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ease-out ${coverageBarColor(dispPct)}`} style={{ width: `${Math.min(dispPct, 100)}%` }} />
            </div>
          </div>
          {/* Sequence Coverage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-foreground/50">Sequence Coverage</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-bold tabular-nums ${coverageColor(seqPct)}`}>{seqPct}%</span>
                <span className="text-[10px] text-foreground/30 tabular-nums">({effectsCoverage.covered}/{effectsCoverage.total})</span>
                {seqPct >= 100 && <span className="text-green-400 text-[11px]">&#10003;</span>}
              </div>
            </div>
            <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ease-out ${coverageBarColor(seqPct)}`} style={{ width: `${Math.min(seqPct, 100)}%` }} />
            </div>
          </div>
        </div>
        {deltaToast && (
          <div className="text-center mt-1.5">
            <span className="text-[11px] text-green-400 font-medium animate-pulse">{deltaToast}</span>
          </div>
        )}
      </div>

      {/* ── Quick Actions + Perspective + View Toggle ── */}
      <div className="px-6 py-2 border-b border-border/50 flex-shrink-0 flex items-center gap-3">
        {perspective === "display" && darkItems.length > 0 && suggestedCount > 0 && (
          <button
            type="button"
            onClick={handleAcceptAllSuggestions}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            Accept All Suggestions ({suggestedCount})
          </button>
        )}
        {perspective === "display" && darkItems.length > 0 && (
          <span className="text-[11px] text-foreground/30">
            {darkItems.length} model{darkItems.length !== 1 ? "s" : ""} need attention
          </span>
        )}
        {perspective === "source" && sourceSummary.unused > 0 && (
          <span className="text-[11px] text-amber-400/60">
            {sourceSummary.unused} source{sourceSummary.unused !== 1 ? "s" : ""} unused
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {/* Perspective toggle */}
          <div className="flex items-center gap-1 bg-foreground/5 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => { setPerspective("display"); setSelectedRows(new Set()); }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                perspective === "display" ? "bg-accent/15 text-accent" : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              My Display
            </button>
            <button
              type="button"
              onClick={() => { setPerspective("source"); setSelectedRows(new Set()); }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                perspective === "source" ? "bg-accent/15 text-accent" : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              Source Sequence
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-foreground/5 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                viewMode === "card" ? "bg-accent/15 text-accent" : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                viewMode === "grid" ? "bg-accent/15 text-accent" : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18M10 6v12M17 6v12" />
              </svg>
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* ── Search (shared) + Grid controls ── */}
      <div className="px-6 py-2 border-b border-border/50 flex-shrink-0 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
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

        {/* Grid-only: Sort + Filter */}
        {viewMode === "grid" && perspective === "display" && (
          <>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="text-[11px] px-2 py-1.5 rounded bg-foreground/5 border border-border text-foreground/60 focus:outline-none focus:border-accent"
            >
              <option value="unmapped-first">Unmapped First</option>
              <option value="name-asc">Name A&#8594;Z</option>
              <option value="name-desc">Name Z&#8594;A</option>
              <option value="fx-desc">Effects High&#8594;Low</option>
              <option value="match-desc">Match High&#8594;Low</option>
            </select>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
              className="text-[11px] px-2 py-1.5 rounded bg-foreground/5 border border-border text-foreground/60 focus:outline-none focus:border-accent"
            >
              <option value="all">All</option>
              <option value="unmapped">Unmapped Only</option>
              <option value="suggested">Suggested Only</option>
              <option value="mapped">Mapped Only</option>
            </select>
          </>
        )}
        {viewMode === "grid" && perspective === "source" && (
          <>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="text-[11px] px-2 py-1.5 rounded bg-foreground/5 border border-border text-foreground/60 focus:outline-none focus:border-accent"
            >
              <option value="unmapped-first">Unmapped First</option>
              <option value="fx-desc">Effects High&#8594;Low</option>
              <option value="name-asc">Name A&#8594;Z</option>
              <option value="dest-count-desc">Dest Count High&#8594;Low</option>
            </select>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
              className="text-[11px] px-2 py-1.5 rounded bg-foreground/5 border border-border text-foreground/60 focus:outline-none focus:border-accent"
            >
              <option value="all">All</option>
              <option value="unmapped">Unmapped Only</option>
              <option value="mapped">Mapped Only</option>
              <option value="many-to-one">2+ Destinations</option>
            </select>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* CARD VIEW — DISPLAY PERSPECTIVE                       */}
      {/* ══════════════════════════════════════════════════════ */}
      {viewMode === "card" && perspective === "display" && (
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
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* GRID VIEW — DISPLAY PERSPECTIVE                       */}
      {/* ══════════════════════════════════════════════════════ */}
      {viewMode === "grid" && perspective === "display" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Multi-select toolbar */}
          {selectedRows.size > 0 && (
            <div className="px-4 py-2 bg-accent/5 border-b border-accent/20 flex-shrink-0 flex items-center gap-3">
              <span className="text-[12px] font-medium text-accent">
                {selectedRows.size} selected
              </span>
              <GridBatchDropdown
                sources={sourceTrayItems}
                onSelect={handleBatchAssignSelected}
              />
              <button
                type="button"
                onClick={() => setSelectedRows(new Set())}
                className="text-[11px] text-foreground/40 hover:text-foreground/60 ml-auto"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border text-foreground/40">
                  <th className="w-8 px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={gridRows.length > 0 && selectedRows.size === gridRows.length}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 rounded border-border accent-accent"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">My Display</th>
                  <th className="px-3 py-2 text-left font-medium w-[16rem]">Mapped To</th>
                  <th className="px-3 py-2 text-right font-medium w-16">Match</th>
                  <th className="px-3 py-2 text-right font-medium w-14">FX</th>
                  <th className="px-3 py-2 text-center font-medium w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {gridRows.map((row) => (
                  <GridRowComponent
                    key={row.destName}
                    row={row}
                    isSelected={selectedRows.has(row.destName)}
                    isDropdownOpen={gridDropdown === row.destName}
                    dropdownSources={gridDropdown === row.destName ? gridDropdownSources : null}
                    dropdownSearch={gridDropdown === row.destName ? gridDropdownSearch : ""}
                    onToggleSelect={() => handleSelectRow(row.destName)}
                    onOpenDropdown={() => {
                      setGridDropdown(row.destName);
                      setGridDropdownSearch("");
                    }}
                    onCloseDropdown={() => setGridDropdown(null)}
                    onDropdownSearchChange={setGridDropdownSearch}
                    onAssign={(sourceName) => {
                      assignUserModelToLayer(sourceName, row.destName);
                      setGridDropdown(null);
                    }}
                    onAcceptSuggestion={(sourceName) => {
                      assignUserModelToLayer(sourceName, row.destName);
                    }}
                    onRemoveLink={(sourceName) => {
                      removeLinkFromLayer(sourceName, row.destName);
                    }}
                  />
                ))}
                {gridRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-foreground/30">
                      {search ? "No matches" : "No models"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div className="px-4 py-2 border-t border-border bg-surface flex-shrink-0 flex items-center gap-4 text-[11px] text-foreground/40">
            <span>{gridSummary.total} models</span>
            <span className="text-green-400/70">{gridSummary.mapped} mapped</span>
            <span className="text-accent/70">{gridSummary.suggested} suggested</span>
            <span className="text-amber-400/70">{gridSummary.unmapped} unmapped</span>
            <span className="ml-auto text-foreground/25">Display Coverage: {dispPct}%</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* CARD VIEW — SOURCE PERSPECTIVE                        */}
      {/* ══════════════════════════════════════════════════════ */}
      {viewMode === "card" && perspective === "source" && (
        <div className="flex-1 min-h-0 overflow-y-auto relative">
          {sourceSummary.unused === 0 && (
            <div className="px-6 py-8 text-center">
              <div className="text-green-400 text-lg font-medium mb-1">
                All source models are being used!
              </div>
              <p className="text-[12px] text-foreground/30">
                Every source model is sending effects to at least one destination.
              </p>
            </div>
          )}

          {sourceCardGroups.map((group) => {
            const isOpen = group.kind === "unmapped" ? needsAttentionOpen : expandedGroups.has(group.label);
            const toggle = group.kind === "unmapped"
              ? () => setNeedsAttentionOpen(!needsAttentionOpen)
              : () => toggleGroup(group.label);
            const labelColor = group.kind === "unmapped"
              ? "text-amber-400/80"
              : group.kind === "multi" ? "text-blue-400/80" : "text-green-400/80";

            return (
              <div key={group.label} className="border-b border-border/50">
                <button
                  type="button"
                  onClick={toggle}
                  className="w-full flex items-center justify-between px-6 py-2.5 text-left hover:bg-foreground/[0.02]"
                >
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${labelColor}`}>
                    {group.label} ({group.items.length})
                  </span>
                  <svg
                    className={`w-4 h-4 text-foreground/30 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-4 pb-3 divide-y divide-border/20">
                    {group.items
                      .filter((item) => !search.trim() || item.sourceName.toLowerCase().includes(search.toLowerCase()) || item.destinations.some((d) => d.toLowerCase().includes(search.toLowerCase())))
                      .map((item) => (
                      <div key={item.sourceName} className={`px-2 py-2.5 hover:bg-foreground/[0.02] ${!item.isMapped && item.effectCount > 50 ? "bg-amber-500/[0.03]" : ""}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {item.isMapped ? (
                            <svg className="w-3.5 h-3.5 text-green-400/60 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span className="text-amber-400 text-[13px]">&#9888;</span>
                          )}
                          <span className="text-[12px] text-foreground/70 font-medium truncate flex-1">
                            {item.sourceName}
                          </span>
                          <span className="text-[10px] text-foreground/30 tabular-nums flex-shrink-0">
                            {item.effectCount} fx
                          </span>
                        </div>
                        {item.destinations.length > 0 ? (
                          <div className="ml-6 flex flex-wrap gap-1">
                            {item.destinations.map((dest) => (
                              <div key={dest} className="inline-flex items-center gap-1 group/dest">
                                <span className="text-[10px] text-foreground/30">&rarr;</span>
                                <span className="text-[11px] text-foreground/40">{dest}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLink(item.sourceName, dest)}
                                  className="text-[10px] text-red-400/50 hover:text-red-400 opacity-0 group-hover/dest:opacity-100 transition-opacity"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="ml-6">
                            <button
                              type="button"
                              onClick={() => {
                                setGridDropdown(item.sourceName);
                                setGridDropdownSearch("");
                              }}
                              className="text-[10px] text-foreground/30 hover:text-foreground/50 transition-colors"
                            >
                              + Add destination...
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Source perspective: dest picker modal */}
          {gridDropdown && perspective === "source" && (
            <SourceDestPicker
              sourceName={gridDropdown}
              items={sourceGridDropdownItems}
              search={gridDropdownSearch}
              onSearchChange={setGridDropdownSearch}
              onSelect={(destName) => {
                assignUserModelToLayer(gridDropdown, destName);
                setGridDropdown(null);
              }}
              onClose={() => setGridDropdown(null)}
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* GRID VIEW — SOURCE PERSPECTIVE                        */}
      {/* ══════════════════════════════════════════════════════ */}
      {viewMode === "grid" && perspective === "source" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Multi-select toolbar */}
          {selectedRows.size > 0 && (
            <div className="px-4 py-2 bg-accent/5 border-b border-accent/20 flex-shrink-0 flex items-center gap-3">
              <span className="text-[12px] font-medium text-accent">
                {selectedRows.size} selected
              </span>
              <DestBatchDropdown
                items={destTrayItems}
                onSelect={handleBatchAssignSelectedToDest}
              />
              <button
                type="button"
                onClick={() => setSelectedRows(new Set())}
                className="text-[11px] text-foreground/40 hover:text-foreground/60 ml-auto"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border text-foreground/40">
                  <th className="w-8 px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={sourceGridRows.length > 0 && selectedRows.size === sourceGridRows.length}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 rounded border-border accent-accent"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Source Model</th>
                  <th className="px-3 py-2 text-left font-medium w-[16rem]">Sending To</th>
                  <th className="px-3 py-2 text-right font-medium w-14">FX</th>
                  <th className="px-3 py-2 text-right font-medium w-14">Dest#</th>
                  <th className="px-3 py-2 text-center font-medium w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {sourceGridRows.map((row) => (
                  <SourceGridRowComponent
                    key={row.sourceName}
                    row={row}
                    isSelected={selectedRows.has(row.sourceName)}
                    isDropdownOpen={gridDropdown === row.sourceName}
                    dropdownItems={gridDropdown === row.sourceName ? sourceGridDropdownItems : null}
                    dropdownSearch={gridDropdown === row.sourceName ? gridDropdownSearch : ""}
                    onToggleSelect={() => handleSelectRow(row.sourceName)}
                    onOpenDropdown={() => {
                      setGridDropdown(row.sourceName);
                      setGridDropdownSearch("");
                    }}
                    onCloseDropdown={() => setGridDropdown(null)}
                    onDropdownSearchChange={setGridDropdownSearch}
                    onAssign={(destName) => {
                      assignUserModelToLayer(row.sourceName, destName);
                      setGridDropdown(null);
                    }}
                    onRemoveLink={(destName) => {
                      removeLinkFromLayer(row.sourceName, destName);
                    }}
                  />
                ))}
                {sourceGridRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-foreground/30">
                      {search ? "No matches" : "No sources"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div className="px-4 py-2 border-t border-border bg-surface flex-shrink-0 flex items-center gap-4 text-[11px] text-foreground/40">
            <span>{sourceSummary.total} sources</span>
            <span className="text-green-400/70">{sourceSummary.mapped} mapped</span>
            <span className="text-amber-400/70">{sourceSummary.unused} unused</span>
            <span className="ml-auto text-foreground/25">Sequence Coverage: {seqPct}%</span>
          </div>
        </div>
      )}

      {/* ═══ TRAY (Bottom Dock) — flips based on perspective ═══ */}
      <div className="flex-shrink-0 border-t border-border bg-surface">
        <button
          type="button"
          onClick={() => setTrayOpen(!trayOpen)}
          className="w-full flex items-center justify-between px-4 py-1.5 text-left hover:bg-foreground/[0.02]"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">
              {perspective === "display" ? "Source Tray" : "Display Tray"}
            </span>
            <span className="text-[10px] text-foreground/30">
              ({perspective === "display" ? `${sourceTrayItems.length} sources` : `${destTrayItems.length} models`})
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
            <div className="relative mb-2">
              <input
                type="text"
                placeholder={perspective === "display" ? "Search sources..." : "Search display models..."}
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

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {/* Display perspective: source chips */}
              {perspective === "display" && filteredTrayItems.map((layer) => {
                const destCount = layer.assignedUserModels.length;
                return (
                  <button
                    key={layer.sourceModel.name}
                    type="button"
                    onClick={() => {
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

              {/* Source perspective: dest model chips */}
              {perspective === "source" && filteredDestTrayItems.map((m) => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => {
                    // If a source dropdown is open, assign this dest to it
                    if (gridDropdown) {
                      assignUserModelToLayer(gridDropdown, m.name);
                      setGridDropdown(null);
                    }
                  }}
                  className={`flex-shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-lg border transition-colors min-w-[5rem] text-center ${
                    m.isMapped
                      ? "border-border/50 bg-foreground/[0.03] hover:bg-foreground/[0.06]"
                      : "border-amber-500/30 bg-amber-500/[0.05] hover:bg-amber-500/[0.10]"
                  } hover:border-accent/30`}
                  title={m.name}
                >
                  <span className="text-[11px] font-medium text-foreground truncate max-w-[6rem]">
                    {m.name}
                  </span>
                  {!m.isMapped && (
                    <span className="text-[8px] text-amber-400/60 mt-0.5">&#9888; dark</span>
                  )}
                </button>
              ))}

              {perspective === "display" && filteredTrayItems.length === 0 && (
                <span className="text-[11px] text-foreground/30 py-2">
                  {traySearch ? "No matches" : "No sources available"}
                </span>
              )}
              {perspective === "source" && filteredDestTrayItems.length === 0 && (
                <span className="text-[11px] text-foreground/30 py-2">
                  {traySearch ? "No matches" : "No display models"}
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

// ─── Grid Row Component ──────────────────────────────────

function GridRowComponent({
  row,
  isSelected,
  isDropdownOpen,
  dropdownSources,
  dropdownSearch,
  onToggleSelect,
  onOpenDropdown,
  onCloseDropdown,
  onDropdownSearchChange,
  onAssign,
  onAcceptSuggestion,
  onRemoveLink,
}: {
  row: GridRow;
  isSelected: boolean;
  isDropdownOpen: boolean;
  dropdownSources: { suggested: { name: string; effectCount: number; score: number }[]; rest: { name: string; effectCount: number; score: number }[] } | null;
  dropdownSearch: string;
  onToggleSelect: () => void;
  onOpenDropdown: () => void;
  onCloseDropdown: () => void;
  onDropdownSearchChange: (v: string) => void;
  onAssign: (sourceName: string) => void;
  onAcceptSuggestion: (sourceName: string) => void;
  onRemoveLink: (sourceName: string) => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onCloseDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isDropdownOpen, onCloseDropdown]);

  const statusIcon = row.isMapped ? (
    <span className="text-green-400" title="Mapped">&#10003;</span>
  ) : row.topSuggestion ? (
    <span title="AI suggestion available">&#128161;</span>
  ) : (
    <span className="text-amber-400" title="Unmapped">&#9888;</span>
  );

  return (
    <tr className={`border-b border-border/20 hover:bg-foreground/[0.02] group/row ${isSelected ? "bg-accent/5" : ""}`}>
      {/* Checkbox */}
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-3.5 h-3.5 rounded border-border accent-accent"
        />
      </td>

      {/* My Display */}
      <td className="px-3 py-2">
        <span className="text-foreground/80 font-medium">{row.destName}</span>
      </td>

      {/* Mapped To (inline dropdown) */}
      <td className="px-3 py-2 relative">
        {row.isMapped ? (
          <div className="flex flex-col gap-0.5">
            {row.sources.map((src) => (
              <div key={src} className="flex items-center gap-1.5 group/src">
                <span className="text-foreground/60 truncate">{src}</span>
                <button
                  type="button"
                  onClick={() => onRemoveLink(src)}
                  className="text-red-400/40 hover:text-red-400 opacity-0 group-hover/src:opacity-100 transition-opacity text-[10px] flex-shrink-0"
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={onOpenDropdown}
              className="text-[10px] text-foreground/25 hover:text-foreground/50 transition-colors text-left mt-0.5 opacity-0 group-hover/row:opacity-100"
            >
              + add source
            </button>
          </div>
        ) : row.topSuggestion ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAcceptSuggestion(row.topSuggestion!.sourceName)}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent/8 text-accent/80 hover:bg-accent/15 hover:text-accent transition-colors"
            >
              <span className="text-[9px]">&#128161;</span>
              {row.topSuggestion.sourceName}
            </button>
            <button
              type="button"
              onClick={onOpenDropdown}
              className="text-[10px] text-foreground/25 hover:text-foreground/50 transition-colors"
            >
              or choose...
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenDropdown}
            className="text-foreground/25 hover:text-foreground/50 transition-colors"
          >
            Choose a source...
          </button>
        )}

        {/* Inline dropdown */}
        {isDropdownOpen && dropdownSources && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-xl w-[20rem] max-h-[16rem] flex flex-col overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-border/50">
              <input
                type="text"
                placeholder="Search sources..."
                value={dropdownSearch}
                onChange={(e) => onDropdownSearchChange(e.target.value)}
                className="w-full text-[11px] px-2 py-1 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {dropdownSources.suggested.length > 0 && (
                <>
                  <div className="px-3 py-1 text-[9px] font-semibold text-foreground/30 uppercase tracking-wider">
                    Suggested
                  </div>
                  {dropdownSources.suggested.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => onAssign(s.name)}
                      className="w-full text-left px-3 py-1.5 hover:bg-accent/10 transition-colors flex items-center gap-2"
                    >
                      <span className="text-[9px]">&#128161;</span>
                      <span className="text-[11px] text-foreground truncate flex-1">{s.name}</span>
                      <span className="text-[9px] text-foreground/25 tabular-nums">{s.effectCount} fx</span>
                      <span className="text-[9px] text-accent/60 tabular-nums">{Math.round(s.score * 100)}%</span>
                    </button>
                  ))}
                  {dropdownSources.rest.length > 0 && (
                    <div className="mx-3 my-0.5 border-t border-border/30" />
                  )}
                </>
              )}
              {dropdownSources.rest.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => onAssign(s.name)}
                  className="w-full text-left px-3 py-1.5 hover:bg-accent/10 transition-colors flex items-center gap-2"
                >
                  <span className="text-[11px] text-foreground truncate flex-1">{s.name}</span>
                  <span className="text-[9px] text-foreground/25 tabular-nums">{s.effectCount} fx</span>
                </button>
              ))}
              {dropdownSources.suggested.length === 0 && dropdownSources.rest.length === 0 && (
                <div className="px-3 py-3 text-center text-[11px] text-foreground/30">
                  No matches
                </div>
              )}
            </div>
          </div>
        )}
      </td>

      {/* Match % */}
      <td className="px-3 py-2 text-right tabular-nums">
        {row.topScore > 0 ? (
          <span className="text-accent/70">{Math.round(row.topScore * 100)}%</span>
        ) : (
          <span className="text-foreground/15">&mdash;</span>
        )}
      </td>

      {/* FX */}
      <td className="px-3 py-2 text-right tabular-nums">
        {row.effectCount > 0 ? (
          <span className="text-foreground/50">{row.effectCount}</span>
        ) : (
          <span className="text-foreground/15">&mdash;</span>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-2 text-center text-[13px]">
        {statusIcon}
      </td>
    </tr>
  );
}

// ─── Source Grid Row Component ────────────────────────────

function SourceGridRowComponent({
  row,
  isSelected,
  isDropdownOpen,
  dropdownItems,
  dropdownSearch,
  onToggleSelect,
  onOpenDropdown,
  onCloseDropdown,
  onDropdownSearchChange,
  onAssign,
  onRemoveLink,
}: {
  row: SourceGridRow;
  isSelected: boolean;
  isDropdownOpen: boolean;
  dropdownItems: { name: string; isMapped: boolean }[] | null;
  dropdownSearch: string;
  onToggleSelect: () => void;
  onOpenDropdown: () => void;
  onCloseDropdown: () => void;
  onDropdownSearchChange: (v: string) => void;
  onAssign: (destName: string) => void;
  onRemoveLink: (destName: string) => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onCloseDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isDropdownOpen, onCloseDropdown]);

  const statusIcon = row.isMapped ? (
    <span className="text-green-400" title="Mapped">&#10003;</span>
  ) : (
    <span className="text-amber-400" title="Unmapped">&#9888;</span>
  );

  const isHighFxUnmapped = !row.isMapped && row.effectCount > 50;

  return (
    <tr className={`border-b border-border/20 hover:bg-foreground/[0.02] group/row ${isSelected ? "bg-accent/5" : ""} ${isHighFxUnmapped ? "bg-amber-500/[0.03]" : ""}`}>
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-3.5 h-3.5 rounded border-border accent-accent"
        />
      </td>

      <td className="px-3 py-2">
        <span className="text-foreground/80 font-medium">{row.sourceName}</span>
      </td>

      <td className="px-3 py-2 relative">
        {row.destinations.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {row.destinations.map((dest) => (
              <div key={dest} className="flex items-center gap-1.5 group/dest">
                <span className="text-foreground/60 truncate">{dest}</span>
                <button
                  type="button"
                  onClick={() => onRemoveLink(dest)}
                  className="text-red-400/40 hover:text-red-400 opacity-0 group-hover/dest:opacity-100 transition-opacity text-[10px] flex-shrink-0"
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={onOpenDropdown}
              className="text-[10px] text-foreground/25 hover:text-foreground/50 transition-colors text-left mt-0.5 opacity-0 group-hover/row:opacity-100"
            >
              + add destination
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenDropdown}
            className="text-foreground/25 hover:text-foreground/50 transition-colors"
          >
            Add destination...
          </button>
        )}

        {isDropdownOpen && dropdownItems && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-xl w-[20rem] max-h-[16rem] flex flex-col overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-border/50">
              <input
                type="text"
                placeholder="Search display models..."
                value={dropdownSearch}
                onChange={(e) => onDropdownSearchChange(e.target.value)}
                className="w-full text-[11px] px-2 py-1 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {dropdownItems.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => onAssign(item.name)}
                  className="w-full text-left px-3 py-1.5 hover:bg-accent/10 transition-colors flex items-center gap-2"
                >
                  <span className="text-[11px] text-foreground truncate flex-1">{item.name}</span>
                  {!item.isMapped && (
                    <span className="text-[9px] text-amber-400/60">&#9888; dark</span>
                  )}
                </button>
              ))}
              {dropdownItems.length === 0 && (
                <div className="px-3 py-3 text-center text-[11px] text-foreground/30">No matches</div>
              )}
            </div>
          </div>
        )}
      </td>

      <td className="px-3 py-2 text-right tabular-nums">
        <span className={row.effectCount > 50 && !row.isMapped ? "text-amber-400/80 font-medium" : "text-foreground/50"}>
          {row.effectCount}
        </span>
      </td>

      <td className="px-3 py-2 text-right tabular-nums">
        <span className={row.destCount >= 3 ? "text-blue-400/70 font-medium" : "text-foreground/50"}>
          {row.destCount}
        </span>
      </td>

      <td className="px-3 py-2 text-center text-[13px]">
        {statusIcon}
      </td>
    </tr>
  );
}

// ─── Source Dest Picker (for card view source perspective) ──

function SourceDestPicker({
  sourceName,
  items,
  search,
  onSearchChange,
  onSelect,
  onClose,
}: {
  sourceName: string;
  items: { name: string; isMapped: boolean }[];
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (destName: string) => void;
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
        className="bg-surface border border-border rounded-xl shadow-xl w-[24rem] max-h-[22rem] flex flex-col overflow-hidden"
      >
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-foreground">Add destination</div>
            <div className="text-[11px] text-foreground/40 truncate">for {sourceName}</div>
          </div>
          <button type="button" onClick={onClose} className="text-foreground/40 hover:text-foreground text-lg leading-none">
            &times;
          </button>
        </div>
        <div className="px-3 py-2">
          <input
            type="text"
            placeholder="Search display models..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-[12px] px-3 py-1.5 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => onSelect(item.name)}
              className="w-full text-left px-3 py-2 hover:bg-accent/10 transition-colors flex items-center gap-2"
            >
              <span className="text-[12px] text-foreground truncate flex-1">{item.name}</span>
              {!item.isMapped && (
                <span className="text-[9px] text-amber-400/60">&#9888; dark</span>
              )}
            </button>
          ))}
          {items.length === 0 && (
            <div className="px-3 py-4 text-center text-[12px] text-foreground/30">
              {search ? "No matches" : "No models available"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dest Batch Dropdown (source perspective multi-select) ──

function DestBatchDropdown({
  items,
  onSelect,
}: {
  items: { name: string; isMapped: boolean }[];
  onSelect: (destName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ddSearch, setDdSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = ddSearch.toLowerCase();
    return items.filter((m) => !q || m.name.toLowerCase().includes(q)).slice(0, 20);
  }, [items, ddSearch]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[11px] font-medium px-2.5 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
      >
        Send all to...
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-xl w-[18rem] max-h-[14rem] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50">
            <input
              type="text"
              placeholder="Search display models..."
              value={ddSearch}
              onChange={(e) => setDdSearch(e.target.value)}
              className="w-full text-[11px] px-2 py-1 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((m) => (
              <button
                key={m.name}
                type="button"
                onClick={() => {
                  onSelect(m.name);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent/10 transition-colors flex items-center gap-2"
              >
                <span className="text-[11px] text-foreground truncate flex-1">{m.name}</span>
                {!m.isMapped && (
                  <span className="text-[9px] text-amber-400/60">&#9888; dark</span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-center text-[11px] text-foreground/30">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Grid Batch Dropdown (multi-select toolbar) ──────────

function GridBatchDropdown({
  sources,
  onSelect,
}: {
  sources: SourceLayerMapping[];
  onSelect: (sourceName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ddSearch, setDdSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = ddSearch.toLowerCase();
    const list = sources.filter((l) => !q || l.sourceModel.name.toLowerCase().includes(q));
    return list.sort((a, b) => b.effectCount - a.effectCount).slice(0, 20);
  }, [sources, ddSearch]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[11px] font-medium px-2.5 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
      >
        Assign all to...
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-xl w-[18rem] max-h-[14rem] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50">
            <input
              type="text"
              placeholder="Search sources..."
              value={ddSearch}
              onChange={(e) => setDdSearch(e.target.value)}
              className="w-full text-[11px] px-2 py-1 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((l) => (
              <button
                key={l.sourceModel.name}
                type="button"
                onClick={() => {
                  onSelect(l.sourceModel.name);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent/10 transition-colors flex items-center gap-2"
              >
                <span className="text-[11px] text-foreground truncate flex-1">{l.sourceModel.name}</span>
                <span className="text-[9px] text-foreground/25 tabular-nums">{l.effectCount} fx</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-center text-[11px] text-foreground/30">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
