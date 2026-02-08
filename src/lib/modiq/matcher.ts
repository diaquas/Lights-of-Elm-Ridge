/**
 * ModIQ — Matching Engine (V3)
 *
 * Three-phase matching: Groups first, then individual models, then submodels.
 *
 * Scoring priority (V3 — six-factor scoring):
 *   1. Fuzzy Name Match       (38%) — the strongest signal
 *   2. Spatial Position        (22%) — disambiguates duplicates (Arch 1 vs Arch 2)
 *   3. Shape Classification    (13%) — circular, linear, matrix, point, custom
 *   4. Model Type (DisplayAs)  (10%) — xLights universal type
 *   5. Node Count              (10%) — pixel/node count similarity (ratio-based)
 *   6. Structure               (7%)  — submodel count similarity
 *
 * Groups: matched primarily on name + type with boosted confidence.
 * Groups appear at the top of each confidence section.
 *
 * Training-derived rules (V2.1 → V3 updates):
 *   - Node count: ratio-based scoring (V3), replaces V2.1 drift tiers
 *   - Moving Head / MH models isolated: only match other moving heads
 *   - Matrix type-locked: only matches other Matrix types
 *   - "Pixel Pole" treated as synonym for "Pole"
 *   - Floods type-locked: only match other floods
 *   - "NO" in group names prevents cross-matching
 *   - Holiday mismatch detection (Halloween vs Christmas indicators)
 *   - GE vendor prefix requires exact product line match
 *
 * Training-derived rules (V2.2):
 *   - House-location terms deprioritize name, boost type (office, garage, etc.)
 *   - Flood↔Line interop: floods can match Line-type models
 *   - Singing face/prop boost with number matching
 *   - Eave/vert individual deprioritization against non-house-line models
 *   - Group-only children detection: lower confidence when no children exposed
 *   - Phase 3 quantity matching: cross-prop class matching for unmapped models
 *
 * Vendor-catalog derived rules (V2.3):
 *   - Eave↔horizontal and vert↔vertical treated as synonymous exact matches
 *   - Canonical base-name matching via EQUIVALENT_BASES
 *   - Vendor pixel fingerprinting (CCC spinners, GE Overlord, Boscoyo, etc.)
 *   - Hybrid prop type relations (Snowflake↔Spinner, Arch↔Matrix)
 *   - Enhanced singing face detection via submodel names (mouth/eyes/phoneme)
 *   - Vendor abbreviation synonyms (MOAW, BOAW, spin, etc.)
 *   - Phase 3b: Group-level interchangeability-class matching
 *
 * Hard exclusion rules (V2.4):
 *   - DMX models excluded entirely (Pixel2DMX, Fog Machine, DMX Head, DmxGeneral)
 *   - Moving Head isolation: MH/Moving Head models only match other moving heads
 *     Detects MH prefix variants (MHR7, MH1), DMX channel names (Gobo, Pan, Tilt, etc.)
 *   - Extreme pixel count drift (≥1000) is a hard zero for non-group models
 *
 * Algorithm tuning (V3.1 — Ticket 38):
 *   - HIGH confidence threshold lowered from 0.85 → 0.80
 *   - Dynamic name weight: boost to 55% for near-exact name matches (≥0.95)
 *   - Spatial reweight guard: only applies when spatial factor > 0.1
 *   - Index normalization: strip zero-padded indices ("Arch 01" → "Arch 1")
 *   - Pixel floor raised from 0.5 → 0.6 for same-name/same-type matches
 *   - Fuzzy index bonus: +0.10 when base name AND index both match exactly
 *   - Quantity penalty softened from 0.70x → 0.80x
 *   - Expanded synonyms (~40 new entries: colors, strands, holidays, etc.)
 *   - Expanded equivalent bases (~20 new entries: stars, trees, icicles, etc.)
 */

import type { ParsedModel } from "./parser";
import { calculateSynonymBoost, tokenizeName } from "./semanticSynonyms";

// ─── Types ──────────────────────────────────────────────────────────

export type Confidence = "high" | "medium" | "low" | "unmapped";

export interface SubmodelMapping {
  sourceName: string;
  destName: string;
  confidence: Confidence;
  pixelDiff: string;
}

export interface ModelMapping {
  sourceModel: ParsedModel;
  destModel: ParsedModel | null;
  score: number;
  confidence: Confidence;
  factors: {
    name: number;
    spatial: number;
    shape: number;
    type: number;
    pixels: number;
    structure: number;
  };
  reason: string;
  submodelMappings: SubmodelMapping[];
}

export interface MappingResult {
  mappings: ModelMapping[];
  totalSource: number;
  totalDest: number;
  mappedCount: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  unmappedSource: number;
  unmappedDest: number;
  unusedDestModels: ParsedModel[];
}

// ─── Weights (V3 — six-factor scoring) ──────────────────────────────
//
// V3 changes:
//   - Added `structure` factor (7%) for submodel/member count similarity
//   - Boosted `pixels` from 8% → 10% (now ratio-based, more informative)
//   - Reduced spatial, shape, type by ~2% each to accommodate new factors

const WEIGHTS = {
  name: 0.38,
  spatial: 0.22,
  shape: 0.13,
  type: 0.1,
  pixels: 0.1,
  structure: 0.07,
};

// ═══════════════════════════════════════════════════════════════════
// FACTOR 1: Fuzzy Name Matching (40%)
// ═══════════════════════════════════════════════════════════════════

/**
 * Expanded abbreviation/synonym map built from analyzing community xmap files.
 * Maps short forms → canonical forms for cross-matching.
 *
 * Priority: Direct name matches always win. These synonyms are fallbacks
 * for when no exact match exists.
 */
const SYNONYMS: Record<string, string[]> = {
  // Directions
  l: ["left", "lft"],
  r: ["right", "rgt", "rt"],
  c: ["center", "ctr", "centre", "mid", "middle"],
  lt: ["left"],
  // Sizes
  lg: ["large", "big"],
  sm: ["small", "mini", "tiny"],
  med: ["medium"],
  // Structural
  grp: ["group", "all"],
  mod: ["model"],
  vert: ["vertical", "verticals", "verts", "verticle", "verticl"],
  horiz: ["horizontal", "horizontals"],
  eave: ["horizontal", "horizontals", "eaves", "roofline", "icicles"],
  roofline: ["eave", "eaves", "horizontal", "horizontals"],
  // Props
  arch: ["arches", "archway"],
  ss: ["showstopper"],
  ge: ["gilbert", "engineering"],
  dw: ["driveway"],
  sw: ["sidewalk"],
  pole: ["pixel pole"],
  cane: ["candy cane", "candycane", "canes"],
  candycane: ["cane", "canes"],
  // Vendor abbreviations / type patterns
  spin: ["spinner"],
  moaw: ["wreath"],
  boaw: ["wreath"],
  // Spanish-English translations (comprehensive)
  tumba: ["tombstone", "tomb", "tumbas"],
  tombstone: ["tumba", "tumbas", "tomb", "rip"],
  contorno: ["outline", "contornos"],
  outline: ["contorno", "contornos"],
  estrella: ["star", "estrellas"],
  arbol: ["tree", "arboles"],
  cana: ["cane", "canas"],
  araña: ["spider", "arañas"],
  murcielago: ["bat", "murcielagos"],
  fantasma: ["ghost", "fantasmas"],
  calabaza: ["pumpkin", "calabazas"],
  rip: ["rip"], // stays same in both languages
  // Cross-holiday/prop mappings (used when no direct match exists)
  firework: ["spiral tree", "inverted tree", "spiral", "fireworks"],
  spiral: ["firework", "fireworks", "inverted tree"],
  "pixel forest": ["peace stakes", "vertical matrix", "icicles"],
  "peace stakes": ["pixel forest"],
  // Halloween ↔ Christmas prop swaps (when no direct match exists)
  "mini trees": ["ghosts", "black cats"],
  "mini pumpkins": ["ghosts", "stars"],
  ghosts: ["mini trees", "mini pumpkins"],
  "black cats": ["mini trees", "spiral trees"],
  "spiral trees": ["black cats"],
  // Structural equivalents
  fence: ["vertical matrix"],
  poles: ["verticals"],
  // Submodel swaps for singing props (pumpkin ↔ ghost/skull)
  "pumpkin eyes": ["ghost eyes", "skull eyes"],
  "pumpkin outline": ["ghost body", "skull outline"],
  // GE product synonyms (same physical prop, different vendor names)
  fuzion: ["rosa wreath", "rosawreath", "rosa"],
  "rosa wreath": ["fuzion"],
  rosawreath: ["fuzion"],
  // Flake/snowflake synonyms (vendor product names)
  chromaflake: ["snowflake", "flake"],
  icequeen: ["snowflake", "flake"],
  "flake arms": ["snowflake tips", "tips"],
  "flake spokes": ["center stars", "snowflake spokes"],
  // Outline/trim products
  chromatrim: ["outline", "roofline", "trim"],
  // Singing prop types (all singing props are interchangeable)
  pimp: ["singing pumpkin", "singing face", "singing prop"],
  "singing pumpkin": ["pimp", "singing skull", "singing face", "singing prop"],
  "singing skull": ["pimp", "singing pumpkin", "singing face"],
  "singing tree": ["singing bulb", "efl snowman", "singing face"],
  "singing bulb": ["singing tree", "efl snowman"],
  // Compound abbreviations
  mt: ["mega tree", "megatree"],
  mh: ["moving head", "movinghead"],
  ppd: ["wreath"],
  // Color variants (common LED color names used interchangeably)
  rgb: ["pixel", "pixels"],
  ww: ["warm white", "warmwhite"],
  cw: ["cool white", "coolwhite"],
  nw: ["neutral white"],
  "warm white": ["ww"],
  "cool white": ["cw"],
  // Group/collection terms
  cluster: ["group", "bunch"],
  bunch: ["cluster", "group"],
  set: ["group", "collection"],
  row: ["line", "strip"],
  // Strand/string terms (common in icicle and rope light naming)
  strand: ["string", "strip", "run"],
  string: ["strand", "strip", "run"],
  strip: ["strand", "string", "run"],
  run: ["strand", "string"],
  icicle: ["icicles", "drip", "drips"],
  drip: ["icicle", "icicles", "drips"],
  // Holiday prop swaps (additional)
  pumpkin: ["calabaza", "jack o lantern", "jackolantern"],
  skull: ["skeleton", "calavera"],
  skeleton: ["skull", "calavera"],
  bat: ["murcielago", "bats"],
  spider: ["araña", "spiders"],
  ghost: ["fantasma", "ghosts"],
  // Tree variants
  tree: ["arbol", "arboles"],
  "spiral tree": ["firework", "fireworks", "inverted tree"],
  "mini tree": ["mini trees", "small tree"],
  // Star variants
  star: ["estrella", "estrellas", "stars"],
  starburst: ["star burst", "explosion"],
  // Matrix/grid terms
  matrix: ["grid", "panel"],
  grid: ["matrix", "panel"],
  panel: ["matrix", "grid"],
  // Window terms
  window: ["windows", "frame"],
  frame: ["window", "border"],
  // Bulb/globe terms
  bulb: ["globe", "orb", "ball"],
  globe: ["bulb", "orb", "ball"],
  // Roof/fascia terms
  fascia: ["roofline", "eave", "gutter"],
  soffit: ["eave", "roofline"],
  gutter: ["roofline", "eave", "fascia"],
};

/**
 * Spanish-English translation map for model names.
 * Applies bidirectionally during name normalization.
 */
const SPANISH_ENGLISH_MAP: Record<string, string> = {
  // Spanish → English
  tumba: "tombstone",
  tumbas: "tombstones",
  contorno: "outline",
  contornos: "outlines",
  estrella: "star",
  estrellas: "stars",
  arbol: "tree",
  arboles: "trees",
  cana: "cane",
  canas: "canes",
  araña: "spider",
  arañas: "spiders",
  murcielago: "bat",
  murcielagos: "bats",
  fantasma: "ghost",
  fantasmas: "ghosts",
  calabaza: "pumpkin",
  calabazas: "pumpkins",
  todo: "all",
  todos: "all",
  linea: "line",
  lineas: "lines",
  // English → Spanish (reverse lookups handled by tokenization)
};

