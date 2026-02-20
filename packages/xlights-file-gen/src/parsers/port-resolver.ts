/**
 * Port Resolver — Derive controller:port bindings from model StartChannel attributes.
 *
 * xLights models have a StartChannel attribute that encodes which controller
 * and port they're assigned to. This module parses those references and
 * assembles complete port binding maps.
 *
 * StartChannel formats:
 *   "!ControllerName:port:startPixel" — Modern bang format (most common)
 *   ">universe:channel"               — Legacy universe format
 *   "universe:channel" or plain number — Oldest formats (rare)
 */

import type { ParsedModel } from "../types/models";
import type {
  ParsedController,
  PortBinding,
  PortModel,
  StartChannelRef,
} from "../types/networks";

/**
 * Parse a StartChannel string into a structured reference.
 */
export function parseStartChannel(startChannel: string): StartChannelRef {
  if (!startChannel || startChannel.trim() === "") {
    return { format: "unknown", raw: startChannel };
  }

  const trimmed = startChannel.trim();

  // Bang format: !ControllerName:port:startPixel
  const bangMatch = trimmed.match(/^!(.+):(\d+):(\d+)$/);
  if (bangMatch) {
    return {
      format: "bang",
      controllerName: bangMatch[1],
      port: parseInt(bangMatch[2]),
      startPixel: parseInt(bangMatch[3]),
      raw: trimmed,
    };
  }

  // Universe format: >universe:channel
  const universeMatch = trimmed.match(/^>(\d+):(\d+)$/);
  if (universeMatch) {
    return {
      format: "universe",
      universe: parseInt(universeMatch[1]),
      channel: parseInt(universeMatch[2]),
      raw: trimmed,
    };
  }

  // Bare universe format: universe:channel (no > prefix)
  const bareUniverseMatch = trimmed.match(/^(\d+):(\d+)$/);
  if (bareUniverseMatch) {
    return {
      format: "universe",
      universe: parseInt(bareUniverseMatch[1]),
      channel: parseInt(bareUniverseMatch[2]),
      raw: trimmed,
    };
  }

  return { format: "unknown", raw: trimmed };
}

/**
 * Resolve port bindings from models and controllers.
 *
 * Takes the parsed models (from rgbeffects XML) and controllers (from networks XML),
 * resolves each model's StartChannel to a controller:port, and assembles
 * the complete port binding map with chain ordering.
 *
 * @param models - Parsed models from xlights_rgbeffects.xml
 * @param controllers - Parsed controllers from xlights_networks.xml
 * @returns Array of port bindings, one per active port
 */
export function resolvePortBindings(
  models: ParsedModel[],
  controllers: ParsedController[],
): PortBinding[] {
  // Filter to only physical models (not groups)
  const physicalModels = models.filter((m) => !m.isGroup && m.pixelCount > 0);

  // Build a controller lookup map by name
  const controllerMap = new Map<string, ParsedController>();
  for (const ctrl of controllers) {
    controllerMap.set(ctrl.name, ctrl);
    // Also index by lowercase for case-insensitive matching
    controllerMap.set(ctrl.name.toLowerCase(), ctrl);
  }

  // Build a universe → controller mapping for legacy format resolution
  const universeMap = buildUniverseMap(controllers);

  // Group models by controller:port
  const portMap = new Map<
    string,
    { models: PortModelEntry[]; ctrl: ParsedController }
  >();

  for (const model of physicalModels) {
    const ref = parseStartChannel(model.startChannel);
    const resolved = resolveRef(ref, controllerMap, universeMap);

    if (!resolved) continue;

    const key = `${resolved.controllerName}:${resolved.port}`;
    if (!portMap.has(key)) {
      const ctrl =
        controllerMap.get(resolved.controllerName) ??
        controllerMap.get(resolved.controllerName.toLowerCase());
      if (!ctrl) continue;
      portMap.set(key, { models: [], ctrl });
    }

    portMap.get(key)!.models.push({
      modelName: model.name,
      pixelCount: model.pixelCount,
      startPixel: resolved.startPixel,
    });
  }

  // Convert to PortBinding array with sorted chain order
  const bindings: PortBinding[] = [];

  for (const [key, { models: portModels, ctrl }] of portMap) {
    const [, portStr] = key.split(":");
    const port = parseInt(portStr);

    // Sort by startPixel to determine chain order
    const sorted = [...portModels].sort((a, b) => a.startPixel - b.startPixel);

    const portModelList: PortModel[] = sorted.map((m, i) => ({
      modelName: m.modelName,
      pixelCount: m.pixelCount,
      startPixel: m.startPixel,
      chainOrder: i,
    }));

    const totalPixels = portModelList.reduce((sum, m) => sum + m.pixelCount, 0);
    const maxPixels = ctrl.maxPixelsPerPort;

    bindings.push({
      controllerName: ctrl.name,
      port,
      models: portModelList,
      totalPixels,
      maxPixels,
      utilizationPercent:
        maxPixels > 0 ? Math.round((totalPixels / maxPixels) * 100) : 0,
      isOverloaded: totalPixels > maxPixels,
    });
  }

  // Sort bindings by controller name then port number
  bindings.sort((a, b) => {
    const nameCompare = a.controllerName.localeCompare(b.controllerName);
    if (nameCompare !== 0) return nameCompare;
    return a.port - b.port;
  });

  return bindings;
}

