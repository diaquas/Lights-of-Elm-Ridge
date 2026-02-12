#!/usr/bin/env node
/**
 * Regenerate source-layout.ts HALLOWEEN_MODELS and CHRISTMAS_MODELS
 * from the canonical xlights_rgbeffects XML files.
 *
 * Usage: node scripts/regenerate-source-layout.js
 */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.resolve(__dirname, "..");
const HALLOWEEN_XML = path.join(ROOT, "xlights_rgbeffects Halloween Default.xml");
const CHRISTMAS_XML = path.join(ROOT, "xlights_rgbeffects Christmas Default.xml");
const OUTPUT = path.join(ROOT, "src/lib/modiq/source-layout.ts");

/**
 * Calculate pixel count from an xLights <model> element, mirroring the
 * logic in parser.ts calculatePixelCount.
 *
 * Priority: explicit PixelCount attr > CustomModel cell count > DisplayAs-aware formula > parm1*parm2
 */
function calculatePixelCount(el, displayAs) {
  const pcAttr = parseInt(el.getAttribute("PixelCount") || "0", 10);
  if (pcAttr > 0) return pcAttr;

  const parm1 = parseInt(el.getAttribute("parm1") || "0", 10);
  const parm2 = parseInt(el.getAttribute("parm2") || "1", 10);
  const parm3 = parseInt(el.getAttribute("parm3") || "1", 10);

  const type = displayAs.toLowerCase();

  // Custom models: count non-empty cells in the CustomModel grid
  if (type === "custom") {
    const customModel = el.getAttribute("CustomModel") || "";
    if (customModel) {
      const cells = customModel.split(/[;,]/);
      const filled = cells.filter((c) => c.trim() !== "").length;
      if (filled > 0) return filled;
    }
    return parm1 * parm2;
  }

  switch (type) {
    case "arches":
      return parm1 * parm2 * Math.max(parm3, 1);
    case "tree 360":
    case "tree flat":
      return parm1 * parm2;
    case "single line":
    case "poly line":
      return parm2;
    case "star":
      return parm1 * parm2;
    case "spinner":
      return parm1 * parm2;
    case "candy cane":
    case "candy canes":
      return parm1 * parm2;
    case "circle":
    case "wreaths":
      return parm2;
    case "icicles":
      return parm2;
    case "matrix":
    case "horiz matrix":
    case "vert matrix":
      return parm2 * parm3;
    case "window frame":
      return parm1 + parm2 * 2 + parm3;
    default:
      return Math.max(parm1 * parm2, parm1, parm2);
  }
}

function parseXmlFile(xmlPath) {
  const xml = fs.readFileSync(xmlPath, "utf-8");
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const doc = dom.window.document;

  const models = [];

  // ── Parse individual <model> elements ──
  const modelEls = doc.querySelectorAll("models > model");
  // Compute world position bounds for normalization
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const rawModels = [];

  for (const el of modelEls) {
    const name = el.getAttribute("name");
    if (!name) continue;

    const displayAs = el.getAttribute("DisplayAs") || "Custom";
    const pixelCount = calculatePixelCount(el, displayAs);
    const worldPosX = parseFloat(el.getAttribute("WorldPosX") || "0");
    const worldPosY = parseFloat(el.getAttribute("WorldPosY") || "0");

    // Collect submodel names
    const submodels = [];
    const subEls = el.querySelectorAll("subModel");
    for (const sub of subEls) {
      const subName = sub.getAttribute("name");
      if (subName) submodels.push(subName);
    }

    // Determine type from DisplayAs and name patterns
    const type = inferType(name, displayAs);

    rawModels.push({ name, type, displayAs, pixelCount, worldPosX, worldPosY, submodels });

    if (worldPosX < minX) minX = worldPosX;
    if (worldPosX > maxX) maxX = worldPosX;
    if (worldPosY < minY) minY = worldPosY;
    if (worldPosY > maxY) maxY = worldPosY;
  }

  // Normalize positions to 0..1
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  for (const m of rawModels) {
    const normX = (m.worldPosX - minX) / rangeX;
    const normY = (m.worldPosY - minY) / rangeY;
    const zone = assignZone(normX, normY);

    models.push({
      name: m.name,
      type: m.type,
      displayAs: m.displayAs,
      pixelCount: m.pixelCount,
      zone,
      posX: round4(normX),
      posY: round4(normY),
      isGroup: false,
      submodels: m.submodels,
    });
  }

  // ── Parse <modelGroup> elements ──
  const groupEls = doc.querySelectorAll("modelGroups > modelGroup");
  for (const el of groupEls) {
    const name = el.getAttribute("name");
    if (!name) continue;

    const modelsStr = el.getAttribute("models") || "";
    const memberModels = modelsStr.split(",").map(s => s.trim()).filter(Boolean);

    // Infer type from member models or group name
    const type = inferGroupType(name, memberModels);

    models.push({
      name,
      type,
      displayAs: "Group",
      pixelCount: 0,
      zone: "mid-center",
      posX: 0.5,
      posY: 0.5,
      isGroup: true,
      submodels: [],
      memberModels,
    });
  }

  return models;
}

