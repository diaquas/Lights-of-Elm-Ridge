"use client";

interface MappingProgressBarProps {
  mappedCount: number;
  totalCount: number;
  skippedCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  percentage: number;
}

export default function MappingProgressBar({
  mappedCount,
  totalCount,
  skippedCount,
  highCount,
  mediumCount,
  lowCount,
  percentage,
}: MappingProgressBarProps) {
  const effectiveTotal = totalCount - skippedCount;
  const highPct = effectiveTotal > 0 ? (highCount / effectiveTotal) * 100 : 0;
  const medPct = effectiveTotal > 0 ? (mediumCount / effectiveTotal) * 100 : 0;
  const lowPct = effectiveTotal > 0 ? (lowCount / effectiveTotal) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {mappedCount}
            <span className="text-lg text-foreground/40">
              /{effectiveTotal}
            </span>
          </span>
          <span className="text-sm text-foreground/50">
            of their models mapped ({percentage}%)
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-foreground/50">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            {highCount} high
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {mediumCount} med
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            {lowCount} low
          </span>
          {skippedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-foreground/20" />
              {skippedCount} skipped
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-foreground/5 rounded-full overflow-hidden flex">
        {highPct > 0 && (
          <div
            className="bg-green-400 transition-all duration-300"
            style={{ width: `${highPct}%` }}
          />
        )}
        {medPct > 0 && (
          <div
            className="bg-amber-400 transition-all duration-300"
            style={{ width: `${medPct}%` }}
          />
        )}
        {lowPct > 0 && (
          <div
            className="bg-red-400 transition-all duration-300"
            style={{ width: `${lowPct}%` }}
          />
        )}
      </div>
    </div>
  );
}
