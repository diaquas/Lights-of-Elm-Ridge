/**
 * Prop Templates — xLights model type definitions
 *
 * Maps high-level prop types to xLights XML model attributes.
 * Used by the package generator and shop wizard to create valid models.
 */

export interface PropTemplate {
  type: string;
  displayAs: string;
  defaultPixels: number;
  parm1?: number;
  parm2?: number;
  parm3?: number;
  description: string;
}

export const PROP_TEMPLATES: PropTemplate[] = [
  { type: "arch", displayAs: "Arches", defaultPixels: 25, parm1: 25, description: "Pixel arch" },
  { type: "candy-cane", displayAs: "Single Line", defaultPixels: 25, description: "Candy cane (single strand)" },
  { type: "mini-tree", displayAs: "Tree Flat", defaultPixels: 50, parm1: 1, parm2: 50, description: "Mini pixel tree" },
  { type: "mega-tree", displayAs: "Tree 360", defaultPixels: 3200, parm1: 16, parm2: 200, description: "360-degree mega tree" },
  { type: "matrix", displayAs: "Matrix", defaultPixels: 2048, parm1: 32, parm2: 64, description: "LED matrix panel" },
  { type: "house-outline", displayAs: "Poly Line", defaultPixels: 500, description: "Roofline / house outline (10px/ft)" },
  { type: "spinner", displayAs: "Spinner", defaultPixels: 180, description: "HD pixel spinner prop" },
  { type: "snowflake", displayAs: "Custom", defaultPixels: 80, description: "Pixel snowflake (custom model)" },
  { type: "wreath", displayAs: "Wreath", defaultPixels: 170, description: "Pixel wreath" },
  { type: "star", displayAs: "Star", defaultPixels: 100, description: "Pixel star" },
];
