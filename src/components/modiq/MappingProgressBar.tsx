"use client";

import { memo } from "react";

interface MappingProgressBarProps {
  /** V3 source-first mode (effects coverage) */
  mode?: "v3" | "v2";
  // V3 props
  mappedLayerCount?: number;
  totalSourceLayers?: number;
  skippedLayerCount?: number;
  groupsMappedCount?: number;
  groupsCoveredChildCount?: number;
  directMappedCount?: number;
  unmappedLayerCount?: number;
  // V2 props (kept for backwards compatibility)
  mappedCount?: number;
  totalCount?: number;
  skippedCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  coveredByGroupCount?: number;
  percentage?: number;
}

export default memo(function MappingProgressBar(
  props: MappingProgressBarProps,
) {
  const mode = props.mode ?? "v2";

  if (mode === "v3") {
    return <V3Bar {...props} />;
  }
  return <V2Bar {...props} />;
});

/** V3: Coverage-based bar (teal groups, green direct, gray unmapped) */
function V3Bar({
  mappedLayerCount = 0,
  totalSourceLayers = 0,
  skippedLayerCount = 0,
  groupsMappedCount = 0,
  groupsCoveredChildCount = 0,
  directMappedCount = 0,
  unmappedLayerCount = 0,
}: MappingProgressBarProps) {
  const effective = totalSourceLayers - skippedLayerCount;
  const groupsPct = effective > 0 ? (groupsMappedCount / effective) * 100 : 0;
  const directPct = effective > 0 ? (directMappedCount / effective) * 100 : 0;
  const unmappedPct =
    effective > 0 ? (unmappedLayerCount / effective) * 100 : 0;

  return (
    <div>
      {/* Headline: effects coverage */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-[28px] font-extrabold leading-none tabular-nums">
          {mappedLayerCount}
        </span>
        <span className="text-lg font-semibold text-foreground/40 tabular-nums">
          /{effective}
        </span>
        <span className="text-sm text-foreground/50 ml-0.5">
          effects layers covered
        </span>
        {skippedLayerCount > 0 && (
          <span className="text-xs text-foreground/30 ml-1">
            ({skippedLayerCount} skipped)
          </span>
        )}
      </div>

      {/* Bar: teal groups → green direct → gray unmapped */}
      <div className="flex h-2 rounded overflow-hidden w-full">
        {groupsPct > 0 && (
          <div
            className="bg-teal-400 transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${groupsPct}%` }}
          />
        )}
        {directPct > 0 && (
          <div
            className="bg-green-500 transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${directPct}%` }}
          />
        )}
        {unmappedPct > 0 && (
          <div
            className="bg-[#333] transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${unmappedPct}%` }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="flex items-center gap-3 mt-1.5 text-xs">
        {groupsMappedCount > 0 && (
          <span className="text-teal-400">
            <span className="font-bold tabular-nums">{groupsMappedCount}</span>{" "}
            groups
            {groupsCoveredChildCount > 0 && (
              <span className="text-foreground/30">
                {" "}
                (covering {groupsCoveredChildCount} models)
              </span>
            )}
          </span>
        )}
        {directMappedCount > 0 && (
          <span className="text-green-400">
            <span className="font-bold tabular-nums">{directMappedCount}</span>{" "}
            direct
          </span>
        )}
        {unmappedLayerCount > 0 && (
          <span className="text-foreground/40">
            <span className="font-bold tabular-nums">{unmappedLayerCount}</span>{" "}
            unused
          </span>
        )}
      </div>
    </div>
  );
}

/** V2: Confidence-based bar (green/yellow/red/cyan/gray) */
function V2Bar({
  mappedCount = 0,
  totalCount = 0,
  skippedCount = 0,
  highCount = 0,
  mediumCount = 0,
  lowCount = 0,
  coveredByGroupCount = 0,
}: MappingProgressBarProps) {
  const effectiveTotal = totalCount - skippedCount;
  const unmappedCount = effectiveTotal - mappedCount;

  const highPct = effectiveTotal > 0 ? (highCount / effectiveTotal) * 100 : 0;
  const medPct = effectiveTotal > 0 ? (mediumCount / effectiveTotal) * 100 : 0;
  const lowPct = effectiveTotal > 0 ? (lowCount / effectiveTotal) * 100 : 0;
  const coveredPct =
    effectiveTotal > 0 ? (coveredByGroupCount / effectiveTotal) * 100 : 0;
  const unmappedPct =
    effectiveTotal > 0 ? (unmappedCount / effectiveTotal) * 100 : 0;

  return (
    <div>
      {/* Headline stat */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-[28px] font-extrabold leading-none tabular-nums">
          {mappedCount}
        </span>
        <span className="text-lg font-semibold text-foreground/40 tabular-nums">
          /{effectiveTotal}
        </span>
        <span className="text-sm text-foreground/50 ml-0.5">mapped</span>
      </div>

      {/* Segmented progress bar */}
      <div className="flex h-2 rounded overflow-hidden w-full">
        {highPct > 0 && (
          <div
            className="bg-green-500 transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${highPct}%` }}
          />
        )}
        {medPct > 0 && (
          <div
            className="bg-yellow-500 transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${medPct}%` }}
          />
        )}
        {lowPct > 0 && (
          <div
            className="bg-red-500 transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${lowPct}%` }}
          />
        )}
        {coveredPct > 0 && (
          <div
            className="bg-cyan-500 transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${coveredPct}%` }}
          />
        )}
        {unmappedPct > 0 && (
          <div
            className="bg-[#333] transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${unmappedPct}%` }}
          />
        )}
      </div>

      {/* Segment labels */}
      <div className="flex w-full mt-1.5">
        {highCount > 0 && (
          <div
            className="flex items-center justify-center gap-1 transition-[width] duration-[400ms]"
            style={{ width: `${highPct}%` }}
          >
            <span className="text-sm font-bold text-green-400 tabular-nums">
              {highCount}
            </span>
            {highPct >= 8 && (
              <span className="text-xs text-foreground/30 uppercase tracking-wide">
                high
              </span>
            )}
          </div>
        )}
        {mediumCount > 0 && (
          <div
            className="flex items-center justify-center gap-1 transition-[width] duration-[400ms]"
            style={{ width: `${medPct}%` }}
          >
            <span className="text-sm font-bold text-yellow-400 tabular-nums">
              {mediumCount}
            </span>
            {medPct >= 8 && (
              <span className="text-xs text-foreground/30 uppercase tracking-wide">
                med
              </span>
            )}
          </div>
        )}
        {lowCount > 0 && (
          <div
            className="flex items-center justify-center gap-1 transition-[width] duration-[400ms]"
            style={{ width: `${lowPct}%` }}
          >
            <span className="text-sm font-bold text-red-400 tabular-nums">
              {lowCount}
            </span>
            {lowPct >= 8 && (
              <span className="text-xs text-foreground/30 uppercase tracking-wide">
                low
              </span>
            )}
          </div>
        )}
        {coveredByGroupCount > 0 && (
          <div
            className="flex items-center justify-center gap-1 transition-[width] duration-[400ms]"
            style={{ width: `${coveredPct}%` }}
          >
            <span className="text-sm font-bold text-cyan-400 tabular-nums">
              {coveredByGroupCount}
            </span>
            {coveredPct >= 10 && (
              <span className="text-xs text-foreground/30 uppercase tracking-wide">
                via groups
              </span>
            )}
          </div>
        )}
        {unmappedCount > 0 && (
          <div
            className="flex items-center justify-center gap-1 transition-[width] duration-[400ms]"
            style={{ width: `${unmappedPct}%` }}
          >
            <span className="text-sm font-bold text-foreground/40 tabular-nums">
              {unmappedCount}
            </span>
            {unmappedPct >= 8 && (
              <span className="text-xs text-foreground/30 uppercase tracking-wide">
                unmapped
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
