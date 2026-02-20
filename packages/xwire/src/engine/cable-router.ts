/**
 * Cable Router
 *
 * Calculates cable runs from controllers to props with length estimates
 * and wire gauge recommendations based on amperage.
 */

import type { CableRunSpec } from "../types/wiring";
import type { ParsedModel } from "@lightsofelmridge/xlights-file-gen/src/types/models";
import type {
  ParsedController,
  PortBinding,
} from "@lightsofelmridge/xlights-file-gen/src/types/networks";
import { WIRE_GAUGE_TABLE } from "../data/wire-gauge-tables";

export type CableRun = CableRunSpec;

/** Default cable length estimate when positions aren't available (feet) */
const DEFAULT_CABLE_LENGTH = 25;

/** Overhead multiplier for cable routing (slack, corners, etc.) */
const CABLE_OVERHEAD = 1.15; // 15% extra for routing

/**
 * Calculate cable runs from controllers/receivers to props.
 *
 * Uses world positions from the layout XML to estimate cable lengths.
 * When positions aren't available, uses a conservative default.
 *
 * @param portBindings - Resolved port bindings
 * @param models - Parsed models with world positions
 * @param controllers - Parsed controllers
 * @param pixelType - Default pixel type for gauge calculation
 * @param voltage - Supply voltage for gauge calculation
 */
export function calculateCableRoutes(
  portBindings: PortBinding[],
  models: ParsedModel[],
  controllers: ParsedController[],
  pixelType: string = "WS2811",
  voltage: number = 12,
): CableRunSpec[] {
  const modelMap = new Map<string, ParsedModel>();
  for (const model of models) {
    modelMap.set(model.name, model);
  }

  const controllerMap = new Map<string, ParsedController>();
  for (const ctrl of controllers) {
    controllerMap.set(ctrl.name, ctrl);
  }

  const runs: CableRunSpec[] = [];
  let runIndex = 0;

  // Generate ethernet runs between controllers
  const ethernetRuns = generateEthernetRuns(controllers);
  runs.push(...ethernetRuns);
  runIndex += ethernetRuns.length;

  // Generate data cable runs per port binding
  for (const binding of portBindings) {
    const ctrl = controllerMap.get(binding.controllerName);
    if (!ctrl) continue;

    // For each model on this port, create a cable run
    for (let i = 0; i < binding.models.length; i++) {
      const portModel = binding.models[i];
      const model = modelMap.get(portModel.modelName);

      // Calculate cable length from controller to first model,
      // or from previous model in chain to current model
      let lengthFeet: number;

      if (i === 0 && model && ctrl) {
        // Controller to first model in chain
        lengthFeet = estimateCableLength(
          { x: 0, y: 0 }, // Controllers typically at house/garage
          { x: model.worldPosX, y: model.worldPosY },
        );
      } else if (i > 0) {
        // Chain: previous model to current model
        const prevModelName = binding.models[i - 1].modelName;
        const prevModel = modelMap.get(prevModelName);
        if (prevModel && model) {
          lengthFeet = estimateCableLength(
            { x: prevModel.worldPosX, y: prevModel.worldPosY },
            { x: model.worldPosX, y: model.worldPosY },
          );
        } else {
          lengthFeet = DEFAULT_CABLE_LENGTH;
        }
      } else {
        lengthFeet = DEFAULT_CABLE_LENGTH;
      }

      // Determine wire gauge based on total amps for the run
      const wireGauge = recommendWireGauge(
        portModel.pixelCount,
        pixelType,
        voltage,
        lengthFeet,
      );

      runs.push({
        id: `data-${runIndex++}`,
        from:
          i === 0 ? binding.controllerName : binding.models[i - 1].modelName,
        to: portModel.modelName,
        port: binding.port,
        lengthFeet: Math.round(lengthFeet),
        wireGauge,
        pixelCount: portModel.pixelCount,
        cableType: "data",
      });
    }
  }

  return runs;
}

/**
 * Generate ethernet cable runs between main controllers and receivers.
 */
function generateEthernetRuns(controllers: ParsedController[]): CableRunSpec[] {
  const runs: CableRunSpec[] = [];
  const mainControllers = controllers.filter((c) => !c.isReceiver);
  const receivers = controllers.filter((c) => c.isReceiver);

  // Each receiver connects back to a main controller (or switch)
  // For simplicity, connect each receiver to the first main controller
  const primaryController = mainControllers[0];
  if (!primaryController) return runs;

  let runIndex = 0;

  for (const receiver of receivers) {
    runs.push({
      id: `eth-${runIndex++}`,
      from: primaryController.name,
      to: receiver.name,
      port: 0, // Ethernet, not a pixel port
      lengthFeet: 50, // Default ethernet run estimate
      wireGauge: 0, // N/A for ethernet
      pixelCount: 0,
      cableType: "ethernet",
    });
  }

  return runs;
}

/**
 * Estimate cable length between two world positions.
 *
 * xLights WorldPos is in arbitrary units. We use a rough conversion
 * where 1 unit ≈ 3 feet (common for residential displays).
 * Applies overhead multiplier for routing slack.
 */
function estimateCableLength(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  // Euclidean distance in xLights world units
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Convert world units to approximate feet
  // xLights world positions vary wildly, but ~3ft per unit is reasonable
  const FEET_PER_UNIT = 3;
  const rawLength = distance * FEET_PER_UNIT;

  // Apply routing overhead and enforce minimum
  const withOverhead = rawLength * CABLE_OVERHEAD;
  return Math.max(withOverhead, 5); // Minimum 5 feet
}

/**
 * Recommend wire gauge based on amperage and cable length.
 *
 * Uses NEC-derived ampacity tables. Selects the smallest (highest AWG)
 * gauge that can safely carry the load at the given length.
 */
function recommendWireGauge(
  pixelCount: number,
  pixelType: string,
  voltage: number,
  lengthFeet: number,
): number {
  // Estimate amps for this run
  const ampsPerPixel =
    pixelType === "SK6812" ? 0.072 : voltage === 5 ? 0.06 : 0.025;
  const totalAmps = pixelCount * ampsPerPixel;

  // For longer runs, we need thicker wire to handle voltage drop
  // Rule of thumb: derate by 20% for every 50ft over 25ft
  const derating = 1 + Math.max(0, (lengthFeet - 25) / 50) * 0.2;
  const effectiveAmps = totalAmps * derating;

  // Find the smallest gauge that handles the load
  // WIRE_GAUGE_TABLE is sorted by AWG (high to low = thin to thick)
  const sortedGauges = [...WIRE_GAUGE_TABLE].sort((a, b) => b.awg - a.awg);

  for (const gauge of sortedGauges) {
    if (gauge.maxAmps >= effectiveAmps) {
      return gauge.awg;
    }
  }

  // Default to 10 AWG for very heavy loads
  return 10;
}
