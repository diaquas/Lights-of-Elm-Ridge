"use client";

import { useState } from "react";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

/**
 * Collapsible section for zero-effect models.
 * Shown at the bottom of each mapping phase, collapsed by default.
 * Includes a "Skip All" button to bulk-skip items with no effects.
 */
export function ZeroEffectSection({
  items,
  onSkipAll,
  phaseLabel,
}: {
  items: SourceLayerMapping[];
  onSkipAll: () => void;
  phaseLabel: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (items.length === 0) return null;

  const handleSkipAll = () => {
    if (items.length > 5 && !confirming) {
      setConfirming(true);
      return;
    }
    onSkipAll();
    setConfirming(false);
  };

  return (
    <details className="mt-4">
      <summary className="flex items-center gap-2 text-sm text-foreground/40 cursor-pointer hover:text-foreground/60 select-none group">
        <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>
          0 Effects ({items.length} {phaseLabel})
        </span>
        <span className="text-xs text-foreground/20">— no visual impact in sequence</span>
      </summary>

      <div className="mt-2 rounded-lg border border-border/50 bg-foreground/[0.01] overflow-hidden">
        {/* Info banner */}
        <div className="px-3 py-2 border-b border-border/30 bg-foreground/[0.02] flex items-center justify-between gap-2">
          <p className="text-xs text-foreground/40">
            These {phaseLabel} have no effects in this sequence and can safely be skipped.
          </p>
          {confirming ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-amber-400">Skip {items.length}?</span>
              <button
                type="button"
                onClick={handleSkipAll}
                className="px-2 py-0.5 text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 rounded transition-colors"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-2 py-0.5 text-xs text-foreground/40 hover:text-foreground/60 rounded transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSkipAll}
              className="px-2.5 py-1 text-xs font-medium text-foreground/40 hover:text-foreground/60 border border-border hover:border-foreground/20 rounded transition-colors flex-shrink-0"
            >
              Skip All
            </button>
          )}
        </div>

        {/* Compact list */}
        <div className="max-h-[200px] overflow-y-auto">
          <div className="divide-y divide-border/20">
            {items.map((item) => (
              <div
                key={item.sourceModel.name}
                className="px-3 py-1.5 flex items-center gap-2 text-foreground/30"
              >
                <svg className="w-3 h-3 flex-shrink-0 text-foreground/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                <span className="text-[12px] truncate flex-1">{item.sourceModel.name}</span>
                <span className="text-xs text-foreground/15">{item.sourceModel.type}</span>
                {item.sourceModel.pixelCount > 0 && (
                  <span className="text-xs text-foreground/15 tabular-nums">{item.sourceModel.pixelCount}px</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
