"use client";

import { useState, useRef, useEffect } from "react";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export type SortOption =
  | "effects-desc"
  | "effects-asc"
  | "pixels-desc"
  | "pixels-asc"
  | "name-asc"
  | "name-desc"
  | "confidence-desc"
  | "confidence-asc"
  | "status";

const SORT_LABELS: Record<SortOption, string> = {
  "effects-desc": "Effects: High \u2192 Low",
  "effects-asc": "Effects: Low \u2192 High",
  "pixels-desc": "Pixels: High \u2192 Low",
  "pixels-asc": "Pixels: Low \u2192 High",
  "name-asc": "Name: A \u2192 Z",
  "name-desc": "Name: Z \u2192 A",
  "confidence-desc": "Confidence: High",
  "confidence-asc": "Confidence: Low",
  status: "Unmapped First",
};

const SORT_GROUPS: { label: string; options: SortOption[] }[] = [
  { label: "Impact", options: ["effects-desc", "effects-asc"] },
  { label: "Size", options: ["pixels-desc", "pixels-asc"] },
  { label: "Name", options: ["name-asc", "name-desc"] },
  { label: "Match", options: ["confidence-desc", "confidence-asc"] },
  { label: "Status", options: ["status"] },
];

export function SortDropdown({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (option: SortOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-foreground/50 hover:text-foreground/70 bg-background border border-border hover:border-foreground/20 rounded-lg transition-colors"
        title="Sort items"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        {SORT_LABELS[value]}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-border rounded-lg shadow-xl z-30 py-1 overflow-hidden">
          {SORT_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-3 py-1 text-[9px] font-semibold text-foreground/25 uppercase tracking-wider">
                {group.label}
              </div>
              {group.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                    value === option
                      ? "text-accent bg-accent/5 font-medium"
                      : "text-foreground/60 hover:bg-foreground/5"
                  }`}
                >
                  {SORT_LABELS[option]}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Sort items based on the selected option.
 * topSuggestionsMap is needed for confidence-based sorting.
 */
export function sortItems(
  items: SourceLayerMapping[],
  sort: SortOption,
  topSuggestionsMap?: Map<string, { model: { name: string }; score: number } | null>,
): SourceLayerMapping[] {
  const sorted = [...items];

  switch (sort) {
    case "effects-desc":
      sorted.sort((a, b) => b.effectCount - a.effectCount);
      break;
    case "effects-asc":
      sorted.sort((a, b) => a.effectCount - b.effectCount);
      break;
    case "pixels-desc":
      sorted.sort(
        (a, b) => (b.sourceModel.pixelCount ?? 0) - (a.sourceModel.pixelCount ?? 0),
      );
      break;
    case "pixels-asc":
      sorted.sort(
        (a, b) => (a.sourceModel.pixelCount ?? 0) - (b.sourceModel.pixelCount ?? 0),
      );
      break;
    case "name-asc":
      sorted.sort((a, b) =>
        a.sourceModel.name.localeCompare(b.sourceModel.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
      break;
    case "name-desc":
      sorted.sort((a, b) =>
        b.sourceModel.name.localeCompare(a.sourceModel.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
      break;
    case "confidence-desc":
      sorted.sort((a, b) => {
        const sa = topSuggestionsMap?.get(a.sourceModel.name)?.score ?? 0;
        const sb = topSuggestionsMap?.get(b.sourceModel.name)?.score ?? 0;
        return sb - sa;
      });
      break;
    case "confidence-asc":
      sorted.sort((a, b) => {
        const sa = topSuggestionsMap?.get(a.sourceModel.name)?.score ?? 0;
        const sb = topSuggestionsMap?.get(b.sourceModel.name)?.score ?? 0;
        return sa - sb;
      });
      break;
    case "status":
      sorted.sort((a, b) => {
        if (a.isMapped === b.isMapped) return 0;
        return a.isMapped ? 1 : -1;
      });
      break;
  }

  return sorted;
}
