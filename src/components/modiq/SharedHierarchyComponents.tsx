"use client";

import { useState } from "react";
import { UnlinkIcon, StatusCheck, FxBadge } from "./MetadataBadges";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { STRONG_THRESHOLD } from "@/types/mappingPhases";
import { MODEL_GRID } from "./panelStyles";
import type { ModelMapping } from "@/lib/modiq/matcher";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

// ─── Current Mapping Card (Right Panel — for mapped items) ────────
// Shared across GroupsPhase, SpinnersPhase, and IndividualsPhase.

export function CurrentMappingCard({
  item,
  matchScore,
  matchFactors,
  isNeedsReview: isNeedsReviewProp,
  onApprove,
  onRemoveLink,
}: {
  item: SourceLayerMapping;
  matchScore?: number;
  matchFactors?: ModelMapping["factors"];
  isNeedsReview?: boolean;
  onApprove?: () => void;
  onRemoveLink: (destName: string) => void;
}) {
  if (item.assignedUserModels.length === 0) return null;

  const isNeedsReview =
    isNeedsReviewProp ?? (matchScore != null && matchScore < STRONG_THRESHOLD);

  // Three distinct states:
  //   1. SUGGESTED MATCH — auto-matched, awaiting approval (isNeedsReview)
  //   2. ✓ MAPPED TO    — confirmed (approved, strong, or manual)
  const isSuggested = isNeedsReview;
  const borderColor = isSuggested
    ? "border-amber-500/25 bg-amber-500/5"
    : "border-green-500/25 bg-green-500/5";
  const headerColor = isSuggested ? "text-amber-400" : "text-green-400";
  const labelColor = isSuggested ? "text-amber-400/70" : "text-green-400/70";

  return (
    <div className="px-5 py-3 border-b border-border flex-shrink-0">
      <div className={`rounded-lg border ${borderColor} p-3`}>
        <div className="flex items-center gap-2 mb-2">
          {isSuggested ? (
            /* Auto-match link icon for pending suggestions */
            <svg
              className={`w-3.5 h-3.5 ${headerColor}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          ) : (
            /* Green check for confirmed mappings */
            <svg
              className={`w-3.5 h-3.5 ${headerColor}`}
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
          <span
            className={`text-xs font-semibold ${labelColor} uppercase tracking-wider`}
          >
            {isSuggested ? "Suggested Match" : "Mapped To"}
          </span>
          {matchScore != null && matchScore > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <ConfidenceBadge
                score={matchScore}
                factors={matchFactors}
                size="sm"
              />
              {isSuggested && onApprove && (
                <button
                  type="button"
                  onClick={onApprove}
                  className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
                >
                  Approve
                </button>
              )}
            </div>
          )}
        </div>
        <div className="space-y-1.5 ml-5.5">
          {item.assignedUserModels.map((m) => (
            <div key={m.name} className="flex items-center gap-2 group/dest">
              <span className="text-sm font-semibold text-foreground truncate flex-1">
                {m.name}
              </span>
              <button
                type="button"
                onClick={() => onRemoveLink(m.name)}
                className="w-5 h-5 flex items-center justify-center rounded text-foreground/20 hover:text-amber-400 hover:bg-amber-500/10 transition-colors flex-shrink-0 opacity-0 group-hover/dest:opacity-100"
                aria-label={`Unlink ${m.name}`}
                title={`Unlink ${m.name}`}
              >
                <UnlinkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {item.coveredChildCount > 0 && (
          <p className="text-xs text-teal-400/60 mt-1.5 ml-5.5">
            covers {item.coveredChildCount} children
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Not Mapped Banner (Right Panel — for unmapped items) ────────

export function NotMappedBanner() {
  return (
    <div className="px-5 py-3 border-b border-border flex-shrink-0">
      <div className="flex items-center gap-2">
        <svg
          className="w-3.5 h-3.5 text-foreground/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <span className="text-xs font-semibold text-foreground/30 uppercase tracking-wider">
          Not Mapped
        </span>
      </div>
    </div>
  );
}

// ─── View Mode Pills (segmented toggle: All / Groups / Models) ────────

export type ViewMode = "all" | "groups" | "models";

export function ViewModePills({
  value,
  onChange,
  labels = { all: "All", groups: "Groups", models: "Models" },
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  labels?: { all: string; groups: string; models: string };
}) {
  const modes: ViewMode[] = ["all", "groups", "models"];
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden">
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`px-3 py-1 text-xs font-semibold tracking-wide transition-colors ${
            value === mode
              ? "bg-foreground/10 text-foreground"
              : "bg-transparent text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"
          } ${mode !== "all" ? "border-l border-border" : ""}`}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  );
}

// ─── Filter Pill (color-coded status pill) ────────────────

const PILL_COLORS = {
  blue: {
    active: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    inactive:
      "text-foreground/40 border-border hover:text-foreground/60 hover:bg-foreground/5",
  },
  green: {
    active: "bg-green-500/15 text-green-400 border-green-500/30",
    inactive:
      "text-foreground/40 border-border hover:text-foreground/60 hover:bg-foreground/5",
  },
  amber: {
    active: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    inactive:
      "text-foreground/40 border-border hover:text-foreground/60 hover:bg-foreground/5",
  },
  purple: {
    active: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    inactive:
      "text-foreground/40 border-border hover:text-foreground/60 hover:bg-foreground/5",
  },
} as const;

export function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: keyof typeof PILL_COLORS;
  onClick: () => void;
}) {
  const c = PILL_COLORS[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? c.active : c.inactive}`}
    >
      {label}
    </button>
  );
}

// ─── Ghost Member Row — CSS Grid aligned ─────────────────

export function GhostMemberRow({ name }: { name: string }) {
  return (
    <div
      className="rounded border-l-[3px] border-l-foreground/15 mb-px"
      style={{
        display: "grid",
        gridTemplateColumns: MODEL_GRID,
        alignItems: "center",
        padding: "3px 10px 3px 8px",
        gap: "0 6px",
        minHeight: 26,
        opacity: 0.35,
      }}
    >
      <StatusCheck status="covered" />
      <FxBadge count={0} />
      <span className="text-[12px] text-foreground/40 truncate">{name}</span>
      <span className="text-xs text-foreground/30 italic text-right whitespace-nowrap">
        covered by group
      </span>
      <div style={{ width: 50 }} />
    </div>
  );
}

// ─── Collapsible Member Pills ───────────────────────────

export function CollapsibleMembers({ members }: { members: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (members.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-foreground/40 hover:text-foreground/60 flex items-center gap-1 transition-colors"
      >
        <span>{members.length} members</span>
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {members.map((member) => (
            <span
              key={member}
              className="px-1.5 py-0.5 text-xs bg-foreground/5 text-foreground/40 rounded"
            >
              {member}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
