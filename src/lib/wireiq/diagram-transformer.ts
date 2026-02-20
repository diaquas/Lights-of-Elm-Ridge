/**
 * Wire:IQ — Diagram Transformer
 *
 * Converts xwire engine output (WiringPlan, PortBindings, PowerPlan)
 * into React Flow nodes and edges ready for rendering.
 */

import type { PortBinding } from "@lightsofelmridge/xlights-file-gen/src/types/networks";
import type {
  ParsedController,
  ParsedNetworkConfig,
} from "@lightsofelmridge/xlights-file-gen/src/types/networks";
import type {
  PowerPlan,
  CableRunSpec,
  BomItem,
  InjectionPoint,
} from "@lightsofelmridge/xwire/src/types/wiring";
import type {
  WireIQNode,
  WireIQEdge,
  WireIQDiagram,
  DiagramStats,
  ControllerNodeData,
  PropStackNodeData,
  PowerSupplyNodeData,
  EthernetSwitchNodeData,
  InjectionMarkerNodeData,
  PortInfo,
  WireType,
} from "./types";
import { WIRE_COLORS } from "./types";

/**
 * Transform all wiring data into a React Flow diagram.
 *
 * @param networkConfig - Parsed controllers from networks XML
 * @param portBindings - Resolved port bindings
 * @param powerPlan - Calculated power plan
 * @param cableRuns - Cable routing data
 * @param bom - Bill of materials
 * @returns Complete diagram with nodes, edges, and stats
 */
export function transformToDiagram(
  networkConfig: ParsedNetworkConfig,
  portBindings: PortBinding[],
  powerPlan: PowerPlan,
  cableRuns: CableRunSpec[],
  bom: BomItem[],
): WireIQDiagram {
  const nodes: WireIQNode[] = [];
  const edges: WireIQEdge[] = [];

  // 1. Create ethernet switch node (if multiple controllers)
  if (networkConfig.controllers.length > 1) {
    const switchNode = createSwitchNode(networkConfig.controllers);
    nodes.push(switchNode);
  }

  // 2. Create controller/receiver nodes
  for (const ctrl of networkConfig.controllers) {
    const ctrlBindings = portBindings.filter(
      (b) => b.controllerName === ctrl.name,
    );
    const controllerNode = createControllerNode(ctrl, ctrlBindings);
    nodes.push(controllerNode);
  }

  // 3. Create prop stack nodes (one per active port)
  for (const binding of portBindings) {
    if (binding.models.length === 0) continue;
    const stackNode = createPropStackNode(binding);
    nodes.push(stackNode);
  }

  // 4. Create PSU nodes
  for (const psu of powerPlan.powerSupplies) {
    const psuNode = createPsuNode(psu);
    nodes.push(psuNode);
  }

  // 5. Create injection marker nodes
  for (const injection of powerPlan.injectionPoints) {
    const injectionNode = createInjectionNode(injection);
    nodes.push(injectionNode);
  }

  // 6. Create edges

  // Ethernet edges (switch → controllers)
  if (networkConfig.controllers.length > 1) {
    for (const ctrl of networkConfig.controllers) {
      edges.push(createEthernetEdge("switch", ctrl.name));
    }
  }

  // Data edges (controller:port → prop stack)
  for (const binding of portBindings) {
    if (binding.models.length === 0) continue;
    const stackId = getPortStackId(binding.controllerName, binding.port);
    edges.push(
      createDataEdge(
        binding.controllerName,
        stackId,
        binding.port,
        binding.totalPixels,
      ),
    );
  }

  // Power edges (PSU → controller)
  for (const psu of powerPlan.powerSupplies) {
    // Find which controller this PSU serves
    const ctrlName = findControllerForPsu(
      psu,
      networkConfig.controllers,
      portBindings,
    );
    if (ctrlName) {
      edges.push(createPowerEdge(getPsuId(psu.name), ctrlName));
    }
  }

  // Injection edges (injection point → prop stack)
  for (const injection of powerPlan.injectionPoints) {
    const binding = portBindings.find((b) =>
      b.models.some((m) => m.modelName === injection.modelName),
    );
    if (binding) {
      const stackId = getPortStackId(binding.controllerName, binding.port);
      edges.push(createInjectionEdge(getInjectionId(injection), stackId));
    }
  }

  // Calculate stats
  const stats = calculateStats(
    networkConfig,
    portBindings,
    powerPlan,
    cableRuns,
    bom,
  );

  return { nodes, edges, stats };
}

