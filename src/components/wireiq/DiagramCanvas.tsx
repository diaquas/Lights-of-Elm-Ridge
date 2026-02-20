"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
  WireIQNode,
  WireIQEdge,
  DiagramStats,
  DiagramViewMode,
} from "@/lib/wireiq/types";
import { ControllerNode } from "./nodes/ControllerNode";
import { PropStackNode } from "./nodes/PropStackNode";
import { PowerSupplyNode } from "./nodes/PowerSupplyNode";
import { EthernetSwitchNode } from "./nodes/EthernetSwitchNode";
import { InjectionMarkerNode } from "./nodes/InjectionMarkerNode";
import { WireEdge } from "./edges/WireEdge";
import { DiagramToolbar } from "./DiagramToolbar";
import { DiagramLegend } from "./DiagramLegend";
import { DiagramStatsPanel } from "./DiagramStats";

interface DiagramCanvasProps {
  initialNodes: WireIQNode[];
  initialEdges: WireIQEdge[];
  stats: DiagramStats;
  onResetLayout: () => void;
}

const nodeTypes = {
  controller: ControllerNode,
  propStack: PropStackNode,
  powerSupply: PowerSupplyNode,
  ethernetSwitch: EthernetSwitchNode,
  injectionMarker: InjectionMarkerNode,
};

const edgeTypes = {
  wireEdge: WireEdge,
};

function DiagramCanvasInner({
  initialNodes,
  initialEdges,
  stats,
  onResetLayout,
}: DiagramCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes as Node[]);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges as Edge[]);
  const [viewMode, setViewMode] = useState<DiagramViewMode>("full");

  // Filter nodes/edges by view mode
  const filteredNodes = useMemo(() => {
    return nodes.map((node) => {
      const hidden = shouldHideNode(node as WireIQNode, viewMode);
      return { ...node, hidden };
    });
  }, [nodes, viewMode]);

  const filteredEdges = useMemo(() => {
    return edges.map((edge) => {
      const hidden = shouldHideEdge(edge as WireIQEdge, viewMode);
      return { ...edge, hidden };
    });
  }, [edges, viewMode]);

  // Update nodes when layout resets
  const handleResetLayout = useCallback(() => {
    onResetLayout();
  }, [onResetLayout]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1a2e" gap={20} />
        <Controls
          showInteractive={false}
          className="!bg-black/40 !border-white/10 !rounded-lg [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-white/60"
        />
        <MiniMap
          className="!bg-black/60 !border-white/10 !rounded-lg"
          nodeColor={(node) => {
            switch (node.type) {
              case "controller":
                return "#475569";
              case "propStack":
                return "#3f3f46";
              case "powerSupply":
                return "#854d0e";
              case "ethernetSwitch":
                return "#1e3a5f";
              case "injectionMarker":
                return "#9a3412";
              default:
                return "#333";
            }
          }}
        />
      </ReactFlow>

      {/* Toolbar overlay (top) */}
      <div className="absolute top-3 left-3 z-10">
        <DiagramToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onResetLayout={handleResetLayout}
        />
      </div>

      {/* Right sidebar overlays */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 w-52">
        <DiagramLegend />
        <DiagramStatsPanel stats={stats} />
      </div>
    </div>
  );
}

/**
 * Determine if a node should be hidden based on view mode.
 */
function shouldHideNode(node: WireIQNode, mode: DiagramViewMode): boolean {
  if (mode === "full") return false;

  const nodeType = node.type;

  switch (mode) {
    case "network":
      // Show switch, controllers — hide props, PSUs, injection
      return (
        nodeType === "propStack" ||
        nodeType === "powerSupply" ||
        nodeType === "injectionMarker"
      );
    case "wiring":
      // Show controllers, props — hide switch, PSUs, injection
      return (
        nodeType === "ethernetSwitch" ||
        nodeType === "powerSupply" ||
        nodeType === "injectionMarker"
      );
    case "power":
      // Show PSUs, controllers, injection — hide switch, individual props
      return nodeType === "ethernetSwitch" || nodeType === "propStack";
    default:
      return false;
  }
}

/**
 * Determine if an edge should be hidden based on view mode.
 */
function shouldHideEdge(edge: WireIQEdge, mode: DiagramViewMode): boolean {
  if (mode === "full") return false;

  const wireType = edge.data?.wireType;

  switch (mode) {
    case "network":
      return wireType !== "ethernet";
    case "wiring":
      return wireType !== "data";
    case "power":
      return wireType !== "power" && wireType !== "injection";
    default:
      return false;
  }
}

/**
 * Wrapped with ReactFlowProvider so hooks work inside.
 */
export function DiagramCanvas(props: DiagramCanvasProps) {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