/**
 * Pre-computed reverse synonym map for O(1) lookup.
 * Maps each synonym value back to its canonical key.
 * Built once at module load time instead of O(n) lookup per tokenize() call.
 */
const REVERSE_SYNONYMS: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [key, vals] of Object.entries(SYNONYMS)) {
    for (const v of vals) {
      // For multi-word synonyms, map each word too
      map.set(v, key);
      const words = v.split(/\s+/);
      if (words.length > 1) {
        for (const w of words) map.set(w, key);
      }
    }
  }
  return map;
})();

/**
 * Canonical prop-type keywords. When these appear in a name,
 * they are the "essence" of what the model is.
 */
const PROP_KEYWORDS = [
  "arch",
  "arches",
  "archway",
  "bat",
  "bulb",
  "cane",
  "candy",
  "cat",
  "circle",
  "cross",
  "eave",
  "fence",
  "firework",
  "flake",
  "flood",
  "forest",
  "fuzion",
  "garage",
  "ghost",
  "horizontal",
  "house",
  "icicle",
  "icicles",
  "matrix",
  "mega",
  "megatree",
  "mini",
  "outline",
  "panel",
  "pole",
  "present",
  "pumpkin",
  "ring",
  "roof",
  "roofline",
  "rosa",
  "sign",
  "singing",
  "skull",
  "snowflake",
  "snowman",
  "spider",
  "spinner",
  "spiral",
  "star",
  "tombstone",
  "tree",
  "tune",
  "vertical",
  "window",
  "wreath",
];

/**
 * Equivalent base names — words treated as identical for base-name comparison.
 * "Eave 1" ≡ "Horizontal 1", "Vert 3" ≡ "Vertical 3", etc.
 * Maps each variant to a shared canonical form.
 */
const EQUIVALENT_BASES: Record<string, string> = {
  // Horizontal structural elements
  eave: "structural_horizontal",
  eaves: "structural_horizontal",
  horizontal: "structural_horizontal",
  horizontals: "structural_horizontal",
  roofline: "structural_horizontal",
  gutter: "structural_horizontal",
  // Vertical structural elements
  vert: "structural_vertical",
  verts: "structural_vertical",
  vertical: "structural_vertical",
  verticals: "structural_vertical",
  verticle: "structural_vertical",
  verticl: "structural_vertical",
  // Outline/border elements
  outline: "structural_outline",
  border: "structural_outline",
  trim: "structural_outline",
  perimeter: "structural_outline",
  // Arch props
  arch: "prop_arch",
  archway: "prop_arch",
  arc: "prop_arch",
  // Candy cane props
  cane: "prop_cane",
  candycane: "prop_cane",
  "candy cane": "prop_cane",
  // Mega tree props
  megatree: "prop_megatree",
  "mega tree": "prop_megatree",
  // Pole/pixel pole props
  pole: "prop_pole",
  "pixel pole": "prop_pole",
  // Spinner/pinwheel props
  spinner: "prop_spinner",
  pinwheel: "prop_spinner",
  // Wreath props
  wreath: "prop_wreath",
  rosa: "prop_wreath",
  // Flood/wash lights
  flood: "prop_flood",
  wash: "prop_flood",
  // Stake/rod props
  stake: "prop_stake",
  rod: "prop_stake",
  // Snowflake props
  snowflake: "prop_snowflake",
  flake: "prop_snowflake",
  chromaflake: "prop_snowflake",
  // Driveway/sidewalk props
  driveway: "structural_pathway",
  sidewalk: "structural_pathway",
  walkway: "structural_pathway",
  pathway: "structural_pathway",
  // Star props
  star: "prop_star",
  starburst: "prop_star",
  "star burst": "prop_star",
  // Tree props
  tree: "prop_tree",
  "mini tree": "prop_tree",
  // Icicle/drip props
  icicle: "prop_icicle",
  drip: "prop_icicle",
  icicles: "prop_icicle",
  drips: "prop_icicle",
  // Window/frame elements
  window: "structural_window",
  frame: "structural_window",
  // Strand/string elements
  strand: "prop_strand",
  string: "prop_strand",
  run: "prop_strand",
  // Matrix/grid elements
  matrix: "prop_matrix",
  grid: "prop_matrix",
  panel: "prop_matrix",
  // Tombstone/grave elements
  tombstone: "prop_tombstone",
  tomb: "prop_tombstone",
  tumba: "prop_tombstone",
  // Bulb/globe elements
  bulb: "prop_bulb",
  globe: "prop_bulb",
  orb: "prop_bulb",
};

/**
 * Map a base name to its canonical form using EQUIVALENT_BASES.
 * Each word is individually canonicalized so "eave" → "structural_horizontal".
 */
function canonicalBase(base: string): string {
  const words = base.split(/\s+/);
  return words.map((w) => EQUIVALENT_BASES[w] || w).join(" ");
}

/**
 * Simple English singularization for xLights model names.
 * Handles common plural patterns found in community layouts.
 * Intentionally conservative to avoid false positives
 * (e.g., "bus" should not become "bu").
 */
const SINGULAR_EXCEPTIONS = new Set([
  "icicles",
  "christmas",
  "canvas",
  "bus",
  "gas",
  "plus",
  "atlas",
  "lens",
  "class",
  "glass",
  "grass",
  "cross",
  "moss",
]);

