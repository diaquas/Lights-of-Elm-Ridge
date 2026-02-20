"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { ControllerNodeData } from "@/lib/wireiq/types";

function ControllerNodeComponent({ data }: NodeProps) {
  const d = data as unknown as ControllerNodeData;

  const utilizationColor =
    d.utilizationPercent > 90
      ? "text-red-400"
      : d.utilizationPercent > 75
        ? "text-yellow-400"
        : "text-green-400";

  return (
    <div
      className={`rounded-lg border-2 shadow-lg min-w-[280px] ${
        d.isReceiver
          ? "border-indigo-600 bg-indigo-950/90"
          : "border-slate-600 bg-slate-900/90"
      }`}
    >
      {/* Ethernet input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-blue-300"
      />

      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xs">
            {d.isReceiver ? "\u{1F4E1}" : "\u{1F5A5}"}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {d.vendor} {d.model}
            </div>
            <div className="text-xs text-white/50 truncate">{d.name}</div>
          </div>
        </div>
        <div className="flex gap-2 mt-1 text-xs text-white/60">
          {d.ip && <span>{d.ip}</span>}
          {d.protocol && (
            <span className="px-1 rounded bg-white/10">{d.protocol}</span>
          )}
          {d.dipSwitch && <span>DIP: {d.dipSwitch}</span>}
        </div>
      </div>

      {/* Port list */}
      <div className="px-2 py-1 max-h-[300px] overflow-y-auto">
        {d.ports.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {d.ports.map((port) => {
              const portColor = port.isOverloaded
                ? "text-red-400"
                : port.utilizationPercent > 75
                  ? "text-yellow-400"
                  : "text-green-400";
              return (
                <div
                  key={port.port}
                  className="flex items-center gap-1 text-xs relative"
                >
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`port-${port.port}`}
                    className="!w-2 !h-2 !bg-amber-500 !border-amber-300 !right-[-8px]"
                    style={{ top: "50%" }}
                  />
                  <span className="text-white/40 w-6 text-right">
                    P{port.port}
                  </span>
                  <span className={`${portColor} font-mono`}>
                    {port.totalPixels}
                  </span>
                  <span className="text-white/30">px</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-white/30 py-1 text-center">
            No active ports
          </div>
        )}
      </div>

      {/* Footer — utilization bar */}
      <div className="px-3 py-2 border-t border-white/10">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-white/50">
            {d.totalPixels.toLocaleString()} /{" "}
            {d.totalCapacity.toLocaleString()} px
          </span>
          <span className={utilizationColor}>{d.utilizationPercent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              d.utilizationPercent > 90
                ? "bg-red-500"
                : d.utilizationPercent > 75
                  ? "bg-yellow-500"
                  : "bg-green-500"
            }`}
            style={{ width: `${Math.min(d.utilizationPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export const ControllerNode = memo(ControllerNodeComponent);
