/**
 * ModIQ — xLights XML Parser
 *
 * Parses xlights_rgbeffects.xml files to extract structured model data
 * for the matching engine. Runs client-side in the browser.
 */

export interface SubModel {
  name: string;
  type: string;
  rangeData: string; // raw line0/line1 etc. for pixel count estimation
  pixelCount: number;
}

export interface ParsedModel {
  name: string;
  displayAs: string; // raw DisplayAs value from XML
  type: string; // normalized category (Arch, Spinner, Tree, etc.)
  pixelCount: number;
  parm1: number;
  parm2: number;
  parm3: number;
  stringType: string;
  startChannel: string;
  worldPosX: number;
  worldPosY: number;
  worldPosZ: number;
  submodels: SubModel[];
  isGroup: boolean;
  aliases: string[];
}

export interface ParsedLayout {
  models: ParsedModel[];
  modelCount: number;
  fileName: string;
}

// ─── Type Normalization ─────────────────────────────────────────────
// Maps xLights DisplayAs values to canonical categories

const TYPE_MAP: Record<string, string> = {
  arches: "Arch",
  "tree 360": "Tree",
  "tree flat": "Tree",
  spinner: "Spinner",
  matrix: "Matrix",
  "vert matrix": "Matrix",
  custom: "Custom",
  "single line": "Line",
  "poly line": "Line",
  star: "Star",
  circle: "Circle",
  "candy cane": "Candy Cane",
  "candy canes": "Candy Cane",
  "window frame": "Window",
  icicles: "Icicles",
  dmxgeneral: "DMX",
  dmxmovinghead: "DMX",
  dmxmovinghead3d: "DMX",
  image: "Image",
  "channel block": "Channel Block",
  wreaths: "Wreath",
};

/**
 * Attempt to infer a type from the model name when DisplayAs is "Custom"
 */
function inferTypeFromName(name: string): string {
  const lower = name.toLowerCase();
  const patterns: [RegExp, string][] = [
    [/spider/i, "Spider"],
    [/bat/i, "Bat"],
    [/tomb(stone)?/i, "Tombstone"],
    [/pumpkin/i, "Pumpkin"],
    [/ghost/i, "Ghost"],
    [/skull/i, "Skull"],
    [/skeleton/i, "Skeleton"],
    [/spinner|showstopper|overlord/i, "Spinner"],
    [/arch/i, "Arch"],
    [/tree/i, "Tree"],
    [/matrix|panel|p5|p10/i, "Matrix"],
    [/star/i, "Star"],
    [/snowflake|flake/i, "Snowflake"],
    [/wreath|rosa/i, "Wreath"],
    [/candy.?cane|cane/i, "Candy Cane"],
    [/icicle/i, "Icicles"],
    [/window/i, "Window"],
    [/flood/i, "Flood"],
    [/pole/i, "Pole"],
    [/fence/i, "Fence"],
    [/bulb|singing/i, "Singing Face"],
    [/tune.?to|radio/i, "Sign"],
    [/present|gift/i, "Present"],
    [/firework|spiral/i, "Spiral Tree"],
    [/mega.?tree/i, "Mega Tree"],
    [/pixel.?forest/i, "Pixel Forest"],
    [/driveway|outline/i, "Outline"],
    [/eave|roofline/i, "Roofline"],
  ];

  for (const [pattern, type] of patterns) {
    if (pattern.test(lower)) return type;
  }
  return "Custom";
}

/**
 * Normalize the DisplayAs value to a canonical type
 */
export function normalizeType(displayAs: string, name: string): string {
  const mapped = TYPE_MAP[displayAs.toLowerCase()];
  if (mapped && mapped !== "Custom") return mapped;

  // For Custom or unmapped types, try to infer from name
  return inferTypeFromName(name);
}

/**
 * Calculate pixel count from model parameters.
 * Different DisplayAs types use parm1/parm2/parm3 differently.
 */
