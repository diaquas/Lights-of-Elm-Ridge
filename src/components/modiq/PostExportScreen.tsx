"use client";

import { useState } from "react";

type SurveyRating = "great" | "okay" | "rough" | null;

interface BoostLine {
  userGroupName: string;
  sourceGroupName: string;
}

interface PostExportScreenProps {
  sequenceTitle: string;
  fileName: string;
  onDownloadAgain: () => void;
  onMapAnother: () => void;
  skippedCount: number;
  /** Display coverage percentage (0-100) */
  displayCoverage?: number;
  /** Sequence coverage stats */
  sequenceCoverage?: { mapped: number; total: number };
  /** Boost mappings that were accepted */
  boostLines?: BoostLine[];
  /** Groups mapped count */
  groupsMappedCount?: number;
  /** Child models resolved by group mappings */
  groupsCoveredChildCount?: number;
  /** Direct individual model maps */
  directMappedCount?: number;
}

/** Color class based on coverage percentage thresholds */
function getCoverageColor(pct: number): string {
  if (pct >= 90) return "text-green-400";
  if (pct >= 70) return "text-amber-400";
  if (pct >= 50) return "text-orange-400";
  return "text-red-400";
}

/** Format percentage: drop .0 for whole numbers */
function fmtPct(n: number): string {
  return n % 1 === 0 ? `${n}` : n.toFixed(1);
}

