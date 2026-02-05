"use client";

import { useCallback } from "react";
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

export default function DraggableSourceCard({
  model,
  isMapped,
  mappedToName,
  onDragStart,
  onDragEnd,
  getDragDataTransfer,
  isSelected,
  onTap,
}: DraggableSourceCardProps) {
  const dragItem: DragItem = { sourceModelName: model.name };

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", getDragDataTransfer(dragItem));
      e.dataTransfer.effectAllowed = "move";
      onDragStart(dragItem);
    },
    [dragItem, onDragStart, getDragDataTransfer],
  );

  const handleDragEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  const handleClick = useCallback(() => {
    if (!isMapped) {
      onTap(model.name);
    }
  }, [isMapped, model.name, onTap]);

  return (
    <div
      draggable={!isMapped}
      onDragStart={isMapped ? undefined : handleDragStart}
      onDragEnd={isMapped ? undefined : handleDragEnd}
      onClick={handleClick}
      className={`group rounded-lg border px-3 py-2 transition-all ${
        isMapped
          ? "border-border/50 opacity-40 cursor-default"
          : isSelected
            ? "border-accent bg-accent/10 shadow-md cursor-pointer"
            : "border-border bg-surface hover:border-foreground/30 hover:shadow-md cursor-grab active:cursor-grabbing"
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        {!isMapped && (
          <span className="text-foreground/20 group-hover:text-foreground/40 flex-shrink-0 select-none">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-sm font-medium truncate ${isMapped ? "text-foreground/40" : "text-foreground/80"}`}
            >
              {model.name}
            </span>
            {!model.isGroup && (
              <span className="text-[11px] text-foreground/30 flex-shrink-0 tabular-nums">
                {model.pixelCount}px
              </span>
            )}
          </div>
          <div className="text-[11px] text-foreground/40 mt-0.5">
            {model.isGroup ? "Group" : model.type}
            {isMapped && mappedToName && (
              <span className="ml-1">
                &rarr; {mappedToName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
