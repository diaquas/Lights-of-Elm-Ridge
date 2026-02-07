"use client";

import { memo, useCallback, useMemo, useState } from "react";
import type { ParsedModel } from "@/lib/modiq";
import type { DragItem } from "@/hooks/useDragAndDrop";

interface DraggableUserCardProps {
  model: ParsedModel;
  score?: number;
  onDragStart: (item: DragItem) => void;
  onDragEnd: () => void;
  getDragDataTransfer: (item: DragItem) => string;
  onClickAssign?: () => void;
  /** Source layers this model is assigned to (for count indicator + inline expansion) */
  assignedSources?: Set<string>;
  /** Remove a specific link between this model and a source layer */
  onRemoveLink?: (sourceName: string, destName: string) => void;
}

/** Teal assignment count badge */
function AssignCountBadge({
  count,
  onClick,
}: {
  count: number;
  onClick?: (e: React.MouseEvent) => void;
}) {
  if (count === 0) return null;
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-[9px] px-[5px] text-[11px] font-semibold tabular-nums flex-shrink-0 cursor-pointer transition-all ${
        count === 1
          ? "bg-white/[0.06] text-[#525252] border border-white/[0.08] hover:bg-teal-500/[0.08] hover:border-teal-500/15 hover:text-teal-300"
          : count <= 3
            ? "bg-teal-500/[0.08] text-teal-300 border border-teal-500/15 hover:bg-teal-500/15 hover:border-teal-500/30"
            : "bg-teal-500/[0.12] text-teal-300 border border-teal-500/20 hover:bg-teal-500/15 hover:border-teal-500/30"
      }`}
    >
      {count}
    </span>
  );
}

export default memo(function DraggableUserCard({
  model,
  score,
  onDragStart,
  onDragEnd,
  getDragDataTransfer,
  onClickAssign,
  assignedSources,
  onRemoveLink,
}: DraggableUserCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const assignCount = assignedSources?.size ?? 0;

  // In V3, the dragged item stores the user model name in sourceModelName
  const dragItem = useMemo<DragItem>(
    () => ({ sourceModelName: model.name }),
    [model.name],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", getDragDataTransfer(dragItem));
      e.dataTransfer.effectAllowed = "move";
      onDragStart(dragItem);
    },
    [dragItem, onDragStart, getDragDataTransfer],
  );

  const handleClick = useCallback(() => {
    if (onClickAssign) {
      onClickAssign();
    }
  }, [onClickAssign]);

  const handleBadgeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (assignCount > 0) {
        setIsExpanded((prev) => !prev);
      }
    },
    [assignCount],
  );

  const typeLabel = model.isGroup ? "GRP" : model.type.toUpperCase();

  return (
    <div className="mb-0.5">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        className={`flex items-center gap-2 rounded min-h-[38px] px-2.5 py-1.5 transition-[border-color,transform] duration-150 ${
          onClickAssign
            ? "border border-border bg-surface hover:border-accent/40 hover:bg-accent/5 cursor-pointer active:bg-accent/10"
            : "border border-border bg-surface hover:border-foreground/30 hover:bg-white/[0.03] cursor-grab active:cursor-grabbing active:scale-[1.01] active:shadow-[0_4px_16px_rgba(0,0,0,0.4)] active:z-10"
        }`}
      >
        {/* Drag handle */}
        {!onClickAssign && (
          <span className="text-foreground/20 flex-shrink-0 select-none w-3.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="5" r="1.5" />
              <circle cx="15" cy="5" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="19" r="1.5" />
              <circle cx="15" cy="19" r="1.5" />
            </svg>
          </span>
        )}

        {/* Click-to-assign indicator */}
        {onClickAssign && (
          <span className="text-accent/40 flex-shrink-0 w-3.5">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        )}

        {/* Model name */}
        <span className="text-[13px] font-medium truncate flex-1 min-w-0 text-foreground/80">
          {model.name}
        </span>

        {/* Score badge (when in Best Matches) */}
        {score != null && score > 0 && (
          <span className="text-[11px] text-green-400/70 flex-shrink-0 tabular-nums">
            {(score * 100).toFixed(0)}%
          </span>
        )}

        {/* Type badge */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/40 flex-shrink-0 uppercase tracking-wide">
          {typeLabel}
        </span>

        {/* Pixel count */}
        {!model.isGroup && (
          <span className="text-[11px] text-foreground/30 flex-shrink-0 tabular-nums min-w-[36px] text-right">
            {model.pixelCount}px
          </span>
        )}

        {/* Assignment count indicator */}
        <AssignCountBadge count={assignCount} onClick={handleBadgeClick} />
      </div>

      {/* Inline expansion showing source assignments */}
      {isExpanded && assignedSources && assignedSources.size > 0 && (
        <div className="ml-6 mr-2 mb-1 py-1">
          {Array.from(assignedSources).map((srcName) => (
            <div
              key={srcName}
              className="flex items-center gap-1.5 py-0.5 pl-2 border-l-2 border-foreground/10"
            >
              <span className="text-[11px] text-foreground/40">&rarr;</span>
              <span className="text-[11px] text-foreground/50 truncate flex-1">
                {srcName}
              </span>
              {onRemoveLink && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveLink(srcName, model.name);
                  }}
                  className="w-4 h-4 flex items-center justify-center rounded text-foreground/20 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  aria-label={`Remove link to ${srcName}`}
                  title={`Remove link to ${srcName}`}
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
