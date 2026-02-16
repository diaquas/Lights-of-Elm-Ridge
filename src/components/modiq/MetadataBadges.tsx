"use client";

import { useState } from "react";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";
import type { AutoMatchStats } from "@/contexts/MappingPhaseContext";
import type { ModelMapping } from "@/lib/modiq/matcher";
import { ConfidenceBadge } from "./ConfidenceBadge";

/**
 * Color tiers for effect counts.
 * green: 500+, amber: 50+, gray: 10+, red: <10
 */
export function getEffectColor(count: number) {
  if (count >= 500)
    return {
      text: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    };
  if (count >= 50)
    return {
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    };
  if (count >= 10)
    return {
      text: "text-foreground/50",
      bg: "bg-foreground/5",
      border: "border-foreground/10",
    };
  return {
    text: "text-red-400/70",
    bg: "bg-red-500/5",
    border: "border-red-500/10",
  };
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
        <svg
          className="w-2.5 h-2.5 opacity-70"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-sm font-bold tabular-nums leading-tight">
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      </div>
      <span className="text-[7px] uppercase tracking-wider opacity-50 leading-none mt-0.5">
        effects
      </span>
    </div>
  );
}

/**
 * Compact inline effect badge for single-line card layouts.
 * Shows "N fx" in a color-coded pill.
 */
