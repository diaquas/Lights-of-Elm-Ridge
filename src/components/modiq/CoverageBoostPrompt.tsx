"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoostSuggestion, SpinnerBoostSuggestion, DisplayCoverage } from "@/lib/modiq";
import { projectDisplayCoverage } from "@/lib/modiq";
import type { ParsedModel } from "@/lib/modiq";

// -- Types --

interface CoverageBoostPromptProps {
  /** Current display coverage before boost */
  displayCoverage: DisplayCoverage;
  /** Sequence coverage stats */
  sequenceCoverage: { mapped: number; total: number };
  /** Group-level boost suggestions */
  groupSuggestions: BoostSuggestion[];
  /** Spinner/submodel boost suggestions */
  spinnerSuggestions: SpinnerBoostSuggestion[];
  /** All dest models for projected coverage calc */
  destModels: ParsedModel[];
  /** Accept selected suggestions and export */
  onAcceptAndExport: (
    acceptedGroups: BoostSuggestion[],
    acceptedSpinners: SpinnerBoostSuggestion[],
  ) => void;
  /** Skip boost and export at current coverage */
  onSkipAndExport: () => void;
  /** Go back to mapping */
  onKeepMapping: () => void;
}

// -- Component --

export default memo(function CoverageBoostPrompt({
  displayCoverage,
  sequenceCoverage,
  groupSuggestions,
  spinnerSuggestions,
  destModels,
  onAcceptAndExport,
  onSkipAndExport,
  onKeepMapping,
}: CoverageBoostPromptProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Checkbox state for group suggestions
  const [checkedGroups, setCheckedGroups] = useState<Set<string>>(new Set());
  // Checkbox state for spinner suggestions
  const [checkedSpinners, setCheckedSpinners] = useState<Set<string>>(new Set());

  // Focus trap + escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onKeepMapping();
    };
    document.addEventListener("keydown", handler);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handler);
  }, [onKeepMapping]);

  // Toggle group checkbox
  const toggleGroup = useCallback((groupName: string) => {
    setCheckedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }, []);

  // Toggle spinner checkbox
  const toggleSpinner = useCallback((modelName: string) => {
    setCheckedSpinners((prev) => {
      const next = new Set(prev);
      if (next.has(modelName)) next.delete(modelName);
      else next.add(modelName);
      return next;
    });
  }, []);

  // Select all
  const totalItems = groupSuggestions.length + spinnerSuggestions.length;
  const checkedCount = checkedGroups.size + checkedSpinners.size;
  const allChecked = checkedCount === totalItems && totalItems > 0;

  const handleSelectAll = useCallback(() => {
    if (allChecked) {
      setCheckedGroups(new Set());
      setCheckedSpinners(new Set());
    } else {
      setCheckedGroups(new Set(groupSuggestions.map((s) => s.userGroup.name)));
      setCheckedSpinners(new Set(spinnerSuggestions.map((s) => s.userModel.name)));
    }
  }, [allChecked, groupSuggestions, spinnerSuggestions]);

  // Projected coverage based on current selections
  const acceptedGroupSuggestions = useMemo(
    () => groupSuggestions.filter((s) => checkedGroups.has(s.userGroup.name)),
    [groupSuggestions, checkedGroups],
  );
  const acceptedSpinnerSuggestions = useMemo(
    () => spinnerSuggestions.filter((s) => checkedSpinners.has(s.userModel.name)),
    [spinnerSuggestions, checkedSpinners],
  );

  const projectedPct = useMemo(
    () =>
      projectDisplayCoverage(
        displayCoverage,
        acceptedGroupSuggestions,
        acceptedSpinnerSuggestions,
        destModels,
      ),
    [displayCoverage, acceptedGroupSuggestions, acceptedSpinnerSuggestions, destModels],
  );

  // Count uncovered models/groups for display
  const uncoveredModels =
    displayCoverage.totalModels - displayCoverage.coveredModels;
  const uncoveredGroups = displayCoverage.unmappedUserGroups.length;

  // Handle accept
  const handleAccept = useCallback(() => {
    onAcceptAndExport(acceptedGroupSuggestions, acceptedSpinnerSuggestions);
  }, [onAcceptAndExport, acceptedGroupSuggestions, acceptedSpinnerSuggestions]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      style={{ willChange: "opacity" }}
      onClick={onKeepMapping}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coverage-boost-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col outline-none"
        style={{ willChange: "transform" }}
      >
        {/* -- Header: Coverage Metrics -- */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-foreground/60">Sequence coverage:</span>
              <span className="font-bold text-green-400">
                {sequenceCoverage.mapped}/{sequenceCoverage.total}
              </span>
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-foreground/60">Display coverage:</span>
              <span className="font-bold text-amber-400">
                {displayCoverage.percentage}%
              </span>
              <span className="text-foreground/40">
                &mdash; {uncoveredModels} model{uncoveredModels !== 1 ? "s" : ""} in{" "}
                {uncoveredGroups} group{uncoveredGroups !== 1 ? "s" : ""} won&apos;t receive effects
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm text-foreground/70">
              These groups in your layout aren&apos;t mapped to anything in this sequence.
              Want to duplicate some effects so more of your display lights up?
            </p>
          </div>
        </div>

        {/* -- Scrollable Suggestion Cards -- */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-3 pb-2">
          {/* Group suggestions */}
          {groupSuggestions.length > 0 && (
            <div className="space-y-2">
              {groupSuggestions.map((suggestion) => (
                <GroupSuggestionCard
                  key={suggestion.userGroup.name}
                  suggestion={suggestion}
                  checked={checkedGroups.has(suggestion.userGroup.name)}
                  onToggle={() => toggleGroup(suggestion.userGroup.name)}
                />
              ))}
            </div>
          )}

          {/* Spinner suggestions */}
          {spinnerSuggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 mt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground/30">
                  SPINNER MATCHING
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <p className="text-xs text-foreground/40 mb-2">
                You have spinners already mapped. We found{" "}
                {spinnerSuggestions.length} more that could receive the same effects:
              </p>
              <div className="space-y-2">
                {spinnerSuggestions.map((suggestion) => (
                  <SpinnerSuggestionCard
                    key={suggestion.userModel.name}
                    suggestion={suggestion}
                    checked={checkedSpinners.has(suggestion.userModel.name)}
                    onToggle={() => toggleSpinner(suggestion.userModel.name)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* -- Footer: Actions -- */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0 space-y-3">
          {/* Projected coverage line */}
          {checkedCount > 0 && (
            <p className="text-sm text-foreground/60">
              Accepting {checkedCount === totalItems ? "all" : "these"} brings display coverage to{" "}
              <span className="font-bold text-green-400">{projectedPct}%</span>.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAccept}
              disabled={checkedCount === 0}
              className={"flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-colors " +
                (checkedCount > 0
                  ? "bg-accent hover:bg-accent/90 text-white"
                  : "bg-surface-light text-foreground/30 cursor-not-allowed")
              }
            >
              Map selected ({checkedCount})
            </button>
            <button
              onClick={onSkipAndExport}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-foreground/70 bg-surface-light border border-border hover:bg-surface hover:text-foreground transition-colors"
            >
              Skip &mdash; export at {displayCoverage.percentage}% display coverage
            </button>
          </div>

          {/* Select all + back */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-foreground/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={handleSelectAll}
                className="rounded border-border accent-accent"
              />
              Select all ({totalItems})
            </label>
            <button
              onClick={onKeepMapping}
              className="text-xs text-foreground/30 hover:text-foreground/60 transition-colors"
            >
              Back to mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// -- Sub-components --

function GroupSuggestionCard({
  suggestion,
  checked,
  onToggle,
}: {
  suggestion: BoostSuggestion;
  checked: boolean;
  onToggle: () => void;
}) {
  const { userGroup, sourceGroup, existingDests, score, reason } = suggestion;
  const memberCount = userGroup.memberModels.length;
  const matchPct = Math.round(score * 100);

  return (
    <label
      className={"block rounded-xl border p-4 cursor-pointer transition-all " +
        (checked
          ? "border-accent/40 bg-accent/[0.04]"
          : "border-border bg-background hover:border-foreground/10")
      }
      onClick={(e) => {
        // Prevent double-toggle from label+checkbox
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        onToggle();
      }}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 rounded border-border accent-accent flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-teal-400/70 bg-teal-500/10 px-1.5 py-0.5 rounded">
              GRP
            </span>
            <span className="font-semibold text-sm text-foreground truncate">
              {userGroup.name}
            </span>
            <span className="text-xs text-foreground/40">
              ({memberCount} model{memberCount !== 1 ? "s" : ""})
            </span>
          </div>
          <p className="text-xs text-foreground/40 mb-2">
            Your {userGroup.name.toLowerCase().replace(/^all\s+/i, "")} won&apos;t receive
            any effects from this sequence.
          </p>
          <div className="text-xs text-foreground/50">
            <span className="text-amber-400/80 mr-1">Suggested source:</span>
            <span className="text-foreground/70 font-medium">{sourceGroup.name}</span>
            {existingDests.length > 0 && (
              <span className="text-foreground/30">
                {" "}
                &mdash; already sending to &quot;{existingDests[0]}&quot;
                {existingDests.length > 1 && (" +" + (existingDests.length - 1))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-foreground/30">{reason}</span>
            <span className="text-xs font-semibold text-accent/70">{matchPct}% match</span>
          </div>
        </div>
      </div>
    </label>
  );
}

function SpinnerSuggestionCard({
  suggestion,
  checked,
  onToggle,
}: {
  suggestion: SpinnerBoostSuggestion;
  checked: boolean;
  onToggle: () => void;
}) {
  const { userModel, sourceModel, templateModel, score, reason } = suggestion;
  const matchPct = Math.round(score * 100);

  // Extract arm/ring info from submodels for display
  let armCount = 0;
  let ringCount = 0;
  for (const sub of userModel.submodels) {
    const lower = sub.name.toLowerCase();
    if (/arm|blade|spoke|wing/i.test(lower)) armCount++;
    else if (/ring|layer|circle|loop/i.test(lower)) ringCount++;
  }

  const structParts = [
    armCount > 0 ? (armCount + " arm" + (armCount > 1 ? "s" : "")) : null,
    ringCount > 0 ? (ringCount + " ring" + (ringCount > 1 ? "s" : "")) : null,
    userModel.pixelCount + "px",
  ].filter(Boolean);

  const structDesc = structParts.join(" \u00b7 ");

  return (
    <label
      className={"block rounded-xl border p-4 cursor-pointer transition-all " +
        (checked
          ? "border-accent/40 bg-accent/[0.04]"
          : "border-border bg-background hover:border-foreground/10")
      }
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        onToggle();
      }}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 rounded border-border accent-accent flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground truncate">
              {userModel.name}
            </span>
            <span className="text-xs text-foreground/40">({structDesc})</span>
          </div>
          <div className="text-xs text-foreground/50 mb-1">
            <span className="text-amber-400/80 mr-1">Copy submodel mapping from</span>
            <span className="text-foreground/70 font-medium">{templateModel.name}</span>
          </div>
          <div className="text-xs text-foreground/40">
            Source: {sourceModel.name}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-foreground/30">{reason}</span>
            <span className="text-xs font-semibold text-accent/70">{matchPct}%</span>
          </div>
        </div>
      </div>
    </label>
  );
}
