/**
 * Wire:IQ — Type Definitions
 *
 * Types for the wiring diagram visualization layer.
 * These types bridge the xwire engine output to React Flow nodes/edges.
 */

import type { Node, Edge } from "@xyflow/react";

// React Flow requires data to be Record<string, unknown> compatible.
// We use index signatures to satisfy this constraint while keeping
// our typed data interfaces.

// ── Diagram View Modes ──

/** Which layers of the diagram to display */
export type DiagramViewMode = "full" | "network" | "wiring" | "power";

export const VIEW_MODE_LABELS: Record<DiagramViewMode, string> = {
  full: "Full System",
  network: "Data Network",
  wiring: "Port Wiring",
  power: "Power Plan",
};

// ── Wire Types ──

export type WireType = "ethernet" | "data" | "power" | "injection" | "ground";

export const WIRE_COLORS: Record<WireType, string> = {
  ethernet: "#3B82F6", // blue-500
  data: "#F59E0B", // amber-500
  power: "#EF4444", // red-500
  injection: "#F97316", // orange-500
  ground: "#6B7280", // gray-500
};

export const WIRE_STYLES: Record<
  WireType,
  { strokeWidth: number; strokeDasharray?: string }
> = {
  ethernet: { strokeWidth: 3 },
  data: { strokeWidth: 2 },
  power: { strokeWidth: 3 },
  injection: { strokeWidth: 2, strokeDasharray: "8 4" },
  ground: { strokeWidth: 1, strokeDasharray: "4 4" },
};

// ── Node Data Types (discriminated union) ──

export interface ControllerNodeData {
  [key: string]: unknown;
  nodeType: "controller";
  name: string;
  vendor: string;
  model: string;
  ip: string;
  protocol: string;
  portCount: number;
  maxPixelsPerPort: number;
  totalPixels: number;
  totalCapacity: number;
  utilizationPercent: number;
  ports: PortInfo[];
  isReceiver: boolean;
  dipSwitch: string;
}

export interface PortInfo {
  port: number;
  totalPixels: number;
  maxPixels: number;
  utilizationPercent: number;
  isOverloaded: boolean;
  models: { name: string; pixelCount: number; chainOrder: number }[];
}

export interface PropStackNodeData {
  [key: string]: unknown;
  nodeType: "propStack";
  controllerName: string;
  port: number;
  models: { name: string; pixelCount: number; chainOrder: number }[];
  totalPixels: number;
  maxPixels: number;
  utilizationPercent: number;
}

export interface PowerSupplyNodeData {
  [key: string]: unknown;
  nodeType: "psu";
  name: string;
  voltage: number;
  watts: number;
  amps: number;
  loadWatts: number;
  utilizationPercent: number;
  models: string[];
}

export interface EthernetSwitchNodeData {
  [key: string]: unknown;
  nodeType: "switch";
  portCount: number;
  connections: string[];
}

export interface InjectionMarkerNodeData {
  [key: string]: unknown;
  nodeType: "injection";
  modelName: string;
  pixelIndex: number;
  voltage: number;
  reason: string;
  fuseAmps: number;
}

/** Union of all node data types */
export type WireIQNodeData =
  | ControllerNodeData
  | PropStackNodeData
  | PowerSupplyNodeData
  | EthernetSwitchNodeData
  | InjectionMarkerNodeData;

/** Typed React Flow node */
export type WireIQNode = Node<WireIQNodeData>;

// ── Edge Data Types ──

export interface WireIQEdgeData {
  [key: string]: unknown;
  wireType: WireType;
  label?: string;
  port?: number;
}

/** Typed React Flow edge */
export type WireIQEdge = Edge<WireIQEdgeData>;

// ── Diagram Stats ──

export interface DiagramStats {
  totalControllers: number;
  totalReceivers: number;
  totalProps: number;
  totalPixels: number;
  totalWatts: number;
  totalPowerSupplies: number;
  totalInjectionPoints: number;
  totalCableRunsFeet: number;
  overloadedPorts: number;
  estimatedBomCost: number;
}

// ── Complete diagram data (ready for React Flow) ──

export interface WireIQDiagram {
  nodes: WireIQNode[];
  edges: WireIQEdge[];
  stats: DiagramStats;
}