export default function PostExportScreen({
  sequenceTitle,
  fileName,
  onDownloadAgain,
  onMapAnother,
  skippedCount,
  displayCoverage,
  sequenceCoverage,
  boostLines,
  groupsMappedCount,
  groupsCoveredChildCount,
  directMappedCount,
}: PostExportScreenProps) {
  const [surveyRating, setSurveyRating] = useState<SurveyRating>(null);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [shareData, setShareData] = useState(false);

  const handleSurveySubmit = (rating: SurveyRating) => {
    setSurveyRating(rating);
    setSurveySubmitted(true);
    // Future: send to telemetry endpoint
  };

  // Compute sequence utilization percentage
  const sequencePct =
    sequenceCoverage && sequenceCoverage.total > 0
      ? Math.round(
          (sequenceCoverage.mapped / sequenceCoverage.total) * 1000,
        ) / 10
      : 0;

  // Stats bar segments (mirroring MappingProgressBar V3 style)
  const total = sequenceCoverage?.total ?? 0;
  const effective = Math.max(1, total - skippedCount);
  const groupChildren = groupsCoveredChildCount ?? 0;
  const direct = directMappedCount ?? 0;
  const unmapped = Math.max(0, effective - groupChildren - direct);

  const groupChildPct = (groupChildren / effective) * 100;
  const directBarPct = (direct / effective) * 100;
  const unmappedBarPct = (unmapped / effective) * 100;

  const hasStats =
    total > 0 &&
    (groupsMappedCount !== undefined || directMappedCount !== undefined);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Success message */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-display font-bold">Mapping exported!</h2>
        <p className="text-foreground/60">
          <span className="font-mono text-sm bg-surface-light px-2 py-1 rounded">
            {fileName}
          </span>{" "}
          saved to your downloads.
        </p>
      </div>

      {/* Coverage boxes — side by side, matching HowItWorksCard style */}
      {(sequenceCoverage || displayCoverage !== undefined) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Sequence Utilized */}
          {sequenceCoverage && (
            <div className="bg-surface rounded-xl border border-border p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto mb-3">
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
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <h3 className="font-display font-bold mb-2">
                Sequence Utilized
              </h3>
              <p
                className={`text-3xl font-extrabold tabular-nums ${getCoverageColor(sequencePct)}`}
              >
                {fmtPct(sequencePct)}%
              </p>
              <p className="text-[11px] text-foreground/30 mt-1">
                {sequenceCoverage.mapped} of {sequenceCoverage.total} layers
              </p>
            </div>
          )}

          {/* Display Coverage */}
          {displayCoverage !== undefined && (
            <div className="bg-surface rounded-xl border border-border p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto mb-3">
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
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-display font-bold mb-2">
                Display Coverage
              </h3>
              <p
                className={`text-3xl font-extrabold tabular-nums ${getCoverageColor(displayCoverage)}`}
              >
                {fmtPct(displayCoverage)}%
              </p>
              <p className="text-[11px] text-foreground/30 mt-1">
                {displayCoverage >= 100
                  ? "Every group receives effects"
                  : "Groups in your layout receiving effects"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stats bar — styled like the mapping progress bar */}
      {hasStats && (
        <div className="bg-surface rounded-xl border border-border p-5">
          {/* Segmented bar */}
          <div className="flex h-2 rounded overflow-hidden w-full">
            {groupChildPct > 0 && (
              <div
                className="bg-teal-400"
                style={{ width: `${groupChildPct}%` }}
              />
            )}
            {directBarPct > 0 && (
              <div
                className="bg-green-500"
                style={{ width: `${directBarPct}%` }}
              />
            )}
            {unmappedBarPct > 0 && (
              <div
                className="bg-[#333]"
                style={{ width: `${unmappedBarPct}%` }}
              />
            )}
          </div>

          {/* Labels */}
          <div className="flex items-center gap-4 mt-2 text-[11px]">
            {(groupsMappedCount ?? 0) > 0 && (
              <span className="text-teal-400">
                <span className="font-bold tabular-nums">
                  {groupsMappedCount}
                </span>{" "}
                groups
                {groupChildren > 0 && (
                  <span className="text-foreground/30">
                    {" "}
                    (covering {groupChildren} models)
                  </span>
                )}
              </span>
            )}
            {direct > 0 && (
              <span className="text-green-400">
                <span className="font-bold tabular-nums">{direct}</span> direct
              </span>
            )}
            {unmapped > 0 && (
              <span className="text-foreground/40">
                <span className="font-bold tabular-nums">{unmapped}</span>{" "}
                unmapped
              </span>
            )}
            {skippedCount > 0 && (
              <span className="text-foreground/30">
                <span className="font-bold tabular-nums">{skippedCount}</span>{" "}
                skipped
              </span>
            )}
          </div>

          {/* Boost lines */}
          {boostLines && boostLines.length > 0 && (
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-green-400 font-semibold mb-2">
                <span>&#x2728;</span>
                <span>
                  Bonus: {boostLines.length} group
                  {boostLines.length > 1 ? "s" : ""} linked for fuller display
                </span>
              </div>
              <div className="space-y-1 text-xs text-foreground/50">
                {boostLines.map((bl, i) => (
                  <div key={i}>
                    {bl.userGroupName} &rarr; {bl.sourceGroupName}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Non-boost skipped count (legacy path when no coverage data) */}
      {!sequenceCoverage && !displayCoverage && skippedCount > 0 && (
        <p className="text-sm text-foreground/40 text-center">
          {skippedCount} model{skippedCount !== 1 ? "s" : ""} were skipped and
          won&apos;t receive effects.
        </p>
      )}

      {/* How to import */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h3 className="font-display font-semibold mb-3">
          How to import into xLights
        </h3>
        <ol className="text-sm text-foreground/60 space-y-2 list-decimal list-inside">
          <li>Open xLights</li>
          <li>Open or create your sequence</li>
          <li>
            <strong>File &rarr; Import Effects</strong> &rarr; select the
            purchased sequence file
          </li>
          <li>
            In the mapping dialog, click <strong>Load Mapping</strong>
          </li>
          <li>Select the .xmap file you just downloaded</li>
          <li>Review and click OK</li>
        </ol>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onDownloadAgain}
          className="flex-1 py-4 rounded-xl font-display font-bold text-lg bg-surface border border-border hover:bg-surface-light text-foreground transition-all"
        >
          Download Again
        </button>
        <button
          onClick={onMapAnother}
          className="flex-1 py-4 rounded-xl font-display font-bold text-lg bg-accent hover:bg-accent/90 text-white transition-all"
        >
          Map Another Sequence
        </button>
      </div>

      {/* Survey */}
      <div className="bg-surface rounded-xl border border-border p-6 text-center">
        {!surveySubmitted ? (
          <>
            <h3 className="font-display font-semibold mb-4">
              How was the auto-mapping?
            </h3>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handleSurveySubmit("great")}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl hover:bg-surface-light transition-colors"
              >
                <span className="text-2xl">&#x1F60A;</span>
                <span className="text-xs text-foreground/50">
                  Great, barely changed anything
                </span>
              </button>
              <button
                onClick={() => handleSurveySubmit("okay")}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl hover:bg-surface-light transition-colors"
              >
                <span className="text-2xl">&#x1F610;</span>
                <span className="text-xs text-foreground/50">
                  Okay, fixed a few things
                </span>
              </button>
              <button
                onClick={() => handleSurveySubmit("rough")}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl hover:bg-surface-light transition-colors"
              >
                <span className="text-2xl">&#x1F615;</span>
                <span className="text-xs text-foreground/50">
                  Rough, had to fix a lot
                </span>
              </button>
            </div>
            <button
              onClick={() => setSurveySubmitted(true)}
              className="mt-3 text-xs text-foreground/30 hover:text-foreground/50"
            >
              Skip
            </button>
          </>
        ) : (
          <div className="space-y-2">
            {surveyRating ? (
              <p className="text-sm text-foreground/60">
                Thanks for your feedback! This helps us improve ModIQ.
              </p>
            ) : (
              <p className="text-sm text-foreground/40">Survey skipped</p>
            )}
          </div>
        )}
      </div>

      {/* Share data opt-in */}
      <div className="flex items-center justify-center gap-2 text-sm text-foreground/40 pb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={shareData}
            onChange={(e) => setShareData(e.target.checked)}
            className="rounded border-border"
          />
          <span>Help improve ModIQ: Share anonymous mapping data</span>
        </label>
      </div>
    </div>
  );
}
