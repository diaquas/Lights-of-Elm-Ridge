"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { MatchReasoning } from "@/types/matching";
import { generateMatchReasoning } from "@/lib/modiq/generateReasoning";
import type { ModelMapping } from "@/lib/modiq/matcher";

interface ConfidenceBadgeProps {
  score: number;
  reasoning?: MatchReasoning;
  /** Pass raw factors to auto-generate reasoning (alternative to passing pre-built reasoning) */
  factors?: ModelMapping["factors"];
  size?: "sm" | "md" | "lg";
}

function getConfidenceTier(score: number): "high" | "medium" | "low" | "none" {
  if (score >= 0.85) return "high";
  if (score >= 0.6) return "medium";
  if (score >= 0.4) return "low";
  return "none";
}

const TIER_CLASSES = {
  high: "bg-green-500/15 text-green-400 border-green-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-red-500/15 text-red-400 border-red-500/30",
  none: "bg-foreground/5 text-foreground/30 border-foreground/10",
};

const SIZE_CLASSES = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export function ConfidenceBadge({
  score,
  reasoning: reasoningProp,
  factors,
  size = "md",
}: ConfidenceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const tier = getConfidenceTier(score);
  const percentage = Math.round(score * 100);

  // Auto-generate reasoning from factors if not provided
  const reasoning = useMemo(() => {
    if (reasoningProp) return reasoningProp;
    if (factors) return generateMatchReasoning(factors, score);
    return undefined;
  }, [reasoningProp, factors, score]);

  return (
    <div className="relative inline-block" ref={badgeRef}>
      <div
        className={`
          inline-flex items-center gap-1 rounded-full border font-semibold
          ${SIZE_CLASSES[size]} ${TIER_CLASSES[tier]}
          ${reasoning ? "cursor-help" : ""}
        `}
        tabIndex={reasoning ? 0 : undefined}
        onMouseEnter={() => reasoning && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => reasoning && setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        {tier === "high" && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {tier === "medium" && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span>{percentage}%</span>
      </div>

      {/* Reasoning Tooltip — portaled to body to escape overflow:hidden ancestors */}
      {showTooltip && reasoning && (
        <ReasoningTooltip
          reasoning={reasoning}
          score={score}
          tier={tier}
          anchorRef={badgeRef}
        />
      )}
    </div>
  );
}

function ReasoningTooltip({
  reasoning,
  score,
  tier,
  anchorRef,
}: {
  reasoning: MatchReasoning;
  score: number;
  tier: "high" | "medium" | "low" | "none";
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const tooltipWidth = 256; // w-64 = 16rem = 256px

    // Center horizontally on the badge, clamp to viewport
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));

    // Position above the badge by default
    const top = rect.top - 8; // 8px gap

    setPos({ top, left });
  }, [anchorRef]);

  // After first render, adjust top so tooltip sits above badge (account for actual height)
  useEffect(() => {
    if (!pos || !tooltipRef.current) return;
    const tooltipHeight = tooltipRef.current.offsetHeight;
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();

    let top = rect.top - tooltipHeight - 8;
    // If it would go off-screen top, flip below the badge
    if (top < 4) {
      top = rect.bottom + 8;
    }
    setPos((prev) => (prev && prev.top !== top ? { ...prev, top } : prev));
  }, [pos, anchorRef]);

  const tierHeaderBg = {
    high: "bg-green-500/10",
    medium: "bg-amber-500/10",
    low: "bg-red-500/10",
    none: "bg-foreground/5",
  };
  const tierTextColor = {
    high: "text-green-400",
    medium: "text-amber-400",
    low: "text-red-400",
    none: "text-foreground/40",
  };

  const tooltip = (
    <div
      ref={tooltipRef}
      className="fixed w-64 pointer-events-none"
      style={{
        zIndex: 9999,
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
      }}
    >
      <div className="bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div
          className={`px-4 py-2.5 border-b border-border ${tierHeaderBg[tier]}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Match Breakdown
            </span>
            <span className={`text-sm font-bold ${tierTextColor[tier]}`}>
              {Math.round(score * 100)}%
            </span>
          </div>
          <p className="text-[11px] text-foreground/40 mt-0.5">
            {reasoning.summary}
          </p>
        </div>

        {/* Components */}
        <div className="px-4 py-3 space-y-2.5">
          {reasoning.components.map((component, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-medium text-foreground/70">
                  {component.factor}
                </span>
                <span className="text-[11px] font-mono text-foreground/40">
                  {component.score >= 0 ? "+" : ""}
                  {Math.round(component.score * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      component.score >= component.maxScore * 0.8
                        ? "bg-green-500"
                        : component.score > 0
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{
                      width: `${component.maxScore > 0 ? Math.max(0, (component.score / component.maxScore) * 100) : 0}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-foreground/20">
                  /{Math.round(component.maxScore * 100)}
                </span>
              </div>
              <p className="text-[10px] text-foreground/40 mt-0.5">
                {component.description}
              </p>
            </div>
          ))}
        </div>

        {/* Why Not Higher */}
        {reasoning.whyNotHigher &&
          reasoning.whyNotHigher.length > 0 &&
          score < 0.85 && (
            <div className="px-4 py-2.5 bg-foreground/3 border-t border-border">
              <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide mb-1.5">
                Why not higher?
              </div>
              <ul className="space-y-0.5">
                {reasoning.whyNotHigher.map((reason, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-[11px] text-foreground/40"
                  >
                    <span className="text-foreground/20 mt-px">&bull;</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Pixel Comparison */}
        {reasoning.pixelComparison && (
          <div className="px-4 py-2.5 border-t border-border">
            <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide mb-1.5">
              Pixel Comparison
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground/40">Source</span>
                <span className="font-mono text-foreground/60 tabular-nums">
                  {reasoning.pixelComparison.source.toLocaleString()}px
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground/40">Your model</span>
                <span className="font-mono text-foreground/60 tabular-nums">
                  {reasoning.pixelComparison.dest.toLocaleString()}px
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50">
                <span className="text-foreground/40">Difference</span>
                <span
                  className={`font-mono tabular-nums ${
                    Math.abs(
                      reasoning.pixelComparison.source -
                        reasoning.pixelComparison.dest,
                    ) === 0
                      ? "text-green-400"
                      : Math.min(
                            reasoning.pixelComparison.source,
                            reasoning.pixelComparison.dest,
                          ) /
                            Math.max(
                              reasoning.pixelComparison.source,
                              reasoning.pixelComparison.dest,
                            ) >=
                          0.8
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {reasoning.pixelComparison.source ===
                  reasoning.pixelComparison.dest
                    ? "Exact match"
                    : `${reasoning.pixelComparison.source > reasoning.pixelComparison.dest ? "−" : "+"}${Math.abs(reasoning.pixelComparison.source - reasoning.pixelComparison.dest).toLocaleString()}px`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Effect Analysis */}
        {reasoning.effectAffinity && (
          <div className="px-4 py-2.5 border-t border-border">
            <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide mb-1.5">
              Effect Analysis
            </div>
            <ul className="space-y-0.5">
              {reasoning.effectAffinity.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span
                    className={`mt-px ${
                      reasoning.effectAffinity!.bonus >= 0
                        ? "text-green-400"
                        : "text-amber-400"
                    }`}
                  >
                    {reasoning.effectAffinity!.bonus >= 0 ? "\u2713" : "\u26A0"}
                  </span>
                  <span className="text-foreground/50">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(tooltip, document.body);
}
