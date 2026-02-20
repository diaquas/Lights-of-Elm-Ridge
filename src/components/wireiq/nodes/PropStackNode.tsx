"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { PropStackNodeData } from "@/lib/wireiq/types";

function PropStackNodeComponent({ data }: NodeProps) {
  const d = data as unknown as PropStackNodeData;

  const portColor =
    d.utilizationPercent > 100
      ? "border-red-500"
      : d.utilizationPercent > 75
        ? "border-yellow-500"
        : "border-zinc-600";

  return (
    <div
      className={`rounded-lg border-2 ${portColor} bg-zinc-900/90 shadow-md min-w-[180px]`}
    >
      {/* Input handle (from controller port) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-amber-300"
      />

      {/* Header */}
      <div className="px-3 py-1.5 border-b border-white/10">
        <div className="text-xs text-white/50">
          Port {d.port} — {d.controllerName}
        </div>
      </div>

      {/* Model list (chain order) */}
      <div className="px-3 py-1.5 space-y-0.5">
        {d.models.map((model, i) => (
          <div key={model.name} className="flex items-center gap-2 text-xs">
            <span className="text-white/30 w-3 text-right">{i + 1}.</span>
            <span className="text-white/90 flex-1 truncate">{model.name}</span>
            <span className="text-white/50 font-mono">
              {model.pixelCount}px
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-white/10 flex justify-between text-xs">
        <span className="text-white/50">
          {d.totalPixels} / {d.maxPixels} px
        </span>
        <span
          className={
            d.utilizationPercent > 100
              ? "text-red-400"
              : d.utilizationPercent > 75
                ? "text-yellow-400"
                : "text-green-400"
          }
        >
          {d.utilizationPercent}%
        </span>
      </div>
    </div>
  );
}

export const PropStackNode = memo(PropStackNodeComponent);
