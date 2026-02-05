"use client";

import { memo, useCallback, useMemo } from "react";
import type { ParsedModel } from "@/lib/modiq";
import type { DragItem } from "@/hooks/useDragAndDrop";

interface DraggableUserCardProps {
  model: ParsedModel;
  score?: number;
  isAssigned: boolean;
  onDragStart: (item: DragItem) => void;
  onDragEnd: () => void;
  getDragDataTransfer: (item: DragItem) => string;
  onClickAssign?: () => void;
}

export default memo(function DraggableUserCard({
  model,
  score,
  isAssigned,
  onDragStart,
  onDragEnd,
  getDragDataTransfer,
  onClickAssign,
}: DraggableUserCardProps) {
  // In V3, the dragged item stores the user model name in sourceModelName
  // (reusing the DragItem interface — the field name is historical)
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
    if (onClickAssign && !isAssigned) {
      onClickAssign();
    }
  }, [onClickAssign, isAssigned]);

  const typeLabel = model.isGroup ? "GRP" : model.type.toUpperCase();
  const canDrag = !isAssigned;

  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag ? handleDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onClick={handleClick}
      className={`flex items-center gap-2 rounded min-h-[38px] px-2.5 py-1.5 mb-0.5 transition-[border-color,transform] duration-150 ${
        isAssigned
          ? "opacity-40 cursor-default border border-border/50"
          : onClickAssign
            ? "border border-border bg-surface hover:border-accent/40 hover:bg-accent/5 cursor-pointer active:bg-accent/10"
            : "border border-border bg-surface hover:border-foreground/30 hover:bg-white/[0.03] cursor-grab active:cursor-grabbing active:scale-[1.01] active:shadow-[0_4px_16px_rgba(0,0,0,0.4)] active:z-10"
      }`}
    >
      {/* Drag handle */}
      {canDrag && !onClickAssign && (
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
      {canDrag && onClickAssign && (
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
      <span
        className={`text-[13px] font-medium truncate flex-1 min-w-0 ${
          isAssigned ? "text-foreground/40" : "text-foreground/80"
        }`}
      >
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

      {/* Assigned indicator */}
      {isAssigned && (
        <svg
          className="w-3.5 h-3.5 text-green-400/50 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </div>
  );
});