export function InlineEffectBadge({ count }: { count: number }) {
  const { text, bg, border } = getEffectColor(count);
  const display = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count;

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums border ${bg} ${border} ${text} flex-shrink-0`}
      title={`${count.toLocaleString()} effects in sequence`}
    >
      <svg
        className="w-2 h-2 opacity-70"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
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
      <svg
        className="w-2.5 h-2.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
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
      <svg
        className="w-2.5 h-2.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"
        />
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
      <svg
        className="w-2.5 h-2.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
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
        {mappedEffects.toLocaleString()} / {totalEffects.toLocaleString()}{" "}
        effects
      </span>
    </div>
  );
}

/**
 * Link2 SVG icon — used inline on auto-matched items to indicate origin.
 * Green 14px icon with tooltip showing "Auto-matched".
 */
export function Link2Badge() {
  return (
    <span title="Auto-matched" className="inline-flex flex-shrink-0">
      <svg
        className="w-3.5 h-3.5 text-green-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 17H7A5 5 0 017 7h2" />
        <path d="M15 7h2a5 5 0 010 10h-2" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    </span>
  );
}

/**
 * Unlink SVG icon — used on mapped items to remove mapping
 * without skipping. Based on Lucide `Unlink2` icon (two separated arcs).
 */
export function UnlinkIcon({
  className = "w-3.5 h-3.5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 7h2a5 5 0 0 1 0 10h-2m-6 0H7A5 5 0 0 1 7 7h2" />
    </svg>
  );
}

/**
 * Auto-match summary banner for the top of Groups & Models and Submodels phases.
 * Shows the total auto-matches, split into strong/review counts.
 * Dismissible; hidden if zero auto-matches in this phase.
 */
export function AutoMatchBanner({
  stats,
  phaseAutoCount,
  onAcceptAllStrong,
  onApproveAllReview,
  bannerFilter,
  onFilterStrong,
  onFilterReview,
  onClearFilter,
}: {
  stats: AutoMatchStats;
  /** Number of auto-matched items visible in THIS phase (not global total) */
  phaseAutoCount: number;
  onAcceptAllStrong?: () => void;
  /** Approve all items that need review */
  onApproveAllReview?: () => void;
  /** Currently active banner filter (if any) */
  bannerFilter?: "auto-strong" | "auto-review" | null;
  /** Click handler for strong count pill */
  onFilterStrong?: () => void;
  /** Click handler for review count pill */
  onFilterReview?: () => void;
  /** Clear banner filter */
  onClearFilter?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || phaseAutoCount === 0) return null;

  // If banner filter is active, show the "Showing" state instead
  if (bannerFilter) {
    const label =
      bannerFilter === "auto-review"
        ? `${stats.reviewCount} needs review`
        : `${stats.strongCount} strong matches`;
    return (
      <div
        className={`mx-4 mt-2 mb-1 px-4 py-2 rounded-lg border flex items-center gap-3 flex-shrink-0 ${
          bannerFilter === "auto-review"
            ? "border-amber-500/20 bg-amber-500/5"
            : "border-green-500/20 bg-green-500/5"
        }`}
      >
        <Link2Badge />
        <span className="text-[12px] font-semibold text-foreground/80">
          Showing: {label}
        </span>
        {bannerFilter === "auto-review" && stats.reviewCount > 0 && (
          <span className="text-[11px] text-foreground/40">
            Review &amp; approve these before continuing
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {bannerFilter === "auto-review" &&
            stats.reviewCount > 0 &&
            onApproveAllReview && (
              <button
                type="button"
                onClick={onApproveAllReview}
                className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
              >
                Approve All ({stats.reviewCount})
              </button>
            )}
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-[11px] font-medium text-accent/70 hover:text-accent transition-colors"
            >
              {bannerFilter === "auto-review"
                ? "Skip review, show all"
                : "Clear filter"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-2 mb-1 px-4 py-2.5 rounded-lg border border-green-500/20 bg-green-500/5 flex items-center gap-3 flex-shrink-0">
      <Link2Badge />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-[12px] font-semibold text-foreground/80">
          {phaseAutoCount} auto-matched
        </span>
        {stats.strongCount > 0 && (
          <button
            type="button"
            onClick={onFilterStrong}
            className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400/80 hover:bg-green-500/20 transition-colors tabular-nums"
          >
            {stats.strongCount} strong
          </button>
        )}
        {stats.reviewCount > 0 && (
          <button
            type="button"
            onClick={onFilterReview}
            className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 hover:bg-amber-500/20 transition-colors tabular-nums"
          >
            {stats.reviewCount} needs review
          </button>
        )}
      </div>
      {onAcceptAllStrong && stats.strongCount > 0 && (
        <button
          type="button"
          onClick={onAcceptAllStrong}
          className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors flex-shrink-0"
        >
          Accept All Strong ({stats.strongCount})
        </button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 text-foreground/20 hover:text-foreground/50 transition-colors flex-shrink-0"
        title="Dismiss"
      >
        <svg
          className="w-3 h-3"
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
  );
}

// ─── CSS Grid Card Components ────────────────────────────

/**
 * Status checkbox for the first grid column (18px).
 * Visual state varies by mapping status; clickable only for needsReview/weak.
 */
export type StatusCheckStatus =
  | "approved"
  | "strong"
  | "manual"
  | "needsReview"
  | "weak"
  | "unmapped"
  | "covered";

const STATUS_CONFIGS: Record<
  StatusCheckStatus,
  {
    border: string;
    bg: string;
    checkColor: string;
    opacity: number;
    hasCheck: boolean;
  }
> = {
  approved: {
    border: "border-green-400",
    bg: "bg-green-400",
    checkColor: "text-white",
    opacity: 1,
    hasCheck: true,
  },
  strong: {
    border: "border-green-400",
    bg: "bg-green-400",
    checkColor: "text-white",
    opacity: 1,
    hasCheck: true,
  },
  manual: {
    border: "border-green-400",
    bg: "bg-green-400",
    checkColor: "text-white",
    opacity: 1,
    hasCheck: true,
  },
  needsReview: {
    border: "border-amber-400",
    bg: "bg-transparent",
    checkColor: "text-amber-400",
    opacity: 0.5,
    hasCheck: true,
  },
  weak: {
    border: "border-red-400",
    bg: "bg-transparent",
    checkColor: "text-red-400",
    opacity: 0.35,
    hasCheck: true,
  },
  unmapped: {
    border: "border-blue-400",
    bg: "bg-transparent",
    checkColor: "",
    opacity: 0.3,
    hasCheck: false,
  },
  covered: {
    border: "border-foreground/20",
    bg: "bg-foreground/20",
    checkColor: "text-foreground/40",
    opacity: 0.25,
    hasCheck: true,
  },
};

export function StatusCheck({
  status,
  onClick,
}: {
  status: StatusCheckStatus;
  onClick?: () => void;
}) {
  const c = STATUS_CONFIGS[status];
  const clickable = status === "needsReview" || status === "weak";
  const title =
    status === "approved" || status === "strong" || status === "manual"
      ? "Mapped"
      : clickable
        ? "Click to approve"
        : status === "unmapped"
          ? "Unmapped"
          : "Covered by group";

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      title={title}
      className={`w-[18px] h-[18px] rounded border-2 ${c.border} ${c.bg} flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
        clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"
      }`}
      style={{ opacity: c.opacity }}
    >
      {c.hasCheck && (
        <svg
          className={`w-2.5 h-2.5 ${c.checkColor}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

