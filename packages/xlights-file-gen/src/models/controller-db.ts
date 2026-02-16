/**
 * Controller Database — Known xLights-compatible controllers
 *
 * Specs for common pixel controllers used in the Christmas lights community.
 * Used by the package generator and xWire for port assignment and power planning.
 */

import type { ControllerSpec } from "../types/controllers";

export const CONTROLLER_DB: ControllerSpec[] = [
  { vendor: "HinksPix", model: "PRO V3", ports: 48, protocol: "E131", maxPixelsPerPort: 1024 },
  { vendor: "HinksPix", model: "EasyLights PIX16", ports: 16, protocol: "E131", maxPixelsPerPort: 800 },
  { vendor: "Falcon", model: "F16V4", ports: 16, protocol: "E131", maxPixelsPerPort: 1024 },
  { vendor: "Falcon", model: "F48", ports: 48, protocol: "E131", maxPixelsPerPort: 1024 },
  { vendor: "Falcon", model: "F4V3", ports: 4, protocol: "E131", maxPixelsPerPort: 1024 },
  { vendor: "HolidayCoro", model: "AlphaPix 16", ports: 16, protocol: "E131", maxPixelsPerPort: 680 },
  { vendor: "HolidayCoro", model: "AlphaPix Flex", ports: 4, protocol: "E131", maxPixelsPerPort: 680 },
  { vendor: "Kulp", model: "K32A-B", ports: 32, protocol: "E131", maxPixelsPerPort: 800 },
  { vendor: "Kulp", model: "K16A-B", ports: 16, protocol: "E131", maxPixelsPerPort: 800 },
  { vendor: "WLED", model: "ESP32 (WLED)", ports: 1, protocol: "DDP", maxPixelsPerPort: 800 },
];

export function findController(vendor: string, model: string): ControllerSpec | undefined {
  return CONTROLLER_DB.find(
    (c) => c.vendor.toLowerCase() === vendor.toLowerCase() &&
           c.model.toLowerCase() === model.toLowerCase(),
  );
}