function calculatePixelCount(
  displayAs: string,
  parm1: number,
  parm2: number,
  parm3: number,
  pixelCountAttr?: string,
  customModel?: string,
): number {
  // If PixelCount attribute is explicitly set, use it
  if (pixelCountAttr && parseInt(pixelCountAttr) > 0) {
    return parseInt(pixelCountAttr);
  }

  const type = displayAs.toLowerCase();

  switch (type) {
    case "arches":
      // parm1 = nodes per arch, parm2 = num arches, parm3 = lights per node
      return parm1 * parm2 * Math.max(parm3, 1);
    case "tree 360":
    case "tree flat":
      // parm1 = strands, parm2 = lights per strand
      return parm1 * parm2;
    case "single line":
    case "poly line":
      // parm2 = total pixels
      return parm2;
    case "star":
      // parm1 = points, parm2 = lights per point
      return parm1 * parm2;
    case "spinner":
      // parm1 = arms, parm2 = lights per arm, parm3 = start at center
      return parm1 * parm2;
    case "candy cane":
    case "candy canes":
      // parm1 = nodes, parm2 = canes per string
      return parm1 * parm2;
    case "circle":
    case "wreaths":
      // parm2 = nodes in circle
      return parm2;
    case "icicles":
      // parm2 = total drops
      return parm2;
    case "matrix":
    case "vert matrix":
      // parm2 = pixels per strand, parm3 = strands
      return parm2 * parm3;
    case "window frame":
      // parm1 = top, parm2 = left/right, parm3 = bottom
      return parm1 + parm2 * 2 + parm3;
    case "custom":
      // For custom models, count non-empty cells in the CustomModel grid
      if (customModel) {
        const cells = customModel.split(/[;,]/);
        return cells.filter((c) => c.trim() !== "").length;
      }
      return parm1 * parm2;
    default:
      // Fallback: parm1 * parm2 is a common pattern
      return Math.max(parm1 * parm2, parm1, parm2);
  }
}

/**
 * Estimate pixel count from a submodel's range data.
 * Range formats: "1-40" or "1,2,3,4,5" or "1-20,25-40"
 */
function estimateSubmodelPixels(rangeData: string): number {
  if (!rangeData) return 0;
  let count = 0;
  const segments = rangeData.split(",");
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (trimmed.includes("-")) {
      const [start, end] = trimmed.split("-").map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        count += Math.abs(end - start) + 1;
      }
    } else if (trimmed !== "" && !isNaN(Number(trimmed))) {
      count += 1;
    }
  }
  return count;
}

/**
 * Parse an xlights_rgbeffects.xml string into structured model data.
 * Uses DOMParser for browser-side XML parsing.
 */
export function parseRgbEffectsXml(
  xmlString: string,
  fileName: string = "xlights_rgbeffects.xml",
): ParsedLayout {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`Invalid XML file: ${parseError.textContent}`);
  }

  const modelElements = doc.querySelectorAll("models > model");
  const models: ParsedModel[] = [];

  modelElements.forEach((el) => {
    const name = el.getAttribute("name") || "";
    const displayAs = el.getAttribute("DisplayAs") || "Custom";
    const parm1 = parseInt(el.getAttribute("parm1") || "0") || 0;
    const parm2 = parseInt(el.getAttribute("parm2") || "0") || 0;
    const parm3 = parseInt(el.getAttribute("parm3") || "0") || 0;
    const stringType = el.getAttribute("StringType") || "";
    const startChannel = el.getAttribute("StartChannel") || "";
    const worldPosX = parseFloat(el.getAttribute("WorldPosX") || "0") || 0;
    const worldPosY = parseFloat(el.getAttribute("WorldPosY") || "0") || 0;
    const worldPosZ = parseFloat(el.getAttribute("WorldPosZ") || "0") || 0;
    const pixelCountAttr = el.getAttribute("PixelCount") || undefined;
    const customModel = el.getAttribute("CustomModel") || undefined;

    // Parse submodels
    const submodelEls = el.querySelectorAll("subModel");
    const submodels: SubModel[] = [];
    submodelEls.forEach((sub) => {
      const subName = sub.getAttribute("name") || "";
      const subType = sub.getAttribute("type") || "ranges";
      // Collect all line data (line0, line1, line2, etc.)
      const lineData: string[] = [];
      for (let i = 0; i < 20; i++) {
        const line = sub.getAttribute(`line${i}`);
        if (line) lineData.push(line);
        else break;
      }
      const rangeData = lineData.join(",");
      submodels.push({
        name: subName,
        type: subType,
        rangeData,
        pixelCount: estimateSubmodelPixels(rangeData),
      });
    });

    // Parse aliases
    const aliasEls = el.querySelectorAll("Aliases > alias");
    const aliases: string[] = [];
    aliasEls.forEach((alias) => {
      const aliasName = alias.getAttribute("name") || "";
      if (aliasName) aliases.push(aliasName);
    });

    const type = normalizeType(displayAs, name);
    const pixelCount = calculatePixelCount(
      displayAs,
      parm1,
      parm2,
      parm3,
      pixelCountAttr,
      customModel,
    );

    // Detect group models (name ends with "GRP" or "- GRP" or "Group")
    const isGroup =
      /[-\s]GRP$|[-\s]Group$/i.test(name) ||
      name.toUpperCase().endsWith(" GRP");

    models.push({
      name,
      displayAs,
      type,
      pixelCount,
      parm1,
      parm2,
      parm3,
      stringType,
      startChannel,
      worldPosX,
      worldPosY,
      worldPosZ,
      submodels,
      isGroup,
      aliases,
    });
  });

  return {
    models,
    modelCount: models.length,
    fileName,
  };
}