/**
 * Fixed-width FX badge (always 42px) for the grid fx column.
 * Shows "N fx" in monospace; 5+ digit counts truncate with tooltip.
 */
export function FxBadge({ count }: { count: number }) {
  const display = count > 9999 ? "9.9k" : String(count);
  const hasEffects = count > 0;

  return (
    <span
      className={`inline-flex items-center justify-center w-[42px] text-[10px] font-semibold py-0.5 rounded font-mono tabular-nums flex-shrink-0 text-center leading-none ${
        hasEffects
          ? "bg-purple-500/15 text-purple-300"
          : "bg-foreground/[0.06] text-foreground/20"
      }`}
      title={count > 9999 ? `${count.toLocaleString()} fx` : undefined}
    >
      {display} fx
    </span>
  );
}

/**
 * Fixed-width type badge (always 42px) for the grid badge column.
 * Color = hierarchy type identity only; never reflects mapping status.
 */
export function TypeBadge({ type }: { type: "SUPER" | "GRP" | "SUB" }) {
  const colors = {
    SUPER: "bg-purple-500/20 text-purple-400",
    GRP: "bg-blue-500/20 text-blue-400",
    SUB: "bg-teal-500/20 text-teal-400",
  };

  return (
    <span
      className={`inline-flex items-center justify-center w-[42px] text-[9px] font-bold tracking-wider py-0.5 rounded font-mono uppercase flex-shrink-0 text-center leading-none ${colors[type]}`}
    >
      {type}
    </span>
  );
}

/**
 * Compact fraction badge showing resolved/total for group cards.
 * Color-coded: green (complete), yellow (partial), blue (empty).
 */
export function FractionBadge({
  resolved,
  total,
  tooltip,
}: {
  resolved: number;
  total: number;
  tooltip?: string;
}) {
  if (total === 0) return null;

  const ratio = total > 0 ? resolved / total : 0;

  const bg =
    ratio >= 1
      ? "rgba(74, 222, 128, 0.15)"
      : ratio > 0
        ? "rgba(251, 191, 36, 0.15)"
        : "rgba(96, 165, 250, 0.15)";
  const color =
    ratio >= 1
      ? "rgb(74, 222, 128)"
      : ratio > 0
        ? "rgb(251, 191, 36)"
        : "rgb(96, 165, 250)";

  const defaultTooltip = `${resolved} resolved · ${total - resolved} need attention · ${total} total`;

  return (
    <span
      title={tooltip ?? defaultTooltip}
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "1px 6px",
        borderRadius: 3,
        background: bg,
        color: color,
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {resolved}/{total}
    </span>
  );
}

/**
 * Destination pill — shows "→ NAME" with auto-match icon and confidence badge.
 * Right-aligned in the destination grid column.
 */
export function DestinationPill({
  name,
  confidence,
  autoMatched = false,
  matchScore,
  matchFactors,
}: {
  name: string;
  confidence?: number;
  autoMatched?: boolean;
  /** Raw 0-1 score for hover tooltip (optional) */
  matchScore?: number;
  /** Factor breakdown for hover tooltip (optional) */
  matchFactors?: ModelMapping["factors"];
}) {
  const color =
    confidence != null
      ? confidence >= 60
        ? "text-green-400"
        : confidence >= 40
          ? "text-amber-400"
          : "text-red-400"
      : "text-green-400";

  return (
    <div className="flex items-center gap-1 min-w-0">
      {autoMatched && (
        <svg
          className={`w-2.5 h-2.5 flex-shrink-0 ${color}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 17H7A5 5 0 017 7h2" />
          <path d="M15 7h2a5 5 0 010 10h-2" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      )}
      <span
        className={`text-[12px] font-medium truncate ${color}`}
        title={name}
      >
        &rarr; {name}
      </span>
      {confidence != null && matchScore != null && matchFactors ? (
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <ConfidenceBadge
            score={matchScore}
            factors={matchFactors}
            size="sm"
          />
        </div>
      ) : confidence != null ? (
        <span
          className={`text-[10px] font-semibold font-mono tabular-nums px-1 py-px rounded flex-shrink-0 ${
            confidence >= 60
              ? "bg-green-900/40 text-green-400"
              : confidence >= 40
                ? "bg-amber-900/40 text-amber-400"
                : "bg-red-900/40 text-red-400"
          }`}
        >
          {confidence}%
        </span>
      ) : null}
    </div>
  );
}