// ── Node creators ──

function createSwitchNode(controllers: ParsedController[]): WireIQNode {
  const data: EthernetSwitchNodeData = {
    nodeType: "switch",
    portCount: controllers.length + 2,
    connections: controllers.map((c) => c.name),
  };

  return {
    id: "switch",
    type: "ethernetSwitch",
    position: { x: 0, y: 0 }, // Positioned by layout engine
    data,
  };
}

function createControllerNode(
  ctrl: ParsedController,
  bindings: PortBinding[],
): WireIQNode {
  const ports: PortInfo[] = [];

  // Build port info for every active port
  for (const binding of bindings) {
    ports.push({
      port: binding.port,
      totalPixels: binding.totalPixels,
      maxPixels: binding.maxPixels,
      utilizationPercent: binding.utilizationPercent,
      isOverloaded: binding.isOverloaded,
      models: binding.models.map((m) => ({
        name: m.modelName,
        pixelCount: m.pixelCount,
        chainOrder: m.chainOrder,
      })),
    });
  }

  // Sort ports by number
  ports.sort((a, b) => a.port - b.port);

  const totalPixels = bindings.reduce((sum, b) => sum + b.totalPixels, 0);
  const totalCapacity = ctrl.portCount * ctrl.maxPixelsPerPort;

  const data: ControllerNodeData = {
    nodeType: "controller",
    name: ctrl.name,
    vendor: ctrl.vendor,
    model: ctrl.model,
    ip: ctrl.ip,
    protocol: ctrl.protocol,
    portCount: ctrl.portCount,
    maxPixelsPerPort: ctrl.maxPixelsPerPort,
    totalPixels,
    totalCapacity,
    utilizationPercent:
      totalCapacity > 0 ? Math.round((totalPixels / totalCapacity) * 100) : 0,
    ports,
    isReceiver: ctrl.isReceiver,
    dipSwitch: ctrl.dipSwitch,
  };

  return {
    id: ctrl.name,
    type: "controller",
    position: { x: 0, y: 0 },
    data,
  };
}

function createPropStackNode(binding: PortBinding): WireIQNode {
  const data: PropStackNodeData = {
    nodeType: "propStack",
    controllerName: binding.controllerName,
    port: binding.port,
    models: binding.models.map((m) => ({
      name: m.modelName,
      pixelCount: m.pixelCount,
      chainOrder: m.chainOrder,
    })),
    totalPixels: binding.totalPixels,
    maxPixels: binding.maxPixels,
    utilizationPercent: binding.utilizationPercent,
  };

  return {
    id: getPortStackId(binding.controllerName, binding.port),
    type: "propStack",
    position: { x: 0, y: 0 },
    data,
  };
}

function createPsuNode(psu: PowerPlan["powerSupplies"][number]): WireIQNode {
  const data: PowerSupplyNodeData = {
    nodeType: "psu",
    name: psu.name,
    voltage: psu.voltage,
    watts: psu.watts,
    amps: psu.amps,
    loadWatts: psu.loadWatts,
    utilizationPercent: psu.utilizationPercent,
    models: psu.models,
  };

  return {
    id: getPsuId(psu.name),
    type: "powerSupply",
    position: { x: 0, y: 0 },
    data,
  };
}

function createInjectionNode(injection: InjectionPoint): WireIQNode {
  const data: InjectionMarkerNodeData = {
    nodeType: "injection",
    modelName: injection.modelName,
    pixelIndex: injection.pixelIndex,
    voltage: injection.voltage,
    reason: injection.reason,
    fuseAmps: injection.fuseAmps,
  };

  return {
    id: getInjectionId(injection),
    type: "injectionMarker",
    position: { x: 0, y: 0 },
    data,
  };
}

// ── Edge creators ──

