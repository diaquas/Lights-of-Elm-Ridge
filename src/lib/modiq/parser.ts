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

/** Group classification: MODEL_GRP = independent models, SUBMODEL_GRP = submodels of a single parent */
export type GroupType = "MODEL_GRP" | "SUBMODEL_GRP";

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
  memberModels: string[]; // For groups: names of models in this group

  // ── Group classification (only set when isGroup=true) ──
  /** Type of group: MODEL_GRP (independent models) or SUBMODEL_GRP (parts of a single prop) */
  groupType?: GroupType;
  /** For SUBMODEL_GRP: the parent prop name(s) the submodels belong to */
  parentModels?: string[];
  /** For SUBMODEL_GRP: semantic category for cross-vendor matching (decorative, circular, radial) */
  semanticCategory?: string;
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

// ─── Group Classification ─────────────────────────────────────────
// Distinguishes between MODEL_GRP (collection of independent models)
// and SUBMODEL_GRP (collection of submodels within a single parent prop)

/**
 * Reliable SUBMODEL_GRP prefixes — these ALWAYS indicate submodel groups.
 * Only includes patterns that are unambiguous.
 */
const SUBMODEL_GROUP_PREFIXES = [
  "S - ",              // Showstopper convention: "S - Big Hearts", "S - Rings"
  "Spinners - ",       // Generic spinner submodel groups
];

/**
 * Vendor prefixes that, when combined with element keywords, indicate SUBMODEL_GRP.
 * These alone do NOT indicate SUBMODEL_GRP (e.g., "PPD Wreath GRP" is MODEL_GRP).
 */
const SPINNER_VENDOR_PREFIXES = [
  "PPD",               // PPD spinners
  "GE SpinReel",       // Gilbert Engineering SpinReel
  "GE SpinArchy",      // Gilbert Engineering SpinArchy
  "GE Grand Illusion", // Gilbert Engineering Grand Illusion
  "GE Rosa",           // Gilbert Engineering Rosa Grande
  "GE CC Boom",        // Gilbert Engineering Click Click Boom
  "GE Overlord",       // Gilbert Engineering Overlord
  "GE Fuzion",         // Gilbert Engineering Fuzion
  "GE Click Click",    // Gilbert Engineering Click Click Boom alt
  "GE Preying",        // Gilbert Engineering Preying Spider
  "EFL",               // EFL spinner
  "CCC",               // Christmas Concepts Corp
  "Boscoyo",           // Boscoyo
];

/**
 * Element keywords that indicate submodel components of a spinner.
 * When combined with a vendor prefix, these indicate SUBMODEL_GRP.
 */
const SUBMODEL_ELEMENT_KEYWORDS = [
  "Spokes", "Spoke",
  "Rings", "Ring",
  "Arms", "Arm",
  "Petals", "Petal",
  "Flowers", "Flower",
  "Hearts", "Heart",
  "Circles", "Circle",
  "Spirals", "Spiral",
  "Balls", "Ball",
  "Ribbons", "Ribbon",
  "Triangles", "Triangle",
  "Diamonds", "Diamond",
  "Scallops", "Scallop",
  "Feathers", "Feather",
  "Stars", "Star",
  "Arrows", "Arrow",
  "Outline",
  "Center",
  "Outer",
  "Inner",
  "Even",
  "Odd",
  "Swirl",
  "Willow",
  "Saucers", "Saucer",
  "Bows", "Bow",
  "Leaf",
  "Iris",
  "Chalice",
  "Torches", "Torch",
  "Hooks", "Hook",
  "Stigma",
  "Thelma",
  "Snarfle",
  "Desparado",
  "Lolli",
  "Noose",
  "Friction",
  "Points",
  "Spaceship",
  "Arrowhead",
  "Windmill",
  "Cone", "Cones",
  "Finger",
  "Piece of Work",
  "Pull My Finger",
  "Off Limits",
  // Positional qualifiers when combined with vendor prefixes
  "All",     // "GE Rosa Grande Spokes All GRP"
];

/**
 * Regular model group patterns — these indicate collections of independent models
 * rather than submodels of a single prop.
 */
