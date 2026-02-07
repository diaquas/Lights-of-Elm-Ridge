"use client";

import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

/**
 * Compact metadata badges for mapping cards.
 * Shows effect count, pixel count, and member count where available.
 */
export function MetadataBadges({ item }: { item: SourceLayerMapping }) {
  const fx = item.effectCount;
  const px = item.sourceModel.pixelCount;
  const members = item.isGroup ? item.memberNames.length : 0;
  const subs = item.sourceModel.submodels?.length ?? 0;

  // Nothing to show
  if (fx === 0 && !px && members === 0 && subs === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {fx > 0 && <EffectBadge count={fx} />}
      {px > 0 && <PixelBadge count={px} />}
      {members > 0 && <MemberBadge count={members} />}
      {!members && subs > 0 && <SubmodelBadge count={subs} />}
    </div>
  );
}

function EffectBadge({ count }: { count: number }) {
  const color =
    count >= 100
      ? "text-orange-400 bg-orange-500/10"
      : count >= 10
        ? "text-amber-400 bg-amber-500/10"
        : "text-foreground/40 bg-foreground/5";

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10px] font-medium tabular-nums ${color}`}
      title={`${count} effects in sequence`}
    >
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      {count}
    </span>
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
