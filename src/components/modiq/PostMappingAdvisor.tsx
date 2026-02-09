"use client";

import { memo, useState } from "react";
import type { HiddenGem } from "@/lib/modiq/effect-analysis";

interface PostMappingAdvisorProps {
  /** Coverage metrics */
  displayCoveragePercent: number;
  effectsCoveragePercent: number;
  /** Unmapped high-impact effects */
  hiddenGems: HiddenGem[];
  /** Total models in user layout */
  totalUserModels: number;
  /** Models covered by current mapping */
  coveredUserModels: number;
}

/**
 * Post-mapping optimization advisor shown on Review screen.
 * Surfaces actionable insights about mapping quality and
 * suggests improvements the user could make.
 * Ticket 45: Post-Mapping Optimization
 */
export default memo(function PostMappingAdvisor({
  displayCoveragePercent,
  effectsCoveragePercent,
  hiddenGems,
  totalUserModels,
  coveredUserModels,
}: PostMappingAdvisorProps) {
  const [expanded, setExpanded] = useState(false);

  const unmappedGems = hiddenGems.filter(
    (g) => !g.isMapped && g.impactScore >= 20,
  );
  const insights = generateInsights({
    displayCoveragePercent,
    effectsCoveragePercent,
    unmappedGemCount: unmappedGems.length,
    totalUserModels,
    coveredUserModels,
  });

  if (insights.length === 0) return null;

  return (
    <div className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <span className="text-sm font-medium">Mapping Advisor</span>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
            {insights.length}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-foreground/40 transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="flex gap-2 p-2.5 bg-[#111] rounded"
            >
              <span className={`text-sm shrink-0 ${insight.iconColor}`}>
                {insight.icon}
              </span>
              <div>
                <p className="text-xs text-foreground/80">{insight.message}</p>
                {insight.detail && (
                  <p className="text-[10px] text-foreground/40 mt-0.5">
                    {insight.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

interface Insight {
  icon: string;
  iconColor: string;
  message: string;
  detail?: string;
}

function generateInsights(params: {
  displayCoveragePercent: number;
  effectsCoveragePercent: number;
  unmappedGemCount: number;
  totalUserModels: number;
  coveredUserModels: number;
}): Insight[] {
  const insights: Insight[] = [];

  // Great coverage
  if (params.displayCoveragePercent >= 95) {
    insights.push({
      icon: "\u2713",
      iconColor: "text-green-400",
      message: "Excellent display coverage! Nearly every prop in your layout is mapped.",
    });
  }

  // Effects mismatch
  if (
    params.effectsCoveragePercent < params.displayCoveragePercent - 15 &&
    params.effectsCoveragePercent < 80
  ) {
    insights.push({
      icon: "\u26A0",
      iconColor: "text-amber-400",
      message: `Your effects coverage (${Math.round(params.effectsCoveragePercent)}%) is lower than display coverage (${Math.round(params.displayCoveragePercent)}%).`,
      detail:
        "Some mapped models have few or no effects in this sequence. This is normal if the sequence uses group-level effects.",
    });
  }

  // Hidden gems
  if (params.unmappedGemCount > 0) {
    insights.push({
      icon: "\u2666",
      iconColor: "text-purple-400",
      message: `${params.unmappedGemCount} unmapped source model${params.unmappedGemCount === 1 ? " has" : "s have"} premium effects (Video, Faces, etc.)`,
      detail:
        "Consider going back to map these for the best visual result.",
    });
  }

  // Low coverage
  if (params.displayCoveragePercent < 50) {
    insights.push({
      icon: "i",
      iconColor: "text-blue-400",
      message:
        "Under 50% coverage is common when your layout is very different from the source.",
      detail:
        "The mapped effects that do match will still look great on your props.",
    });
  }

  // Many unmapped user models
  const unmappedUserModels =
    params.totalUserModels - params.coveredUserModels;
  if (unmappedUserModels > 5 && params.displayCoveragePercent < 70) {
    insights.push({
      icon: "\u2192",
      iconColor: "text-foreground/50",
      message: `${unmappedUserModels} of your props won't receive any effects from this sequence.`,
      detail:
        "These props will stay off during playback. You can add additional sequences to cover them.",
    });
  }

  return insights;
}
