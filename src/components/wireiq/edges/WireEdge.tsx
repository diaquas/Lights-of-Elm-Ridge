"use client";

import { memo } from "react";
import { BaseEdge, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import type { WireIQEdgeData, WireType } from "@/lib/wireiq/types";
import { WIRE_COLORS, WIRE_STYLES } from "@/lib/wireiq/types";

function WireEdgeComponent(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
  } = props;

  const edgeData = data as WireIQEdgeData | undefined;
  const wireType: WireType = edgeData?.wireType ?? "data";

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const style = WIRE_STYLES[wireType];
  const color = WIRE_COLORS[wireType];

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.strokeDasharray,
        }}
      />
      {edgeData?.label && (
        <foreignObject
          x={labelX - 40}
          y={labelY - 10}
          width={80}
          height={20}
          className="pointer-events-none"
        >
          <div className="text-[10px] text-center px-1 py-0.5 rounded bg-black/60 text-white/70 whitespace-nowrap overflow-hidden">
            {edgeData.label}
          </div>
        </foreignObject>
      )}
    </>
  );
}

export const WireEdge = memo(WireEdgeComponent);
