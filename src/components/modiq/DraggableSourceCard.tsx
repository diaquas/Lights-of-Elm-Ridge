"use client";

import { memo, useCallback, useMemo } from "react";
import type { ParsedModel } from "@/lib/modiq";
import type { DragItem } from "@/hooks/useDragAndDrop";

interface DraggableSourceCardProps {
  model: ParsedModel;
  isMapped: boolean;
  mappedToName?: string;
  onDragStart: (item: DragItem) => void;
  onDragEnd: () => void;
  getDragDataTransfer: (item: DragItem) => string;
  /** Tap-to-select on mobile */
  isSelected: boolean;
  onTap: (modelName: string) => void;
}

export default memo(function DraggableSourceCard({
  model,
  isMapped,
  mappedToName,
  onDragStart,
  onDragEnd,
  getDragDataTransfer,
  isSelected,
  onTap,
}: DraggableSourceCardProps) {
  // Stable dragItem reference — only changes when model.name changes
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
    if (!isMapped) {
      onTap(model.name);
    }
  }, [isMapped, model.name, onTap]);

  const typeLabel = model.isGroup ? "GRP" : model.type.toUpperCase();

  // Compact single-line card: 40px total (8px padding + 4px margin)
  return (
    <div
      draggable={!isMapped}
      onDragStart={isMapped ? undefined : handleDragStart}
      onDragEnd={isMapped ? undefined : onDragEnd}
      onClick={handleClick}
      className={`flex items-center gap-2 rounded px-2.5 py-2 mb-1 transition-[border-color,transform] duration-150 ${
        isMapped
          ? "opacity-40 cursor-default border border-border/50"
          : isSelected
            ? "border border-accent bg-accent/10 shadow-md cursor-pointer"
            : "border border-border bg-surface hover:border-foreground/30 cursor-grab active:cursor-grabbing active:scale-[1.02] active:shadow-lg"
      }`}
    >
      {/* Drag handle */}
      {!isMapped && (
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

      {/* Model name — flex:1 truncate */}
      <span
        className={`text-[13px] font-medium truncate flex-1 min-w-0 ${
          isMapped ? "text-foreground/40" : "text-foreground/80"
        }`}
      >
        {model.name}
        {isMapped && mappedToName && (
          <span className="text-foreground/30 ml-1">&rarr; {mappedToName}</span>
        )}
      </span>

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
    </div>
  );
});
