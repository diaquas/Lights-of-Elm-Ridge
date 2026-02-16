/**
 * Bill of Materials Generator
 *
 * Generates a shopping list of cables, connectors, and fuses.
 *
 * TODO: Implement
 * Inputs: Cable routes, power plan
 * Outputs: Itemized list with quantities, specs, and estimated costs
 */

export interface BomItem {
  category: "cable" | "connector" | "fuse" | "psu" | "enclosure";
  description: string;
  quantity: number;
  unitCost: number;
  spec: string; // e.g., "18AWG 3-conductor, 100ft"
}

export function generateBillOfMaterials(): BomItem[] {
  throw new Error("Not implemented");
}
