/**
 * ModIQ Semantic Synonyms
 *
 * Groups of terms that should be treated as equivalent when matching
 * user layout items to sequence items.
 *
 * Usage:
 * - If user has "Yard Outline" and sequence has "Lawn Border", these should match
 * - Matching is bidirectional within each group
 * - Case-insensitive matching
 */

export const SEMANTIC_SYNONYMS: string[][] = [
  // Ground/Lawn synonyms
  ["lawn", "yard", "grass", "ground", "turf"],

  // Outline/Border synonyms
  ["outline", "border", "edge", "perimeter", "trim"],

  // House/Home synonyms
  ["house", "home", "dwelling", "residence"],

  // Tree types
  ["tree", "evergreen", "pine", "fir", "spruce"],
  ["mini tree", "small tree", "tiny tree", "tabletop tree"],

  // Arch synonyms
  ["arch", "arches", "archway", "arc"],

  // Star synonyms
  ["star", "stars", "starburst"],

  // Snowflake synonyms
  ["snowflake", "flake", "snow flake"],

  // Candy cane synonyms
  ["candy cane", "candycane", "cane"],

  // Icicle synonyms
  ["icicle", "icicles", "ice"],

  // Roof/Roofline synonyms
  ["roof", "roofline", "roof line", "eave", "eaves", "gutter"],

  // Window synonyms
  ["window", "windows", "win"],

  // Door synonyms
  ["door", "doors", "entrance", "entry"],

  // Garage synonyms
  ["garage", "carport"],

  // Fence synonyms
  ["fence", "fencing", "picket", "rail", "railing"],

  // Bush/Shrub synonyms
  ["bush", "bushes", "shrub", "shrubs", "hedge", "hedges"],

  // Wreath synonyms
  ["wreath", "wreaths", "ring", "circle"],

  // Spinner synonyms (High Density)
  ["spinner", "spinners", "pinwheel", "wheel"],
  ["showstopper", "show stopper", "ss"],

  // Matrix synonyms (all matrix-family names are interchangeable)
  ["matrix", "panel", "screen", "display", "grid", "p5", "p10", "virtual matrix"],

  // Mega tree synonyms
  ["mega tree", "megatree", "mega", "large tree", "big tree"],

  // Pixel synonyms
  ["pixel", "pixels", "node", "nodes", "led", "leds"],

  // String/Strand synonyms
  ["string", "strand", "line", "strip"],

  // Flood/Wash synonyms
  ["flood", "floods", "wash", "spot", "spotlight"],

  // Column/Pillar synonyms
  ["column", "pillar", "post", "pole"],

  // Stake synonyms
  ["stake", "stakes", "stick", "sticks", "rod", "rods"],

  // Net/Mesh synonyms
  ["net", "mesh", "netting"],

  // Fan/Firework synonyms
  ["fan", "fans", "firework", "fireworks"],

  // Spiral synonyms
  ["spiral", "spirals", "helix", "coil"],

  // Path/Walk synonyms
  ["path", "pathway", "walk", "walkway", "sidewalk", "driveway"],

  // Leaping/Jumping synonyms (deer, etc.)
  ["leaping", "jumping", "running", "flying"],

  // Deer synonyms
  ["deer", "reindeer", "buck", "doe"],

  // Snowman synonyms
  ["snowman", "snow man", "frosty"],

  // Santa synonyms
  ["santa", "santa claus", "father christmas", "st nick"],

  // Present/Gift synonyms
  ["present", "presents", "gift", "gifts", "box", "boxes", "package"],

  // Bow synonyms
  ["bow", "bows", "ribbon", "ribbons"],

  // Bell synonyms
  ["bell", "bells", "chime", "chimes"],

  // Candle synonyms
  ["candle", "candles", "flame", "flames"],

  // Angel synonyms
  ["angel", "angels", "cherub"],

  // Cross synonyms
  ["cross", "crucifix"],

  // Heart synonyms
  ["heart", "hearts", "love"],

  // Pumpkin synonyms (Halloween)
  ["pumpkin", "pumpkins", "jack o lantern", "jackolantern", "jol"],

  // Ghost synonyms
  ["ghost", "ghosts", "spirit", "spirits", "spook"],

  // Spider synonyms
  ["spider", "spiders", "tarantula"],

  // Web synonyms
  ["web", "webs", "spider web", "cobweb"],

  // Skeleton synonyms
  ["skeleton", "skeletons", "bones", "skull", "skulls"],

  // Bat synonyms
  ["bat", "bats"],

  // Witch synonyms
  ["witch", "witches", "hag"],

  // Cat synonyms
  ["cat", "cats", "black cat", "kitty"],

  // Tombstone synonyms
  ["tombstone", "tombstones", "gravestone", "headstone", "grave", "rip"],

  // Cauldron synonyms
  ["cauldron", "cauldrons", "pot", "kettle"],

  // Directional synonyms
  ["left", "l", "lt"],
  ["right", "r", "rt"],
  ["center", "centre", "middle", "mid", "ctr", "c"],
  ["front", "fnt", "f"],
  ["back", "rear", "bk", "b"],
  ["top", "upper", "up"],
  ["bottom", "lower", "btm", "bot"],

  // Size synonyms
  ["small", "sm", "mini", "tiny", "little"],
  ["medium", "med", "mid"],
  ["large", "lg", "big", "grande"],
  ["extra large", "xl", "xlarge", "huge", "giant"],

  // Color group synonyms (for when colors are in names)
  ["red", "r"],
  ["green", "grn", "g"],
  ["blue", "blu", "b"],
  ["white", "wht", "w"],
  ["warm white", "ww", "warm"],
  ["cool white", "cw", "cool"],
  ["rgb", "color", "colour", "multi"],

  // Abbreviation expansions
  ["grp", "group", "groups"],
  ["all", "every", "entire"],
];

