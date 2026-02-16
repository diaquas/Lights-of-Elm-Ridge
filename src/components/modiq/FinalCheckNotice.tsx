"use client";

import { memo } from "react";
import type { HiddenGem } from "@/lib/modiq/effect-analysis";

interface FinalCheckNoticeProps {
  /** High-impact unmapped effects */
  hiddenGems: HiddenGem[];
  /** Whether the user has dismissed this notice */
  dismissed: boolean;
  onDismiss: () => void;
  /** Called when user wants to go back and map one of these */
  onMapModel?: (modelName: string) => void;
}

/**
 * Final check notice shown on the Review screen before export.
 * Surfaces high-value unmapped effects that the user might want to address.
 * Ticket 47: Final Check Before Export
 */
export default memo(function FinalCheckNotice({
  hiddenGems,
  dismissed,
  onDismiss,
  onMapModel,
}: FinalCheckNoticeProps) {
  // Only show if there are meaningful hidden gems
  const significantGems = hiddenGems.filter((g) => g.impactScore >= 30);
  if (significantGems.length === 0 || dismissed) return null;

  const topGems = significantGems.slice(0, 5);

  return (
    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-amber-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-amber-300">
              Unmapped Premium Effects
            </h3>
            <p className="text-xs text-foreground/50 mt-0.5">
              These effects won&apos;t show on your display unless mapped
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-foreground/30 hover:text-foreground/60 transition-colors p-1"
          aria-label="Dismiss notice"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {topGems.map((gem) => (
          <div
            key={`${gem.sourceModelName}-${gem.effectType}`}
            className="flex items-center justify-between p-2 bg-[#111] rounded"
          >
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-foreground/80 block truncate">
                {gem.sourceModelName}
              </span>
              <span className="text-xs text-foreground/40">
                {gem.effectCount} {gem.effectType} effects
              </span>
            </div>
            {onMapModel && (
              <button
                onClick={() => onMapModel(gem.sourceModelName)}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium px-2 py-1 rounded hover:bg-amber-500/10 transition-colors shrink-0 ml-2"
              >
                Map
              </button>
            )}
          </div>
        ))}
      </div>

      {significantGems.length > 5 && (
        <p className="text-xs text-foreground/30 mt-2">
          +{significantGems.length - 5} more unmapped
        </p>
      )}
    </div>
  );
});