// ── Internal helpers ──

interface PortModelEntry {
  modelName: string;
  pixelCount: number;
  startPixel: number;
}

interface ResolvedRef {
  controllerName: string;
  port: number;
  startPixel: number;
}

/**
 * Build a universe → controller mapping for legacy StartChannel resolution.
 *
 * Maps each universe number to the controller that owns it and the
 * port number derived from the universe offset.
 */
function buildUniverseMap(
  controllers: ParsedController[],
): Map<
  number,
  {
    controllerName: string;
    startUniverse: number;
    channelsPerUniverse: number;
    portCount: number;
    maxPixelsPerPort: number;
  }
> {
  const map = new Map<
    number,
    {
      controllerName: string;
      startUniverse: number;
      channelsPerUniverse: number;
      portCount: number;
      maxPixelsPerPort: number;
    }
  >();

  for (const ctrl of controllers) {
    for (let i = 0; i < ctrl.universeCount; i++) {
      const universe = ctrl.startUniverse + i;
      map.set(universe, {
        controllerName: ctrl.name,
        startUniverse: ctrl.startUniverse,
        channelsPerUniverse: ctrl.channelsPerUniverse,
        portCount: ctrl.portCount,
        maxPixelsPerPort: ctrl.maxPixelsPerPort,
      });
    }
  }

  return map;
}

/**
 * Resolve a StartChannelRef to a concrete controller:port:startPixel.
 */
function resolveRef(
  ref: StartChannelRef,
  controllerMap: Map<string, ParsedController>,
  universeMap: Map<
    number,
    {
      controllerName: string;
      startUniverse: number;
      channelsPerUniverse: number;
      portCount: number;
      maxPixelsPerPort: number;
    }
  >,
): ResolvedRef | null {
  if (
    ref.format === "bang" &&
    ref.controllerName &&
    ref.port &&
    ref.startPixel
  ) {
    return {
      controllerName: ref.controllerName,
      port: ref.port,
      startPixel: ref.startPixel,
    };
  }

  if (
    ref.format === "universe" &&
    ref.universe != null &&
    ref.channel != null
  ) {
    const ctrlInfo = universeMap.get(ref.universe);
    if (!ctrlInfo) return null;

    // Derive port from universe offset and channels per universe.
    // Each port typically occupies ceil(maxPixelsPerPort * 3 / channelsPerUniverse) universes.
    const channelsPerPixel = 3; // RGB = 3 channels per pixel
    const pixelsPerUniverse = Math.floor(
      ctrlInfo.channelsPerUniverse / channelsPerPixel,
    );
    const universeOffset = ref.universe - ctrlInfo.startUniverse;
    const absoluteChannel =
      universeOffset * ctrlInfo.channelsPerUniverse + ref.channel;
    const absolutePixel = Math.floor(absoluteChannel / channelsPerPixel) + 1;

    // Estimate port: each port has maxPixelsPerPort pixels
    const port =
      Math.floor((absolutePixel - 1) / ctrlInfo.maxPixelsPerPort) + 1;
    const startPixelOnPort =
      ((absolutePixel - 1) % ctrlInfo.maxPixelsPerPort) + 1;

    if (port > 0 && port <= ctrlInfo.portCount) {
      return {
        controllerName: ctrlInfo.controllerName,
        port,
        startPixel: startPixelOnPort,
      };
    }
  }

  return null;
}
