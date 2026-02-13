"use client";

import { useState } from "react";
import { UnlinkIcon } from "./MetadataBadges";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { STRONG_THRESHOLD } from "@/types/mappingPhases";
import type { ModelMapping } from "@/lib/modiq/matcher";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

// ─── Current Mapping Card (Right Panel — for mapped items) ────────
// Shared across GroupsPhase, SpinnersPhase, and IndividualsPhase.

export function CurrentMappingCard({
  item,
  matchScore,
  matchFactors,
  onRemoveLink,
}: {
  item: SourceLayerMapping;
  matchScore?: number;
  matchFactors?: ModelMapping["factors"];
  onRemoveLink: (destName: string) => void;
}) {
  if (item.assignedUserModels.length === 0) return null;

  const isNeedsReview = matchScore != null && matchScore < STRONG_THRESHOLD;
  const borderColor = isNeedsReview
    ? "border-amber-500/25 bg-amber-500/5"
    : "border-green-500/25 bg-green-500/5";
  const headerColor = isNeedsReview ? "text-amber-400" : "text-green-400";
  const labelColor = isNeedsReview ? "text-amber-400/70" : "text-green-400/70";

  return (
    <div className="px-5 py-3 border-b border-border flex-shrink-0">
      <div className={`rounded-lg border ${borderColor} p-3`}>
        <div className="flex items-center gap-2 mb-2">
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
          <span
            className={`text-[10px] font-semibold ${labelColor} uppercase tracking-wider`}
          >
            Currently Mapped To
          </span>
          {matchScore != null && matchScore > 0 && (
            <div className="ml-auto">
              <ConfidenceBadge
                score={matchScore}
                factors={matchFactors}
                size="sm"
              />
            </div>
          )}
        </div>
        <div className="space-y-1.5 ml-5.5">
          {item.assignedUserModels.map((m) => (
            <div key={m.name} className="flex items-center gap-2 group/dest">
              <span className="text-[13px] font-semibold text-foreground truncate flex-1">
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
          <p className="text-[11px] text-teal-400/60 mt-1.5 ml-5.5">
            covers {item.coveredChildCount} children
          </p>
        )}
      </div>
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
      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${active ? c.active : c.inactive}`}
    >
      {label}
    </button>
  );
}

// ─── Ghost Member Row (0-effect members shown for structural clarity) ────────

export function GhostMemberRow({ name }: { name: string }) {
  return (
    <div className="w-full px-3 py-1 rounded-lg border-l-[3px] border-l-foreground/10 bg-foreground/[0.01] border border-border/30 opacity-40">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] text-foreground/25 tabular-nums flex-shrink-0">
          0 fx
        </span>
        <span className="text-[11px] text-foreground/30 truncate flex-shrink min-w-0">
          {name}
        </span>
        <span className="ml-auto text-[9px] text-foreground/20 flex-shrink-0">
          covered by group
        </span>
      </div>
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
        className="text-[11px] text-foreground/40 hover:text-foreground/60 flex items-center gap-1 transition-colors"
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
              className="px-1.5 py-0.5 text-[10px] bg-foreground/5 text-foreground/40 rounded"
            >
              {member}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
