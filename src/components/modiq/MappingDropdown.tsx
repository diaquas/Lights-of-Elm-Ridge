"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { ParsedModel, Confidence, ModelMapping } from "@/lib/modiq";

interface Suggestion {
  model: ParsedModel;
  score: number;
  confidence: Confidence;
  factors: ModelMapping["factors"];
}

interface MappingDropdownProps {
  destModel: ParsedModel;
  suggestions: Suggestion[];
  availableSourceModels: ParsedModel[];
  onSelect: (sourceModelName: string) => void;
  onClear: () => void;
  onSkip: () => void;
  onClose: () => void;
  hasCurrent: boolean;
}

const CONF_COLORS: Record<Confidence, string> = {
  high: "text-green-400",
  medium: "text-amber-400",
  low: "text-red-400",
  unmapped: "text-foreground/30",
};

export default function MappingDropdown({
  suggestions,
  availableSourceModels,
  onSelect,
  onClear,
  onSkip,
  onClose,
  hasCurrent,
}: MappingDropdownProps) {
  const [search, setSearch] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // All items for the list: suggestions first, then remaining available
  const suggestionNames = useMemo(
    () => new Set(suggestions.map((s) => s.model.name)),
    [suggestions],
  );

  const otherModels = useMemo(() => {
    const q = search.toLowerCase();
    return availableSourceModels
      .filter((m) => !suggestionNames.has(m.name))
      .filter((m) => (q ? m.name.toLowerCase().includes(q) : true));
  }, [availableSourceModels, suggestionNames, search]);

  const filteredSuggestions = useMemo(() => {
    if (!search) return suggestions;
    const q = search.toLowerCase();
    return suggestions.filter((s) => s.model.name.toLowerCase().includes(q));
  }, [suggestions, search]);

  const allItems = useMemo(() => {
    const items: {
      name: string;
      score: number | null;
      confidence: Confidence | null;
      type: string;
      pixels: number;
      isGroup: boolean;
    }[] = [];
    for (const s of filteredSuggestions) {
      items.push({
        name: s.model.name,
        score: s.score,
        confidence: s.confidence,
        type: s.model.type,
        pixels: s.model.pixelCount,
        isGroup: s.model.isGroup,
      });
    }
    for (const m of otherModels) {
      items.push({
        name: m.name,
        score: null,
        confidence: null,
        type: m.type,
        pixels: m.pixelCount,
        isGroup: m.isGroup,
      });
    }
    return items;
  }, [filteredSuggestions, otherModels]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[highlightIdx]) {
        onSelect(allItems[highlightIdx].name);
        onClose();
      }
    }
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
      style={{ maxWidth: "400px" }}
    >
      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search source models..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setHighlightIdx(0);
          }}
          onKeyDown={handleKeyDown}
          className="w-full text-sm px-2.5 py-1.5 rounded-lg bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
        />
      </div>

      {/* Items */}
      <div className="max-h-64 overflow-y-auto">
        {filteredSuggestions.length > 0 && (
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/30 bg-surface-light">
            Suggestions
          </div>
        )}
        {allItems.map((item, i) => {
          const isSuggestionBoundary =
            i === filteredSuggestions.length && otherModels.length > 0;
          return (
            <div key={item.name}>
              {isSuggestionBoundary && (
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/30 bg-surface-light">
                  All Available
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  onSelect(item.name);
                  onClose();
                }}
                onMouseEnter={() => setHighlightIdx(i)}
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-sm transition-colors ${
                  i === highlightIdx ? "bg-accent/10" : "hover:bg-surface-light"
                }`}
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground/80 truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-foreground/40">
                    {item.isGroup
                      ? "Group"
                      : `${item.pixels}px \u00B7 ${item.type}`}
                  </div>
                </div>
                {item.score !== null && (
                  <span
                    className={`text-xs font-mono flex-shrink-0 ${CONF_COLORS[item.confidence!]}`}
                  >
                    {(item.score * 100).toFixed(0)}%
                  </span>
                )}
              </button>
            </div>
          );
        })}
        {allItems.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-foreground/30">
            No available models
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 border-t border-border flex gap-2">
        {hasCurrent && (
          <button
            type="button"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="flex-1 text-xs py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Clear Mapping
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onSkip();
            onClose();
          }}
          className="flex-1 text-xs py-1.5 rounded-lg text-foreground/40 hover:bg-foreground/5 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
