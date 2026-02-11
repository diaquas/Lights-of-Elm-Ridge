"use client";

import { useMemo, useCallback } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { SacrificeSummary } from "../SacrificeIndicator";
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
  const { interactive, phaseCounts, setCurrentPhase } = useMappingPhase();

  const { displayCoverage, effectsCoverage } = interactive;

  const { mappedLayers, unmappedLayers, skippedLayers, manyToOneCount } = useMemo(() => {
    const mapped: SourceLayerMapping[] = [];
    const unmapped: SourceLayerMapping[] = [];
    const skipped: SourceLayerMapping[] = [];
    let manyToOne = 0;

    for (const layer of interactive.sourceLayerMappings) {
      if (layer.isSkipped) {
        skipped.push(layer);
      } else if (layer.isMapped) {
        mapped.push(layer);
        if (layer.assignedUserModels.length > 1) manyToOne++;
      } else {
        unmapped.push(layer);
      }
    }

    return {
      mappedLayers: mapped,
      unmappedLayers: unmapped,
      skippedLayers: skipped,
      manyToOneCount: manyToOne,
    };
  }, [interactive.sourceLayerMappings]);

  const totalChildrenResolved = mappedLayers
    .filter((l) => l.isGroup)
    .reduce((sum, g) => sum + g.coveredChildCount, 0);

  // User models without any mappings
  const userUnmappedCount = displayCoverage.total - displayCoverage.covered;

  // Display coverage determines the visual treatment
  const isGreat = displayCoverage.percent >= 90;
  const isGood = displayCoverage.percent >= 70;
  const showFinalizeNudge = displayCoverage.percent < 100;

  const goToFinalize = useCallback(() => {
    setCurrentPhase("finalize");
  }, [setCurrentPhase]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Finalize nudge */}
      {showFinalizeNudge && (
        <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[13px] text-amber-200/80">
              Display coverage is {displayCoverage.percent}% &mdash; go back to Finalize to fill gaps?
            </span>
          </div>
          <button
            type="button"
            onClick={goToFinalize}
            className="text-[12px] font-medium text-amber-400 hover:text-amber-300 px-3 py-1 rounded-lg hover:bg-amber-500/10 transition-colors"
          >
            Go to Finalize
          </button>
        </div>
      )}

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

          {/* ═══ Side-by-Side Summary Counts ═══ */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface rounded-xl border border-border p-5">
              <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide mb-3">
                Source Sequence
              </div>
              <div className="space-y-2">
                <SummaryRow label="Layers mapped" value={mappedLayers.length} />
                <SummaryRow label="Skipped" value={skippedLayers.length} muted />
                <SummaryRow label="Many-to-one" value={manyToOneCount} muted />
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-border p-5">
              <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide mb-3">
                My Display
              </div>
              <div className="space-y-2">
                <SummaryRow
                  label="Groups active"
                  value={`${displayCoverage.covered}/${displayCoverage.total}`}
                />
                <SummaryRow label="Groups dark" value={userUnmappedCount} muted />
                <SummaryRow
                  label="Display coverage"
                  value={`${displayCoverage.percent}%`}
                  highlight={isGreat}
                />
              </div>
            </div>
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

          {/* ═══ Informational Notices ═══ */}
          {userUnmappedCount > 0 && (
            <InfoNotice
              icon="info"
              title={`${userUnmappedCount} model${userUnmappedCount !== 1 ? "s" : ""} in your layout ${userUnmappedCount !== 1 ? "have" : "has"} no matching sequence content`}
              subtitle="These are props the sequence doesn't use — totally normal!"
            />
          )}

          {unmappedLayers.length > 0 && (
            <InfoNotice
              icon="layers"
              title={`${unmappedLayers.length} sequence layer${unmappedLayers.length !== 1 ? "s" : ""} ${unmappedLayers.length !== 1 ? "don't" : "doesn't"} have destinations in your layout`}
              subtitle="The sequence has props you don't have — this is expected!"
            />
          )}
        </div>
      </div>

      {/* ═══ Export Actions ═══ */}
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

// ─── Summary Row ────────────────────────────────────────

function SummaryRow({
  label,
  value,
  muted,
  highlight,
}: {
  label: string;
  value: string | number;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className={muted ? "text-foreground/35" : "text-foreground/50"}>
        {label}
      </span>
      <span
        className={`font-medium tabular-nums ${
          highlight
            ? "text-green-400"
            : muted
              ? "text-foreground/35"
              : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Info Notice ────────────────────────────────────────

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
