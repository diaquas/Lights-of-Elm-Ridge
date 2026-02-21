/**
 * Wire:IQ — Layout Engine
 *
 * Uses ELK.js to automatically position diagram nodes in a layered hierarchy:
 *   Layer 0: PSUs + Ethernet Switch
 *   Layer 1: Controllers (main)
 *   Layer 2: Receivers (differential)
 *   Layer 3: Prop stacks (grouped by port)
 *
 * ELK is port-aware, meaning it understands that specific edges connect
 * to specific handles (ports) on nodes, and minimizes edge crossings.
 */

import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode, ElkExtendedEdge } from "elkjs";
import type { WireIQNode, WireIQEdge } from "./types";

const elk = new ELK();

/** Default ELK layout options for wiring diagrams */
const DEFAULT_ELK_OPTIONS: Record<string, string> = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "120",
  "elk.layered.spacing.edgeNodeBetweenLayers": "40",
  "elk.spacing.nodeNode": "60",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.portConstraints": "FIXED_ORDER",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
};

/** Estimated node dimensions by type */
const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  controller: { width: 320, height: 280 },
  propStack: { width: 220, height: 120 },
  powerSupply: { width: 200, height: 100 },
  ethernetSwitch: { width: 280, height: 80 },
  injectionMarker: { width: 180, height: 60 },
};

/**
 * Apply ELK.js automatic layout to position all nodes.
 *
 * @param nodes - Unpositioned React Flow nodes
 * @param edges - React Flow edges (determine connectivity)
 * @returns Nodes with updated x,y positions
 */
export async function calculateLayout(
  nodes: WireIQNode[],
  edges: WireIQEdge[],
): Promise<WireIQNode[]> {
  if (nodes.length === 0) return [];

  // Convert React Flow nodes/edges to ELK graph
  const elkGraph = toElkGraph(nodes, edges);

  // Run ELK layout
  const layoutResult = await elk.layout(elkGraph);

  // Map ELK positions back to React Flow nodes
  return applyElkPositions(nodes, layoutResult);
}

/**
 * Convert React Flow nodes/edges to an ELK graph for layout computation.
 */
function toElkGraph(nodes: WireIQNode[], edges: WireIQEdge[]): ElkNode {
  const elkNodes: ElkNode[] = nodes.map((node) => {
    const dims = NODE_DIMENSIONS[node.type ?? "propStack"] ?? {
      width: 200,
      height: 100,
    };

    // Adjust height for controller nodes based on port count
    let height = dims.height;
    if (node.type === "controller" && node.data.nodeType === "controller") {
      const portCount = node.data.ports.length;
      height = Math.max(dims.height, 100 + portCount * 24);
    }

    // Adjust height for prop stacks based on model count
    if (node.type === "propStack" && node.data.nodeType === "propStack") {
      const modelCount = node.data.models.length;
      height = Math.max(dims.height, 60 + modelCount * 28);
    }

    // Build ELK ports for controller nodes
    const ports = buildElkPorts(node);

    return {
      id: node.id,
      width: dims.width,
      height,
      ...(ports.length > 0 ? { ports } : {}),
      layoutOptions: getNodeLayoutOptions(node),
    };
  });

  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [
      edge.sourceHandle ? `${edge.source}:${edge.sourceHandle}` : edge.source,
    ],
    targets: [edge.target],
  }));

  return {
    id: "root",
    layoutOptions: DEFAULT_ELK_OPTIONS,
    children: elkNodes,
    edges: elkEdges,
  };
}

/**
 * Build ELK port definitions for a node.
 * Controller nodes have one port per active pixel port.
 */
function buildElkPorts(
  node: WireIQNode,
): Array<{ id: string; layoutOptions: Record<string, string> }> {
  if (node.type !== "controller" || node.data.nodeType !== "controller") {
    return [];
  }

  return node.data.ports.map((port, index) => ({
    id: `${node.id}:port-${port.port}`,
    layoutOptions: {
      "elk.port.side": "EAST",
      "elk.port.index": String(index),
    },
  }));
}

/**
 * Get ELK layout options for a specific node.
 * Used to influence which layer a node is placed in.
 */
function getNodeLayoutOptions(node: WireIQNode): Record<string, string> {
  const options: Record<string, string> = {};

  // Use layer constraints to group node types
  switch (node.type) {
    case "ethernetSwitch":
      options["elk.layered.layerConstraint"] = "FIRST";
      break;
    case "powerSupply":
      options["elk.layered.layerConstraint"] = "FIRST";
      break;
    case "controller":
      // Receivers should be in a later layer than main controllers
      if (node.data.nodeType === "controller" && node.data.isReceiver) {
        // No explicit constraint — let ELK figure it out from edges
      }
      break;
    case "propStack":
      options["elk.layered.layerConstraint"] = "LAST";
      break;
  }

  return options;
}

/**
 * Apply ELK computed positions back to React Flow nodes.
 */
function applyElkPositions(
  nodes: WireIQNode[],
  elkResult: ElkNode,
): WireIQNode[] {
  const positionMap = new Map<string, { x: number; y: number }>();

  for (const child of elkResult.children ?? []) {
    if (child.x != null && child.y != null) {
      positionMap.set(child.id, { x: child.x, y: child.y });
    }
  }

  return nodes.map((node) => {
    const pos = positionMap.get(node.id);
    if (pos) {
      return { ...node, position: pos };
    }
    return node;
  });
}
