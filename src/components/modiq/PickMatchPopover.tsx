"use client";

import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import type { ParsedModel, Confidence, ModelMapping } from "@/lib/modiq";

interface Suggestion {
  model: ParsedModel;
  score: number;
  confidence: Confidence;
  factors: ModelMapping["factors"];
}

interface PickMatchPopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  suggestions: Suggestion[];
  availableSourceModels: ParsedModel[];
  onSelect: (sourceModelName: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

export default memo(function PickMatchPopover({
  anchorRef,
  suggestions,
  availableSourceModels,
  onSelect,
  onSkip,
  onClose,
}: PickMatchPopoverProps) {
  const [search, setSearch] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 0, left: 0, width: 380 });
  const [ready, setReady] = useState(false);

  // Position the popover to match left panel width (layout measurement)
  useEffect(() => {
    if (ready) return;
    if (!anchorRef.current || !popoverRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const popoverHeight = popoverRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;

    // Find the left panel container width — walk up to the grid child
    let panelEl: HTMLElement | null = anchorRef.current;
    while (panelEl && !panelEl.classList.contains("min-w-0")) {
      panelEl = panelEl.parentElement;
    }
    const panelWidth = panelEl
      ? panelEl.getBoundingClientRect().width
      : Math.min(rect.width, 720);
    const panelLeft = panelEl
      ? panelEl.getBoundingClientRect().left
      : rect.left;

    // Clamp width between 320 and 720, respecting viewport
    const maxWidth = Math.min(720, window.innerWidth - 32);
    const width = Math.max(320, Math.min(maxWidth, panelWidth));

    let top = rect.bottom + 4;
    let left = panelLeft;

    // Flip above if not enough room below
    if (top + popoverHeight > viewportHeight - 16) {
      top = rect.top - popoverHeight - 4;
    }

    // Ensure not off-screen
    if (left + width > window.innerWidth - 16) {
      left = window.innerWidth - width - 16;
    }
    if (left < 16) left = 16;

    requestAnimationFrame(() => {
      setPosition({ top, left, width });
      setReady(true);
    });
  });

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape only; Tab is handled by focus trap below
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focus trap: cycle Tab within the popover (input → list → skip button)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !popoverRef.current) return;
      const focusable = popoverRef.current.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when ready
  useEffect(() => {
    if (ready) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [ready]);

  // Top 3 suggestions only
  const topSuggestions = useMemo(
    () => suggestions.filter((s) => s.score > 0).slice(0, 3),
    [suggestions],
  );

  const suggestionNames = useMemo(
    () => new Set(topSuggestions.map((s) => s.model.name)),
    [topSuggestions],
  );

  const filteredSuggestions = useMemo(() => {
    if (!search) return topSuggestions;
    const q = search.toLowerCase();
    return topSuggestions.filter(
      (s) =>
        s.model.name.toLowerCase().includes(q) ||
        s.model.type.toLowerCase().includes(q),
    );
  }, [topSuggestions, search]);

  const filteredAvailable = useMemo(() => {
    const q = search.toLowerCase();
    return availableSourceModels
      .filter((m) => !suggestionNames.has(m.name))
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q),
      );
  }, [availableSourceModels, suggestionNames, search]);

  const allItems = useMemo(() => {
    const items: {
      name: string;
      score: number | null;
      type: string;
      pixels: number;
      isGroup: boolean;
      isSuggestion: boolean;
    }[] = [];
    for (const s of filteredSuggestions) {
      items.push({
        name: s.model.name,
        score: s.score,
        type: s.model.type,
        pixels: s.model.pixelCount,
        isGroup: s.model.isGroup,
        isSuggestion: true,
      });
    }
    for (const m of filteredAvailable) {
      items.push({
        name: m.name,
        score: null,
        type: m.type,
        pixels: m.pixelCount,
        isGroup: m.isGroup,
        isSuggestion: false,
      });
    }
    return items;
  }, [filteredSuggestions, filteredAvailable]);

  // Reset highlight index when search changes (derived state, not effect)
  const [prevSearch, setPrevSearch] = useState(search);
  if (prevSearch !== search) {
    setPrevSearch(search);
    setHighlightIdx(0);
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
    },
    [allItems, highlightIdx, onSelect, onClose],
  );

  const handleSelect = useCallback(
    (name: string) => {
      onSelect(name);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleSkip = useCallback(() => {
    onSkip();
    onClose();
  }, [onSkip, onClose]);

  if (!ready) return null;

  const popover = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25"
        style={{ zIndex: 999 }}
        onClick={onClose}
      />
      <div
        ref={popoverRef}
        id="pick-match-listbox"
        role="listbox"
        className="fixed flex flex-col overflow-hidden rounded-[10px] border border-border bg-surface shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03)]"
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
          maxHeight: 420,
          zIndex: 1000,
        }}
      >
        {/* Search input */}
        <div className="p-2 border-b border-border flex-shrink-0">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls="pick-match-listbox"
              aria-haspopup="listbox"
              type="text"
              placeholder="Search source models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-8 pl-8 pr-3 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 outline-none focus:border-zinc-500 placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Scrollable results */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Suggestions section — green themed */}
          {filteredSuggestions.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-green-400 sticky top-0 bg-[#141414]">
                Suggestions
              </div>
              {filteredSuggestions.map((s, i) => {
                const globalIdx = i;
                return (
                  <button
                    key={s.model.name}
                    role="option"
                    aria-selected={highlightIdx === globalIdx}
                    type="button"
                    onClick={() => handleSelect(s.model.name)}
                    onMouseEnter={() => setHighlightIdx(globalIdx)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                      highlightIdx === globalIdx
                        ? "bg-green-500/[0.08]"
                        : "hover:bg-green-500/[0.05]"
                    }`}
                  >
                    <span className="text-sm font-medium text-green-400 truncate flex-1">
                      {s.model.name}
                    </span>
                    <span className="text-xs text-green-400/60 flex-shrink-0 min-w-[48px] text-right tabular-nums">
                      {s.model.pixelCount}px
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/[0.08] text-green-400/70 border border-green-500/15 uppercase tracking-wide flex-shrink-0">
                      {s.model.isGroup ? "GRP" : s.model.type}
                    </span>
                    <span className="text-[12px] font-semibold text-green-400 flex-shrink-0 min-w-[32px] text-right tabular-nums">
                      {(s.score * 100).toFixed(0)}%
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {/* All available section — neutral */}
          {filteredAvailable.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 sticky top-0 bg-[#141414]">
                All Available
              </div>
              {filteredAvailable.map((m, i) => {
                const globalIdx = filteredSuggestions.length + i;
                return (
                  <button
                    key={m.name}
                    role="option"
                    aria-selected={highlightIdx === globalIdx}
                    type="button"
                    onClick={() => handleSelect(m.name)}
                    onMouseEnter={() => setHighlightIdx(globalIdx)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                      highlightIdx === globalIdx
                        ? "bg-zinc-800"
                        : "hover:bg-zinc-800/50"
                    }`}
                  >
                    <span className="text-sm text-zinc-200 truncate flex-1">
                      {m.name}
                    </span>
                    <span className="text-xs text-zinc-500 flex-shrink-0 min-w-[48px] text-right tabular-nums">
                      {m.pixelCount}px
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-wide flex-shrink-0">
                      {m.isGroup ? "GRP" : m.type}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {allItems.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-zinc-500">
              No available models
            </div>
          )}
        </div>

        {/* Skip action */}
        <button
          type="button"
          onClick={handleSkip}
          className="flex items-center gap-1.5 px-3 py-2 border-t border-[#2a2a2a] text-[12px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors flex-shrink-0"
        >
          <span>&#8856;</span>
          Skip this model
        </button>
      </div>
    </>
  );

  return createPortal(popover, document.body);
});
