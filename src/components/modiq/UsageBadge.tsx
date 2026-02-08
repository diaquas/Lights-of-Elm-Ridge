"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface UsageBadgeProps {
  /** Number of source items using this dest model */
  count: number;
  /** Names of source items mapped to this dest model */
  mappedSourceNames: string[];
  /** Effect counts per source name (for display in popover) */
  sourceEffectCounts?: Map<string, number>;
  /** Currently selected source item name (for "map instead" action) */
  currentSourceSelection?: string;
  /** Remove a specific source→dest mapping */
  onRemoveLink?: (sourceName: string) => void;
  /** Map current selection to this dest model */
  onAccept?: () => void;
}

export function UsageBadge({
  count,
  mappedSourceNames,
  sourceEffectCounts,
  currentSourceSelection,
  onRemoveLink,
  onAccept,
}: UsageBadgeProps) {
  const [open, setOpen] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  if (count === 0) return null;

  return (
    <div className="relative inline-block" ref={badgeRef}>
      <button
        type="button"
        className={`
          inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded text-[9px] font-semibold flex-shrink-0 cursor-pointer
          ${
            count >= 2
              ? "bg-red-500/15 text-red-400 border border-red-500/30"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
          }
        `}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        title={`${count} mapping${count !== 1 ? "s" : ""} — click to manage`}
      >
        {count}
      </button>

      {open && (
        <UsagePopover
          anchorRef={badgeRef}
          mappedSourceNames={mappedSourceNames}
          sourceEffectCounts={sourceEffectCounts}
          currentSourceSelection={currentSourceSelection}
          onRemoveLink={onRemoveLink}
          onAccept={onAccept}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Usage Popover (portaled, click-triggered) ──────────
//
// Popovers remain open until dismissed, unlike tooltips which
// disappear on mouse leave. This allows reliable interaction
// with de-map buttons inside the popover.

function UsagePopover({
  anchorRef,
  mappedSourceNames,
  sourceEffectCounts,
  currentSourceSelection,
  onRemoveLink,
  onAccept,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  mappedSourceNames: string[];
  sourceEffectCounts?: Map<string, number>;
  currentSourceSelection?: string;
  onRemoveLink?: (sourceName: string) => void;
  onAccept?: () => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position the popover relative to the badge
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const popoverWidth = 280;

    // Position to the left of the badge
    let left = rect.left - popoverWidth - 8;
    // If it would go off-screen left, flip to the right
    if (left < 8) {
      left = rect.right + 8;
    }
    // Clamp right edge
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }

    // Vertically center on the badge
    const top = rect.top + rect.height / 2;

    setPos({ top, left });
  }, [anchorRef]);

  // After render, adjust vertical position to center on the badge
  useEffect(() => {
    if (!pos || !popoverRef.current) return;
    const popoverHeight = popoverRef.current.offsetHeight;
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();

    let top = rect.top + rect.height / 2 - popoverHeight / 2;
    // Clamp to viewport
    if (top < 4) top = 4;
    if (top + popoverHeight > window.innerHeight - 4) {
      top = window.innerHeight - popoverHeight - 4;
    }
    setPos((prev) => (prev && prev.top !== top ? { ...prev, top } : prev));
  }, [pos, anchorRef]);

  // Click-outside to dismiss
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    },
    [anchorRef, onClose],
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  // Escape key to dismiss
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Show "Map to X instead" if current selection is NOT already in the mapped list
  const showMapInstead =
    currentSourceSelection &&
    onAccept &&
    !mappedSourceNames.includes(currentSourceSelection);

  const popover = (
    <div
      ref={popoverRef}
      className="fixed w-[280px]"
      style={{
        zIndex: 9999,
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
      }}
    >
      <div className="bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-border bg-foreground/[0.02]">
          <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide">
            Mapped To ({mappedSourceNames.length})
          </span>
        </div>

        {/* Mapped items list */}
        <div className="px-3 py-2 space-y-1">
          {mappedSourceNames.map((sourceName) => {
            const effectCount = sourceEffectCounts?.get(sourceName);
            return (
              <div
                key={sourceName}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-foreground/[0.03] group"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-medium text-foreground/70 truncate block">
                    {sourceName}
                  </span>
                  {effectCount !== undefined && effectCount > 0 && (
                    <span className="text-[10px] text-foreground/30">
                      {effectCount} effects
                    </span>
                  )}
                </div>

                {/* De-map button */}
                {onRemoveLink && (
                  <button
                    type="button"
                    className="p-1 rounded-md hover:bg-red-500/15 text-foreground/30 hover:text-red-400 transition-all flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveLink(sourceName);
                    }}
                    title={`Remove mapping from ${sourceName}`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
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
                )}
              </div>
            );
          })}
        </div>

        {/* "Map to X instead" action */}
        {showMapInstead && (
          <div className="px-3 py-2.5 border-t border-border">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAccept?.();
                onClose();
              }}
              className="w-full py-1.5 px-3 text-[11px] font-medium text-accent bg-accent/10 hover:bg-accent/20 border border-accent/25 rounded-lg transition-colors text-center"
            >
              Map to &ldquo;{currentSourceSelection}&rdquo;
              {mappedSourceNames.length === 1 ? " instead" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(popover, document.body);
}
