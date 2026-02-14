"use client";

import { memo, useState } from "react";
import type { ProgressTrackerState } from "@/hooks/useProgressTracker";

interface ProgressDetailsModalProps {
  state: ProgressTrackerState;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Full-screen modal showing detailed mapping progress breakdown:
 * - Main dual-metric display
 * - Phase-by-phase table
 * - Effect type breakdown with bars
 * - Signature effects status
 * - Items mapped per category
 */
export const ProgressDetailsModal = memo(function ProgressDetailsModal({
  state,
  isOpen,
  onClose,
}: ProgressDetailsModalProps) {
  const [showAllEffects, setShowAllEffects] = useState(false);

  if (!isOpen) return null;

  const displayBarColor =
    state.display.percent >= 80 ? "bg-green-500" : "bg-yellow-500";
  const displayTextColor =
    state.display.percent >= 80 ? "text-green-400" : "text-yellow-400";
  const displayBorderColor =
    state.display.percent >= 80
      ? "border-green-500/30 bg-green-500/5"
      : "border-yellow-500/30 bg-yellow-500/5";
  const effectsBarColor =
    state.effects.percent >= 70 ? "bg-blue-500" : "bg-yellow-500";
  const effectsTextColor =
    state.effects.percent >= 70 ? "text-blue-400" : "text-yellow-400";
  const effectsBorderColor =
    state.effects.percent >= 70
      ? "border-blue-500/30 bg-blue-500/5"
      : "border-yellow-500/30 bg-yellow-500/5";

  const visibleEffects = showAllEffects
    ? state.effectTypes
    : state.effectTypes.slice(0, 8);
  const hiddenCount = state.effectTypes.length - 8;
  const maxEffectCount =
    state.effectTypes.length > 0
      ? Math.max(...state.effectTypes.map((e) => e.captured))
      : 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Mapping Progress Details"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal */}
      <div
        role="document"
        className="relative w-full max-w-2xl max-h-[80vh] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">
            Mapping Progress Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-4rem)] px-6 py-5 space-y-6">
          {/* ═══ Main Metrics ═══ */}
          <div className="grid grid-cols-2 gap-4">
            {/* Display Coverage */}
            <div
              className={`rounded-xl border p-5 text-center ${displayBorderColor}`}
            >
              <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-2">
                Your Display
              </div>
              <div className={`text-4xl font-bold ${displayTextColor}`}>
                {state.display.percent}%
              </div>
              <div className="h-2.5 bg-foreground/10 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${displayBarColor}`}
                  style={{ width: `${state.display.percent}%` }}
                />
              </div>
              <div className="text-[12px] text-foreground/50 mt-2">
                {state.display.current} of {state.display.total} models active
              </div>
              {state.display.percent >= 90 && (
                <div className="text-[11px] text-green-400 mt-1 font-medium">
                  Excellent coverage!
                </div>
              )}
            </div>

            {/* Effects Coverage */}
            <div
              className={`rounded-xl border p-5 text-center ${effectsBorderColor}`}
            >
              <div className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-2">
                Sequence Effects
              </div>
              <div className={`text-4xl font-bold ${effectsTextColor}`}>
                {state.effects.percent}%
              </div>
              <div className="h-2.5 bg-foreground/10 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${effectsBarColor}`}
                  style={{ width: `${state.effects.percent}%` }}
                />
              </div>
              <div className="text-[12px] text-foreground/50 mt-2">
                {state.effects.current.toLocaleString()} of{" "}
                {state.effects.total.toLocaleString()} effects
              </div>
              {state.effects.percent >= 80 && (
                <div className="text-[11px] text-blue-400 mt-1 font-medium">
                  Great effect capture!
                </div>
              )}
            </div>
          </div>

