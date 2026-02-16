"use client";

import { memo } from "react";
import type { EffectSuggestionContext } from "@/lib/modiq/effect-analysis";

interface EffectContextBadgeProps {
  context: EffectSuggestionContext | null;
  /** Show in compact inline mode or full card mode */
  mode?: "inline" | "card";
}

/**
 * Shows effect context information for a source model during mapping.
 * Helps users understand what effects they'll gain by mapping this model.
 * Ticket 44: Effect-Aware Suggestions
 */
export default memo(function EffectContextBadge({
  context,
  mode = "inline",
}: EffectContextBadgeProps) {
  if (!context) return null;

  if (mode === "inline") {
    return <InlineBadge context={context} />;
  }

  return <CardBadge context={context} />;
});

function InlineBadge({ context }: { context: EffectSuggestionContext }) {
  if (context.hasSignatureEffects) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/15 border border-purple-500/25 rounded text-xs text-purple-300 font-medium">
        <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1l2 5h5l-4 3.5 1.5 5L8 11.5 3.5 14.5 5 9.5 1 6h5z" />
        </svg>
        {context.signatureEffectNames[0]}
      </span>
    );
  }

  if (context.complexityLevel === "high") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/25 rounded text-xs text-blue-300 font-medium">
        {context.topEffects.length} effect types
      </span>
    );
  }

  return null;
}

function CardBadge({ context }: { context: EffectSuggestionContext }) {
  return (
    <div className="p-2.5 bg-foreground/5 border border-foreground/10 rounded-lg">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-1.5">
        {context.hasSignatureEffects && (
          <svg
            className="h-3 w-3 text-purple-400"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M8 1l2 5h5l-4 3.5 1.5 5L8 11.5 3.5 14.5 5 9.5 1 6h5z" />
          </svg>
        )}
        <span className="text-xs font-medium text-foreground/70">
          Effects Preview
        </span>
      </div>

      {/* Top effects */}
      <div className="flex flex-wrap gap-1 mb-1.5">
        {context.topEffects.map((effect) => (
          <span
            key={effect.name}
            className={`px-1.5 py-0.5 rounded text-xs font-medium ${getCategoryStyle(effect.category)}`}
          >
            {effect.name}{" "}
            <span className="opacity-60">&times;{effect.count}</span>
          </span>
        ))}
      </div>

      {/* Summary */}
      <p className="text-xs text-foreground/40 leading-tight">
        {context.summary}
      </p>
    </div>
  );
}

function getCategoryStyle(
  category: string,
): string {
  switch (category) {
    case "signature":
      return "bg-purple-500/15 text-purple-300";
    case "matrix":
      return "bg-blue-500/15 text-blue-300";
    case "radial":
      return "bg-cyan-500/15 text-cyan-300";
    case "circular":
      return "bg-teal-500/15 text-teal-300";
    case "linear":
      return "bg-amber-500/15 text-amber-300";
    case "fill":
      return "bg-foreground/10 text-foreground/50";
    default:
      return "bg-foreground/10 text-foreground/50";
  }
}