function inferType(name, displayAs) {
  const n = name.toLowerCase();
  if (n.includes("spider")) return "Spider";
  if (n.includes("bat")) return "Bat";
  if (n.includes("pumpkin")) return "Pumpkin";
  if (n.includes("tombstone") || n.includes("tomb")) return "Tombstone";
  if (n.includes("arch")) return "Arch";
  if (n.includes("eave")) return "Outline";
  if (n.includes("vert ")) return "Vert Matrix";
  if (n.includes("tree") && n.includes("spiral")) return "Spiral Tree";
  if (n.includes("tree") && n.includes("real")) return "Tree";
  if (n.includes("tree") && (n.includes("small") || n.includes("medium"))) return "Mini Tree";
  if (n.includes("mega tree") || n === "mega tree") return "Mega Tree";
  if (n.includes("pixel forest")) return "Pixel Forest";
  if (n.includes("fence")) return "Fence";
  if (n.includes("pole")) return "Pole";
  if (n.includes("flood")) return "Flood";
  if (n.includes("window")) return "Window";
  if (n.includes("firework")) return "Firework";
  if (n.includes("spinner") || n.includes("showstopper") || n.includes("rosa") || n.includes("overlord") || n.includes("fuzion") || n.includes("boom")) return "Spinner";
  if (n.includes("candy") || n.includes("cane")) return "Candy Cane";
  if (n.includes("present")) return "Present";
  if (n.includes("snowflake")) return "Snowflake";
  if (n.includes("star")) return "Star";
  if (n.includes("wreath")) return "Wreath";
  if (n.includes("icicle")) return "Icicle";
  if (n.includes("driveway")) return "Single Line";
  if (n.includes("matrix") || n.includes("tune-to")) return "Matrix";
  if (displayAs === "Poly Line") return "Single Line";
  if (displayAs === "Vert Matrix") return "Vert Matrix";
  if (displayAs === "Tree 360") return "Tree";
  if (displayAs === "Spinner") return "Spinner";
  return displayAs;
}

function inferGroupType(name, members) {
  const n = name.toLowerCase();
  // Check for known patterns
  if (n.includes("spider")) return "Spider";
  if (n.includes("bat")) return "Bat";
  if (n.includes("pumpkin")) return "Pumpkin";
  if (n.includes("tombstone") || n.includes("tomb")) return "Tombstone";
  if (n.includes("arch")) return "Arch";
  if (n.includes("eave")) return "Outline";
  if (n.includes("vert")) return "Vert Matrix";
  if (n.includes("mini tree")) return "Mini Tree";
  if (n.includes("spiral")) return "Spiral Tree";
  if (n.includes("tree") && n.includes("real")) return "Tree";
  if (n.includes("mega tree")) return "Mega Tree";
  if (n.includes("pixel forest")) return "Pixel Forest";
  if (n.includes("fence")) return "Fence";
  if (n.includes("pole")) return "Pole";
  if (n.includes("flood")) return "Flood";
  if (n.includes("window")) return "Window";
  if (n.includes("firework")) return "Firework";
  if (n.includes("spinner") || n.includes("showstopper") || n.includes("rosa") || n.includes("overlord") || n.includes("fuzion") || n.includes("boom")) return "Spinner";
  if (n.includes("candy") || n.includes("cane")) return "Candy Cane";
  if (n.includes("present")) return "Present";
  if (n.includes("snowflake")) return "Snowflake";
  if (n.includes("star")) return "Star";
  if (n.includes("wreath")) return "Wreath";
  if (n.includes("icicle")) return "Icicle";
  if (n.includes("eye")) return "Outline";
  if (n.includes("outline")) return "Outline";
  if (n.includes("ring")) return "Spinner";
  if (n.includes("spoke")) return "Spinner";
  // Fallback: infer from first member
  if (members.length > 0) {
    return inferType(members[0], "Group");
  }
  return "Group";
}