          {/* ═══ Phase Breakdown Table ═══ */}
          <div>
            <h3 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest mb-3">
              Breakdown by Phase
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-foreground/5 text-foreground/50 text-left">
                    <th className="px-4 py-2.5 font-medium">Phase</th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Items Mapped
                    </th>
                    <th className="px-4 py-2.5 font-medium text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {state.phases.map((phase) => (
                    <tr
                      key={phase.phaseId}
                      className={
                        phase.isActive ? "bg-accent/5" : "hover:bg-foreground/[0.02]"
                      }
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {phase.isComplete && (
                            <svg
                              className="w-3.5 h-3.5 text-green-400 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          {phase.isActive && (
                            <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0 animate-pulse" />
                          )}
                          <span
                            className={
                              phase.isActive
                                ? "font-semibold text-foreground"
                                : phase.isComplete
                                  ? "text-foreground/70"
                                  : "text-foreground/40"
                            }
                          >
                            {phase.phase}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {phase.items > 0 ? phase.items : "--"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {phase.isComplete ? (
                          <span className="text-[11px] text-green-400 font-medium">
                            Done
                          </span>
                        ) : phase.isActive ? (
                          <span className="text-[11px] text-accent font-medium">
                            In Progress
                          </span>
                        ) : (
                          <span className="text-[11px] text-foreground/30">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ Items Mapped ═══ */}
          {(state.itemsMapped.groups.total > 0 ||
            state.itemsMapped.models.total > 0 ||
            state.itemsMapped.submodelGroups.total > 0) && (
            <div>
              <h3 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest mb-3">
                Items Mapped
              </h3>
              <div className="space-y-2.5">
                {state.itemsMapped.groups.total > 0 && (
                  <ProgressRow
                    label="Groups"
                    mapped={state.itemsMapped.groups.mapped}
                    total={state.itemsMapped.groups.total}
                    percent={state.itemsMapped.groups.percent}
                    color="bg-teal-500"
                  />
                )}
                {state.itemsMapped.models.total > 0 && (
                  <ProgressRow
                    label="Models"
                    mapped={state.itemsMapped.models.mapped}
                    total={state.itemsMapped.models.total}
                    percent={state.itemsMapped.models.percent}
                    color="bg-green-500"
                  />
                )}
                {state.itemsMapped.submodelGroups.total > 0 && (
                  <ProgressRow
                    label="Submodel Groups"
                    mapped={state.itemsMapped.submodelGroups.mapped}
                    total={state.itemsMapped.submodelGroups.total}
                    percent={state.itemsMapped.submodelGroups.percent}
                    color="bg-purple-500"
                  />
                )}
              </div>
            </div>
          )}

          {/* ═══ Effect Types Captured ═══ */}
          {state.effectTypes.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest mb-3">
                Effect Types Captured
              </h3>
              <div className="space-y-1.5">
                {visibleEffects.map((entry) => (
                  <div key={entry.type} className="flex items-center gap-2">
                    <span className="text-[12px] text-foreground/60 w-28 truncate">
                      {entry.type}
                    </span>
                    <span className="text-[12px] font-bold text-foreground/80 tabular-nums w-12 text-right">
                      {entry.captured.toLocaleString()}
                    </span>
                    <div className="flex-1 h-2 bg-foreground/5 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${entry.isSignature ? "bg-amber-500" : "bg-accent/50"}`}
                        style={{
                          width: `${maxEffectCount > 0 ? (entry.captured / maxEffectCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    {entry.isSignature && (
                      <span className="text-[10px] text-amber-400 font-medium whitespace-nowrap">
                        Signature
                      </span>
                    )}
                  </div>
                ))}
                {!showAllEffects && hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllEffects(true)}
                    className="text-[11px] text-accent hover:text-accent/80 transition-colors mt-1"
                  >
                    ... {hiddenCount} more effect types
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ═══ Signature Effects Status ═══ */}
          {state.signatureEffects.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest mb-3">
                Signature Effects Status
              </h3>
              <div className="space-y-1.5">
                {state.signatureEffects.map((sig) => (
                  <div
                    key={sig.type}
                    className={`flex items-center justify-between p-2.5 rounded-lg ${
                      sig.isMapped
                        ? "bg-green-500/5 border border-green-500/20"
                        : "bg-orange-500/5 border border-orange-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px]">
                        {sig.isMapped ? "\u2705" : "\u26A0\uFE0F"}
                      </span>
                      <span className="text-[13px] font-medium text-foreground">
                        {sig.type}
                      </span>
                      <span className="text-[11px] text-foreground/40">
                        ({sig.count.toLocaleString()} effects)
                      </span>
                    </div>
                    {sig.isMapped ? (
                      <span className="text-[11px] text-green-400 font-medium">
                        &rarr; {sig.mappedTo}
                      </span>
                    ) : (
                      <span className="text-[11px] text-orange-400 font-semibold">
                        UNMAPPED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function ProgressRow({
  label,
  mapped,
  total,
  percent,
  color,
}: {
  label: string;
  mapped: number;
  total: number;
  percent: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] text-foreground/60 w-32">{label}:</span>
      <span className="text-[13px] font-bold text-foreground/80 tabular-nums w-14">
        {mapped} of {total}
      </span>
      <div className="flex-1 h-2.5 bg-foreground/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[13px] text-foreground/50 tabular-nums w-10 text-right">
        {percent}%
      </span>
    </div>
  );
}
