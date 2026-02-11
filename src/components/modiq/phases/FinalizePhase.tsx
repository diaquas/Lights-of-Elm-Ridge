"use client";

import { useState, useMemo, useCallback } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";
import type { ParsedModel } from "@/lib/modiq";

// ─── Types ──────────────────────────────────────────────

interface DestDisplayItem {
  model: ParsedModel;
  sources: string[]; // source names mapped to this dest
  isMapped: boolean;
  isGroup: boolean;
}

interface SuggestionHit {
  sourceName: string;
  score: number;
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
    skipSourceLayer,
    unskipSourceLayer,
    getSuggestionsForLayer,
    destToSourcesMap,
    allDestModels,
    assignedUserModelNames,
  } = interactive;

  // ── Left panel state ──
  const [leftSearch, setLeftSearch] = useState("");
  const [leftMappedOpen, setLeftMappedOpen] = useState(true);
  const [leftSkippedOpen, setLeftSkippedOpen] = useState(false);

  // ── Right panel state ──
  const [rightSearch, setRightSearch] = useState("");
  const [rightDarkOpen, setRightDarkOpen] = useState(true);
  const [rightReceivingOpen, setRightReceivingOpen] = useState(true);

  // ── Picker state for "+ Add another destination" and "Choose a source" ──
  const [activeSourcePicker, setActiveSourcePicker] = useState<string | null>(null);
  const [activeDestPicker, setActiveDestPicker] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  // ── Cross-highlighting ──
  const [highlightedSources, setHighlightedSources] = useState<Set<string>>(new Set());
  const [highlightedDests, setHighlightedDests] = useState<Set<string>>(new Set());

  // ══════════════════════════════════════════════════════
  // LEFT PANEL DATA — Source Sequence View
  // ══════════════════════════════════════════════════════

  const { mappedSources, skippedSources } = useMemo(() => {
    const mapped: SourceLayerMapping[] = [];
    const skipped: SourceLayerMapping[] = [];
    for (const layer of sourceLayerMappings) {
      if (layer.isSkipped) {
        skipped.push(layer);
      } else if (layer.isMapped) {
        mapped.push(layer);
      }
    }
    mapped.sort((a, b) =>
      a.sourceModel.name.localeCompare(b.sourceModel.name, undefined, { numeric: true, sensitivity: "base" }),
    );
    skipped.sort((a, b) =>
      a.sourceModel.name.localeCompare(b.sourceModel.name, undefined, { numeric: true, sensitivity: "base" }),
    );
    return { mappedSources: mapped, skippedSources: skipped };
  }, [sourceLayerMappings]);

  const filteredMappedSources = useMemo(() => {
    if (!leftSearch.trim()) return mappedSources;
    const q = leftSearch.toLowerCase();
    return mappedSources.filter((l) =>
      l.sourceModel.name.toLowerCase().includes(q) ||
      l.assignedUserModels.some((m) => m.name.toLowerCase().includes(q)),
    );
  }, [mappedSources, leftSearch]);

  // ══════════════════════════════════════════════════════
  // RIGHT PANEL DATA — My Display View
  // ══════════════════════════════════════════════════════

  const { receivingItems, darkItems } = useMemo(() => {
    const receiving: DestDisplayItem[] = [];
    const dark: DestDisplayItem[] = [];

    // Only show non-DMX individual models (physical props)
    const displayModels = allDestModels.filter(
      (m) => !m.name.startsWith("DMX") && !m.isGroup,
    );

    for (const model of displayModels) {
      const srcs = destToSourcesMap.get(model.name);
      const sourceNames = srcs ? Array.from(srcs) : [];
      const item: DestDisplayItem = {
        model,
        sources: sourceNames,
        isMapped: sourceNames.length > 0,
        isGroup: model.isGroup,
      };
      if (item.isMapped) {
        receiving.push(item);
      } else {
        dark.push(item);
      }
    }

    // Also include mapped groups
    const displayGroups = allDestModels.filter(
      (m) => !m.name.startsWith("DMX") && m.isGroup,
    );
    for (const model of displayGroups) {
      const srcs = destToSourcesMap.get(model.name);
      const sourceNames = srcs ? Array.from(srcs) : [];
      if (sourceNames.length > 0) {
        receiving.push({
          model,
          sources: sourceNames,
          isMapped: true,
          isGroup: true,
        });
      }
    }

    receiving.sort((a, b) =>
      a.model.name.localeCompare(b.model.name, undefined, { numeric: true, sensitivity: "base" }),
    );
    dark.sort((a, b) =>
      a.model.name.localeCompare(b.model.name, undefined, { numeric: true, sensitivity: "base" }),
    );

    return { receivingItems: receiving, darkItems: dark };
  }, [allDestModels, destToSourcesMap]);

  const filteredReceiving = useMemo(() => {
    if (!rightSearch.trim()) return receivingItems;
    const q = rightSearch.toLowerCase();
    return receivingItems.filter((i) =>
      i.model.name.toLowerCase().includes(q) ||
      i.sources.some((s) => s.toLowerCase().includes(q)),
    );
  }, [receivingItems, rightSearch]);

  const filteredDark = useMemo(() => {
    if (!rightSearch.trim()) return darkItems;
    const q = rightSearch.toLowerCase();
    return darkItems.filter((i) => i.model.name.toLowerCase().includes(q));
  }, [darkItems, rightSearch]);

  // ── Suggestions for dark (unmapped) dest items ──
  // For each unmapped dest, find source layers that would be a good match
  const darkSuggestions = useMemo(() => {
    const map = new Map<string, SuggestionHit[]>();
    for (const item of darkItems) {
      // Check each mapped source layer for how well it matches this dest
      const hits: SuggestionHit[] = [];
      for (const layer of sourceLayerMappings) {
        if (layer.isSkipped || !layer.isMapped) continue;
        const suggestions = getSuggestionsForLayer(layer.sourceModel);
        const match = suggestions.find((s) => s.model.name === item.model.name);
        if (match && match.score >= 0.50) {
          hits.push({ sourceName: layer.sourceModel.name, score: match.score });
        }
      }
      if (hits.length > 0) {
        hits.sort((a, b) => b.score - a.score);
        map.set(item.model.name, hits.slice(0, 3));
      }
    }
    return map;
  }, [darkItems, sourceLayerMappings, getSuggestionsForLayer]);

  // ── Handlers ──

  const handleRemoveLink = useCallback(
    (sourceName: string, destName: string) => {
      removeLinkFromLayer(sourceName, destName);
    },
    [removeLinkFromLayer],
  );

  const handleAcceptSuggestion = useCallback(
    (sourceName: string, destName: string) => {
      assignUserModelToLayer(sourceName, destName);
    },
    [assignUserModelToLayer],
  );

  const handleSkipSource = useCallback(
    (sourceName: string) => {
      skipSourceLayer(sourceName);
    },
    [skipSourceLayer],
  );

  const handleUnskipSource = useCallback(
    (sourceName: string) => {
      unskipSourceLayer(sourceName);
    },
    [unskipSourceLayer],
  );

  // Unassigned dest models for the picker
  const unassignedDests = useMemo(() => {
    return allDestModels
      .filter((m) => !m.name.startsWith("DMX") && !assignedUserModelNames.has(m.name))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
      );
  }, [allDestModels, assignedUserModelNames]);

  const filteredPickerDests = useMemo(() => {
    if (!pickerSearch.trim()) return unassignedDests;
    const q = pickerSearch.toLowerCase();
    return unassignedDests.filter((m) => m.name.toLowerCase().includes(q));
  }, [unassignedDests, pickerSearch]);

  // Available source layers for "Choose a source" picker (right panel)
  const mappedSourceLayers = useMemo(() => {
    return sourceLayerMappings
      .filter((l) => !l.isSkipped && l.isMapped)
      .sort((a, b) =>
        a.sourceModel.name.localeCompare(b.sourceModel.name, undefined, { numeric: true, sensitivity: "base" }),
      );
  }, [sourceLayerMappings]);

  const filteredPickerSources = useMemo(() => {
    if (!pickerSearch.trim()) return mappedSourceLayers;
    const q = pickerSearch.toLowerCase();
    return mappedSourceLayers.filter((l) =>
      l.sourceModel.name.toLowerCase().includes(q),
    );
  }, [mappedSourceLayers, pickerSearch]);

  // Cross-highlighting handlers
  const handleHighlightSource = useCallback(
    (sourceName: string) => {
      const layer = sourceLayerMappings.find(
        (l) => l.sourceModel.name === sourceName,
      );
      if (layer) {
        setHighlightedSources(new Set([sourceName]));
        setHighlightedDests(new Set(layer.assignedUserModels.map((m) => m.name)));
      }
    },
    [sourceLayerMappings],
  );

  const handleHighlightDest = useCallback(
    (destName: string) => {
      const srcs = destToSourcesMap.get(destName);
      if (srcs) {
        setHighlightedDests(new Set([destName]));
        setHighlightedSources(new Set(srcs));
      }
    },
    [destToSourcesMap],
  );

  const clearHighlight = useCallback(() => {
    setHighlightedSources(new Set());
    setHighlightedDests(new Set());
  }, []);

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════

  const seqCovPct = phaseItems.length > 0
    ? Math.round((mappedSources.length / phaseItems.length) * 100)
    : 100;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Persistent Coverage Bars Header ── */}
      <div className="px-6 py-3 border-b border-border flex-shrink-0 bg-surface">
        <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Sequence Coverage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-foreground/50">Sequence Coverage</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-bold tabular-nums ${seqCovPct >= 90 ? "text-green-400" : seqCovPct >= 70 ? "text-yellow-400" : "text-red-400"}`}>
                  {seqCovPct}%
                </span>
                <span className="text-[11px] text-foreground/35 tabular-nums">
                  ({mappedSources.length}/{phaseItems.length})
                </span>
                {seqCovPct === 100 && (
                  <span className="text-green-400 text-[11px]">&#10003;</span>
                )}
              </div>
            </div>
            <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                  seqCovPct >= 90 ? "bg-green-500" : seqCovPct >= 70 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${seqCovPct}%` }}
              />
            </div>
          </div>

          {/* Display Coverage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-foreground/50">Display Coverage</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-bold tabular-nums ${displayCoverage.percent >= 90 ? "text-green-400" : displayCoverage.percent >= 70 ? "text-yellow-400" : "text-red-400"}`}>
                  {displayCoverage.percent}%
                </span>
                <span className="text-[11px] text-foreground/35 tabular-nums">
                  ({displayCoverage.covered}/{displayCoverage.total})
                </span>
                {displayCoverage.percent >= 100 && (
                  <span className="text-green-400 text-[11px]">&#10003;</span>
                )}
              </div>
            </div>
            <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                  displayCoverage.percent >= 90 ? "bg-green-500" : displayCoverage.percent >= 70 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(displayCoverage.percent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Dual-Pane Layout ── */}
      <div className="flex-1 min-h-0 grid grid-cols-2 divide-x divide-border overflow-hidden">
        {/* ════════════════════════════════════════════════
            LEFT PANEL — Source Sequence View
            "Where is each source layer going?"
           ════════════════════════════════════════════════ */}
        <div className="flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-foreground/70 uppercase tracking-wide">
                Source Sequence
              </h3>
              <span className="text-[11px] text-foreground/40">
                {mappedSources.length} mapped
              </span>
            </div>
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search sources..."
                value={leftSearch}
                onChange={(e) => setLeftSearch(e.target.value)}
                className="w-full text-[12px] pl-8 pr-7 py-1.5 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
              />
              {leftSearch && (
                <button
                  type="button"
                  onClick={() => setLeftSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 text-sm"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* MAPPED SOURCES */}
            <div className="border-b border-border/50">
              <button
                type="button"
                onClick={() => setLeftMappedOpen(!leftMappedOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-foreground/[0.02]"
              >
                <span className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">
                  Mapped Sources ({filteredMappedSources.length})
                </span>
                <svg
                  className={`w-4 h-4 text-foreground/30 transition-transform ${leftMappedOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {leftMappedOpen && (
                <div className="divide-y divide-border/20">
                  {filteredMappedSources.map((layer) => (
                    <SourceRow
                      key={layer.sourceModel.name}
                      layer={layer}
                      isHighlighted={highlightedSources.has(layer.sourceModel.name)}
                      onRemoveLink={handleRemoveLink}
                      onSkip={handleSkipSource}
                      onHighlight={handleHighlightSource}
                      onClearHighlight={clearHighlight}
                      onOpenDestPicker={(name) => {
                        setActiveSourcePicker(name);
                        setPickerSearch("");
                      }}
                    />
                  ))}
                  {filteredMappedSources.length === 0 && (
                    <div className="px-4 py-6 text-center text-[12px] text-foreground/30">
                      {leftSearch ? "No matches" : "No mapped sources yet"}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SKIPPED SOURCES */}
            {skippedSources.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setLeftSkippedOpen(!leftSkippedOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-foreground/[0.02]"
                >
                  <span className="text-[11px] font-semibold text-foreground/30 uppercase tracking-wider">
                    Skipped ({skippedSources.length})
                  </span>
                  <svg
                    className={`w-4 h-4 text-foreground/20 transition-transform ${leftSkippedOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {leftSkippedOpen && (
                  <div className="divide-y divide-border/20">
                    {skippedSources.map((layer) => (
                      <div
                        key={layer.sourceModel.name}
                        className="px-4 py-2 flex items-center justify-between opacity-50"
                      >
                        <span className="text-[12px] text-foreground/40 line-through truncate">
                          {layer.sourceModel.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUnskipSource(layer.sourceModel.name)}
                          className="text-[11px] text-accent hover:underline flex-shrink-0 ml-2"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dest picker dropdown for "+ Add another destination" */}
          {activeSourcePicker && (
            <PickerOverlay
              title="Add destination"
              search={pickerSearch}
              onSearchChange={setPickerSearch}
              onClose={() => setActiveSourcePicker(null)}
              items={filteredPickerDests.map((m) => ({
                id: m.name,
                label: m.name,
                sublabel: m.isGroup ? "Group" : undefined,
              }))}
              onSelect={(destName) => {
                assignUserModelToLayer(activeSourcePicker, destName);
                setActiveSourcePicker(null);
              }}
            />
          )}
        </div>

        {/* ════════════════════════════════════════════════
            RIGHT PANEL — My Display View
            "What's happening with each part of my display?"
           ════════════════════════════════════════════════ */}
        <div className="flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-foreground/70 uppercase tracking-wide">
                My Display
              </h3>
              <span className="text-[11px] text-foreground/40">
                {receivingItems.length} active &middot; {darkItems.length} dark
              </span>
            </div>
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search display..."
                value={rightSearch}
                onChange={(e) => setRightSearch(e.target.value)}
                className="w-full text-[12px] pl-8 pr-7 py-1.5 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
              />
              {rightSearch && (
                <button
                  type="button"
                  onClick={() => setRightSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 text-sm"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* RECEIVING EFFECTS */}
            <div className="border-b border-border/50">
              <button
                type="button"
                onClick={() => setRightReceivingOpen(!rightReceivingOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-foreground/[0.02]"
              >
                <span className="text-[11px] font-semibold text-green-400/80 uppercase tracking-wider">
                  Receiving Effects ({filteredReceiving.length})
                </span>
                <svg
                  className={`w-4 h-4 text-foreground/30 transition-transform ${rightReceivingOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {rightReceivingOpen && (
                <div className="divide-y divide-border/20">
                  {filteredReceiving.map((item) => (
                    <DestRow
                      key={item.model.name}
                      item={item}
                      isHighlighted={highlightedDests.has(item.model.name)}
                      onRemoveLink={handleRemoveLink}
                      onHighlight={handleHighlightDest}
                      onClearHighlight={clearHighlight}
                      onOpenSourcePicker={(destName) => {
                        setActiveDestPicker(destName);
                        setPickerSearch("");
                      }}
                    />
                  ))}
                  {filteredReceiving.length === 0 && (
                    <div className="px-4 py-6 text-center text-[12px] text-foreground/30">
                      {rightSearch ? "No matches" : "No models receiving effects"}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DARK — NO EFFECTS */}
            {(darkItems.length > 0 || rightSearch) && (
              <div>
                <button
                  type="button"
                  onClick={() => setRightDarkOpen(!rightDarkOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-foreground/[0.02]"
                >
                  <span className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider flex items-center gap-1.5">
                    Dark &mdash; No Effects ({filteredDark.length})
                  </span>
                  <svg
                    className={`w-4 h-4 text-foreground/30 transition-transform ${rightDarkOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {rightDarkOpen && (
                  <div className="divide-y divide-border/20">
                    {displayCoverage.percent >= 100 && darkItems.length === 0 && (
                      <div className="px-4 py-6 text-center">
                        <div className="text-green-400 text-sm font-medium mb-1">
                          All groups in your display are receiving effects
                        </div>
                        <div className="text-[11px] text-foreground/30">
                          Nothing to do here!
                        </div>
                      </div>
                    )}
                    {filteredDark.map((item) => (
                      <DarkDestRow
                        key={item.model.name}
                        item={item}
                        suggestions={darkSuggestions.get(item.model.name)}
                        onAcceptSuggestion={handleAcceptSuggestion}
                        onOpenSourcePicker={(destName) => {
                          setActiveDestPicker(destName);
                          setPickerSearch("");
                        }}
                      />
                    ))}
                    {filteredDark.length === 0 && darkItems.length > 0 && (
                      <div className="px-4 py-4 text-center text-[12px] text-foreground/30">
                        No matches
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Source picker for "Choose a source" / "Change source" */}
          {activeDestPicker && (
            <PickerOverlay
              title="Choose a source"
              search={pickerSearch}
              onSearchChange={setPickerSearch}
              onClose={() => setActiveDestPicker(null)}
              items={filteredPickerSources.map((l) => ({
                id: l.sourceModel.name,
                label: l.sourceModel.name,
                sublabel: l.isGroup ? "Group" : `${l.effectCount} effects`,
              }))}
              onSelect={(sourceName) => {
                assignUserModelToLayer(sourceName, activeDestPicker);
                setActiveDestPicker(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Source Row (Left Panel) ─────────────────────────────

function SourceRow({
  layer,
  isHighlighted,
  onRemoveLink,
  onSkip,
  onHighlight,
  onClearHighlight,
  onOpenDestPicker,
}: {
  layer: SourceLayerMapping;
  isHighlighted: boolean;
  onRemoveLink: (sourceName: string, destName: string) => void;
  onSkip: (sourceName: string) => void;
  onHighlight: (sourceName: string) => void;
  onClearHighlight: () => void;
  onOpenDestPicker: (sourceName: string) => void;
}) {
  const isGroup = layer.isGroup;
  const prefix = isGroup ? "GRP" : "";

  return (
    <div
      className={`px-4 py-2.5 transition-colors ${
        isHighlighted ? "bg-accent/5 ring-1 ring-inset ring-accent/20" : "hover:bg-foreground/[0.02]"
      }`}
      onMouseEnter={() => onHighlight(layer.sourceModel.name)}
      onMouseLeave={onClearHighlight}
    >
      <div className="flex items-center gap-2 mb-1">
        {prefix && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 uppercase">
            {prefix}
          </span>
        )}
        <span className="text-[13px] font-medium text-foreground truncate">
          {layer.sourceModel.name}
        </span>
        <span className="text-[10px] text-foreground/25 ml-auto flex-shrink-0">
          {layer.effectCount} fx
        </span>
      </div>

      {/* Destinations */}
      <div className="ml-4 space-y-1">
        {layer.assignedUserModels.map((dest) => (
          <div key={dest.name} className="flex items-center gap-2 group/link">
            <span className="text-foreground/30 text-[11px]">&rarr;</span>
            <span className="text-[12px] text-foreground/60 truncate flex-1">
              {dest.name}
            </span>
            <button
              type="button"
              onClick={() => onRemoveLink(layer.sourceModel.name, dest.name)}
              className="text-[11px] text-red-400/60 hover:text-red-400 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0"
              title="Remove mapping"
            >
              &times;
            </button>
          </div>
        ))}

        {/* Many-to-one: add another destination */}
        <button
          type="button"
          onClick={() => onOpenDestPicker(layer.sourceModel.name)}
          className="flex items-center gap-1.5 text-[11px] text-accent/60 hover:text-accent transition-colors mt-0.5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add another destination
        </button>
      </div>

      {/* Skip action */}
      <div className="mt-1.5 ml-4">
        <button
          type="button"
          onClick={() => onSkip(layer.sourceModel.name)}
          className="text-[10px] text-foreground/25 hover:text-foreground/50 transition-colors"
        >
          Skip this source
        </button>
      </div>
    </div>
  );
}

// ─── Dest Row — Receiving Effects (Right Panel) ──────────

function DestRow({
  item,
  isHighlighted,
  onRemoveLink,
  onHighlight,
  onClearHighlight,
  onOpenSourcePicker,
}: {
  item: DestDisplayItem;
  isHighlighted: boolean;
  onRemoveLink: (sourceName: string, destName: string) => void;
  onHighlight: (destName: string) => void;
  onClearHighlight: () => void;
  onOpenSourcePicker: (destName: string) => void;
}) {
  return (
    <div
      className={`px-4 py-2.5 transition-colors ${
        isHighlighted ? "bg-accent/5 ring-1 ring-inset ring-accent/20" : "hover:bg-foreground/[0.02]"
      }`}
      onMouseEnter={() => onHighlight(item.model.name)}
      onMouseLeave={onClearHighlight}
    >
      <div className="flex items-center gap-2 mb-1">
        {item.isGroup && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 uppercase">
            GRP
          </span>
        )}
        <span className="text-[13px] font-medium text-foreground truncate">
          {item.model.name}
        </span>
      </div>

      {/* Sources feeding this dest */}
      <div className="ml-4 space-y-1">
        {item.sources.map((srcName) => (
          <div key={srcName} className="flex items-center gap-2 group/link">
            <span className="text-foreground/30 text-[11px]">&larr;</span>
            <span className="text-[12px] text-foreground/60 truncate flex-1">
              {srcName}
            </span>
            <button
              type="button"
              onClick={() => onRemoveLink(srcName, item.model.name)}
              className="text-[11px] text-red-400/60 hover:text-red-400 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0"
              title="Remove mapping"
            >
              &times;
            </button>
          </div>
        ))}

        {/* Change source / add source */}
        <button
          type="button"
          onClick={() => onOpenSourcePicker(item.model.name)}
          className="flex items-center gap-1.5 text-[11px] text-accent/60 hover:text-accent transition-colors mt-0.5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          {item.sources.length > 0 ? "Change source" : "Choose a source"}
        </button>
      </div>
    </div>
  );
}

// ─── Dark Dest Row (Right Panel — unmapped) ──────────────

function DarkDestRow({
  item,
  suggestions,
  onAcceptSuggestion,
  onOpenSourcePicker,
}: {
  item: DestDisplayItem;
  suggestions?: SuggestionHit[];
  onAcceptSuggestion: (sourceName: string, destName: string) => void;
  onOpenSourcePicker: (destName: string) => void;
}) {
  return (
    <div className="px-4 py-2.5 hover:bg-foreground/[0.02]">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-3.5 h-3.5 text-amber-400/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-[13px] font-medium text-foreground/60 truncate">
          {item.model.name}
        </span>
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="ml-6 space-y-1 mt-1">
          {suggestions.map((s) => (
            <div key={s.sourceName} className="flex items-center gap-2">
              <span className="text-[11px] text-foreground/30">Suggested:</span>
              <span className="text-[12px] text-foreground/50 truncate flex-1">
                {s.sourceName}
              </span>
              <span className="text-[10px] text-foreground/25 tabular-nums">
                {Math.round(s.score * 100)}%
              </span>
              <button
                type="button"
                onClick={() => onAcceptSuggestion(s.sourceName, item.model.name)}
                className="text-[11px] px-2 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20 font-medium transition-colors flex-shrink-0"
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Manual assignment */}
      <div className="ml-6 mt-1">
        <button
          type="button"
          onClick={() => onOpenSourcePicker(item.model.name)}
          className="flex items-center gap-1.5 text-[11px] text-foreground/35 hover:text-foreground/60 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Choose a source
        </button>
      </div>
    </div>
  );
}

// ─── Picker Overlay ──────────────────────────────────────

function PickerOverlay({
  title,
  search,
  onSearchChange,
  onClose,
  items,
  onSelect,
}: {
  title: string;
  search: string;
  onSearchChange: (v: string) => void;
  onClose: () => void;
  items: { id: string; label: string; sublabel?: string }[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-foreground/40 hover:text-foreground text-lg"
        >
          &times;
        </button>
      </div>
      <div className="px-4 py-2">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full text-[12px] px-3 py-1.5 rounded bg-foreground/5 border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
          autoFocus
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-foreground/30">
            {search ? "No matches" : "No items available"}
          </div>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="w-full text-left px-4 py-2 hover:bg-accent/10 transition-colors flex items-center gap-2"
          >
            <span className="text-[13px] text-foreground truncate flex-1">{item.label}</span>
            {item.sublabel && (
              <span className="text-[10px] text-foreground/30 flex-shrink-0">{item.sublabel}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