const MODEL_GROUP_PATTERNS = [
  /^All\s*-\s*.*-\s*GRP$/i,       // "All - Arches - GRP", "All - Poles - GRP"
  /^All\s+\w+s(?:\s|$)/i,         // "All Arches", "All Poles" (plural nouns)
  /^\d+\s+All\s+/i,               // "10 All Arches", "6 All Tombstones"
  /^GROUP\s*-/i,                  // "GROUP - All Ghosts"
  /^FOLDER\s*-/i,                 // "FOLDER - Rosa Tomb Groups"
  // Top-level product groups (vendor + product name + GRP, no element)
  /^PPD\s+\w+\s+GRP$/i,           // "PPD Wreath GRP" (not "PPD Wreath Spokes GRP")
  /^GE\s+\w+\s+GRP$/i,            // "GE Overlord GRP" (not "GE Overlord Spokes GRP")
  /^Spinner\s*-\s*\w+\s*\d*$/i,   // "Spinner - Showstopper 1", "Spinner - Fuzion"
];

/**
 * Check if a group name indicates a SUBMODEL_GRP based on vendor + element combination.
 */
function hasVendorPlusElement(groupName: string): boolean {
  const upperName = groupName.toUpperCase();

  // Check if name has a known vendor prefix
  const hasVendorPrefix = SPINNER_VENDOR_PREFIXES.some(prefix =>
    upperName.startsWith(prefix.toUpperCase())
  );

  if (!hasVendorPrefix) return false;

  // Check if name also contains an element keyword
  const hasElement = SUBMODEL_ELEMENT_KEYWORDS.some(keyword => {
    const keywordUpper = keyword.toUpperCase();
    // Must be a word boundary match (not part of product name)
    const regex = new RegExp(`\\b${keywordUpper}\\b`);
    return regex.test(upperName);
  });

  return hasElement;
}

/**
 * Semantic categories for submodel groups — used for cross-vendor matching.
 * Groups in the same semantic category are likely functionally equivalent.
 */
const SEMANTIC_CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  // Circular elements (rings, circles, balls)
  circular: [
    /\bRings?\b/i,
    /\bCircles?\b/i,
    /\bBalls?\b/i,
    /\bSaucers?\b/i,
  ],
  // Decorative shapes (hearts, flowers, petals, stars)
  decorative: [
    /\bHearts?\b/i,
    /\bFlowers?\b/i,
    /\bPetals?\b/i,
    /\bStars?\b/i,
    /\bDiamonds?\b/i,
    /\bBows?\b/i,
  ],
  // Radial elements (spokes, arms, arrows)
  radial: [
    /\bSpokes?\b/i,
    /\bArms?\b/i,
    /\bArrows?\b/i,
    /\bFeathers?\b/i,
  ],
  // Spiral/swirl elements
  spiral: [
    /\bSpirals?\b/i,
    /\bSwirl\b/i,
    /\bWillow\b/i,
    /\bRibbons?\b/i,
  ],
  // Outline/perimeter elements
  outline: [
    /\bOutline\b/i,
    /\bOuter\b/i,
    /\bInner\b/i,
    /\bCenter\b/i,
    /\bEdge\b/i,
  ],
  // Triangular elements
  triangular: [
    /\bTriangles?\b/i,
    /\bScallops?\b/i,
  ],
};

/**
 * Classify a group based on its member names.
 * Primary method: checks if members follow the "Parent/Submodel" pattern.
 */
function classifyGroupFromMembers(
  memberModels: string[]
): { groupType: GroupType; parentModels: string[] } {
  if (memberModels.length === 0) {
    return { groupType: "MODEL_GRP", parentModels: [] };
  }

  // Check if members follow "Parent/Submodel" pattern (e.g., "PPD Wreath/Spiral-1")
  const submodelPattern = /^(.+)\/(.+)$/;
  const parentNames = new Set<string>();
  let submodelCount = 0;

  for (const member of memberModels) {
    const match = member.match(submodelPattern);
    if (match) {
      parentNames.add(match[1]); // Collect parent model names
      submodelCount++;
    }
  }

  // If most/all members are submodels of a small set of parents, it's a SUBMODEL_GRP
  // Allow up to 2 parent models (some groups span related props)
  if (submodelCount >= memberModels.length * 0.5 && parentNames.size <= 2) {
    return {
      groupType: "SUBMODEL_GRP",
      parentModels: Array.from(parentNames),
    };
  }

  return { groupType: "MODEL_GRP", parentModels: [] };
}

/**
 * Classify a group based on its name (fallback when member analysis is inconclusive).
 */
