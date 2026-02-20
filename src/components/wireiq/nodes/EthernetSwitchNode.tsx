"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { EthernetSwitchNodeData } from "@/lib/wireiq/types";

function EthernetSwitchNodeComponent({ data }: NodeProps) {
  const d = data as unknown as EthernetSwitchNodeData;

  return (
    <div className="rounded-lg border-2 border-blue-600 bg-blue-950/90 shadow-md min-w-[240px]">
      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{"\u{1F500}"}</span>
          <span className="text-sm font-semibold text-white">
            Network Switch
          </span>
          <span className="text-xs text-white/40">{d.portCount}-port</span>
        </div>

        {/* Port indicators */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {d.connections.map((name, i) => (
            <div key={name} className="relative">
              <Handle
                type="source"
                position={Position.Bottom}
                id={`sw-${i}`}
                className="!w-2 !h-2 !bg-blue-400 !border-blue-200"
                style={{ position: "relative", transform: "none" }}
              />
              <span className="text-[10px] text-white/40 block text-center mt-0.5">
                {name.length > 8 ? name.slice(0, 8) + "..." : name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const EthernetSwitchNode = memo(EthernetSwitchNodeComponent);
