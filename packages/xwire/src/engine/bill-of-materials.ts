/**
 * Bill of Materials Generator
 *
 * Generates a shopping list of cables, connectors, fuses, power supplies,
 * and enclosures from a wiring plan. Feeds directly into Shopping List 2.0.
 */

import type {
  BomItem,
  CableRunSpec,
  PowerPlan,
  InjectionPoint,
} from "../types/wiring";

/**
 * Generate a complete bill of materials from cable runs and power plan.
 *
 * @param cableRuns - All cable runs (data + ethernet)
 * @param powerPlan - Calculated power plan with PSU sizing
 * @returns Itemized BOM sorted by category
 */
export function generateBillOfMaterials(
  cableRuns: CableRunSpec[],
  powerPlan: PowerPlan,
): BomItem[] {
  const items: BomItem[] = [];

  // Cable items
  items.push(...generateCableItems(cableRuns));

  // Ethernet items
  items.push(...generateEthernetItems(cableRuns));

  // Connector items
  items.push(...generateConnectorItems(cableRuns));

  // Fuse items (for power injection points)
  items.push(...generateFuseItems(powerPlan.injectionPoints));

  // Power supply items
  items.push(...generatePsuItems(powerPlan));

  // Enclosure items
  items.push(...generateEnclosureItems(powerPlan));

  return items;
}

/**
 * Generate cable line items, aggregated by gauge.
 */
function generateCableItems(cableRuns: CableRunSpec[]): BomItem[] {
  const dataRuns = cableRuns.filter((r) => r.cableType === "data");
  if (dataRuns.length === 0) return [];

  // Aggregate cable by gauge
  const byGauge = new Map<number, { totalFeet: number; runs: number }>();
  for (const run of dataRuns) {
    const existing = byGauge.get(run.wireGauge) ?? { totalFeet: 0, runs: 0 };
    existing.totalFeet += run.lengthFeet;
    existing.runs += 1;
    byGauge.set(run.wireGauge, existing);
  }

  const items: BomItem[] = [];
  for (const [gauge, info] of byGauge) {
    // Round up to nearest 25ft spool increment
    const spoolSize = 25;
    const totalFeet = Math.ceil(info.totalFeet / spoolSize) * spoolSize;

    items.push({
      category: "cable",
      description: `${gauge}AWG 3-conductor pixel wire`,
      quantity: totalFeet,
      unitCost: getCableUnitCost(gauge),
      spec: `${gauge}AWG 3-conductor (data + V+ + GND), ${totalFeet}ft total across ${info.runs} runs`,
      priority: "required",
    });
  }

  return items;
}

/**
 * Generate ethernet cable items.
 */
function generateEthernetItems(cableRuns: CableRunSpec[]): BomItem[] {
  const ethernetRuns = cableRuns.filter((r) => r.cableType === "ethernet");
  if (ethernetRuns.length === 0) return [];

  const items: BomItem[] = [];

  for (const run of ethernetRuns) {
    // Round up to standard cable length
    const standardLength = getStandardEthernetLength(run.lengthFeet);

    items.push({
      category: "ethernet",
      description: `Cat6 ethernet cable (${run.from} → ${run.to})`,
      quantity: 1,
      unitCost: getEthernetCost(standardLength),
      spec: `Cat6 outdoor-rated, ${standardLength}ft`,
      sourceModel: run.to,
      priority: "required",
    });
  }

  // Add a network switch if there are multiple ethernet runs
  if (ethernetRuns.length > 1) {
    const portCount = ethernetRuns.length + 2; // +2 for router + spare
    const switchSize = portCount <= 5 ? 5 : portCount <= 8 ? 8 : 16;

    items.push({
      category: "ethernet",
      description: `${switchSize}-port gigabit ethernet switch`,
      quantity: 1,
      unitCost: switchSize <= 5 ? 15 : switchSize <= 8 ? 20 : 35,
      spec: `Unmanaged, ${switchSize}-port, 10/100/1000`,
      priority: "required",
    });
  }

  return items;
}

/**
 * Generate connector items for cable runs.
 */
