"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { PowerSupplyNodeData } from "@/lib/wireiq/types";

function PowerSupplyNodeComponent({ data }: NodeProps) {
  const d = data as unknown as PowerSupplyNodeData;

  return (
    <div className="rounded-lg border-2 border-yellow-700 bg-yellow-950/90 shadow-md min-w-[180px]">
      {/* Output handle (to controller) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-red-500 !border-red-300"
      />

      {/* Content */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{"\u26A1"}</span>
          <span className="text-sm font-semibold text-white">{d.name}</span>
        </div>
        <div className="flex gap-2 mt-1 text-xs text-white/60">
          <span>{d.voltage}V</span>
          <span>{d.watts}W</span>
          <span>{d.amps}A</span>
        </div>

        {/* Utilization bar */}
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-white/50">{d.loadWatts}W load</span>
            <span
              className={
                d.utilizationPercent > 80
                  ? "text-red-400"
                  : d.utilizationPercent > 60
                    ? "text-yellow-400"
                    : "text-green-400"
              }
            >
              {d.utilizationPercent}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                d.utilizationPercent > 80
                  ? "bg-red-500"
                  : d.utilizationPercent > 60
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${Math.min(d.utilizationPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const PowerSupplyNode = memo(PowerSupplyNodeComponent);