function assignZone(normX, normY) {
  const col = normX < 0.33 ? "left" : normX < 0.66 ? "center" : "right";
  const row = normY > 0.66 ? "high" : normY > 0.33 ? "mid" : "low";
  return `${row}-${col}`;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function formatModel(m) {
  const lines = [
    `  {`,
    `    name: ${JSON.stringify(m.name)},`,
    `    type: ${JSON.stringify(m.type)},`,
    `    displayAs: ${JSON.stringify(m.displayAs)},`,
    `    pixelCount: ${m.pixelCount},`,
    `    zone: ${JSON.stringify(m.zone)},`,
    `    posX: ${m.posX.toFixed(4)},`,
    `    posY: ${m.posY.toFixed(4)},`,
    `    isGroup: ${m.isGroup},`,
    `    submodels: ${JSON.stringify(m.submodels)},`,
  ];
  if (m.memberModels) {
    lines.push(`    memberModels: ${JSON.stringify(m.memberModels)},`);
  }
  lines.push(`  }`);
  return lines.join("\n");
}

// ── Main ──
function main() {
  console.log("Parsing Halloween XML...");
  const halloween = parseXmlFile(HALLOWEEN_XML);
  const halloweenIndividuals = halloween.filter(m => !m.isGroup);
  const halloweenGroups = halloween.filter(m => m.isGroup);
  console.log(`  ${halloweenIndividuals.length} models, ${halloweenGroups.length} groups`);

  let christmas = [];
  if (fs.existsSync(CHRISTMAS_XML)) {
    console.log("Parsing Christmas XML...");
    christmas = parseXmlFile(CHRISTMAS_XML);
    const christmasIndividuals = christmas.filter(m => !m.isGroup);
    const christmasGroups = christmas.filter(m => m.isGroup);
    console.log(`  ${christmasIndividuals.length} models, ${christmasGroups.length} groups`);
  } else {
    console.log("Christmas XML not found, skipping.");
  }

  // Read existing file to preserve the bottom section (functions)
  const existing = fs.readFileSync(OUTPUT, "utf-8");

  // Find where functions start (after the data arrays)
  const funcMarker = "export function getModelsForDisplay";
  const funcIdx = existing.indexOf(funcMarker);
  if (funcIdx === -1) {
    console.error("Could not find function section marker");
    process.exit(1);
  }
  const funcSection = existing.slice(funcIdx);

  // Build output
  const halloweenEntries = halloween.map(formatModel).join(",\n");
  const christmasEntries = christmas.length > 0
    ? christmas.map(formatModel).join(",\n")
    : "  // No Christmas data available";

  const output = `/**
 * ModIQ — Source Layout Data
 *
 * Canonical model lists for Lights of Elm Ridge displays.
 * Contains separate layouts for Halloween and Christmas decorations.
 *
 * Halloween: ${halloweenIndividuals.length} models, ${halloweenGroups.length} groups
 * Christmas: ${christmas.filter(m => !m.isGroup).length} models, ${christmas.filter(m => m.isGroup).length} groups
 *
 * Generated from xlights_rgbeffects XML files.
 * Re-generate: node scripts/regenerate-source-layout.js
 */

import type { ParsedModel } from "./parser";
import { classifyGroup } from "./parser";
import { getEntityType } from "@/types/xLightsTypes";

export type DisplayType = "halloween" | "christmas";

export interface SourceModel {
  name: string;
  type: string;
  displayAs: string;
  pixelCount: number;
  zone: string;
  posX: number;
  posY: number;
  isGroup: boolean;
  submodels: string[];
  memberModels?: string[];
}

/**
 * Zone assignment based on normalized position.
 * Divides the layout into a 3x3 grid.
 */
function assignZone(normX: number, normY: number): string {
  const col = normX < 0.33 ? "left" : normX < 0.66 ? "center" : "right";
  const row = normY > 0.66 ? "high" : normY > 0.33 ? "mid" : "low";
  return \`\${row}-\${col}\`;
}

// ═══════════════════════════════════════════════════════════════════
// Halloween Layout (${halloweenIndividuals.length} models, ${halloweenGroups.length} groups)
// ═══════════════════════════════════════════════════════════════════

export const HALLOWEEN_MODELS: SourceModel[] = [
${halloweenEntries},
];

// ═══════════════════════════════════════════════════════════════════
// Christmas Layout (${christmas.filter(m => !m.isGroup).length} models, ${christmas.filter(m => m.isGroup).length} groups)
// ═══════════════════════════════════════════════════════════════════

export const CHRISTMAS_MODELS: SourceModel[] = [
${christmasEntries},
];

${funcSection}`;

  fs.writeFileSync(OUTPUT, output, "utf-8");
  console.log(`\nWritten to ${OUTPUT}`);
  console.log("Done!");
}

main();
