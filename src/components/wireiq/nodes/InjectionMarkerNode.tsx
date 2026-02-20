"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { InjectionMarkerNodeData } from "@/lib/wireiq/types";

function InjectionMarkerNodeComponent({ data }: NodeProps) {
  const d = data as unknown as InjectionMarkerNodeData;

  return (
    <div className="rounded-md border border-orange-500/60 bg-orange-950/80 shadow-sm min-w-[160px]">
      {/* Source handle (connects to prop stack) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-orange-500 !border-orange-300"
      />

      <div className="px-2 py-1.5">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-orange-400">{"\u25C6"}</span>
          <span className="text-white/80 font-medium">Inject {d.voltage}V</span>
          <span className="text-white/40">@ px {d.pixelIndex}</span>
        </div>
        <div className="text-[10px] text-white/40 mt-0.5 truncate">
          {d.modelName} — Fuse: {d.fuseAmps}A
        </div>
      </div>
    </div>
  );
}

export const InjectionMarkerNode = memo(InjectionMarkerNodeComponent);
