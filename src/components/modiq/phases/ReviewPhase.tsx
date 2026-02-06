"use client";

import { useMemo } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export interface ReviewPhaseProps {
  onExport: () => void;
  onExportReport: () => void;
  onReset: () => void;
  seqTitle: string;
  coveragePercent: number;
}

export function ReviewPhase({
  onExport,
  onExportReport,
  onReset,
  seqTitle,
  coveragePercent,
}: ReviewPhaseProps) {
  const { interactive, overallProgress, phaseCounts } = useMappingPhase();

  const { mappedLayers, skippedLayers, unmappedLayers } = useMemo(() => {
    const mapped: SourceLayerMapping[] = [];
    const skipped: SourceLayerMapping[] = [];
    const unmapped: SourceLayerMapping[] = [];

    for (const layer of interactive.sourceLayerMappings) {
      if (layer.isSkipped) skipped.push(layer);
      else if (layer.isMapped) mapped.push(layer);
      else unmapped.push(layer);
    }

    return { mappedLayers: mapped, skippedLayers: skipped, unmappedLayers: unmapped };
  }, [interactive.sourceLayerMappings]);

  const totalChildrenResolved = mappedLayers
    .filter((l) => l.isGroup)
    .reduce((sum, g) => sum + g.coveredChildCount, 0);

  const exportClass =
    coveragePercent >= 100
      ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20"
      : coveragePercent >= 50
        ? "bg-amber-500 hover:bg-amber-600 text-white"
        : "bg-zinc-600 hover:bg-zinc-500 text-zinc-300";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border text-center">
        {coveragePercent >= 100 ? (
          <>
            <div className="text-5xl mb-3">&#10024;</div>
            <h2 className="text-2xl font-bold text-foreground">
              All Layers Mapped!
            </h2>
            <p className="text-foreground/50 mt-2">
              {overallProgress.completed}/{overallProgress.total} sequence layers ready for
              export
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground">Review Mappings</h2>
            <p className="text-foreground/50 mt-2">
              {overallProgress.completed} of {overallProgress.total} mapped &middot;{" "}
              {unmappedLayers.length} remaining
            </p>
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              label="Spinners"
              value={phaseCounts.get("spinners") ?? 0}
              color="purple"
            />
          </div>

          {/* Coverage Bar */}
          <div className="bg-surface rounded-xl border border-border p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">
                Sequence Coverage
              </span>
              <span className="text-lg font-bold text-foreground">
                {Math.round(coveragePercent)}%
              </span>
            </div>
            <div className="h-3 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  coveragePercent >= 100
                    ? "bg-green-500"
                    : coveragePercent >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${Math.min(coveragePercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-foreground/30">
              <span>{mappedLayers.length} mapped</span>
              {skippedLayers.length > 0 && (
                <span>{skippedLayers.length} skipped</span>
              )}
              {unmappedLayers.length > 0 && (
                <span className="text-amber-400/60">
                  {unmappedLayers.length} unmapped
                </span>
              )}
            </div>
          </div>

          {/* Mapping Source */}
          <div className="bg-surface rounded-xl border border-border p-4 mb-6">
            <div className="text-[11px] text-foreground/30 uppercase tracking-wide mb-1">
              Mapping
            </div>
            <div className="text-sm text-foreground">
              {seqTitle} &rarr; Your Layout
            </div>
          </div>

          {/* Unmapped Warning */}
          {unmappedLayers.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-amber-400">
                    {unmappedLayers.length} layers still unmapped
                  </h4>
                  <p className="text-[12px] text-foreground/40 mt-1">
                    These sequence layers won&apos;t have destinations in your xmap
                    file. You can still export, or go back to map them.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mapped Summary (collapsible) */}
          <details className="mb-6">
            <summary className="text-sm font-medium text-foreground/60 cursor-pointer hover:text-foreground/80 mb-3">
              View all {mappedLayers.length} mappings
            </summary>
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="divide-y divide-border/30">
                {mappedLayers.map((layer) => {
                  const suggs = interactive.getSuggestionsForLayer(layer.sourceModel);
                  const matchedSugg = suggs.find(
                    (s) => s.model.name === layer.assignedUserModels[0]?.name,
                  );

                  return (
                    <div
                      key={layer.sourceModel.name}
                      className="px-4 py-2.5 flex items-center gap-3 hover:bg-foreground/[0.02]"
                    >
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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

      {/* Export Actions */}
      <div className="px-8 py-4 border-t border-border">
        <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
          <button
            type="button"
            onClick={onExport}
            className={`flex-1 py-3.5 rounded-xl font-display font-bold text-base transition-all flex items-center justify-center gap-2 ${exportClass}`}
          >
            {coveragePercent >= 100 && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {coveragePercent >= 100
              ? "Download Mapping File (.xmap)"
              : `Download Mapping File (${unmappedLayers.length} remaining)`}
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
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>
        {value}
      </div>
      <div className="text-[11px] text-foreground/40 mt-1">{label}</div>
      {subtitle && (
        <div className="text-[10px] text-foreground/25 mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}