function singularize(word: string): string {
  if (word.length <= 2) return word;
  if (SINGULAR_EXCEPTIONS.has(word)) return word;

  // "arches" → "arch", "bushes" → "bush", "witches" → "witch"
  if (
    word.endsWith("ches") ||
    word.endsWith("shes") ||
    word.endsWith("xes") ||
    word.endsWith("sses") ||
    word.endsWith("zzes")
  ) {
    return word.slice(0, -2);
  }
  // "icicles" handled by exception; "circles" → "circle", "poles" → "pole"
  if (word.endsWith("les") && word.length > 4) {
    return word.slice(0, -1);
  }
  // "tombstones" → "tombstone", "canes" → "cane", "lines" → "line"
  if (
    word.endsWith("nes") ||
    word.endsWith("tes") ||
    word.endsWith("ves") ||
    word.endsWith("zes") ||
    word.endsWith("res") ||
    word.endsWith("ges") ||
    word.endsWith("ces") ||
    word.endsWith("ses") ||
    word.endsWith("pes") ||
    word.endsWith("des") ||
    word.endsWith("kes")
  ) {
    return word.slice(0, -1);
  }
  // "spiders" → "spider", "stars" → "star", "floods" → "flood"
  // But NOT words ending in "ss" (class, grass, etc.)
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Split camelCase and PascalCase compound words into separate tokens.
 * "MegaTree" → "Mega Tree", "CandyCane" → "Candy Cane",
 * "RoofLine" → "Roof Line", "PixelPole" → "Pixel Pole"
 *
 * Preserves uppercase acronyms: "DMXHead" → "DMX Head", "GEFuzion" → "GE Fuzion"
 */
function splitCompoundWords(name: string): string {
  return (
    name
      // Insert space before uppercase letter preceded by lowercase: "MegaTree" → "Mega Tree"
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      // Insert space between uppercase run and following uppercase+lowercase: "DMXHead" → "DMX Head"
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
  );
}

/**
 * Normalize a model name for comparison:
 * - split camelCase/PascalCase compound words
 * - lowercase
 * - strip separators to spaces
 * - strip version prefixes (various formats from vendors)
 * - strip common noise words (all, group, grp, my, the, model, mod)
 * - singularize tokens (arches → arch, trees → tree)
 * - strip trailing numeric indices for base-name comparison
 */
function normalizeName(name: string): string {
  // Split compound words before lowercasing (needs case info)
  let n = splitCompoundWords(name).toLowerCase();
  // Strip version-prefix patterns from various vendors:
  //   "01.11 Garage Peak" → "Garage Peak"
  //   "02.14.0Grp FLOODS" → "FLOODS"
  //   "03.16.0Mod Showstopper" → "Showstopper"
  //   "01.9.3Sub Peace Stakes" → "Peace Stakes"
  //   "01 Cascading Arches" → "Cascading Arches" (simple numeric prefix)
  n = n.replace(/^\d{1,3}(\.\d{1,3})*(\.\d+)?(grp|mod|sub)?\s+/i, "");
  // Also strip simple leading "NN " pattern (e.g., "01 ", "15 ")
  n = n.replace(/^\d{1,2}\s+/, "");
  // Strip channel/universe/port prefixes common in community layouts:
  //   "CH01 Arch 1" → "Arch 1", "Ch-01 Arch" → "Arch"
  //   "U1-Arch 1" → "Arch 1", "Univ1 Arch" → "Arch"
  //   "Port 1 - Arch" → "Arch", "P1S1 - Arch" → "Arch"
  //   "[1] Arch" → "Arch", "(01) Arch" → "Arch"
  n = n.replace(/^ch[-.\s]?\d{1,3}\s*/i, "");
  n = n.replace(/^u(?:niv)?\d{1,3}[-.\s]?\s*/i, "");
  n = n.replace(/^p\d{1,2}s\d{1,2}\s*[-–]\s*/i, "");
  n = n.replace(/^port\s*\d{1,2}\s*[-–]\s*/i, "");
  n = n.replace(/^\[\d{1,3}\]\s*/, "");
  n = n.replace(/^\(\d{1,3}\)\s*/, "");
  // Strip "NN - " dash-separated numeric prefix (e.g., "01 - Arch 1")
  n = n.replace(/^\d{1,2}\s*[-–]\s*/, "");
  // Replace separators with spaces
  n = n.replace(/[-_.\t]+/g, " ");
  // Strip noise words (keep "no" — it's meaningful for group matching)
  n = n.replace(/\b(all|group|grp|my|the|model|mod|everything|but)\b/gi, "");
  // Singularize each token to normalize plurals
  n = n.split(/\s+/).map(singularize).join(" ");
  // Normalize zero-padded indices: "arch 01" → "arch 1", "tree 003" → "tree 3"
  // Preserves non-index numbers like pixel counts embedded mid-name
  n = n.replace(/\b0+(\d+)\b/g, "$1");
  // Collapse whitespace
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

/**
 * Extract the "base name" — the prop-type keyword without numeric index.
 * "Arch 3" → "arch", "Spinner - Showstopper 2" → "spinner showstopper"
 */
function baseName(name: string): string {
  let n = normalizeName(name);
  // Strip trailing numbers (but not numbers mid-name like "p5" or "350")
  n = n.replace(/\s+\d+$/, "");
  // Strip leading numbers left over
  n = n.replace(/^\d+\s+/, "");
  return n;
}

/**
 * Extract the numeric index from a name (for positional ordering).
 * "Arch 3" → 3, "Spider - 12" → 12, "Pole" → -1
 */
function extractIndex(name: string): number {
  const n = normalizeName(name);
  const match = n.match(/(\d+)\s*$/);
  return match ? parseInt(match[1]) : -1;
}

/**
 * Tokenization cache to avoid re-computing for the same normalized names.
 * Cleared between matching sessions via clearTokenCache().
 */
const tokenCache = new Map<string, Set<string>>();

/**
 * Clear the tokenization cache. Call between independent matching sessions.
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Expand a single token through synonym chains (forward + reverse).
 * Returns all reachable synonyms for the token.
 */
function expandToken(tok: string): string[] {
  const result: string[] = [tok];
  // Forward lookup: "ss" → ["showstopper"]
  const syns = SYNONYMS[tok];
  if (syns) {
    for (const s of syns) result.push(s);
  }
  // Reverse lookup: "showstopper" → "ss"
  const reverseKey = REVERSE_SYNONYMS.get(tok);
  if (reverseKey) result.push(reverseKey);
  return result;
}

/**
 * Tokenize a normalized name, expanding synonyms with 2-pass resolution.
 * Pass 1: expand each raw token's direct synonyms.
 * Pass 2: expand any new single-word tokens added in pass 1 to catch
 *          abbreviation chains (e.g., "ss" → "showstopper" → "show stopper").
 * Uses pre-computed REVERSE_SYNONYMS for O(1) reverse lookup.
 * Results are cached for repeated lookups of the same name.
 */
function tokenize(normalized: string): Set<string> {
  const cached = tokenCache.get(normalized);
  if (cached) return cached;

  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  const expanded = new Set<string>();

  // Pass 1: direct expansion
  for (const tok of rawTokens) {
    for (const e of expandToken(tok)) expanded.add(e);
  }

  // Pass 2: expand any new single-word tokens from pass 1
  // This catches chains like "ss" → "showstopper" → then "showstopper"
  // also maps to "show stopper" or other variants.
  // Only expand tokens that weren't in the original raw set.
  const pass1Tokens = [...expanded];
  for (const tok of pass1Tokens) {
    if (!rawTokens.includes(tok) && !tok.includes(" ")) {
      for (const e of expandToken(tok)) expanded.add(e);
    }
  }

  tokenCache.set(normalized, expanded);
  return expanded;
}

/**
 * Core fuzzy name score.
 *
 * Strategy:
 * 1. Exact normalized match → 1.0
 * 2. Base-name match (ignoring index) → 0.85
 * 3. Token overlap with synonym expansion → proportional score
 * 4. Substring containment bonus
 */
function scoreName(source: ParsedModel, dest: ParsedModel): number {
  const srcNorm = normalizeName(source.name);
  const destNorm = normalizeName(dest.name);

  // Exact normalized match
  if (srcNorm === destNorm) return 1.0;

  const srcBase = baseName(source.name);
  const destBase = baseName(dest.name);

  // Base name exact match (e.g. "arch" === "arch" for "Arch 1" vs "ARCH 3")
  if (srcBase === destBase && srcBase.length > 0) return 0.85;

  // Canonical base-name match: e.g. "Eave 1" ≡ "Horizontal 1",
  // "Vert 3" ≡ "Vertical 3", including common misspellings.
  const srcCanonical = canonicalBase(srcBase);
  const destCanonical = canonicalBase(destBase);
  if (
    srcCanonical === destCanonical &&
    srcCanonical.length > 0 &&
    srcBase !== destBase
  ) {
    const srcIdx = extractIndex(source.name);
    const destIdx = extractIndex(dest.name);
    if (srcIdx !== -1 && destIdx !== -1 && srcIdx === destIdx) return 1.0;
    return 0.85;
  }

  // "Pixel Pole N" and "Pole N" are the same thing
  const srcPoleBase = srcBase.replace(/^pixel\s+/, "");
  const destPoleBase = destBase.replace(/^pixel\s+/, "");
  if (
    srcPoleBase === destPoleBase &&
    srcPoleBase.length > 0 &&
    (srcBase.startsWith("pixel ") || destBase.startsWith("pixel ")) &&
    extractIndex(source.name) === extractIndex(dest.name) &&
    extractIndex(source.name) !== -1
  ) {
    return 1.0;
  }

  // Singing face/prop: boost when both models are singing types.
  // Use numbers when possible; otherwise fall back to nodes/submodels.
  if (isSinging(source) && isSinging(dest)) {
    const srcIdx = extractIndex(source.name);
    const destIdx = extractIndex(dest.name);
    if (srcIdx !== -1 && destIdx !== -1 && srcIdx === destIdx) {
      return 1.0; // Same singing face number
    }
    return 0.85; // Both singing — rank by nodes/submodels
  }

  // Tokenized overlap with synonym expansion
  const srcTokens = tokenize(srcNorm);
  const destTokens = tokenize(destNorm);

  if (srcTokens.size === 0 || destTokens.size === 0) return 0;

  // Count matches (bidirectional)
  let matches = 0;
  for (const t of srcTokens) {
    if (destTokens.has(t)) matches++;
  }
  const overlapScore = matches / Math.max(srcTokens.size, destTokens.size);

  // Substring containment bonus: "showstopper" in "Showstopper Spinner Left"
  let substringBonus = 0;
  if (srcBase.length >= 3 && destNorm.includes(srcBase)) substringBonus = 0.15;
  else if (destBase.length >= 3 && srcNorm.includes(destBase))
    substringBonus = 0.15;

  // Prop keyword match bonus: if both contain the same prop keyword
  let keywordBonus = 0;
  for (const kw of PROP_KEYWORDS) {
    if (srcNorm.includes(kw) && destNorm.includes(kw)) {
      keywordBonus = 0.2;
      break;
    }
  }

  // Check aliases: if any alias of source matches dest (or vice versa)
  let aliasBonus = 0;
  for (const alias of source.aliases) {
    const aliasNorm = normalizeName(alias.replace(/^oldname:/, ""));
    if (aliasNorm === destNorm || aliasNorm === destBase) {
      aliasBonus = 0.3;
      break;
    }
  }
  for (const alias of dest.aliases) {
    const aliasNorm = normalizeName(alias.replace(/^oldname:/, ""));
    if (aliasNorm === srcNorm || aliasNorm === srcBase) {
      aliasBonus = 0.3;
      break;
    }
  }

  // Semantic synonym boost: catches "Lawn Outline" ↔ "Yard Border" etc.
  // Only applies when existing overlap is low (avoids double-boosting)
  let semanticBoost = 0;
  if (overlapScore < 0.5) {
    const srcSemanticTokens = tokenizeName(source.name);
    const destSemanticTokens = tokenizeName(dest.name);
    if (srcSemanticTokens.length > 0 && destSemanticTokens.length > 0) {
      const synScore = calculateSynonymBoost(
        srcSemanticTokens,
        destSemanticTokens,
      );
      if (synScore > 0.4) {
        semanticBoost = synScore * 0.25;
      }
    }
  }

  return Math.min(
    1.0,
    overlapScore + substringBonus + keywordBonus + aliasBonus + semanticBoost,
  );
}

/**
 * Score how well two groups match based on their member model lists.
 * Compares the base names of member models to find overlap.
 * Returns 0..1 where 1 means identical member composition.
 */
function scoreMemberOverlap(source: ParsedModel, dest: ParsedModel): number {
  const srcMembers = source.memberModels || [];
  const destMembers = dest.memberModels || [];

  if (srcMembers.length === 0 || destMembers.length === 0) return 0;

  // Extract base names from member model names
  const srcBases = new Set(srcMembers.map((m) => baseName(m)));
  const destBases = new Set(destMembers.map((m) => baseName(m)));

  // Count how many base names overlap
  let matches = 0;
  for (const b of srcBases) {
    if (b.length > 0 && destBases.has(b)) matches++;
  }

  if (matches === 0) {
    // Try token-level matching for cross-language cases
    // Optimization: pre-tokenize all members first (uses cache)
    const srcTokenSets = srcMembers.map((m) => tokenize(normalizeName(m)));
    const destTokenSets = destMembers.map((m) => tokenize(normalizeName(m)));

    // Build combined dest token set for O(1) lookups
    const allDestTokens = new Set<string>();
    for (const dSet of destTokenSets) {
      for (const t of dSet) allDestTokens.add(t);
    }

    let tokenMatches = 0;
    for (const srcSet of srcTokenSets) {
      // Quick check: does srcSet have ANY token in dest pool?
      let hasAnyOverlap = false;
      for (const t of srcSet) {
        if (allDestTokens.has(t)) {
          hasAnyOverlap = true;
          break;
        }
      }
      if (!hasAnyOverlap) continue;

      // Full check: find a destSet with >50% overlap
      for (const destSet of destTokenSets) {
        let overlap = 0;
        const threshold = Math.max(srcSet.size, destSet.size) * 0.5;
        for (const t of srcSet) {
          if (destSet.has(t)) {
            overlap++;
            // Early exit: already past threshold
            if (overlap > threshold) break;
          }
        }
        if (overlap / Math.max(srcSet.size, destSet.size) > 0.5) {
          tokenMatches++;
          break;
        }
      }
    }
    return tokenMatches / Math.max(srcMembers.length, destMembers.length);
  }

  return matches / Math.max(srcBases.size, destBases.size);
}

// ═══════════════════════════════════════════════════════════════════
// FACTOR 2: Spatial Position (25%)
// ═══════════════════════════════════════════════════════════════════

interface NormalizedBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function getNormalizedBounds(models: ParsedModel[]): NormalizedBounds {
  const nonGroup = models.filter((m) => !m.isGroup);
  if (nonGroup.length === 0) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }
  return {
    minX: Math.min(...nonGroup.map((m) => m.worldPosX)),
    maxX: Math.max(...nonGroup.map((m) => m.worldPosX)),
    minY: Math.min(...nonGroup.map((m) => m.worldPosY)),
    maxY: Math.max(...nonGroup.map((m) => m.worldPosY)),
  };
}

function normalizePosition(value: number, min: number, max: number): number {
  const range = max - min;
  if (range === 0) return 0.5;
  return (value - min) / range;
}

/**
 * Spatial scoring using Euclidean distance in normalized space.
 * Closer models score higher. Handles the Arch1-vs-Arch2 problem:
 * when two arches have the same base name, position is the tiebreaker.
 */
function scoreSpatial(
  source: ParsedModel,
  dest: ParsedModel,
  sourceBounds: NormalizedBounds,
  destBounds: NormalizedBounds,
): number {
  if (source.isGroup || dest.isGroup) return 0.5;

  const srcX = normalizePosition(
    source.worldPosX,
    sourceBounds.minX,
    sourceBounds.maxX,
  );
  const srcY = normalizePosition(
    source.worldPosY,
    sourceBounds.minY,
    sourceBounds.maxY,
  );
  const destX = normalizePosition(
    dest.worldPosX,
    destBounds.minX,
    destBounds.maxX,
  );
  const destY = normalizePosition(
    dest.worldPosY,
    destBounds.minY,
    destBounds.maxY,
  );

  // Euclidean distance in normalized [0,1] space. Max possible = sqrt(2) ≈ 1.414
  const dist = Math.sqrt((srcX - destX) ** 2 + (srcY - destY) ** 2);

  // Convert to score: 0 distance = 1.0, sqrt(2) distance = 0.0
  return Math.max(0, 1.0 - dist / 1.414);
}

// ═══════════════════════════════════════════════════════════════════
// FACTOR 3: Shape Classification (15%)
// ═══════════════════════════════════════════════════════════════════

type Shape = "circular" | "linear" | "matrix" | "triangle" | "point" | "custom";

/**
 * Classify a model's physical shape from its DisplayAs and name.
 * This is geometry-level, not prop-type-level.
 */
function classifyShape(model: ParsedModel): Shape {
  const da = model.displayAs.toLowerCase();
  const name = model.name.toLowerCase();

  // Circular shapes
  if (
    da === "circle" ||
    da === "spinner" ||
    da === "sphere" ||
    da === "wreaths" ||
    /spinner|wreath|circle|ring|globe|ball|rosa|fuzion|overlord|starburst/i.test(
      name,
    )
  ) {
    return "circular";
  }

  // Matrix / rectangular shapes
  if (
    da.includes("matrix") ||
    da === "cube" ||
    da === "window frame" ||
    /matrix|panel|p5|p10|fence|window|sign|tune.*to/i.test(name)
  ) {
    return "matrix";
  }

  // Linear shapes
  if (
    da === "single line" ||
    da === "poly line" ||
    da === "icicles" ||
    da === "arches" ||
    da === "candy cane" ||
    da === "candy canes" ||
    /eave|vert|horizontal|roofline|outline|driveway|pole|cane|icicle|arch/i.test(
      name,
    )
  ) {
    return "linear";
  }

  // Triangle / tree shapes
  if (da.includes("tree") || /tree|mega.*tree|spiral|firework/i.test(name)) {
    return "triangle";
  }

  // Point shapes (stars, floods, small props)
  if (da === "star" || /star|flood|bulb/i.test(name)) {
    return "point";
  }

  return "custom";
}

function scoreShape(source: ParsedModel, dest: ParsedModel): number {
  if (source.isGroup || dest.isGroup) return 0.5;

  const srcShape = classifyShape(source);
  const destShape = classifyShape(dest);

  if (srcShape === destShape) return 1.0;

  // Partial matches for related shapes (0.4 for loosely related)
  const related: Record<Shape, Shape[]> = {
    circular: ["custom", "point"],
    linear: ["custom", "triangle"],
    matrix: ["custom"],
    triangle: ["custom", "linear"],
    point: ["custom", "circular"],
    custom: ["circular", "linear", "matrix", "triangle", "point"],
  };

  if (related[srcShape]?.includes(destShape)) return 0.4;

  return 0.0;
}

// ═══════════════════════════════════════════════════════════════════
// FACTOR 4: Model Type / DisplayAs (12%)
// ═══════════════════════════════════════════════════════════════════

const RELATED_TYPES: Record<string, string[]> = {
  Tree: ["Mega Tree", "Spiral Tree"],
  "Mega Tree": ["Tree", "Spiral Tree"],
  "Spiral Tree": ["Tree", "Mega Tree"],
  Arch: ["Candy Cane", "Line"],
  "Candy Cane": ["Arch", "Line"],
  Spinner: ["Wreath", "Snowflake", "Circle"],
  Wreath: ["Spinner", "Circle"],
  Circle: ["Wreath", "Spinner"],
  Spider: ["Custom"],
  Bat: ["Custom"],
  Tombstone: ["Custom"],
  Pumpkin: ["Custom", "Ghost"],
  Ghost: ["Custom", "Pumpkin"],
  Matrix: ["Fence"],
  Fence: ["Matrix", "Pixel Forest"],
  Sign: ["Matrix"],
  Line: ["Roofline", "Outline", "Flood", "Pole"],
  Roofline: ["Line", "Outline"],
  Outline: ["Line", "Roofline"],
  Pole: ["Line"],
  Flood: ["Line"],
  Icicles: ["Line", "Roofline"],
  Window: [],
  "Pixel Forest": ["Matrix", "Fence"],
  "Singing Face": ["Custom"],
  Star: ["Snowflake", "Circle"],
  Snowflake: ["Star", "Spinner", "Wreath"],
  Present: ["Custom"],
  Group: [],
};

function scoreType(source: ParsedModel, dest: ParsedModel): number {
  if (source.type === dest.type) return 1.0;

  if (source.isGroup && dest.isGroup) return 0.7;

  const related = RELATED_TYPES[source.type] || [];
  if (related.includes(dest.type)) return 0.7;

  if (dest.type === "Custom" || source.type === "Custom") return 0.3;

  return 0.0;
}

// ═══════════════════════════════════════════════════════════════════
// FACTOR 5: Node Count (10%) — ratio-based scoring
// ═══════════════════════════════════════════════════════════════════

/**
 * Node count scoring using ratio-based approach (V3).
 *
 * Uses min/max ratio so a 100px model vs a 200px model gives 0.5 ratio.
 * Applies a curve that rewards close matches more steeply:
 *   ratio 1.00       → 1.0  (exact match)
 *   ratio 0.95+      → 0.95 (nearly identical — e.g. 100 vs 105)
 *   ratio 0.80+      → 0.80 (close — e.g. 100 vs 125)
 *   ratio 0.50+      → 0.45 (moderate difference — e.g. 100 vs 200)
 *   ratio 0.25+      → 0.15 (big difference — e.g. 100 vs 400)
 *   ratio < 0.25     → 0.0  (enormous difference)
 *
 * Old drift-tier approach was too coarse (99 vs 100 was a cliff).
 */
function scorePixels(source: ParsedModel, dest: ParsedModel): number {
  if (source.isGroup || dest.isGroup) return 0.5;

  const srcPx = source.pixelCount;
  const destPx = dest.pixelCount;

  if (srcPx === 0 || destPx === 0) return 0.5;

  const ratio = Math.min(srcPx, destPx) / Math.max(srcPx, destPx);

  if (ratio >= 0.95) return 0.9 + ratio * 0.1; // 0.995 → 1.0, 0.95 → 0.995
  if (ratio >= 0.8) return 0.6 + (ratio - 0.8) * 2.0; // 0.80 → 0.60, 0.95 → 0.90
  if (ratio >= 0.5) return 0.2 + (ratio - 0.5) * 1.33; // 0.50 → 0.20, 0.80 → 0.60
  if (ratio >= 0.25) return (ratio - 0.25) * 0.8; // 0.25 → 0.0, 0.50 → 0.20
  return 0.0;
}

// ═══════════════════════════════════════════════════════════════════
// FACTOR 6: Structure Score (7%) — submodel & member count similarity
// ═══════════════════════════════════════════════════════════════════

/**
 * Structure scoring: compares submodel count and member count
 * to catch models that look similar but have different internal structure.
 *
 * For individual models:  primarily submodel count similarity
 * For groups:             returns 0.5 (member overlap handled separately)
 * When both have no submodels/members: neutral 0.5
 */
function scoreStructure(source: ParsedModel, dest: ParsedModel): number {
  if (source.isGroup || dest.isGroup) return 0.5;

  const srcSubs = source.submodels?.length ?? 0;
  const destSubs = dest.submodels?.length ?? 0;

  // If neither has submodels, neutral — structure doesn't apply
  if (srcSubs === 0 && destSubs === 0) return 0.5;

  // If one has submodels and the other doesn't, mild penalty
  if (srcSubs === 0 || destSubs === 0) return 0.2;

  // Both have submodels — compare counts via ratio
  const subRatio = Math.min(srcSubs, destSubs) / Math.max(srcSubs, destSubs);

  // Exact match is best; close counts are good
  if (subRatio >= 0.9) return 1.0; // e.g. 9 vs 10 submodels
  if (subRatio >= 0.7) return 0.8; // e.g. 7 vs 10
  if (subRatio >= 0.5) return 0.5; // e.g. 5 vs 10
  return 0.2; // very different structure
}

// ═══════════════════════════════════════════════════════════════════
// Combined Scoring
// ═══════════════════════════════════════════════════════════════════

// ─── Hard Exclusion Helpers ────────────────────────────────────────

/**
 * Moving Head detection.
 *
 * Moving heads are DMX-controlled spotlights (pan/tilt fixtures). They should
 * ONLY match other moving heads, never pixel-based props.
 *
 * Name patterns:
 *   - "Moving Head ..." / "MovingHead ..."
 *   - Standalone "MH" word: "MH 1", "MH Left"
 *   - MH prefix with identifier: "MHR7-Gobo", "MH1-Pan", "MH2"
 *
 * DMX channel names (only when model type is DMX):
 *   - Pan, Tilt, Gobo, Focus, Prism, Shutter, Zoom, Color Wheel, Iris, Strobe
 */
function isMovingHead(model: ParsedModel): boolean {
  const n = model.name;

  // "Moving Head" anywhere in name
  if (/moving\s*head/i.test(n)) return true;

  // Standalone "MH" as a word (e.g. "MH 1", "MH Left")
  if (/\bm\.?h\b/i.test(n)) return true;

  // MH prefix with alphanumeric identifier: MHR7, MH1, MH12, MH2R
  // \bmh followed by optional letters then at least one digit
  if (/\bmh\w*\d/i.test(n)) return true;

  // DMX-type models with characteristic moving head channel/function names
  if (model.type === "DMX" || /dmx/i.test(model.displayAs)) {
    if (
      /\b(pan|tilt|gobo|focus|prism|shutter|zoom|color\s*wheel|iris|strobe|frost)\b/i.test(
        n,
      )
    )
      return true;
  }

  return false;
}

/**
 * DMX model detection. DMX fixtures (DMX Head, Pixel2DMX, Fog Machines, etc.)
 * are non-pixel devices and should never participate in mapping.
 */
export function isDmxModel(model: ParsedModel): boolean {
  if (model.type === "DMX") return true;
  if (/dmx/i.test(model.displayAs)) return true;
  const n = model.name.toLowerCase();
  return (
    /\bpixel2dmx\b/i.test(n) ||
    /\bdmx\s*head\b/i.test(n) ||
    /\bfog\s*machine/i.test(n)
  );
}

/**
 * Detect a pole/pixel-pole synonym pair.
 * "Pole N" ↔ "Pixel Pole N" are always the same physical prop regardless
 * of how xLights classifies them (Horiz Matrix, Tree 180, Custom, etc.).
 * When true, all hard exclusions (type-lock, pixel drift) are bypassed
 * and the name score is forced to 1.0.
 */
function isPolePair(a: ParsedModel, b: ParsedModel): boolean {
  const aBase = baseName(a.name); // e.g. "pole" or "pixel pole"
  const bBase = baseName(b.name);
  // Strip "pixel " prefix to normalize
  const aNorm = aBase.replace(/^pixel\s+/, "");
  const bNorm = bBase.replace(/^pixel\s+/, "");
  if (aNorm !== bNorm || aNorm.length === 0) return false;
  // At least one must have the "pixel" prefix (otherwise they're just the same name)
  if (!aBase.startsWith("pixel ") && !bBase.startsWith("pixel ")) return false;
  // Must be pole-type names specifically
  if (!/\bpole\b/i.test(aNorm)) return false;
  // Indices must match (if both have indices)
  const aIdx = extractIndex(a.name);
  const bIdx = extractIndex(b.name);
  if (aIdx !== -1 && bIdx !== -1) return aIdx === bIdx;
  // If one or neither has an index, still allow (e.g. single "Pole" ↔ "Pixel Pole")
  return true;
}

/** Check if a model is a Matrix type. */
function isMatrixType(model: ParsedModel): boolean {
  const da = model.displayAs.toLowerCase();
  const n = model.name.toLowerCase();
  return (
    da.includes("matrix") || model.type === "Matrix" || /\bmatrix\b/i.test(n)
  );
}

/** Check if a model is a Flood type. */
function isFloodType(model: ParsedModel): boolean {
  return model.type === "Flood" || /\bflood\b/i.test(model.name);
}

/**
 * Check if a model is a large spinner/wreath type (500+ pixels).
 * Large spinners are generally compatible with each other regardless of
 * exact pixel count (e.g., Showstopper, GE Overlord, GE Fuzion, Rosa Wreath).
 * This allows 800px Showstopper to match 1529px GE Overlord.
 */
function isLargeSpinner(model: ParsedModel): boolean {
  const n = model.name.toLowerCase();
  const da = model.displayAs.toLowerCase();
  // Type-based detection
  if (model.type === "Spinner" || da === "spinner" || da.includes("wreath")) {
    return true;
  }
  // Name-based detection for common spinner/wreath products
  if (
    /\b(spinner|showstopper|fuzion|rosa|overlord|wreath|starburst|click\s*click\s*boom|grand\s*illusion|shape\s*shifter|king|spinarcy|mesmerizer|boscoyo|mega\s*spinner|radiation)\b/i.test(
      n,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Holiday indicator detection.
 * Returns "halloween", "christmas", or null if no clear indicator.
 */
const HALLOWEEN_INDICATORS =
  /\b(spider|bat|ghost|pumpkin|tombstone|tomb|skull|skeleton|witch|zombie|reaper|scarecrow|cauldron|coffin|graveyard|rip)\b/i;
const CHRISTMAS_INDICATORS =
  /\b(wreath|snowflake|flake|bow|candy\s*cane|cane|snowman|stocking|nutcracker|ornament|present|gift|sleigh|reindeer|santa|angel|nativity|grinch|elf)\b/i;

function detectHoliday(model: ParsedModel): "halloween" | "christmas" | null {
  const n = model.name;
  if (HALLOWEEN_INDICATORS.test(n)) return "halloween";
  if (CHRISTMAS_INDICATORS.test(n)) return "christmas";
  return null;
}

/**
 * Check if a group name contains "no" as a negation word.
 * e.g. "All - No Spinners - GRP", "All Pixels GRP - No Yard"
 */
function groupHasNegation(model: ParsedModel): boolean {
  return /\bno\b/i.test(model.name);
}

/**
 * Extract the GE product line from a model name.
 * "GE Fuzion 1" → "fuzion", "GE Rosa Grande 2" → "rosa grande"
 * Returns null if no GE prefix.
 */
function extractGeProduct(name: string): string | null {
  const match = name.match(
    /\bGE\s+((?:Click\s+Click\s+Boom|Rosa\s+Grande|Grand\s+Illusion|Space\s+Odyss(?:ey|y)|Shape\s+Shifter|King(?:s)?\s+(?:Diamond|Ransom)|SpinArchy|Starburst\s+xTreme|Starlord|Squared|XLS|Fuzion|Overlord|Showstopper|Flake\s+\w+))/i,
  );
  if (match) return match[1].toLowerCase();
  // Simple fallback: "GE <word>" → the word
  const simple = name.match(/\bGE\s+(\w+)/i);
  if (simple) return simple[1].toLowerCase();
  return null;
}

/** House-location terms — rooms/areas of a house. Models with these are
 *  location-qualified (e.g. "Office Eave 1") and name matching should be
 *  deprioritized in favor of type matching. */
const HOUSE_LOCATION_TERMS =
  /\b(office|garage|door|living\s*room|bedroom|dining\s*room|bathroom|kitchen|hallway|porch|patio|den|foyer|attic|basement|laundry|closet|pantry|loft)\b/i;

function hasHouseLocation(model: ParsedModel): boolean {
  return HOUSE_LOCATION_TERMS.test(model.name);
}

/** Check if a model is a Line type (for Flood↔Line interop). */
function isLineType(model: ParsedModel): boolean {
  return (
    model.type === "Line" ||
    model.displayAs.toLowerCase() === "single line" ||
    model.displayAs.toLowerCase() === "poly line"
  );
}

/** Check if a model is a house-line structural element. */
const HOUSE_LINE_PATTERN =
  /\b(eave|vert(?:ical)?|roof(?:line)?|outline|horizontal|gutter)\b/i;

function isHouseLine(model: ParsedModel): boolean {
  return (
    HOUSE_LINE_PATTERN.test(model.name) ||
    model.type === "Roofline" ||
    model.type === "Outline"
  );
}

/** Check if a model is a singing face/prop.
 *  Detects via name patterns or submodel names (mouth/eyes/phoneme).
 *  Common vendor names: "Pimp", "Male Singing Prop", "EFL Snowman", "Singing Bulb", "Singing Skull" */
function isSinging(model: ParsedModel): boolean {
  const n = model.name.toLowerCase();
  // Direct "singing" keyword
  if (/\bsinging\b/i.test(n)) return true;
  // Vendor names for singing props
  if (/\bpimp\b/i.test(n)) return true;
  if (/\befl\s*snowman\b/i.test(n)) return true;
  // "Singing Skull" pattern (some vendors use this)
  if (/\bsinging\s*skull\b/i.test(n)) return true;
  // Submodel detection (mouth/eyes/phoneme indicates a singing face)
  return model.submodels.some((s) => /\b(mouth|eyes?|phoneme)\b/i.test(s.name));
}

/** Interchangeability classes — props within the same class can cross-match
 *  during quantity matching when no exact-type match exists in the dest. */
const INTERCHANGEABLE_CLASSES: Record<string, string[]> = {
  halloween_yard: [
    "pumpkin",
    "ghost",
    "tombstone",
    "skeleton",
    "spider",
    "bat",
    "skull",
    "witch",
    "zombie",
    "reaper",
    "scarecrow",
    "cauldron",
    "coffin",
    "black cat",
  ],
  christmas_yard: [
    "snowman",
    "present",
    "gift",
    "candy cane",
    "stocking",
    "nutcracker",
    "ornament",
  ],
  // Mini yard props — cross-holiday interchangeable (mini trees ↔ ghosts ↔ black cats)
  mini_yard: ["mini tree", "ghost", "black cat", "mini pumpkin"],
  tree: ["tree", "mega tree", "megatree", "spiral"],
  arch: ["arch", "archway", "candy cane", "cane"],
  star_flake: ["star", "snowflake", "flake"],
  wreath_spinner: ["wreath", "spinner", "rosa", "fuzion"],
  structural_line: ["eave", "vertical", "roofline", "outline", "horizontal"],
  // Vertical structures (poles, verticals, fence)
  vertical_structure: ["pole", "vertical", "fence"],
};

/** Get the interchangeability class for a model, or null if none. */
function getInterchangeClass(model: ParsedModel): string | null {
  const n = model.name.toLowerCase();
  for (const [cls, keywords] of Object.entries(INTERCHANGEABLE_CLASSES)) {
    for (const kw of keywords) {
      if (n.includes(kw)) return cls;
    }
  }
  return null;
}

/**
 * Known vendor product pixel counts. When both source and dest share a
 * pixel count that maps to a known product, they're likely the same physical
 * prop — applied as a supplementary score boost.
 */
const VENDOR_PIXEL_HINTS: Record<number, string> = {
  // CCC Spinners (Christmas Concepts Corp)
  269: "ccc_spinner_18",
  451: "ccc_spinner_24",
  519: "ccc_spinner_25",
  596: "ccc_spinner_36",
  768: "ccc_spinner_36_v2",
  1046: "ccc_spinner_48",
  // Gilbert Engineering (GE) products
  640: "ge_flake_640",
  1529: "ge_overlord",
  1200: "ge_rosa_grande",
  960: "ge_fuzion",
  1800: "ge_click_click_boom",
  // EFL Designs
  800: "efl_showstopper",
  400: "efl_babyflake",
  // Boscoyo
  1117: "boscoyo_mesmerizer",
  720: "boscoyo_whimsical",
  // Holiday Coro
  480: "holidaycoro_24_spinner",
  // Common matrix sizes (P5/P10 panels)
  512: "p10_matrix_16x32",
  1024: "p10_matrix_32x32",
  2048: "p5_matrix_64x32",
  4096: "p5_matrix_64x64",
  // Standard small props (common pixel counts across vendors)
  50: "standard_small_prop",
  100: "standard_medium_prop",
  150: "standard_custom_prop",
  200: "standard_candy_cane",
  250: "standard_tree_250",
  300: "standard_arch_300",
  500: "standard_outline_500",
};

function computeScore(
  source: ParsedModel,
  dest: ParsedModel,
  sourceBounds: NormalizedBounds,
  destBounds: NormalizedBounds,
): { score: number; factors: ModelMapping["factors"] } {
  const zeroFactors = {
    name: 0,
    spatial: 0,
    shape: 0,
    type: 0,
    pixels: 0,
    structure: 0,
  };

  // ── Hard exclusions (return 0 immediately) ─────────────

  // Never match against DMX fixtures (Pixel2DMX, Fog Machine, DMX Head, etc.)
  // Exception: Moving heads are type=DMX but have their own isolation rule below.
  const srcDmx = isDmxModel(source);
  const destDmx = isDmxModel(dest);
  const srcMH = isMovingHead(source);
  const destMH = isMovingHead(dest);
  if ((srcDmx && !srcMH) || (destDmx && !destMH)) {
    return { score: 0, factors: zeroFactors };
  }

  // Moving Head isolation: moving heads can ONLY match other moving heads.
  // If one side is MH and the other is not, hard zero.
  if (srcMH !== destMH) {
    return { score: 0, factors: zeroFactors };
  }

  // Pole / Pixel Pole synonym: these are always the same physical prop
  // regardless of xLights type classification or pixel count differences.
  // Bypass all remaining hard exclusions and force a 1.0 match.
  const polePair = isPolePair(source, dest);
  if (polePair) {
    return {
      score: 1.0,
      factors: {
        name: 1.0,
        spatial: 0.5,
        shape: 0.5,
        type: 1.0,
        pixels: 1.0,
        structure: 0.5,
      },
    };
  }

  // Extreme pixel count difference: if drift >= 1000 and neither is a group,
  // these models are fundamentally different (e.g. 100px spider vs 12000px matrix)
  // EXCEPTION: Large spinners (500+ pixels) are generally compatible with each other
  // regardless of pixel count differences (e.g., 800px Showstopper ↔ 1529px GE Overlord)
  if (!source.isGroup && !dest.isGroup) {
    const srcPx = source.pixelCount;
    const destPx = dest.pixelCount;
    if (srcPx > 0 && destPx > 0 && Math.abs(srcPx - destPx) >= 1000) {
      // Check if both are large spinners (500+ pixels each)
      const bothLargeSpinners =
        isLargeSpinner(source) &&
        isLargeSpinner(dest) &&
        srcPx >= 500 &&
        destPx >= 500;
      if (!bothLargeSpinners) {
        return { score: 0, factors: zeroFactors };
      }
      // Large spinners with big pixel diff: allow but score will reflect mismatch
    }
  }

  // Matrix type-lock: matrix only matches matrix
  if (isMatrixType(source) !== isMatrixType(dest)) {
    // Allow if both are groups (groups can contain mixed types)
    if (!(source.isGroup && dest.isGroup)) {
      return { score: 0, factors: zeroFactors };
    }
  }

  // Flood type-lock: floods match other floods or lines (many sequences
  // build floods as a line of very few, very large pixels)
  if (isFloodType(source) || isFloodType(dest)) {
    const bothFlood = isFloodType(source) && isFloodType(dest);
    const floodLine =
      (isFloodType(source) && isLineType(dest)) ||
      (isFloodType(dest) && isLineType(source));
    if (!bothFlood && !floodLine) {
      if (!(source.isGroup && dest.isGroup)) {
        return { score: 0, factors: zeroFactors };
      }
    }
  }

  // SINGING CONSTRAINT: Singing models ONLY match other singing models.
  // Never cross-match a singing face/prop to a non-singing model.
  // This is a hard rule from community xmap analysis.
  const srcSinging = isSinging(source);
  const destSinging = isSinging(dest);
  if (srcSinging !== destSinging) {
    // One is singing, the other is not — hard exclusion
    return { score: 0, factors: zeroFactors };
  }

  // ── Compute base factors ───────────────────────────────

  const factors = {
    name: scoreName(source, dest),
    spatial: scoreSpatial(source, dest, sourceBounds, destBounds),
    shape: scoreShape(source, dest),
    type: scoreType(source, dest),
    pixels: scorePixels(source, dest),
    structure: scoreStructure(source, dest),
  };

  // ── Relaxed pixel scoring for same-type/same-name models ──
  // When models clearly match by name AND type, pixel count differences
  // should be penalized much less — a 50px arch and 100px arch are the
  // same prop, just different sizes. Floor the pixel factor at 0.6 so
  // pixel drift doesn't drag these obvious matches into medium/low tiers.
  if (
    !source.isGroup &&
    !dest.isGroup &&
    factors.name >= 0.85 &&
    factors.type >= 0.7
  ) {
    factors.pixels = Math.max(factors.pixels, 0.6);
  }

  // ── Holiday mismatch penalty ───────────────────────────
  // If source is clearly Halloween and dest is clearly Christmas (or vice
  // versa), zero out the score for holiday-specific indicator models.
  const srcHoliday = detectHoliday(source);
  const destHoliday = detectHoliday(dest);
  if (srcHoliday && destHoliday && srcHoliday !== destHoliday) {
    return { score: 0, factors };
  }

  // ── GE vendor prefix exact match requirement ───────────
  // When both models have a GE prefix, the product line must match exactly.
  // "GE Fuzion" should not match "GE Rosa Grande".
  const srcGe = extractGeProduct(source.name);
  const destGe = extractGeProduct(dest.name);
  if (srcGe && destGe && srcGe !== destGe) {
    // Allow very low score for GE mismatch (might still be best available)
    return { score: Math.min(0.1, factors.name * 0.1), factors };
  }

  // ── SUBMODEL_GROUP HARD CONSTRAINT ─────────────────────────
  // SUBMODEL_GROUP groups should ONLY match other SUBMODEL_GROUP groups.
  // They should NEVER match regular models or MODEL_GROUP/META_GROUP/MIXED_GROUP groups.
  // This is the highest priority rule for spinner submodel groups.
  const srcIsSubmodelGrp =
    source.isGroup && source.groupType === "SUBMODEL_GROUP";
  const destIsSubmodelGrp = dest.isGroup && dest.groupType === "SUBMODEL_GROUP";

  if (srcIsSubmodelGrp && !destIsSubmodelGrp) {
    // Source is a SUBMODEL_GROUP but dest is not — hard block
    return { score: 0, factors: zeroFactors };
  }
  if (destIsSubmodelGrp && !srcIsSubmodelGrp) {
    // Dest is a SUBMODEL_GROUP but source is not — hard block
    return { score: 0, factors: zeroFactors };
  }

  // ── MODEL vs GROUP HARD CONSTRAINT ──────────────────────
  // Models should only match models. Groups should only match groups.
  // e.g., "Tree - Spiral 2" (model) should NOT match "09 All Mega Trees" (group)
  if (source.isGroup !== dest.isGroup) {
    return { score: 0, factors: zeroFactors };
  }

  // ── Group-vs-group matching ────────────────────────────
  if (source.isGroup && dest.isGroup) {
    // Note: SUBMODEL_GROUP vs MODEL_GROUP mismatch already handled above

    // "NO" logic: if one group has "no" negation and the other doesn't,
    // they almost certainly don't match
    const srcNeg = groupHasNegation(source);
    const destNeg = groupHasNegation(dest);
    if (srcNeg !== destNeg) {
      return { score: 0, factors };
    }

    // SUBMODEL GROUP MATCHING: Allow cross-vendor matching via semantic category
    // e.g., "S - Big Hearts" (decorative) ≈ "GE SpinReel Max Flowers GRP" (decorative)
    if (srcIsSubmodelGrp && destIsSubmodelGrp) {
      const srcCategory = source.semanticCategory;
      const destCategory = dest.semanticCategory;

      // If both have semantic categories and they match, boost the match
      if (srcCategory && destCategory && srcCategory === destCategory) {
        // Strong match for same semantic category
        const categoryScore = 0.75 + factors.name * 0.25;
        return { score: Math.min(1.0, categoryScore), factors };
      }

      // If only one has a category or categories differ, use normal name matching
      // but with a penalty for different categories
      if (srcCategory && destCategory && srcCategory !== destCategory) {
        const penalizedScore = factors.name * 0.5;
        return { score: penalizedScore, factors };
      }
    }

    const memberScore = scoreMemberOverlap(source, dest);
    // Groups: Name 55%, Members 30%, Type 15%
    // (bumped name weight — groups match primarily on name, and spatial
    // doesn't apply; boosted scores push groups into HIGH tier)
    const rawScore =
      factors.name * 0.55 + memberScore * 0.3 + factors.type * 0.15;
    // Boost: if root name matches well, push toward HIGH
    const score = Math.min(1.0, rawScore * 1.3);
    return { score, factors };
  }

  // House-location terms: deprioritize name, boost type when model name
  // contains room/area qualifiers (e.g. "Office Eave 1", "Garage Outline")
  if (
    (hasHouseLocation(source) || hasHouseLocation(dest)) &&
    !source.isGroup &&
    !dest.isGroup
  ) {
    const houseScore =
      factors.name * 0.23 +
      factors.spatial * WEIGHTS.spatial +
      factors.shape * WEIGHTS.shape +
      factors.type * 0.25 +
      factors.pixels * WEIGHTS.pixels +
      factors.structure * WEIGHTS.structure;
    return { score: houseScore, factors };
  }

  // Dynamic name weight boost: when name factor is near-exact (>=0.95),
  // the name alone is a very strong signal. Boost name weight from 38% → 55%
  // and reduce spatial (22→12%) + shape (13→6%) to let the name dominate.
  const nameWeight = factors.name >= 0.95 ? 0.55 : WEIGHTS.name;
  const spatialWeight = factors.name >= 0.95 ? 0.12 : WEIGHTS.spatial;
  const shapeWeight = factors.name >= 0.95 ? 0.06 : WEIGHTS.shape;

  let score =
    factors.name * nameWeight +
    factors.spatial * spatialWeight +
    factors.shape * shapeWeight +
    factors.type * WEIGHTS.type +
    factors.pixels * WEIGHTS.pixels +
    factors.structure * WEIGHTS.structure;

  // COORDINATE-BASED TIEBREAKER: When base names match but indices differ,
  // position becomes the primary differentiator.
  // e.g., "Window 1" vs "Window 2" → match by leftmost-to-leftmost
  // e.g., "Spinner - Showstopper 1" vs "Spinner - Showstopper 2" → match by position
  if (!source.isGroup && !dest.isGroup) {
    const srcBase = baseName(source.name);
    const destBase = baseName(dest.name);
    const srcIdx = extractIndex(source.name);
    const destIdx = extractIndex(dest.name);
    // If base names match well but indices differ, boost spatial weight significantly.
    // Guard: only reweight when spatial data is meaningful (>0.1) — if both models
    // lack coordinates, boosting spatial to 42% would just amplify noise.
    if (
      srcBase === destBase &&
      srcBase.length > 0 &&
      srcIdx !== destIdx &&
      factors.spatial > 0.1
    ) {
      // Re-weight: spatial becomes 42%, name drops to 18%
      score =
        factors.name * 0.18 +
        factors.spatial * 0.42 +
        factors.shape * WEIGHTS.shape +
        factors.type * WEIGHTS.type +
        factors.pixels * WEIGHTS.pixels +
        factors.structure * WEIGHTS.structure;
    }

    // FUZZY INDEX BONUS: When base names match AND indices align,
    // reward the exact index match with +0.10 bonus.
    // e.g., "Arch 3" ↔ "Arch 3" gets boosted over "Arch 3" ↔ "Arch 5"
    if (
      srcBase === destBase &&
      srcBase.length > 0 &&
      srcIdx >= 0 &&
      srcIdx === destIdx
    ) {
      score = Math.min(1.0, score + 0.1);
    }
  }

  // Eave/vert individual models should preferably match other house-line
  // models (eave, vert, roofline, outline), not random props
  const srcIsEaveVert =
    /\b(eave|vert(?:ical)?)\b/i.test(source.name) && !source.isGroup;
  const destIsEaveVert =
    /\b(eave|vert(?:ical)?)\b/i.test(dest.name) && !dest.isGroup;
  if (srcIsEaveVert && !isHouseLine(dest) && !dest.isGroup) {
    score *= 0.4;
  } else if (destIsEaveVert && !isHouseLine(source) && !source.isGroup) {
    score *= 0.4;
  }

  // Vendor pixel hint: when both models share a pixel count matching a known
  // vendor product, boost score — they're likely the same physical prop
  if (
    !source.isGroup &&
    !dest.isGroup &&
    source.pixelCount === dest.pixelCount &&
    source.pixelCount > 0 &&
    VENDOR_PIXEL_HINTS[source.pixelCount]
  ) {
    score = Math.min(1.0, score * 1.15);
  }

  return { score, factors };
}

function scoreToConfidence(score: number): Confidence {
  if (score >= 0.8) return "high";
  if (score >= 0.6) return "medium";
  if (score >= 0.4) return "low";
  return "unmapped";
}

function generateReason(mapping: ModelMapping): string {
  const { factors, sourceModel, destModel } = mapping;
  if (!destModel) return "No suitable match found in your layout.";

  const parts: string[] = [];

  if (factors.name >= 0.85) parts.push("Name match");
  else if (factors.name >= 0.5) parts.push("Fuzzy name match");

  if (factors.spatial >= 0.8 && !sourceModel.isGroup)
    parts.push("Position match");

  if (factors.shape >= 0.9) parts.push("Shape match");
  else if (factors.shape < 0.3 && !sourceModel.isGroup)
    parts.push("Shape mismatch");

  if (factors.type >= 0.9) parts.push("Type match");
  else if (factors.type < 0.4) parts.push("Type mismatch");

  if (factors.pixels >= 0.9 && !sourceModel.isGroup) {
    parts.push("Node count match");
  } else if (factors.pixels < 0.3 && !sourceModel.isGroup) {
    parts.push(
      `Node count differs (${sourceModel.pixelCount} vs ${destModel.pixelCount})`,
    );
  }

  if (factors.structure >= 0.9 && !sourceModel.isGroup) {
    parts.push("Structure match");
  } else if (factors.structure <= 0.2 && !sourceModel.isGroup) {
    parts.push("Structure differs");
  }

  return parts.join(" · ") || "Best available match";
}

// ═══════════════════════════════════════════════════════════════════
// Spinner Shared-Source Detection
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if two models are both spinners whose submodel names overlap,
 * indicating they represent the same physical spinner type.
 *
 * When true, the source spinner is NOT consumed after matching, allowing
 * multiple dest spinners (user's layout) to all map to the same source
 * spinner. The xmap output will map each dest spinner's submodels to the
 * source spinner's submodels by exact name.
 */
function isSpinnerSharedMatch(source: ParsedModel, dest: ParsedModel): boolean {
  if (source.isGroup || dest.isGroup) return false;
  if (source.submodels.length === 0 || dest.submodels.length === 0)
    return false;

  // Both must be spinner-type models
  const spinnerPattern =
    /spinner|showstopper|fuzion|rosa.*grande|overlord|click.*click.*boom/i;
  const isSourceSpinner =
    source.type === "Spinner" || spinnerPattern.test(source.name);
  const isDestSpinner =
    dest.type === "Spinner" || spinnerPattern.test(dest.name);

  if (!isSourceSpinner || !isDestSpinner) return false;

  // Check submodel name overlap using normalized names
  const srcNames = new Set(source.submodels.map((s) => normalizeName(s.name)));
  const destNames = new Set(dest.submodels.map((s) => normalizeName(s.name)));

  let matches = 0;
  for (const name of srcNames) {
    if (name.length > 0 && destNames.has(name)) matches++;
  }

  // Require at least 3 matching submodel names (or all if fewer than 3)
  const threshold = Math.min(3, srcNames.size);
  return matches >= threshold;
}

// ═══════════════════════════════════════════════════════════════════
// Submodel Matching
// ═══════════════════════════════════════════════════════════════════

/**
 * Cache for submodel mappings to avoid recomputing during export.
 */
const submodelCache = new Map<string, SubmodelMapping[]>();

/**
 * Clear the submodel mapping cache.
 */
export function clearSubmodelCache(): void {
  submodelCache.clear();
}

function mapSubmodels(
  source: ParsedModel,
  dest: ParsedModel,
): SubmodelMapping[] {
  if (source.submodels.length === 0) return [];

  // Check cache
  const cacheKey = `${source.name}:${dest.name}`;
  const cached = submodelCache.get(cacheKey);
  if (cached) return cached;

  const mappings: SubmodelMapping[] = [];
  const usedDest = new Set<number>();

  for (const srcSub of source.submodels) {
    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < dest.submodels.length; i++) {
      if (usedDest.has(i)) continue;
      const destSub = dest.submodels[i];

      // Build a temporary ParsedModel-like object for name scoring
      const srcFake = { ...source, name: srcSub.name } as ParsedModel;
      const destFake = { ...dest, name: destSub.name } as ParsedModel;
      let score = scoreName(srcFake, destFake);

      // Blend in pixel similarity if available
      if (srcSub.pixelCount > 0 && destSub.pixelCount > 0) {
        const pxRatio =
          1.0 -
          Math.abs(srcSub.pixelCount - destSub.pixelCount) /
            Math.max(srcSub.pixelCount, destSub.pixelCount);
        score = score * 0.7 + pxRatio * 0.3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestScore > 0.2) {
      usedDest.add(bestIdx);
      const destSub = dest.submodels[bestIdx];
      mappings.push({
        sourceName: srcSub.name,
        destName: destSub.name,
        confidence: scoreToConfidence(bestScore),
        pixelDiff: `${srcSub.pixelCount || "?"}px → ${destSub.pixelCount || "?"}px`,
      });
    } else {
      mappings.push({
        sourceName: srcSub.name,
        destName: "",
        confidence: "unmapped",
        pixelDiff: `${srcSub.pixelCount || "?"}px`,
      });
    }
  }

  // Store in cache before returning
  submodelCache.set(cacheKey, mappings);
  return mappings;
}

// ═══════════════════════════════════════════════════════════════════
// Main Matching Algorithm — Three-Phase
// ═══════════════════════════════════════════════════════════════════

/**
 * Phase 1: Match groups (most important — entire display groups)
 * Phase 2: Match individual models
 * Phase 3: Resolve submodels within matched models
 *
 * Within each phase, greedy assignment by score (highest first).
 * Groups appear at the top of each confidence section in output.
 */
export function matchModels(
  sourceModels: ParsedModel[],
  destModels: ParsedModel[],
): MappingResult {
  const sourceBounds = getNormalizedBounds(sourceModels);
  const destBounds = getNormalizedBounds(destModels);

  // Separate groups from individual models
  const sourceGroups = sourceModels.filter((m) => m.isGroup);
  const sourceIndividuals = sourceModels.filter((m) => !m.isGroup);
  const destGroups = destModels.filter((m) => m.isGroup);
  const destIndividuals = destModels.filter((m) => !m.isGroup);

  const assignedSourceIdx = new Set<number>();
  const assignedDestIdx = new Set<number>();
  const allMappings: ModelMapping[] = [];

  // ── Phase 1: Match Groups ──────────────────────────────
  const groupMappings = greedyMatch(
    sourceGroups,
    destGroups,
    sourceBounds,
    destBounds,
  );
  for (const m of groupMappings) {
    allMappings.push(m);
    if (m.destModel) {
      // Track by original index in full destModels array
      const destIdx = destModels.indexOf(m.destModel);
      if (destIdx >= 0) assignedDestIdx.add(destIdx);
    }
    const srcIdx = sourceModels.indexOf(m.sourceModel);
    if (srcIdx >= 0) assignedSourceIdx.add(srcIdx);
  }

  // ── Phase 2: Match Individual Models ───────────────────
  // Dest pool: individual models + any unmatched groups (a group in dest
  // might be the best match for an individual source model)
  const remainingDest = destModels.filter((_, i) => !assignedDestIdx.has(i));

  const individualMappings = greedyMatch(
    sourceIndividuals,
    remainingDest,
    sourceBounds,
    destBounds,
  );
  for (const m of individualMappings) {
    allMappings.push(m);
  }

  // ── Post-processing: Group-only children detection ─────
  // When a dest group has member model names listed but none of those
  // members exist as individual models in the dest layout, the match
  // is less verifiable — lower confidence by one tier.
  for (const mapping of allMappings) {
    if (
      mapping.destModel &&
      mapping.destModel.isGroup &&
      mapping.confidence !== "unmapped"
    ) {
      const members = mapping.destModel.memberModels || [];
      if (members.length > 0) {
        const hasExposedChildren = members.some((memberName) => {
          const mb = baseName(memberName);
          return (
            mb.length > 0 &&
            destIndividuals.some((d) => baseName(d.name) === mb)
          );
        });
        if (!hasExposedChildren) {
          if (mapping.confidence === "high") {
            mapping.confidence = "medium";
            mapping.reason += " · Group children not exposed in layout";
          } else if (mapping.confidence === "medium") {
            mapping.confidence = "low";
            mapping.reason += " · Group children not exposed in layout";
          }
        }
      }
    }
  }

  // ── Phase 3: Quantity matching for unmapped source models ──
  // After exact matching, try to cross-match unmapped source models
  // to unused dest models within the same interchangeability class
  // (e.g. 8 pumpkins → 7 ghosts when no pumpkins exist in dest).
  const unmappedSources = allMappings
    .filter((m) => m.destModel === null && !m.sourceModel.isGroup)
    .map((m) => m.sourceModel);

  if (unmappedSources.length > 0) {
    const usedDestSoFar = new Set(
      allMappings.filter((m) => m.destModel).map((m) => m.destModel!.name),
    );
    const unusedDests = destModels.filter(
      (m) => !m.isGroup && !usedDestSoFar.has(m.name),
    );

    if (unusedDests.length > 0) {
      // Group unmapped sources by interchangeability class
      const unmappedByClass = new Map<string, ParsedModel[]>();
      for (const src of unmappedSources) {
        const cls = getInterchangeClass(src);
        if (cls) {
          if (!unmappedByClass.has(cls)) unmappedByClass.set(cls, []);
          unmappedByClass.get(cls)!.push(src);
        }
      }

      // Group unused dests by interchangeability class
      const unusedByClass = new Map<string, ParsedModel[]>();
      for (const dest of unusedDests) {
        const cls = getInterchangeClass(dest);
        if (cls) {
          if (!unusedByClass.has(cls)) unusedByClass.set(cls, []);
          unusedByClass.get(cls)!.push(dest);
        }
      }

      // Match within same interchangeability class
      for (const [cls, srcModels] of unmappedByClass) {
        const destPool = unusedByClass.get(cls);
        if (!destPool || destPool.length === 0) continue;

        // Sort both by numeric index for ordinal matching
        const sortedSrc = [...srcModels].sort(
          (a, b) => extractIndex(a.name) - extractIndex(b.name),
        );
        const sortedDest = [...destPool].sort(
          (a, b) => extractIndex(a.name) - extractIndex(b.name),
        );

        const usedDestInClass = new Set<number>();
        for (const src of sortedSrc) {
          let bestIdx = -1;
          let bestScore = 0;
          for (let d = 0; d < sortedDest.length; d++) {
            if (usedDestInClass.has(d)) continue;
            const dest = sortedDest[d];
            // Score: blend of name similarity + node count similarity
            const nameS = scoreName(src, dest);
            const pixS = scorePixels(src, dest);
            const combined = nameS * 0.6 + pixS * 0.4;
            if (combined > bestScore) {
              bestScore = combined;
              bestIdx = d;
            }
          }

          // After 0.8x penalty, finalScore must reach LOW (0.40) to be useful.
          // Pre-penalty threshold: 0.40 / 0.8 = 0.50
          if (bestIdx >= 0 && bestScore > 0.49) {
            usedDestInClass.add(bestIdx);
            const destMatch = sortedDest[bestIdx];
            // Penalize cross-prop matches (cap at 0.8x original)
            const finalScore = bestScore * 0.8;
            const confidence = scoreToConfidence(finalScore);
            const subMappings = mapSubmodels(src, destMatch);

            // Only assign if the result reaches a real confidence tier
            if (confidence === "unmapped") continue;

            // Update the existing unmapped entry in allMappings
            const mappingIdx = allMappings.findIndex(
              (m) => m.sourceModel === src && m.destModel === null,
            );
            if (mappingIdx >= 0) {
              allMappings[mappingIdx] = {
                sourceModel: src,
                destModel: destMatch,
                score: finalScore,
                confidence,
                factors: {
                  name: scoreName(src, destMatch),
                  spatial: 0,
                  shape: scoreShape(src, destMatch),
                  type: scoreType(src, destMatch),
                  pixels: scorePixels(src, destMatch),
                  structure: scoreStructure(src, destMatch),
                },
                reason: `Quantity match (${cls.replace(/_/g, " ")})`,
                submodelMappings: subMappings,
              };
            }
          }
        }
      }
    }
  }

  // ── Phase 3c: Surplus-to-spatial matching (many-to-one) ──
  // When source has more instances of a prop than the user (e.g., source
  // has 8 arches but user has 5), the surplus source models are still
  // unmapped after greedy matching. Map them to the spatially nearest
  // already-matched dest model of the same type. This ensures effects
  // from surplus source models don't disappear — they get routed to the
  // user's closest available prop. The xmap format supports many-to-one.
  const stillUnmappedIndividuals = allMappings
    .filter((m) => m.destModel === null && !m.sourceModel.isGroup)
    .map((m) => m.sourceModel);

  if (stillUnmappedIndividuals.length > 0) {
    // Build a map of base-name → already-matched dest models
    const matchedDestsByBase = new Map<
      string,
      { destModel: ParsedModel; score: number }[]
    >();
    for (const m of allMappings) {
      if (!m.destModel || m.sourceModel.isGroup) continue;
      const srcBase = baseName(m.sourceModel.name);
      if (srcBase.length === 0) continue;
      if (!matchedDestsByBase.has(srcBase)) matchedDestsByBase.set(srcBase, []);
      matchedDestsByBase.get(srcBase)!.push({
        destModel: m.destModel,
        score: m.score,
      });
    }

    for (const src of stillUnmappedIndividuals) {
      const srcBase = baseName(src.name);
      if (srcBase.length === 0) continue;

      // Also check canonical base for wider matching (e.g., "eave" → "structural_horizontal")
      const srcCanonical = canonicalBase(srcBase);
      let candidates = matchedDestsByBase.get(srcBase);
      if (!candidates) {
        // Try canonical base: find any base whose canonical form matches
        for (const [base, dests] of matchedDestsByBase) {
          if (
            canonicalBase(base) === srcCanonical &&
            srcCanonical !== srcBase
          ) {
            candidates = dests;
            break;
          }
        }
      }

      if (!candidates || candidates.length === 0) continue;

      // Pick the spatially closest dest model
      let bestDest: ParsedModel | null = null;
      let bestDist = Infinity;
      for (const { destModel } of candidates) {
        const dx = src.worldPosX - destModel.worldPosX;
        const dy = src.worldPosY - destModel.worldPosY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestDest = destModel;
        }
      }

      if (bestDest) {
        const subMappings = mapSubmodels(src, bestDest);
        // Score is capped at medium confidence (0.65) since this is a
        // many-to-one fallback — the user should review these
        const fallbackScore = 0.65;
        const mappingIdx = allMappings.findIndex(
          (m) => m.sourceModel === src && m.destModel === null,
        );
        if (mappingIdx >= 0) {
          allMappings[mappingIdx] = {
            sourceModel: src,
            destModel: bestDest,
            score: fallbackScore,
            confidence: "medium",
            factors: {
              name: scoreName(src, bestDest),
              spatial: scoreSpatial(src, bestDest, sourceBounds, destBounds),
              shape: scoreShape(src, bestDest),
              type: scoreType(src, bestDest),
              pixels: scorePixels(src, bestDest),
              structure: scoreStructure(src, bestDest),
            },
            reason: "Surplus → nearest same-type prop",
            submodelMappings: subMappings,
          };
        }
      }
    }
  }

  // ── Phase 3b: Group-level interchangeability matching ──
  // Same cross-prop class matching applied to unmapped groups.
  // e.g. "All - Mini Pumpkins - GRP" → "GROUP - All Ghosts" when both
  // are in the halloween_yard class and no exact match exists.
  const unmappedSourceGroups = allMappings
    .filter((m) => m.destModel === null && m.sourceModel.isGroup)
    .map((m) => m.sourceModel);

  if (unmappedSourceGroups.length > 0) {
    const usedDestAfterP3 = new Set(
      allMappings.filter((m) => m.destModel).map((m) => m.destModel!.name),
    );
    const unusedDestGroups = destModels.filter(
      (m) => m.isGroup && !usedDestAfterP3.has(m.name),
    );

    if (unusedDestGroups.length > 0) {
      // Determine interchangeability class for a group from name + members
      const getGroupClass = (model: ParsedModel): string | null => {
        const n = model.name.toLowerCase();
        const members = (model.memberModels || []).join(" ").toLowerCase();
        const combined = n + " " + members;
        for (const [cls, keywords] of Object.entries(INTERCHANGEABLE_CLASSES)) {
          for (const kw of keywords) {
            if (combined.includes(kw)) return cls;
          }
        }
        return null;
      };

      const unmappedGroupsByClass = new Map<string, ParsedModel[]>();
      for (const src of unmappedSourceGroups) {
        const cls = getGroupClass(src);
        if (cls) {
          if (!unmappedGroupsByClass.has(cls))
            unmappedGroupsByClass.set(cls, []);
          unmappedGroupsByClass.get(cls)!.push(src);
        }
      }

      const unusedGroupsByClass = new Map<string, ParsedModel[]>();
      for (const d of unusedDestGroups) {
        const cls = getGroupClass(d);
        if (cls) {
          if (!unusedGroupsByClass.has(cls)) unusedGroupsByClass.set(cls, []);
          unusedGroupsByClass.get(cls)!.push(d);
        }
      }

      for (const [cls, srcGroups] of unmappedGroupsByClass) {
        const destPool = unusedGroupsByClass.get(cls);
        if (!destPool || destPool.length === 0) continue;

        const usedDestInClass = new Set<number>();
        for (const src of srcGroups) {
          let bestIdx = -1;
          let bestScore = 0;
          for (let d = 0; d < destPool.length; d++) {
            if (usedDestInClass.has(d)) continue;
            const dest = destPool[d];

            // GROUP TYPE COMPATIBILITY: Skip if one is SUBMODEL_GROUP and other is not
            const srcIsSubmodelGrp = src.groupType === "SUBMODEL_GROUP";
            const destIsSubmodelGrp = dest.groupType === "SUBMODEL_GROUP";
            if (srcIsSubmodelGrp !== destIsSubmodelGrp) continue;

            const memberS = scoreMemberOverlap(src, dest);
            const typeS = scoreType(src, dest);
            const nameS = scoreName(src, dest);
            const combined = nameS * 0.4 + memberS * 0.4 + typeS * 0.2;
            if (combined > bestScore) {
              bestScore = combined;
              bestIdx = d;
            }
          }

          // Same threshold as Phase 3: after 0.7x penalty, must reach LOW (0.40)
          if (bestIdx >= 0 && bestScore > 0.57) {
            usedDestInClass.add(bestIdx);
            const destMatch = destPool[bestIdx];
            const finalScore = bestScore * 0.7;
            const confidence = scoreToConfidence(finalScore);
            const subMappings = mapSubmodels(src, destMatch);

            if (confidence === "unmapped") continue;

            const mappingIdx = allMappings.findIndex(
              (m) => m.sourceModel === src && m.destModel === null,
            );
            if (mappingIdx >= 0) {
              allMappings[mappingIdx] = {
                sourceModel: src,
                destModel: destMatch,
                score: finalScore,
                confidence,
                factors: {
                  name: scoreName(src, destMatch),
                  spatial: 0,
                  shape: 0.5,
                  type: scoreType(src, destMatch),
                  pixels: 0.5,
                  structure: 0.5,
                },
                reason: `Group quantity match (${cls.replace(/_/g, " ")})`,
                submodelMappings: subMappings,
              };
            }
          }
        }
      }
    }
  }

  // ── Collect unused dest models ─────────────────────────
  const usedDest = new Set(
    allMappings.filter((m) => m.destModel).map((m) => m.destModel!.name),
  );
  const unusedDestModels = destModels.filter((m) => !usedDest.has(m.name));

  // ── Sort: confidence → groups first → natural source name ──
  const confidenceOrder: Record<Confidence, number> = {
    high: 0,
    medium: 1,
    low: 2,
    unmapped: 3,
  };
  allMappings.sort((a, b) => {
    // Primary: confidence tier
    const cDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (cDiff !== 0) return cDiff;
    // Secondary: groups before individuals within same tier
    const aGroup = a.sourceModel.isGroup ? 0 : 1;
    const bGroup = b.sourceModel.isGroup ? 0 : 1;
    if (aGroup !== bGroup) return aGroup - bGroup;
    // Tertiary: natural number sort on source model name
    // (e.g. "Eave 2" < "Eave 10" < "Eave 100")
    return a.sourceModel.name.localeCompare(b.sourceModel.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  const mapped = allMappings.filter((m) => m.destModel !== null);
  return {
    mappings: allMappings,
    totalSource: sourceModels.length,
    totalDest: destModels.length,
    mappedCount: mapped.length,
    highConfidence: mapped.filter((m) => m.confidence === "high").length,
    mediumConfidence: mapped.filter((m) => m.confidence === "medium").length,
    lowConfidence: mapped.filter((m) => m.confidence === "low").length,
    unmappedSource: sourceModels.length - mapped.length,
    unmappedDest: unusedDestModels.length,
    unusedDestModels,
  };
}

/**
 * Fast pre-filter to skip obviously incompatible pairs before expensive scoring.
 * Returns true if the pair should be SKIPPED (incompatible).
 */
function shouldSkipPair(source: ParsedModel, dest: ParsedModel): boolean {
  // Skip DMX models (except moving heads, which have their own isolation rule)
  const srcMH = isMovingHead(source);
  const destMH = isMovingHead(dest);
  if ((isDmxModel(source) && !srcMH) || (isDmxModel(dest) && !destMH))
    return true;

  // Moving Head isolation: skip if exactly one side is a moving head
  if (srcMH !== destMH) return true;

  // Matrix type-lock: matrix only matches matrix (unless both are groups)
  if (isMatrixType(source) !== isMatrixType(dest)) {
    if (!(source.isGroup && dest.isGroup)) return true;
  }

  // Extreme pixel count difference (>= 1000) for non-groups
  // EXCEPTION: Large spinners (500+ pixels) are compatible with each other
  if (!source.isGroup && !dest.isGroup) {
    const srcPx = source.pixelCount;
    const destPx = dest.pixelCount;
    if (srcPx > 0 && destPx > 0 && Math.abs(srcPx - destPx) >= 1000) {
      // Allow large spinners to pass through
      const bothLargeSpinners =
        isLargeSpinner(source) &&
        isLargeSpinner(dest) &&
        srcPx >= 500 &&
        destPx >= 500;
      if (!bothLargeSpinners) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Greedy matching within a pool of source and dest models.
 * Returns mappings for all source models (matched or unmapped).
 */
function greedyMatch(
  sources: ParsedModel[],
  dests: ParsedModel[],
  sourceBounds: NormalizedBounds,
  destBounds: NormalizedBounds,
): ModelMapping[] {
  // Build score matrix with pre-filtering
  const entries: {
    srcIdx: number;
    destIdx: number;
    score: number;
    factors: ModelMapping["factors"];
  }[] = [];

  for (let s = 0; s < sources.length; s++) {
    for (let d = 0; d < dests.length; d++) {
      // Fast pre-filter: skip incompatible pairs before expensive scoring
      if (shouldSkipPair(sources[s], dests[d])) continue;

      const { score, factors } = computeScore(
        sources[s],
        dests[d],
        sourceBounds,
        destBounds,
      );
      // Only consider if there's some name or type affinity
      if (score > 0.1) {
        entries.push({ srcIdx: s, destIdx: d, score, factors });
      }
    }
  }

  // Sort by score descending
  entries.sort((a, b) => b.score - a.score);

  const assignedSrc = new Set<number>();
  const assignedDest = new Set<number>();
  const mappings: ModelMapping[] = [];

  // Greedy assignment
  for (const entry of entries) {
    if (assignedSrc.has(entry.srcIdx) || assignedDest.has(entry.destIdx))
      continue;

    const sourceModel = sources[entry.srcIdx];
    const destModel = dests[entry.destIdx];
    const confidence = scoreToConfidence(entry.score);

    // Don't assign if confidence is too low
    if (confidence === "unmapped") continue;

    const mapping: ModelMapping = {
      sourceModel,
      destModel,
      score: entry.score,
      confidence,
      factors: entry.factors,
      reason: "",
      submodelMappings: mapSubmodels(sourceModel, destModel),
    };
    mapping.reason = generateReason(mapping);

    mappings.push(mapping);
    assignedDest.add(entry.destIdx);

    // For spinner models with matching submodels, allow the source to be
    // reused by other dest spinners — multiple user spinners can all map
    // to the same source spinner when submodel names match exactly.
    if (!isSpinnerSharedMatch(sourceModel, destModel)) {
      assignedSrc.add(entry.srcIdx);
    }
  }

  // Add unmapped source models
  for (let s = 0; s < sources.length; s++) {
    if (!assignedSrc.has(s)) {
      mappings.push({
        sourceModel: sources[s],
        destModel: null,
        score: 0,
        confidence: "unmapped",
        factors: {
          name: 0,
          spatial: 0,
          shape: 0,
          type: 0,
          pixels: 0,
          structure: 0,
        },
        reason: "No suitable match found in your layout.",
        submodelMappings: [],
      });
    }
  }

  return mappings;
}

// ═══════════════════════════════════════════════════════════════════
// Public Helpers for Interactive Mapping (V2)
// ═══════════════════════════════════════════════════════════════════

export { mapSubmodels, scoreToConfidence };

/**
 * Return ranked match suggestions for a given dest model against a pool
 * of source models. Used by the interactive mapping UI to populate
 * the remap dropdown with scored candidates.
 */
export function suggestMatches(
  destModel: ParsedModel,
  sourcePool: ParsedModel[],
  allSourceModels: ParsedModel[],
  allDestModels: ParsedModel[],
): {
  model: ParsedModel;
  score: number;
  confidence: Confidence;
  factors: ModelMapping["factors"];
}[] {
  const sourceBounds = getNormalizedBounds(allSourceModels);
  const destBounds = getNormalizedBounds(allDestModels);

  const suggestions: {
    model: ParsedModel;
    score: number;
    confidence: Confidence;
    factors: ModelMapping["factors"];
  }[] = [];

  for (const source of sourcePool) {
    // Fast pre-filter: skip incompatible pairs
    if (shouldSkipPair(source, destModel)) continue;

    const { score, factors } = computeScore(
      source,
      destModel,
      sourceBounds,
      destBounds,
    );
    if (score > 0.05) {
      suggestions.push({
        model: source,
        score,
        confidence: scoreToConfidence(score),
        factors,
      });
    }
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, 20);
}

/**
 * V3 source-first suggestion: given a SOURCE model (the task item),
 * rank user (dest) models by how well they match.
 * Same scoring as suggestMatches but iterating dest pool instead of source pool.
 */
export function suggestMatchesForSource(
  sourceModel: ParsedModel,
  destPool: ParsedModel[],
  allSourceModels: ParsedModel[],
  allDestModels: ParsedModel[],
): {
  model: ParsedModel;
  score: number;
  confidence: Confidence;
  factors: ModelMapping["factors"];
}[] {
  const sourceBounds = getNormalizedBounds(allSourceModels);
  const destBounds = getNormalizedBounds(allDestModels);

  const suggestions: {
    model: ParsedModel;
    score: number;
    confidence: Confidence;
    factors: ModelMapping["factors"];
  }[] = [];

  for (const dest of destPool) {
    // Fast pre-filter: skip incompatible pairs
    if (shouldSkipPair(sourceModel, dest)) continue;

    const { score, factors } = computeScore(
      sourceModel,
      dest,
      sourceBounds,
      destBounds,
    );
    if (score > 0.05) {
      suggestions.push({
        model: dest,
        score,
        confidence: scoreToConfidence(score),
        factors,
      });
    }
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, 20);
}
