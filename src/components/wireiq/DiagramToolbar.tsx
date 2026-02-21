"use client";

import { useReactFlow } from "@xyflow/react";
import type { DiagramViewMode } from "@/lib/wireiq/types";
import { VIEW_MODE_LABELS } from "@/lib/wireiq/types";

interface DiagramToolbarProps {
  viewMode: DiagramViewMode;
  onViewModeChange: (mode: DiagramViewMode) => void;
  onResetLayout: () => void;
}

const VIEW_MODES: DiagramViewMode[] = ["full", "network", "wiring", "power"];

export function DiagramToolbar({
  viewMode,
  onViewModeChange,
  onResetLayout,
}: DiagramToolbarProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  return (
    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-1.5">
      {/* View mode tabs */}
      <div className="flex gap-0.5 bg-white/5 rounded-md p-0.5">
        {VIEW_MODES.map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              viewMode === mode
                ? "bg-accent text-white"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {VIEW_MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-white/10" />

      {/* Zoom controls */}
      <button
        onClick={() => zoomIn()}
        className="p-1.5 text-white/50 hover:text-white/80 transition-colors"
        title="Zoom In"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
        </svg>
      </button>
      <button
        onClick={() => zoomOut()}
        className="p-1.5 text-white/50 hover:text-white/80 transition-colors"
        title="Zoom Out"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35M8 11h6" />
        </svg>
      </button>
      <button
        onClick={() => fitView({ padding: 0.15 })}
        className="p-1.5 text-white/50 hover:text-white/80 transition-colors"
        title="Fit to View (F)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </button>

      <div className="w-px h-5 bg-white/10" />

      <button
        onClick={onResetLayout}
        className="px-2.5 py-1 text-xs text-white/50 hover:text-white/80 transition-colors"
        title="Re-run auto layout"
      >
        Reset Layout
      </button>
    </div>
  );
}
