"use client";

import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

/**
 * Color tiers for effect counts.
 * green: 500+, amber: 50+, gray: 10+, red: <10
 */
export function getEffectColor(count: number) {
  if (count >= 500) return { text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" };
  if (count >= 50) return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
  if (count >= 10) return { text: "text-foreground/50", bg: "bg-foreground/5", border: "border-foreground/10" };
  return { text: "text-red-400/70", bg: "bg-red-500/5", border: "border-red-500/10" };
}

/**
 * Hero effect badge — the dominant visual element on each card.
 * Shows effect count large with "fx" label, color-coded by tier.
 */
export function HeroEffectBadge({ count }: { count: number }) {
  const { text, bg, border } = getEffectColor(count);

  return (
    <div
      className={`flex flex-col items-center justify-center min-w-[42px] px-1.5 py-1 rounded-lg border ${bg} ${border} ${text} flex-shrink-0`}
      title={`${count.toLocaleString()} effects in sequence`}
    >
      <div className="flex items-center gap-0.5">
        <svg className="w-2.5 h-2.5 opacity-70" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-sm font-bold tabular-nums leading-tight">
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      </div>
      <span className="text-[7px] uppercase tracking-wider opacity-50 leading-none mt-0.5">effects</span>
    </div>
  );
}

/**
 * Compact inline effect badge for single-line card layouts.
 * Shows "+N fx" in a color-coded pill.
 */
export function InlineEffectBadge({ count }: { count: number }) {
  const { text, bg, border } = getEffectColor(count);
  const display = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count;

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums border ${bg} ${border} ${text} flex-shrink-0`}
      title={`${count.toLocaleString()} effects in sequence`}
    >
      <svg className="w-2 h-2 opacity-70" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      {display} fx
    </span>
  );
}

/**
 * Compact metadata badges for mapping cards.
 * Shows pixel count, member count, and submodel count (effect count is now the hero badge).
 */
export function MetadataBadges({ item }: { item: SourceLayerMapping }) {
  const px = item.sourceModel.pixelCount;
  const members = item.isGroup ? item.memberNames.length : 0;
  const subs = item.sourceModel.submodels?.length ?? 0;

  if (!px && members === 0 && subs === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {px > 0 && <PixelBadge count={px} />}
      {members > 0 && <MemberBadge count={members} />}
      {!members && subs > 0 && <SubmodelBadge count={subs} />}
    </div>
  );
}

function PixelBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10px] font-medium tabular-nums text-foreground/35 bg-foreground/5"
      title={`${count} pixels`}
    >
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
      {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
    </span>
  );
}

function MemberBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10px] font-medium tabular-nums text-blue-400/60 bg-blue-500/8"
      title={`${count} member models`}
    >
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
      {count}
    </span>
  );
}

function SubmodelBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10px] font-medium tabular-nums text-purple-400/60 bg-purple-500/8"
      title={`${count} submodels`}
    >
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" d="M9 3v12m0 0H5m4 0h4" />
      </svg>
      {count}
    </span>
  );
}

/**
 * Compact effects coverage bar for phase headers.
 * Shows "X / Y effects mapped (Z%)" with a thin progress bar.
 */
export function EffectsCoverageBar({
  mappedEffects,
  totalEffects,
}: {
  mappedEffects: number;
  totalEffects: number;
}) {
  if (totalEffects === 0) return null;

  const pct = Math.round((mappedEffects / totalEffects) * 100);
  const barColor =
    pct >= 90
      ? "bg-green-500"
      : pct >= 50
        ? "bg-amber-500"
        : "bg-foreground/30";

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-foreground/8 rounded-full overflow-hidden max-w-[120px]">
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-foreground/35 tabular-nums whitespace-nowrap">
        {mappedEffects.toLocaleString()} / {totalEffects.toLocaleString()} effects
      </span>
    </div>
  );
}