// ─── Lazy singleton synonym map ────────────────────────

let _synonymMap: Map<string, Set<string>> | null = null;

/**
 * Build a lookup map for fast synonym checking.
 * Cached as a module-level singleton after first call.
 */
export function buildSynonymMap(): Map<string, Set<string>> {
  if (_synonymMap) return _synonymMap;

  const map = new Map<string, Set<string>>();

  for (const group of SEMANTIC_SYNONYMS) {
    const normalizedGroup = group.map((term) => term.toLowerCase().trim());
    const synonymSet = new Set(normalizedGroup);

    for (const term of normalizedGroup) {
      // Merge with existing synonyms if term appears in multiple groups
      const existing = map.get(term);
      if (existing) {
        for (const syn of synonymSet) {
          existing.add(syn);
        }
      } else {
        map.set(term, new Set(synonymSet));
      }
    }
  }

  _synonymMap = map;
  return map;
}

/**
 * Check if two terms are synonyms
 */
export function areSynonyms(term1: string, term2: string): boolean {
  const synonymMap = buildSynonymMap();
  const normalized1 = term1.toLowerCase().trim();
  const normalized2 = term2.toLowerCase().trim();

  if (normalized1 === normalized2) return true;

  const synonyms = synonymMap.get(normalized1);
  return synonyms?.has(normalized2) ?? false;
}

/**
 * Get all synonyms for a term
 */
export function getSynonyms(term: string): string[] {
  const synonymMap = buildSynonymMap();
  const normalized = term.toLowerCase().trim();
  const synonyms = synonymMap.get(normalized);
  return synonyms ? Array.from(synonyms) : [normalized];
}

/**
 * Calculate similarity boost when terms share synonyms.
 * Returns a value between 0 and 1.
 */
export function calculateSynonymBoost(
  userTerms: string[],
  sequenceTerms: string[],
): number {
  const synonymMap = buildSynonymMap();
  let matches = 0;
  const totalUserTerms = userTerms.length;

  for (const userTerm of userTerms) {
    const userNormalized = userTerm.toLowerCase().trim();
    const userSynonyms =
      synonymMap.get(userNormalized) || new Set([userNormalized]);

    for (const seqTerm of sequenceTerms) {
      const seqNormalized = seqTerm.toLowerCase().trim();
      if (userSynonyms.has(seqNormalized)) {
        matches++;
        break; // Found a match for this user term, move to next
      }
    }
  }

  return totalUserTerms > 0 ? matches / totalUserTerms : 0;
}

/**
 * Tokenize a model name into meaningful terms
 */
export function tokenizeName(name: string): string[] {
  return (
    name
      .toLowerCase()
      // Replace common separators with spaces
      .replace(/[-_]/g, " ")
      // Remove numbers at end (they're usually instance numbers)
      .replace(/\s*\d+\s*$/, "")
      // Split on spaces and filter empty
      .split(/\s+/)
      .filter((term) => term.length > 0)
  );
}

/**
 * Enhanced similarity score using synonyms
 */
export function calculateEnhancedSimilarity(
  userName: string,
  sequenceName: string,
): number {
  const userTokens = tokenizeName(userName);
  const seqTokens = tokenizeName(sequenceName);

  // Base: exact token matches
  const exactMatches = userTokens.filter((t) => seqTokens.includes(t)).length;
  const exactScore =
    (exactMatches * 2) / (userTokens.length + seqTokens.length);

  // Boost: synonym matches
  const synonymBoost = calculateSynonymBoost(userTokens, seqTokens);

  // Combined score (weighted)
  const combinedScore = exactScore * 0.7 + synonymBoost * 0.3;

  return Math.min(1, combinedScore);
}