function generateConnectorItems(cableRuns: CableRunSpec[]): BomItem[] {
  const dataRuns = cableRuns.filter((r) => r.cableType === "data");
  if (dataRuns.length === 0) return [];

  const items: BomItem[] = [];

  // 3-pin connectors (one pair per cable run — male + female)
  const connectorPairs = dataRuns.length;
  items.push({
    category: "connector",
    description: "3-pin waterproof connectors (male + female pair)",
    quantity: connectorPairs,
    unitCost: 0.75,
    spec: "Ray Wu style 3-pin JST-SM waterproof",
    priority: "required",
  });

  // Spare connectors (10% extra)
  const spares = Math.max(2, Math.ceil(connectorPairs * 0.1));
  items.push({
    category: "connector",
    description: "3-pin waterproof connectors (spares)",
    quantity: spares,
    unitCost: 0.75,
    spec: "Ray Wu style 3-pin JST-SM waterproof — backup",
    priority: "recommended",
  });

  return items;
}

/**
 * Generate fuse items for power injection points.
 */
function generateFuseItems(injectionPoints: InjectionPoint[]): BomItem[] {
  if (injectionPoints.length === 0) return [];

  // Group by fuse rating
  const byRating = new Map<number, number>();
  for (const point of injectionPoints) {
    const count = byRating.get(point.fuseAmps) ?? 0;
    byRating.set(point.fuseAmps, count + 1);
  }

  const items: BomItem[] = [];
  for (const [amps, count] of byRating) {
    items.push({
      category: "fuse",
      description: `${amps}A blade fuse`,
      quantity: count + Math.ceil(count * 0.2), // +20% spares
      unitCost: 0.5,
      spec: `${amps}A ATC/ATO blade fuse for power injection`,
      priority: "required",
    });
  }

  // Fuse holders
  items.push({
    category: "fuse",
    description: "Inline blade fuse holder",
    quantity: injectionPoints.length,
    unitCost: 2.0,
    spec: "Waterproof inline ATC fuse holder with 16AWG leads",
    priority: "required",
  });

  return items;
}

/**
 * Generate power supply items.
 */
function generatePsuItems(powerPlan: PowerPlan): BomItem[] {
  return powerPlan.powerSupplies.map((psu) => ({
    category: "psu" as const,
    description: `${psu.voltage}V ${psu.watts}W power supply`,
    quantity: 1,
    unitCost: getPsuCost(psu.watts),
    spec: `${psu.voltage}V DC, ${psu.watts}W (${psu.amps}A), Mean Well or equivalent`,
    priority: "required" as const,
  }));
}

/**
 * Generate enclosure items (one per PSU).
 */
function generateEnclosureItems(powerPlan: PowerPlan): BomItem[] {
  if (powerPlan.powerSupplies.length === 0) return [];

  const items: BomItem[] = [];

  // Weatherproof enclosures for PSUs
  items.push({
    category: "enclosure",
    description: "Weatherproof electrical enclosure",
    quantity: powerPlan.powerSupplies.length,
    unitCost: 25,
    spec: "NEMA 3R rated, large enough for PSU + fuse block + terminal strips",
    priority: "required",
  });

  // Terminal strips for power distribution
  items.push({
    category: "enclosure",
    description: "Power distribution terminal strip",
    quantity: powerPlan.powerSupplies.length,
    unitCost: 8,
    spec: "12-position barrier terminal strip, 30A rated",
    priority: "required",
  });

  return items;
}

// ── Cost lookup helpers ──

function getCableUnitCost(gauge: number): number {
  // Cost per foot by gauge
  const costs: Record<number, number> = {
    22: 0.08,
    20: 0.1,
    18: 0.15,
    16: 0.2,
    14: 0.3,
    12: 0.4,
    10: 0.55,
  };
  return costs[gauge] ?? 0.15;
}

function getStandardEthernetLength(estimatedFeet: number): number {
  // Standard ethernet cable lengths
  const standards = [10, 25, 50, 75, 100, 150, 200];
  return standards.find((l) => l >= estimatedFeet) ?? 200;
}

function getEthernetCost(lengthFeet: number): number {
  // Approximate cost for outdoor-rated Cat6
  if (lengthFeet <= 25) return 12;
  if (lengthFeet <= 50) return 18;
  if (lengthFeet <= 100) return 25;
  return 35;
}

function getPsuCost(watts: number): number {
  // Approximate cost for Mean Well equivalent PSUs
  const costs: Record<number, number> = {
    60: 15,
    100: 22,
    150: 28,
    200: 35,
    350: 45,
    500: 55,
    600: 65,
  };
  return costs[watts] ?? 40;
}
