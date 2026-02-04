"use client";

import { useState, useCallback } from "react";
import type {
  ParsedModel,
  Confidence,
  SubmodelMapping,
  ModelMapping,
} from "@/lib/modiq";
import MappingDropdown from "./MappingDropdown";

interface Suggestion {
  model: ParsedModel;
  score: number;
  confidence: Confidence;
  factors: ModelMapping["factors"];
}

interface InteractiveMappingRowProps {
  destModel: ParsedModel;
  sourceModel: ParsedModel | null;
  confidence: Confidence;
  reason: string;
  submodelMappings: SubmodelMapping[];
  isSkipped: boolean;
  isManualOverride: boolean;
  isFocused: boolean;
  onAssign: (sourceModelName: string) => void;
  onClear: () => void;
  onSkip: () => void;
  getSuggestions: () => Suggestion[];
  availableSourceModels: ParsedModel[];
}

const CONFIDENCE_STYLES: Record<
  Confidence,
  { bg: string; text: string; label: string; dot: string }
> = {
  high: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    label: "HIGH",
    dot: "bg-green-400",
  },
  medium: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    label: "MED",
    dot: "bg-amber-400",
  },
  low: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    label: "LOW",
    dot: "bg-red-400",
  },
  unmapped: {
    bg: "bg-foreground/5",
    text: "text-foreground/30",
    label: "NONE",
    dot: "bg-foreground/30",
  },
};

export default function InteractiveMappingRow({
  destModel,
  sourceModel,
  confidence,
  reason,
  submodelMappings,
  isSkipped,
  isManualOverride,
  isFocused,
  onAssign,
  onClear,
  onSkip,
  getSuggestions,
  availableSourceModels,
}: InteractiveMappingRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const hasSubmodels = submodelMappings.length > 0;
  const style = CONFIDENCE_STYLES[confidence];

  const handleOpenDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(true);
  }, []);

  const handleClearClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClear();
    },
    [onClear],
  );

  if (isSkipped) {
    return (
      <div className="px-4 sm:px-6 py-2 flex items-center justify-between opacity-40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-foreground/40 line-through truncate">
            {destModel.name}
          </span>
          <span className="text-[10px] text-foreground/30 italic">skipped</span>
        </div>
        <button
          type="button"
          onClick={() => onAssign("")}
          className="text-[10px] text-accent/60 hover:text-accent px-2 py-0.5 rounded"
          title="Unskip"
        >
          unskip
        </button>
      </div>
    );
  }

  return (
    <div className={`${isFocused ? "ring-1 ring-accent/40 ring-inset" : ""}`}>
      <div
        className={`px-4 sm:px-6 py-3 sm:grid sm:grid-cols-[1fr_24px_1fr_28px] sm:gap-2 items-center ${
          hasSubmodels ? "cursor-pointer hover:bg-surface-light" : ""
        }`}
        onClick={hasSubmodels ? () => setIsExpanded(!isExpanded) : undefined}
      >
        {/* User's model (dest) */}
        <div className="mb-1 sm:mb-0 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${style.bg} ${style.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>
            <span className="text-sm font-medium truncate">
              {destModel.name}
            </span>
          </div>
          {!destModel.isGroup && (
            <span className="text-xs text-foreground/40 ml-7">
              {destModel.pixelCount}px &middot; {destModel.type}
            </span>
          )}
        </div>

        {/* Arrow */}
        <div className="hidden sm:flex items-center justify-center text-foreground/20">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </div>

        {/* Mapped source (or remap trigger) */}
        <div className="relative min-w-0">
          {sourceModel ? (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">
                  {sourceModel.name}
                </span>
                {isManualOverride && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent/60 font-medium flex-shrink-0">
                    manual
                  </span>
                )}
              </div>
              {!sourceModel.isGroup && (
                <span className="text-xs text-foreground/40">
                  {sourceModel.pixelCount}px &middot; {sourceModel.type}
                </span>
              )}
              {reason && (
                <p className="text-[11px] text-foreground/40 mt-0.5 truncate">
                  {reason}
                </p>
              )}
              {hasSubmodels && (
                <span className="text-[11px] text-accent/60 mt-0.5 inline-block">
                  {submodelMappings.length} submodels{" "}
                  {isExpanded ? "\u25B2" : "\u25BC"}
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOpenDropdown}
              className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-foreground/15 hover:border-accent/40 hover:bg-accent/5 transition-colors group"
            >
              <span className="text-sm text-foreground/30 group-hover:text-foreground/50">
                Click to map a source model...
              </span>
            </button>
          )}

          {/* Dropdown */}
          {dropdownOpen && (
            <MappingDropdown
              destModel={destModel}
              suggestions={getSuggestions()}
              availableSourceModels={availableSourceModels}
              onSelect={(name) => onAssign(name)}
              onClear={onClear}
              onSkip={onSkip}
              onClose={() => setDropdownOpen(false)}
              hasCurrent={!!sourceModel}
            />
          )}
        </div>

        {/* Actions: remap / clear */}
        <div className="hidden sm:flex items-center justify-center">
          {sourceModel ? (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleOpenDropdown}
                className="p-1 rounded text-foreground/20 hover:text-accent hover:bg-accent/10 transition-colors"
                title="Remap"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleClearClick}
                className="p-1 rounded text-foreground/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Clear mapping"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <span />
          )}
        </div>
      </div>

      {/* Expanded submodel view */}
      {isExpanded && hasSubmodels && (
        <div className="px-6 pb-4 bg-background/50 border-t border-border/50">
          <div className="py-2 space-y-1">
            {submodelMappings.map((sub, i) => {
              const subStyle = CONFIDENCE_STYLES[sub.confidence];
              return (
                <div
                  key={i}
                  className="grid grid-cols-[60px_1fr_24px_1fr] gap-2 items-center text-xs py-1"
                >
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${subStyle.bg} ${subStyle.text}`}
                  >
                    <span className={`w-1 h-1 rounded-full ${subStyle.dot}`} />
                    {subStyle.label}
                  </span>
                  <span className="text-foreground/70 truncate">
                    {sub.sourceName}
                  </span>
                  <span className="text-foreground/20 text-center">&rarr;</span>
                  <span className="text-foreground/70">
                    {sub.destName || (
                      <span className="text-foreground/30 italic">
                        unmapped
                      </span>
                    )}
                    <span className="text-foreground/30 ml-1">
                      ({sub.pixelDiff})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