function classifyGroupByName(groupName: string): GroupType {
  // Check if it matches known MODEL_GRP patterns first (take priority)
  for (const pattern of MODEL_GROUP_PATTERNS) {
    if (pattern.test(groupName)) {
      return "MODEL_GRP";
    }
  }

  // Check known SUBMODEL_GRP prefixes (reliable, unambiguous)
  for (const prefix of SUBMODEL_GROUP_PREFIXES) {
    if (groupName.startsWith(prefix)) {
      return "SUBMODEL_GRP";
    }
  }

  // Check vendor + element combination (e.g., "GE Rosa Spokes GRP" but not "GE Rosa GRP")
  if (hasVendorPlusElement(groupName)) {
    return "SUBMODEL_GRP";
  }

  // Default to MODEL_GRP for generic groups
  return "MODEL_GRP";
}

/**
 * Determine the semantic category for a submodel group.
 * Used for cross-vendor matching (e.g., "Hearts" ≈ "Flowers" in "decorative").
 */
function getSemanticCategory(groupName: string): string | undefined {
  for (const [category, patterns] of Object.entries(SEMANTIC_CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(groupName)) {
        return category;
      }
    }
  }
  return undefined;
}

/**
 * Fully classify a group: determine type, parent models, and semantic category.
 */
function classifyGroup(
  groupName: string,
  memberModels: string[]
): { groupType: GroupType; parentModels?: string[]; semanticCategory?: string } {
  // Primary method: analyze member names for "Parent/Submodel" pattern
  const memberAnalysis = classifyGroupFromMembers(memberModels);

  if (memberAnalysis.groupType === "SUBMODEL_GRP") {
    return {
      groupType: "SUBMODEL_GRP",
      parentModels: memberAnalysis.parentModels,
      semanticCategory: getSemanticCategory(groupName),
    };
  }

  // Fallback: classify by name patterns
  const nameType = classifyGroupByName(groupName);

  if (nameType === "SUBMODEL_GRP") {
    return {
      groupType: "SUBMODEL_GRP",
      parentModels: [],
      semanticCategory: getSemanticCategory(groupName),
    };
  }

  return { groupType: "MODEL_GRP" };
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
      isGroup: false,
      aliases,
      memberModels: [],
    });
  });

  // ─── Parse Model Groups ────────────────────────────────────────
  // In xLights, groups are stored as <modelGroup> elements inside
  // <modelGroups>, completely separate from <model> elements.
  const groupElements = doc.querySelectorAll("modelGroups > modelGroup");
  groupElements.forEach((el) => {
    const name = el.getAttribute("name") || "";
    if (!name) return;

    // Member models are stored as a comma-separated "models" attribute
    const modelsAttr = el.getAttribute("models") || "";
    const memberModels = modelsAttr
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    // Groups may have position data via centrex/centrey or WorldPosX/WorldPosY
    const worldPosX =
      parseFloat(el.getAttribute("WorldPosX") || "") ||
      parseFloat(el.getAttribute("centrex") || "") ||
      0;
    const worldPosY =
      parseFloat(el.getAttribute("WorldPosY") || "") ||
      parseFloat(el.getAttribute("centrey") || "") ||
      0;
    const worldPosZ =
      parseFloat(el.getAttribute("WorldPosZ") || "") || 0;

    // Parse aliases (groups can have aliases too)
    const aliasEls = el.querySelectorAll("Aliases > alias");
    const aliases: string[] = [];
    aliasEls.forEach((alias) => {
      const aliasName = alias.getAttribute("name") || "";
      if (aliasName) aliases.push(aliasName);
    });

    // Classify the group: MODEL_GRP (independent models) or SUBMODEL_GRP (parts of a prop)
    const classification = classifyGroup(name, memberModels);

    models.push({
      name,
      displayAs: "ModelGroup",
      type: "Group",
      pixelCount: 0,
      parm1: 0,
      parm2: 0,
      parm3: 0,
      stringType: "",
      startChannel: "",
      worldPosX,
      worldPosY,
      worldPosZ,
      submodels: [],
      isGroup: true,
      aliases,
      memberModels,
      groupType: classification.groupType,
      parentModels: classification.parentModels,
      semanticCategory: classification.semanticCategory,
    });
  });

  return {
    models,
    modelCount: models.length,
    fileName,
  };
}
