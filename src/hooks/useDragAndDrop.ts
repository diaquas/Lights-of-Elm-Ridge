"use client";

import { useState, useCallback, useRef } from "react";

export interface DragItem {
  sourceModelName: string;
  fromMappedDest?: string; // set when dragging from a mapped row (for swap)
}

export interface DropTarget {
  destModelName: string;
  isMapped: boolean;
  currentSourceName?: string;
}

export interface DragState {
  isDragging: boolean;
  dragItem: DragItem | null;
  activeDropTarget: string | null; // destModelName currently hovered
}

export interface DragAndDropHandlers {
  state: DragState;
  handleDragStart: (item: DragItem) => void;
  handleDragEnd: () => void;
  handleDragEnter: (destModelName: string) => void;
  handleDragLeave: (destModelName: string) => void;
  handleDrop: (target: DropTarget) => DragItem | null;
  getDragDataTransfer: (item: DragItem) => string;
  parseDragDataTransfer: (data: string) => DragItem | null;
}

export function useDragAndDrop(): DragAndDropHandlers {
  const [state, setState] = useState<DragState>({
    isDragging: false,
    dragItem: null,
    activeDropTarget: null,
  });

  // Use ref for the current drag item to avoid stale closures
  const dragItemRef = useRef<DragItem | null>(null);

  const handleDragStart = useCallback((item: DragItem) => {
    dragItemRef.current = item;
    setState({
      isDragging: true,
      dragItem: item,
      activeDropTarget: null,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    dragItemRef.current = null;
    setState({
      isDragging: false,
      dragItem: null,
      activeDropTarget: null,
    });
  }, []);

  const handleDragEnter = useCallback((destModelName: string) => {
    setState((prev) => ({
      ...prev,
      activeDropTarget: destModelName,
    }));
  }, []);

  const handleDragLeave = useCallback((destModelName: string) => {
    setState((prev) => {
      if (prev.activeDropTarget === destModelName) {
        return { ...prev, activeDropTarget: null };
      }
      return prev;
    });
  }, []);

  const handleDrop = useCallback((target: DropTarget): DragItem | null => {
    const item = dragItemRef.current;
    dragItemRef.current = null;
    setState({
      isDragging: false,
      dragItem: null,
      activeDropTarget: null,
    });
    return item;
  }, []);

  const getDragDataTransfer = useCallback((item: DragItem): string => {
    return JSON.stringify(item);
  }, []);

  const parseDragDataTransfer = useCallback(
    (data: string): DragItem | null => {
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed.sourceModelName === "string") {
          return parsed as DragItem;
        }
        return null;
      } catch {
        return null;
      }
    },
    [],
  );

  return {
    state,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    getDragDataTransfer,
    parseDragDataTransfer,
  };
}
