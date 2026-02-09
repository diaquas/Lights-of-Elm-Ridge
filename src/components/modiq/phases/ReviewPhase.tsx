"use client";

import { useMemo, useState } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { SacrificeSummary } from "../SacrificeIndicator";
import PostMappingAdvisor from "../PostMappingAdvisor";
import FinalCheckNotice from "../FinalCheckNotice";
import CoverageProgressBar from "../CoverageProgressBar";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export interface ReviewPhaseProps {
  onExport: () => void;
  onExportReport: () => void;
  onReset: () => void;
  seqTitle: string;
  /** @deprecated — kept for prop compat; display/effects coverage is now computed internally */
  coveragePercent: number;
}

export function ReviewPhase({
  onExport,
  onExportReport,
  onReset,
  seqTitle,
}: ReviewPhaseProps) {
  const { interactive, phaseCounts } = useMappingPhase();

  const { displayCoverage, effectsCoverage, hiddenGems } = interactive;
  const [finalCheckDismissed, setFinalCheckDismissed] = useState(false);

  const { mappedLayers, unmappedLayers } = useMemo(() => {
    const mapped: SourceLayerMapping[] = [];
    const unmapped: SourceLayerMapping[] = [];

    for (const layer of interactive.sourceLayerMappings) {
      if (layer.isSkipped) continue;
      if (layer.isMapped) mapped.push(layer);
      else unmapped.push(layer);
    }

    return { mappedLayers: mapped, unmappedLayers: unmapped };
  }, [interactive.sourceLayerMappings]);

  const totalChildrenResolved = mappedLayers
    .filter((l) => l.isGroup)
    .reduce((sum, g) => sum + g.coveredChildCount, 0);

  // User models without any mappings
  const userUnmappedCount = displayCoverage.total - displayCoverage.covered;

  // Display coverage determines the visual treatment
  const isGreat = displayCoverage.percent >= 90;
  const isGood = displayCoverage.percent >= 70;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border text-center flex-shrink-0">
        {isGreat ? (
          <div className="text-4xl mb-2">&#127881;</div>
        ) : isGood ? (
          <div className="text-4xl mb-2">&#10003;</div>
        ) : null}
        <h2 className="text-2xl font-bold text-foreground">
          Mapping Complete!
        </h2>
      </div>

      {/* Summary Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto">
          {/* ═══ Hero: Your Display Coverage ═══ */}
          <div
            className={`rounded-xl border p-8 mb-6 text-center ${
              isGreat
                ? "border-green-500/30 bg-green-500/5"
                : "border-border bg-surface"
            }`}
          >
            <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-3">
              Your Display Coverage
            </div>
            <div
              className={`text-6xl font-bold mb-4 ${
                isGreat
                  ? "text-green-400"
                  : isGood
                    ? "text-foreground"
                    : "text-amber-400"
              }`}
            >
              {displayCoverage.percent}%
            </div>

            {/* Progress Bar */}
            <div className="h-4 bg-foreground/10 rounded-full overflow-hidden mb-4 max-w-md mx-auto">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isGreat
                    ? "bg-green-500"
                    : isGood
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                }`}
                style={{
                  width: `${Math.min(displayCoverage.percent, 100)}%`,
                }}
              />
            </div>

            <p className="text-foreground/50 text-sm">
              <span className="font-semibold text-foreground">
                {displayCoverage.covered}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {displayCoverage.total}
              </span>{" "}
              models in your layout will receive effects
            </p>
          </div>

          {/* ═══ Stats Grid ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Auto-Matched"
              value={phaseCounts.get("auto-accept") ?? 0}
              color="green"
            />
            <StatCard
              label="Groups Mapped"
              value={interactive.groupsMappedCount}
              subtitle={
                totalChildrenResolved > 0
                  ? `${totalChildrenResolved} children resolved`
                  : undefined
              }
              color="blue"
            />
            <StatCard
              label="Individual Models"
              value={interactive.directMappedCount}
              color="foreground"
            />
            <StatCard
              label="Submodel Groups"
              value={phaseCounts.get("spinners") ?? 0}
              color="purple"
            />
          </div>

          {/* ═══ Dual Coverage Progress ═══ */}
          <div className="bg-surface rounded-xl border border-border p-6 mb-6">
            <CoverageProgressBar
              displayCoveragePercent={displayCoverage.percent}
              effectsCoveragePercent={effectsCoverage.percent}
              displayCoverage={displayCoverage}
              effectsCoverage={effectsCoverage}
            />
          </div>

          {/* ═══ Effects Impact ═══ */}
          <div className="bg-surface rounded-xl border border-border p-6 mb-6">
            <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide mb-4">
              Effects Impact
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/50">
                  Total effects in sequence
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {effectsCoverage.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/50">
                  Effects mapped to your layout
                </span>
                <span className="font-medium text-green-400 tabular-nums">
                  {effectsCoverage.covered.toLocaleString()} (
                  {effectsCoverage.percent}%)
                </span>
              </div>
            </div>
            {effectsCoverage.percent > 0 && (
              <div className="mt-4 p-3 bg-green-500/8 rounded-lg text-center">
                <p className="text-green-400 text-sm font-medium">
                  Your display will show {effectsCoverage.percent}% of this
                  sequence&apos;s visual effects!
                </p>
              </div>
            )}
          </div>

          {/* ═══ Final Check — Unmapped Premium Effects (Ticket 47) ═══ */}
          <div className="mb-6">
            <FinalCheckNotice
              hiddenGems={hiddenGems}
              dismissed={finalCheckDismissed}
              onDismiss={() => setFinalCheckDismissed(true)}
            />
          </div>

          {/* ═══ Mapping Advisor (Ticket 45) ═══ */}
          <div className="mb-6">
            <PostMappingAdvisor
              displayCoveragePercent={displayCoverage.percent}
              effectsCoveragePercent={effectsCoverage.percent}
              hiddenGems={hiddenGems}
              totalUserModels={displayCoverage.total}
              coveredUserModels={displayCoverage.covered}
            />
          </div>

          {/* ═══ Mapping Source ═══ */}
          <div className="bg-surface rounded-xl border border-border p-4 mb-6">
            <div className="text-[11px] text-foreground/30 uppercase tracking-wide mb-1">
              Mapping
            </div>
            <div className="text-sm text-foreground">
              {seqTitle} &rarr; Your Layout
            </div>
          </div>

          {/* ═══ Optimized Assignment Trade-offs ═══ */}
          {interactive.sacrifices.length > 0 && (
            <div className="mb-6">
              <SacrificeSummary sacrifices={interactive.sacrifices} />
            </div>
          )}

          {/* ═══ Informational Notices (not warnings!) ═══ */}

          {/* User models without sequence content — INFO, not warning */}
          {userUnmappedCount > 0 && (
            <InfoNotice
              icon="info"
              title={`${userUnmappedCount} model${userUnmappedCount !== 1 ? "s" : ""} in your layout ${userUnmappedCount !== 1 ? "have" : "has"} no matching sequence content`}
              subtitle="These are props the sequence doesn't use — totally normal!"
            />
          )}

          {/* Unused sequence layers — INFO, not warning */}
          {unmappedLayers.length > 0 && (
            <InfoNotice
              icon="layers"
              title={`${unmappedLayers.length} sequence layer${unmappedLayers.length !== 1 ? "s" : ""} ${unmappedLayers.length !== 1 ? "don't" : "doesn't"} have destinations in your layout`}
              subtitle="The sequence has props you don't have — this is expected!"
            />
          )}

          {/* ═══ Mapped Summary (collapsible) ═══ */}
          <details className="mb-6">
            <summary className="text-sm font-medium text-foreground/60 cursor-pointer hover:text-foreground/80 mb-3">
              View all {mappedLayers.length} mappings
            </summary>
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="divide-y divide-border/30">
                {mappedLayers.map((layer) => {
                  const suggs = interactive.getSuggestionsForLayer(
                    layer.sourceModel,
                  );
                  const matchedSugg = suggs.find(
                    (s) => s.model.name === layer.assignedUserModels[0]?.name,
                  );

                  return (
                    <div
                      key={layer.sourceModel.name}
                      className="px-4 py-2.5 flex items-center gap-3 hover:bg-foreground/[0.02]"
                    >
                      <svg
                        className="w-4 h-4 text-green-400 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-[13px] text-foreground/70 truncate flex-1">
                        {layer.sourceModel.name}
                      </span>
                      <span className="text-foreground/20">&rarr;</span>
                      <span className="text-[13px] text-foreground/50 truncate flex-1 text-right">
                        {layer.assignedUserModels[0]?.name ?? "\u2014"}
                      </span>
                      {matchedSugg && (
                        <ConfidenceBadge score={matchedSugg.score} size="sm" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* ═══ Export Actions — clean, no scary numbers ═══ */}
      <div className="px-8 py-4 border-t border-border flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
          <button
            type="button"
            onClick={onExport}
            className={`flex-1 py-3.5 rounded-xl font-display font-bold text-base transition-all flex items-center justify-center gap-2 ${
              isGreat
                ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20"
                : isGood
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download .xmap File
          </button>
          <button
            type="button"
            onClick={onExportReport}
            className="px-5 py-3.5 rounded-xl font-medium text-foreground/60 hover:text-foreground bg-surface border border-border hover:bg-surface-light transition-colors"
          >
            Export Report (.csv)
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-5 py-3.5 rounded-xl font-medium text-foreground/60 hover:text-foreground bg-surface border border-border hover:bg-surface-light transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Info Notice (replaces scary warnings) ────────────

function InfoNotice({
  icon,
  title,
  subtitle,
}: {
  icon: "info" | "layers";
  title: string;
  subtitle: string;
}) {
  return (
    <div className="border border-border/50 rounded-xl p-4 mb-4 bg-foreground/[0.02]">
      <div className="flex items-start gap-3">
        {icon === "info" ? (
          <svg
            className="w-5 h-5 text-blue-400/60 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-foreground/30 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        )}
        <div className="flex-1">
          <p className="text-sm text-foreground/60">{title}</p>
          <p className="text-[12px] text-foreground/30 mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────

function StatCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: number;
  subtitle?: string;
  color: "green" | "blue" | "purple" | "foreground";
}) {
  const colorClasses = {
    green: "text-green-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    foreground: "text-foreground",
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4 text-center">
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-[11px] text-foreground/40 mt-1">{label}</div>
      {subtitle && (
        <div className="text-[10px] text-foreground/25 mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}
