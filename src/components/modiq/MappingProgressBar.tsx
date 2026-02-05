"use client";

import { memo } from "react";

interface MappingProgressBarProps {
  mappedCount: number;
  totalCount: number;
  skippedCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  percentage: number;
}

export default memo(function MappingProgressBar({
  mappedCount,
  totalCount,
  skippedCount,
  highCount,
  mediumCount,
  lowCount,
}: MappingProgressBarProps) {
  const effectiveTotal = totalCount - skippedCount;
  const unmappedCount = effectiveTotal - mappedCount;

  const highPct = effectiveTotal > 0 ? (highCount / effectiveTotal) * 100 : 0;
  const medPct =
    effectiveTotal > 0 ? (mediumCount / effectiveTotal) * 100 : 0;
  const lowPct = effectiveTotal > 0 ? (lowCount / effectiveTotal) * 100 : 0;
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
        <span className="text-[13px] text-foreground/50 ml-0.5">mapped</span>
      </div>

      {/* Segmented progress bar — 8px */}
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
        {unmappedPct > 0 && (
          <div
            className="bg-[#333] transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${unmappedPct}%` }}
          />
        )}
      </div>

      {/* Segment labels — aligned below segments */}
      <div className="flex w-full mt-1.5">
        {highCount > 0 && (
          <div
            className="flex items-center justify-center gap-1 transition-[width] duration-[400ms]"
            style={{ width: `${highPct}%` }}
          >
            <span className="text-[13px] font-bold text-green-400 tabular-nums">
              {highCount}
            </span>
            {highPct >= 8 && (
              <span className="text-[10px] text-foreground/30 uppercase tracking-wide">
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
            <span className="text-[13px] font-bold text-yellow-400 tabular-nums">
              {mediumCount}
            </span>
            {medPct >= 8 && (
              <span className="text-[10px] text-foreground/30 uppercase tracking-wide">
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
            <span className="text-[13px] font-bold text-red-400 tabular-nums">
              {lowCount}
            </span>
            {lowPct >= 8 && (
              <span className="text-[10px] text-foreground/30 uppercase tracking-wide">
                low
              </span>
            )}
          </div>
        )}
        {unmappedCount > 0 && (
          <div
            className="flex items-center justify-center gap-1 transition-[width] duration-[400ms]"
            style={{ width: `${unmappedPct}%` }}
          >
            <span className="text-[13px] font-bold text-foreground/40 tabular-nums">
              {unmappedCount}
            </span>
            {unmappedPct >= 8 && (
              <span className="text-[10px] text-foreground/30 uppercase tracking-wide">
                unmapped
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
