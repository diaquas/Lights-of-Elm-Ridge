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

const IDLE_STATE: DragState = {
  isDragging: false,
  dragItem: null,
  activeDropTarget: null,
};

export function useDragAndDrop(): DragAndDropHandlers {
  const [state, setState] = useState<DragState>(IDLE_STATE);

  // Use ref for the current drag item to avoid stale closures
  const dragItemRef = useRef<DragItem | null>(null);
  // Track current drop target in ref to avoid unnecessary state updates
  const activeTargetRef = useRef<string | null>(null);
  // Throttle dragenter updates with rAF
  const rafRef = useRef<number | null>(null);

  const handleDragStart = useCallback((item: DragItem) => {
    dragItemRef.current = item;
    activeTargetRef.current = null;
    setState({
      isDragging: true,
      dragItem: item,
      activeDropTarget: null,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    dragItemRef.current = null;
    activeTargetRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setState(IDLE_STATE);
  }, []);

  const handleDragEnter = useCallback((destModelName: string) => {
    // Skip if already targeting this element
    if (activeTargetRef.current === destModelName) return;
    activeTargetRef.current = destModelName;

    // Batch with rAF to avoid rapid state updates during drag
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setState((prev) => {
        if (prev.activeDropTarget === destModelName) return prev;
        return { ...prev, activeDropTarget: destModelName };
      });
    });
  }, []);

  const handleDragLeave = useCallback((destModelName: string) => {
    if (activeTargetRef.current !== destModelName) return;
    activeTargetRef.current = null;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setState((prev) => {
        if (prev.activeDropTarget !== destModelName) return prev;
        return { ...prev, activeDropTarget: null };
      });
    });
  }, []);

  const handleDrop = useCallback((target: DropTarget): DragItem | null => {
    const item = dragItemRef.current;
    dragItemRef.current = null;
    activeTargetRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setState(IDLE_STATE);
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
