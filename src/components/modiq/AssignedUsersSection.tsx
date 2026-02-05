"use client";

import { useState, memo } from "react";
import type { ParsedModel } from "@/lib/modiq";
import type { DragItem } from "@/hooks/useDragAndDrop";
import DraggableUserCard from "./DraggableUserCard";

interface AssignedUsersSectionProps {
  users: ParsedModel[];
  onDragStart: (item: DragItem) => void;
  onDragEnd: () => void;
  getDragDataTransfer: (item: DragItem) => string;
}

export default memo(function AssignedUsersSection({
  users,
  onDragStart,
  onDragEnd,
  getDragDataTransfer,
}: AssignedUsersSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-foreground/30 bg-surface-light hover:bg-surface-light/80 sticky top-0 z-10 transition-colors"
      >
        <span>Already Assigned ({users.length})</span>
        <svg
          className={`w-3 h-3 text-foreground/30 transition-transform ml-auto ${isOpen ? "rotate-180" : ""}`}
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
      {isOpen && (
        <div className="px-2 py-1">
          {users.map((m) => (
            <DraggableUserCard
              key={m.name}
              model={m}
              isAssigned={true}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              getDragDataTransfer={getDragDataTransfer}
            />
          ))}
        </div>
      )}
    </div>
  );
});