function createEthernetEdge(fromId: string, toId: string): WireIQEdge {
  return {
    id: `eth-${fromId}-${toId}`,
    source: fromId,
    target: toId,
    type: "wireEdge",
    data: { wireType: "ethernet" as WireType },
    style: { stroke: WIRE_COLORS.ethernet, strokeWidth: 3 },
    animated: false,
  };
}

function createDataEdge(
  controllerId: string,
  stackId: string,
  port: number,
  pixelCount: number,
): WireIQEdge {
  return {
    id: `data-${controllerId}-p${port}`,
    source: controllerId,
    sourceHandle: `port-${port}`,
    target: stackId,
    type: "wireEdge",
    data: {
      wireType: "data" as WireType,
      label: `P${port}: ${pixelCount}px`,
      port,
    },
    style: { stroke: WIRE_COLORS.data, strokeWidth: 2 },
    animated: false,
  };
}

function createPowerEdge(psuId: string, controllerId: string): WireIQEdge {
  return {
    id: `pwr-${psuId}-${controllerId}`,
    source: psuId,
    target: controllerId,
    type: "wireEdge",
    data: { wireType: "power" as WireType },
    style: { stroke: WIRE_COLORS.power, strokeWidth: 3 },
    animated: false,
  };
}

function createInjectionEdge(injectionId: string, stackId: string): WireIQEdge {
  return {
    id: `inj-${injectionId}`,
    source: injectionId,
    target: stackId,
    type: "wireEdge",
    data: { wireType: "injection" as WireType },
    style: {
      stroke: WIRE_COLORS.injection,
      strokeWidth: 2,
      strokeDasharray: "8 4",
    },
    animated: false,
  };
}

// ── ID helpers ──

function getPortStackId(controllerName: string, port: number): string {
  return `stack-${controllerName}-p${port}`;
}

function getPsuId(name: string): string {
  return `psu-${name}`;
}

function getInjectionId(injection: InjectionPoint): string {
  return `inj-${injection.modelName}-px${injection.pixelIndex}`;
}

/**
 * Determine which controller a PSU is associated with.
 * Uses model overlap between PSU's model list and controller's port bindings.
 */
function findControllerForPsu(
  psu: PowerPlan["powerSupplies"][number],
  controllers: ParsedController[],
  portBindings: PortBinding[],
): string | null {
  const psuModels = new Set(psu.models);

  for (const ctrl of controllers) {
    const ctrlBindings = portBindings.filter(
      (b) => b.controllerName === ctrl.name,
    );
    const ctrlModels = ctrlBindings.flatMap((b) =>
      b.models.map((m) => m.modelName),
    );

    if (ctrlModels.some((m) => psuModels.has(m))) {
      return ctrl.name;
    }
  }

  return controllers[0]?.name ?? null;
}

// ── Stats calculator ──

function calculateStats(
  networkConfig: ParsedNetworkConfig,
  portBindings: PortBinding[],
  powerPlan: PowerPlan,
  cableRuns: CableRunSpec[],
  bom: BomItem[],
): DiagramStats {
  const totalPixels = portBindings.reduce((sum, b) => sum + b.totalPixels, 0);
  const overloadedPorts = portBindings.filter((b) => b.isOverloaded).length;
  const totalCableFeet = cableRuns
    .filter((r) => r.cableType === "data")
    .reduce((sum, r) => sum + r.lengthFeet, 0);
  const estimatedCost = bom.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0,
  );

  // Count unique prop names across all bindings
  const uniqueProps = new Set(
    portBindings.flatMap((b) => b.models.map((m) => m.modelName)),
  );

  return {
    totalControllers: networkConfig.totalControllers,
    totalReceivers: networkConfig.totalReceivers,
    totalProps: uniqueProps.size,
    totalPixels,
    totalWatts: Math.round(powerPlan.totalWatts),
    totalPowerSupplies: powerPlan.powerSupplies.length,
    totalInjectionPoints: powerPlan.injectionPoints.length,
    totalCableRunsFeet: totalCableFeet,
    overloadedPorts,
    estimatedBomCost: Math.round(estimatedCost),
  };
}
