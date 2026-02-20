/**
 * Port Assigner
 *
 * Validates port assignments and suggests rebalancing when ports are overloaded.
 * Used when the XML already has port assignments (most common case) to verify
 * they're within limits, and for the Shop Wizard path where ports need to be
 * assigned from scratch.
 */

import type { PortValidation } from "../types/wiring";
import type { ParsedModel } from "@lightsofelmridge/xlights-file-gen/src/types/models";
import type {
  ParsedController,
  PortBinding,
} from "@lightsofelmridge/xlights-file-gen/src/types/networks";

export interface PortAssignment {
  port: number;
  modelName: string;
  pixelCount: number;
  startPixel: number;
}

/**
 * Validate existing port assignments and flag issues.
 *
 * @param portBindings - Resolved port bindings from the port resolver
 * @returns Validation results per port
 */
export function validatePorts(portBindings: PortBinding[]): PortValidation[] {
  return portBindings.map((binding) => {
    const overloadAmount = Math.max(0, binding.totalPixels - binding.maxPixels);
    const isOverloaded = overloadAmount > 0;

    let suggestion = "";
    if (isOverloaded) {
      suggestion =
        `Move ${overloadAmount}+ pixels to another port. ` +
        `Consider splitting the chain at model "${binding.models[binding.models.length - 1]?.modelName ?? "unknown"}".`;
    }

    return {
      controllerName: binding.controllerName,
      port: binding.port,
      currentPixels: binding.totalPixels,
      maxPixels: binding.maxPixels,
      isOverloaded,
      overloadAmount,
      suggestion,
    };
  });
}

/**
 * Auto-assign ports for models that don't have StartChannel assignments.
 *
 * Used by Shop Wizard to generate initial port assignments when creating
 * a layout from scratch. Uses a greedy bin-packing strategy.
 *
 * @param models - Models to assign (should be physical, non-group models)
 * @param controller - Target controller
 * @returns Port assignments
 */
export function assignPorts(
  models: ParsedModel[],
  controller: ParsedController,
): PortAssignment[] {
  const assignments: PortAssignment[] = [];
  const portUsage = new Map<number, number>(); // port → current pixel count

  // Sort models by pixel count descending (largest first = better packing)
  const sorted = [...models]
    .filter((m) => !m.isGroup && m.pixelCount > 0)
    .sort((a, b) => b.pixelCount - a.pixelCount);

  for (const model of sorted) {
    // Find the first port with enough remaining capacity
    let assignedPort: number | null = null;

    for (let port = 1; port <= controller.portCount; port++) {
      const used = portUsage.get(port) ?? 0;
      if (used + model.pixelCount <= controller.maxPixelsPerPort) {
        assignedPort = port;
        break;
      }
    }

    if (assignedPort === null) {
      // All ports full — assign to least-used port (will be overloaded)
      let minUsage = Infinity;
      let minPort = 1;
      for (let port = 1; port <= controller.portCount; port++) {
        const used = portUsage.get(port) ?? 0;
        if (used < minUsage) {
          minUsage = used;
          minPort = port;
        }
      }
      assignedPort = minPort;
    }

    const currentUsage = portUsage.get(assignedPort) ?? 0;
    assignments.push({
      port: assignedPort,
      modelName: model.name,
      pixelCount: model.pixelCount,
      startPixel: currentUsage + 1,
    });
    portUsage.set(assignedPort, currentUsage + model.pixelCount);
  }

  return assignments;
}

/**
 * Check if a display fits on a controller within its port limits.
 *
 * @param models - All physical models
 * @param controller - Target controller
 * @returns Whether all models fit, and details if not
 */
export function checkControllerCapacity(
  models: ParsedModel[],
  controller: ParsedController,
): {
  fits: boolean;
  totalPixels: number;
  maxCapacity: number;
  details: string;
} {
  const physicalModels = models.filter((m) => !m.isGroup && m.pixelCount > 0);
  const totalPixels = physicalModels.reduce((sum, m) => sum + m.pixelCount, 0);
  const maxCapacity = controller.portCount * controller.maxPixelsPerPort;

  const fits = totalPixels <= maxCapacity;
  const details = fits
    ? `${totalPixels} pixels fit within ${controller.portCount} ports (${maxCapacity} max)`
    : `${totalPixels} pixels exceed ${controller.portCount}-port capacity of ${maxCapacity} — need additional controller`;

  return { fits, totalPixels, maxCapacity, details };
}
