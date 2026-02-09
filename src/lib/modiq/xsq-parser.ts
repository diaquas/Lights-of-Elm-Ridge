/**
 * ModIQ — xsq Sequence File Parser
 *
 * Parses xLights .xsq sequence files to extract the list of model names
 * that a sequence actually uses. This enables per-sequence filtering
 * so the matcher only considers models relevant to the selected sequence.
 *
 * xsq format: XML with <Element type="model" name="ModelName"> entries
 * in the ElementEffects section. Each entry represents a model that has
 * timing/effects data in the sequence.
 */

/**
 * Models to exclude from the extracted list — these are utility/folder
 * entries, not real mappable models.
 */
const EXCLUDED_PREFIXES = ["FOLDER -", "Pixel2DMX", "Fog Machine"];

/**
 * Extract model names from an xsq XML string.
 * Returns a deduplicated, sorted array of model names used in the sequence.
 */
export function parseXsqModels(xsqXml: string): string[] {
  const modelNames = new Set<string>();

  // Match all <Element type="model" name="..."> entries
  const regex = /type="model"\s+name="([^"]+)"/g;
  let match;
  while ((match = regex.exec(xsqXml)) !== null) {
    const name = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    // Skip utility/folder entries
    if (EXCLUDED_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      continue;
    }

    modelNames.add(name);
  }

  return Array.from(modelNames).sort();
}

/**
 * Extract per-model effect counts from an xsq XML string.
 * Returns a Record mapping model names to their direct effect count.
 * Only models with > 0 effects are included.
 *
 * This is needed for vendor-uploaded sequences where we don't have
 * pre-extracted SEQUENCE_EFFECT_COUNTS data. It distinguishes container
 * groups (0 direct effects) from groups that actually have effects.
 */
export function parseXsqEffectCounts(xsqXml: string): Record<string, number> {
  const counts: Record<string, number> = {};

  // Strategy: use DOMParser for accurate nested element handling.
  // Each <Element type="model"> can contain:
  //   - <EffectLayer> with direct <Effect> children (direct effects)
  //   - Nested <Element type="model"> children (child models)
  // We only want to count the direct effects, not child model effects.
  const parser = new DOMParser();
  const doc = parser.parseFromString(xsqXml, "text/xml");

  // Check for parse errors
  if (doc.querySelector("parsererror")) {
    console.warn(
      "parseXsqEffectCounts: XML parse error, returning empty counts",
    );
    return counts;
  }

  function processElement(el: Element) {
    const type = el.getAttribute("type");
    const name = el.getAttribute("name");

    if (type === "model" && name) {
      const decodedName = name
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");

      if (!EXCLUDED_PREFIXES.some((p) => decodedName.startsWith(p))) {
        // Count Effect elements in direct EffectLayer children only
        let effectCount = 0;
        for (let i = 0; i < el.children.length; i++) {
          const child = el.children[i];
          if (child.tagName === "EffectLayer") {
            for (let j = 0; j < child.children.length; j++) {
              if (child.children[j].tagName === "Effect") {
                effectCount++;
              }
            }
          }
        }

        if (effectCount > 0) {
          counts[decodedName] = (counts[decodedName] ?? 0) + effectCount;
        }
      }
    }

    // Recurse into nested Element children
    for (let i = 0; i < el.children.length; i++) {
      if (el.children[i].tagName === "Element") {
        processElement(el.children[i]);
      }
    }
  }

  // Walk from root → ElementEffects → Element nodes
  const root = doc.documentElement;
  for (let i = 0; i < root.children.length; i++) {
    const section = root.children[i];
    if (section.tagName === "ElementEffects") {
      for (let j = 0; j < section.children.length; j++) {
        if (section.children[j].tagName === "Element") {
          processElement(section.children[j]);
        }
      }
    }
  }

  return counts;
}

/**
 * Extract per-model effect TYPE counts from an xsq XML string.
 * Returns a Record mapping model names to their effect type distributions.
 * e.g., { "Matrix": { "Video": 42, "Morph": 20, "Text": 5 } }
 *
 * The effect name is extracted from the first token of the Effect's ref/name
 * attribute (xLights stores "EffectName,param1=val,param2=val" in ref).
 */
export function parseXsqEffectTypeCounts(
  xsqXml: string,
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  const parser = new DOMParser();
  const doc = parser.parseFromString(xsqXml, "text/xml");
  if (doc.querySelector("parsererror")) {
    console.warn("parseXsqEffectTypeCounts: XML parse error, returning empty");
    return result;
  }

  function processElement(el: Element) {
    const type = el.getAttribute("type");
    const name = el.getAttribute("name");

    if (type === "model" && name) {
      const decodedName = name
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");

      if (!EXCLUDED_PREFIXES.some((p) => decodedName.startsWith(p))) {
        for (let i = 0; i < el.children.length; i++) {
          const child = el.children[i];
          if (child.tagName === "EffectLayer") {
            for (let j = 0; j < child.children.length; j++) {
              const effect = child.children[j];
              if (effect.tagName === "Effect") {
                // Effect name: try "name" attribute first, then parse from "ref"
                let effectName =
                  effect.getAttribute("name") ??
                  effect.getAttribute("ref")?.split(",")[0];
                if (effectName) {
                  // Normalize: strip whitespace, use title case key
                  effectName = effectName.trim();
                  if (!result[decodedName]) result[decodedName] = {};
                  result[decodedName][effectName] =
                    (result[decodedName][effectName] ?? 0) + 1;
                }
              }
            }
          }
        }
      }
    }

    for (let i = 0; i < el.children.length; i++) {
      if (el.children[i].tagName === "Element") {
        processElement(el.children[i]);
      }
    }
  }

  const root = doc.documentElement;
  for (let i = 0; i < root.children.length; i++) {
    const section = root.children[i];
    if (section.tagName === "ElementEffects") {
      for (let j = 0; j < section.children.length; j++) {
        if (section.children[j].tagName === "Element") {
          processElement(section.children[j]);
        }
      }
    }
  }

  return result;
}

/**
 * Pre-extracted model lists per sequence slug.
 *
 * These are generated by running parseXsqModels() on each sequence's .xsq file.
 * As new sequences are uploaded to R2, their model lists should be extracted
 * and added here. This avoids needing to fetch/parse xsq files at runtime.
 */
const SEQUENCE_MODELS: Record<string, string[]> = {
  abracadabra: [
    // ── Master Groups ──
    "All - Pixels - GRP",
    "All - No Spinners - GRP",
    "All - No Spinners No Tree - GRP",
    "All - No Spinners No Tree No Matrix - GRP",
    // ── House Groups ──
    "All - House - GRP",
    "All - House Outlines - GRP",
    "All - Eaves - GRP",
    "All - Verts - GRP",
    "All - Windows - GRP",
    // ── Yard Groups ──
    "All - Yard - GRP",
    "All - Yard Left - GRP",
    "All - Yard Middle - GRP",
    "All - Yard Right - GRP",
    "All - Arches - GRP",
    "All - Poles - GRP",
    "All - Fence - GRP",
    "All - Mini Trees - GRP",
    "All - Trees - Real - GRP",
    "All - Pixel Forest - GRP",
    "All - Fireworks - GRP",
    "All - Floods - GRP",
    "All - Spiral Trees - GRP",
    // ── Arch submodel groups ──
    "Arches - Inner - GRP",
    "Arches - Middle - GRP",
    "Arches - Outer - GRP",
    // ── Spinner Groups ──
    "All - Spinners - GRP",
    "Spinners - Showstopper - Submodels - GRP",
    "Spinners - CC Boom - Submodels - GRP",
    "Spinners - Fuzion - Submodels - GRP",
    "Spinners - Overlord - Submodels - GRP",
    "Spinners - Rosa Grande - Submodels - GRP",
    // ── Halloween Groups ──
    "All - Spiders - GRP",
    "All - Spider Legs - GRP",
    "All - Spider Eyes - GRP",
    "All - Spider Hourglasses - GRP",
    "All - Bats - GRP",
    "All - Bat Eyes - GRP",
    "All - Bat Outlines - GRP",
    "All - Eyes - GRP",
    "All - Mini Pumpkins - GRP",
    "All - Mini Pumpkin Outlines - GRP",
    "All - Mini Pumpkin Eyes - GRP",
    "All - Tombstones - GRP",
    "All - Tombstone Outlines - GRP",
    "All - Tombstone RIPs - GRP",
    "All - Tombstone Arches - GRP",
    "All - Tombstone Small Borders - GRP",
    "All - Tombstones - Old - GRP",
    "All - Tombstones - Small - GRP",
    "All - Tombstones GE Rosa - GRP",
    // ── GE Fuzion submodel groups ──
    "GE Fuzion GRP",
    "GE Fuzion M GRP",
    "GE Fuzion Outline GRP",
    "GE Fuzion Ring GRP",
    "GE Fuzion Triangle Lg GRP",
    "GE Fuzion Arrowhead GRP",
    "GE Fuzion Feather Even GRP",
    "GE Fuzion Feather Odd GRP",
    "GE Fuzion Flower GRP",
    "GE Fuzion Ribbon Long GRP",
    "GE Fuzion Ribon Sm GRP",
    "GE Fuzion Spoke GRP",
    "GE Fuzion Stars GRP",
    "GE Fuzion Star 1 GRP",
    "GE Fuzion Star 2 GRP",
    "GE Fuzion Balls GRP",
    "GE Fuzion Windmill Lg Even GRP",
    "GE Fuzion Windmill Lg Odd GRP",
    "GE Fuzion Windmill Sm Even GRP",
    "GE Fuzion Windmill Sm Odd GRP",
    "GE Fuzion Spaceship Even GRP",
    "GE Fuzion Spaceship Odd GRP",
    // ── GE Overlord submodel groups ──
    "GE Overlord GRP",
    "GE Overlord Arrow GRP",
    "GE Overlord Desparado All GRP",
    "GE Overlord Desparado Odd GRP",
    "GE Overloard Desparado Even GRP",
    "GE Overlord Friction GRP",
    "GE Overlord Lolli GRP",
    "GE Overlord Noose All GRP",
    "GE Overlord Noose Even GRP",
    "GE Overlord Noose Odd GRP",
    "GE Overlord Off Limits All GRP",
    "GE Overlord Off Limits Even GRP",
    "GE Overlord Off Limits Odd GRP",
    "GE Overlord Outer Edge All GRP",
    "GE Overlord Outer Edge Even GRP",
    "GE Overlord Outer Edge Odd GRP",
    "GE Overlord Points All GRP",
    "GE Overlord Points Even GRP",
    "GE Overlord Points Odd GRP",
    "GE Overlord So Hot GRP",
    "GE Overlord Spiral GRP",
    "GE Overlord Sporks GRP",
    // ── GE Rosa Grande submodel groups ──
    "GE Rosa Grande GRP",
    "GE Rosa Grande Spoke Mini GRP",
    "GE Rosa Grande Spoke GRP",
    "GE Rosa Grande Ring GRP",
    "GE Rosa Grande Outer Ring GRP",
    "GE Rosa Grande Outer Ball GRP",
    "GE Rosa Grande Flower GRP",
    "GE Rosa Grande Ribbon GRP",
    "GE Rosa Grande Hook CW GRP",
    "GE Rosa Grande Hook CCW GRP",
    "GE Rosa Grande Feather Long GRP",
    "GE Rosa Grande Feather Long Even GRP",
    "GE Rosa Grande Feather Long Odd GRP",
    "GE Rosa Grande Feather Short GRP",
    "GE Rosa Grande Feather Short Even GRP",
    "GE Rosa Grande Feather Short Odd GRP",
    "GE Rosa Grande Torch Long GRP",
    "GE Rosa Grande Torch Long Even GRP",
    "GE Rosa Grande Torch Long Odd GRP",
    "GE Rosa Grande Torch Short GRP",
    "GE Rosa Grande Torch Short Even GRP",
    "GE Rosa Grande Torch Short Odd GRP",
    "GE Rosa Grande Snowflake Spoke GRP",
    "GE Rosa Grande Web Ring GRP",
    "GE Rosa Grande Web Spoke GRP",
    "GE Rosa Grande Wavy GRP",
    // ── GE CC Boom submodel groups ──
    "GE CC Boom GRP",
    "GE CC Boom Outline GRP",
    "GE CC Boom Star GRP",
    "GE CC Boom Finger GRP",
    "GE CC Boom Spokes GRP",
    "GE CC Boom Spokes Inner GRP",
    "GE CC Boom Stigma GRP",
    "GE CC Boom Stigma GRP Model",
    "GE CC Boom Strangness GRP",
    "GE CC Boom Strangness Model",
    "GE CC Boom Thelma GRP",
    "GE CC Boom Thelma GRP Model",
    "GE CC Boom Snarlfle GRP",
    "GE CC Boom Snarfle GRP Model",
    "GE CC Boom Pull My Finger GRP",
    "GE CC Boom Pull my Finger GRP Model",
    "GE Click Click Boom Pull My Finger GRP",
    "GE CC Boom Piece of Work GRP",
    "GE CC Boom Piece of Work GRP Model",
    "GE CC Boom Outside Ball GRP",
    "GE CC Boom Cone All GRP",
    "GE CC Boom Cone Even GRP",
    "GE CC Boom Cone Odd GRP",
    "GE CC Boom Cone SM All GRP",
    "GE CC Boom Cone SM Odd GRP",
    "GE CC Boom Cone Small Even GRP",
    "GE CC Boom Cones All GRP Model",
    "GE CC Boom Cones SM-LG All GRP",
    // ── GE Preying Spider submodel groups ──
    "GE Preying Spiders ALL GRP",
    "GE Preying Spider Crawly GRP",
    "GE Preying Spider 350 Leg GRP",
    "GE Preying Spider 350 GRP",
    "GE Preying Spider 350 Cross GRP",
    "GE Preying Spider 350 Mouth GRP",
    "GE Preying Spider 350 Outline GRP",
    "GE Preying Spider Body GRP",
    "GE Preying Spider Eye GRP",
    // ── GE Rosa Tomb submodel groups ──
    "GE Rosa Tomb GRP",
    "GE Rosa Tomb Spokes GRP",
    "GE Rosa Tomb Rings GRP",
    "GE Rosa Tomb Cross Spinner GRP",
    "GE Rosa Tomb Tomb Spokes GRP",
    "GE Rosa Tomb Gourds GRP",
    "GE Rosa Tomb Warp GRP",
    "GE Rosa Tomb Paddles GRP",
    "GE Rosa Tomb Tomb Ring GRP",
    "GE Rosa Tomb Cross Ring GRP",
    "GE Rosa Tomb Cross Outline GRP",
    "GE Rosa Tomb Bat Body GRP",
    "GE Rosa Tomb Eyes GRP",
    "GE Rosa Tomb Flake GRP",
    "GE Rosa Tomb Highlilghts GRP",
    "GE Rosa Tomb Outline GRP",
    "GE Rosa Tomb Stars GRP",
    "GE Rosa Tomb Tombstone Lower GRP",
    "GE Rosa Tomb Wings GRP",
    "GE Rosa Tomb Wings Down GRP",
    "GE Rosa Tomb Wings Up GRP",
    // ── Showstopper submodels (S - prefix) ──
    "S - All Rings",
    "S - Angle Spinner Left",
    "S - Angle Spinner Right",
    "S - Arrows",
    "S - Arrows - Long",
    "S - Arrows - Short",
    "S - Big Hearts",
    "S - Big Petals",
    "S - Big Petals - Even",
    "S - Big Petals - Odd",
    "S - Big Umbrella",
    "S - Big Y",
    "S - Bows",
    "S - Cascading Arches",
    "S - Cascading Arches - Even",
    "S - Cascading Arches - Odd",
    "S - Cascading Leaf",
    "S - Cascading Petal",
    "S - Center Balls",
    "S - Center Balls - Even",
    "S - Center Balls - Odd",
    "S - Center Rings",
    "S - Chalice",
    "S - Circles (V)",
    "S - Circles - Even",
    "S - Circles - Odd",
    "S - Crosses",
    "S - Diamonds",
    "S - Feathers",
    "S - Fireworks",
    "S - Geo Explode",
    "S - Half Moon",
    "S - Half Willow",
    "S - Inner Circle",
    "S - Inner Swirl Left",
    "S - Inner Swirl Right",
    "S - Iris",
    "S - Leaf",
    "S - Leaf - Even",
    "S - Leaf - Odd",
    "S - Lightning",
    "S - Medium Hearts",
    "S - Medium Umbrella",
    "S - More Stars",
    "S - Outer Balls",
    "S - Outer Rings",
    "S - Outer Swirl Left",
    "S - Outer Swirl Right",
    "S - Outline",
    "S - Oysters",
    "S - Pupil",
    "S - Saucers",
    "S - Short Angle Spinner",
    "S - Small Hearts",
    "S - Small Umbrella",
    "S - Snowflakes",
    "S - Spiders",
    "S - Spinners - All",
    "S - Spinners - Inner",
    "S - Spinners - Long",
    "S - Spinners - Outer",
    "S - Spinners - Short",
    "S - Squiggle 1",
    "S - Squiggle 2",
    "S - Starburst",
    "S - Stars",
    "S - Swirl Left",
    "S - Swirl Right",
    "S - Swirl and a Circle",
    "S - Three Quarter Circle",
    "S - Trident",
    "S - Trophies",
    "S - Whites",
    "S - Willow",
    "S - Wine Glass",
    "S - Wreath",
    // ── Individual models ──
    "Matrix",
    "Mega Tree",
    "Singing Pumpkin",
    "Spider - Tree Topper",
    "Spinner - Showstopper 1",
    "Spinner - Showstopper 2",
    "Spinner - Showstopper 3",
    "Spinner - Fuzion",
    "Pixel Forest",
    "Pixel Forest-2",
    "Firework 1",
    "Firework 2",
    "Floods 1",
    "Floods 2",
    "Floods 3",
    "Floods 4",
    "Tune-To-Matrix",
    "Tune-To-Matrix-2",
    "Window - Avery",
    "Window - Ellis",
    "Window - Garage",
    "Window - Office",
    "Window - Tower",
    "Tree - Medium 1",
    "Tree - Medium 2",
    "Tree Real 1 - Trunk",
    "Tree Real 1 - Fork Left",
    "Tree Real 1 - Fork Right",
    "Tree - Real 1",
    "Tree Real 2",
    "Tree Real 3",
    "Tree Real 4",
    // ── Eaves (real names from xsq) ──
    "Eave 1- Office Left",
    "Eave 2 - Office Peak 1",
    "Eave 3 - Office Peak 2",
    "Eave 4 - Office Right",
    "Eave 5 - Entrance Arch",
    "Eave 6 - Tower Left",
    "Eave 7 - Tower Peak 1",
    "Eave 8 - Tower Peak 2",
    "Eave 9 - Upper Tower Right",
    "Eave 10 - Lower Tower Forward",
    "Eave 11 - Lower Tower Right",
    "Eave 12 - Avery Eave",
    "Eave 13 - Avery Right",
    "Eave 14 - Ellis Eave",
    "Eave 15 - Ellis Right",
    "Eave 16 - Guest Left",
    "Eave 17 - Guest Eave",
    "Eave 18 - Guest Right",
    "Eave 19 - Guest Bath",
    "Eave 20 - Guest Bath Right",
    "Eave 21 - Garage 1",
    "Eave 22 - Garage Left",
    "Eave 23 - Garage Peak 1",
    "Eave 24 - Garage Peak 2",
    "Eave 25 - Garage Right",
    "Eave 26 - Garage 2",
    // ── Verts (real names from xsq) ──
    "Vert 1 - Office 1",
    "Vert 2 - Office 2",
    "Vert 3 - Tower 1",
    "Vert 4 - Entrance 1",
    "Vert 5 - Entrance 2",
    "Vert 6 - Tower 2",
    "Vert 7 - Dining",
    "Vert 8 - Avery",
    "Vert 9 - Guest 1",
    "Vert 10 - Guest 2",
    "Vert 11 - Ellis",
    "Vert 12 - Guest Bath",
    "Vert 13 - Garage 1",
    "Vert 14 - Garage 2",
    "Vert 15 - Garage 3",
    // ── Arches ──
    "Arch 1",
    "Arch 2",
    "Arch 3",
    "Arch 4",
    "Arch 5",
    "Arch 6",
    "Arch 7",
    "Arch 8",
    // ── Poles ──
    "Pole 1",
    "Pole 2",
    "Pole 3",
    "Pole 4",
    "Pole 5",
    "Pole 6",
    "Pole 7",
    "Pole 8",
    // ── Fence Panels ──
    "Fence Panel 1",
    "Fence Panel 2",
    "Fence Panel 3",
    "Fence Panel 4",
    "Fence Panel 5",
    "Fence Panel 6",
    "Fence Panel 7",
    // ── Spiders ──
    "Spider 1",
    "Spider 2",
    "Spider 3",
    "Spider 4",
    "Spider 5",
    "Spider 6",
    // ── Bats ──
    "Bat 1",
    "Bat 2",
    "Bat 3",
    "Bat 4",
    "Bat 5",
    "Bat 6",
    "Bat 7",
    // ── Tombstones ──
    "Tombstone 1",
    "Tombstone 2",
    "Tombstone 3",
    "Tombstone 4",
    "Tombstone Small - 1",
    "Tombstone Small - 2",
    "Tombstone Small - 3",
    "Tombstone Small - 4",
    "Tombstone Small - 5",
    "Tombstone Small - 6",
    "GE Rosa Tomb 1",
    "GE Rosa Tomb 2",
    "GE Rosa Tomb 3",
    "GE Rosa Tomb 4",
    // ── Pumpkins ──
    "Pumpkin Mini 1",
    "Pumpkin Mini 2",
    "Pumpkin Mini 3",
    "Pumpkin Mini 4",
    "Pumpkin Mini 5",
    "Pumpkin Mini 6",
    "Pumpkin Mini 7",
    "Pumpkin Mini 8",
    // ── Trees ──
    "Tree - Small 1",
    "Tree - Small 2",
    "Tree - Small 3",
    "Tree - Small 4",
    "Tree - Small 5",
    "Tree - Small 6",
    "Tree - Spiral 1",
    "Tree - Spiral 2",
    "Tree - Spiral 3",
    "Tree - Spiral 4",
    "Tree - Spiral 5",
    "Tree - Spiral 6",
    "Tree - Spiral 7",
    "Tree - Spiral 8",
    // ── Utility ──
    "Yard Only",
  ],
};

/**
 * Pre-extracted effect counts per model per sequence.
 * Each entry maps model name → number of effects in that sequence.
 * Generated by counting <Effect> elements within each model's EffectLayers.
 */
const SEQUENCE_EFFECT_COUNTS: Record<string, Record<string, number>> = {
  abracadabra: {
    Matrix: 122,
    "All - House Outlines - GRP": 83,
    "All - Fireworks - GRP": 80,
    "All - Poles - GRP": 77,
    "GE CC Boom Outline GRP": 77,
    "All - Fence - GRP": 76,
    "All - Mini Trees - GRP": 75,
    "All - Arches - GRP": 71,
    "GE Rosa Grande Outer Ball GRP": 69,
    "All - Mini Pumpkins - GRP": 68,
    "S - Spinners - Inner": 67,
    "All - Spiders - GRP": 66,
    "Floods 1": 65,
    "Floods 2": 65,
    "Floods 3": 65,
    "Floods 4": 65,
    "All - Tombstones - GRP": 64,
    "GE Overlord Outer Edge All GRP": 63,
    "GE Overlord Noose All GRP": 63,
    "GE Overlord Noose Even GRP": 63,
    "GE Fuzion Ribbon Long GRP": 63,
    "All - No Spinners No Tree No Matrix - GRP": 60,
    "All - Bats - GRP": 60,
    "Mega Tree": 54,
    "GE Rosa Grande Outer Ring GRP": 52,
    "GE Fuzion Spoke GRP": 51,
    "GE Rosa Grande Ring GRP": 50,
    "GE Fuzion Spaceship Even GRP": 50,
    "GE Overlord GRP": 50,
    "GE Rosa Grande Torch Long GRP": 49,
    "GE CC Boom Pull My Finger GRP": 49,
    "GE CC Boom Piece of Work GRP": 49,
    "GE Fuzion M GRP": 49,
    "GE Overlord Off Limits Even GRP": 48,
    "GE Fuzion Ribon Sm GRP": 48,
    "GE CC Boom Cone SM All GRP": 47,
    "S - Squiggle 1": 47,
    "GE Fuzion Outline GRP": 47,
    "GE Rosa Grande Hook CCW GRP": 46,
    "GE Fuzion Feather Odd GRP": 46,
    "GE CC Boom Pull my Finger GRP Model": 39,
    "GE CC Boom GRP": 37,
    "GE Rosa Grande Feather Short GRP": 35,
    "GE Overlord Off Limits Odd GRP": 34,
    "GE Rosa Grande Spoke GRP": 34,
    "GE CC Boom Outside Ball GRP": 34,
    "S - Small Hearts": 34,
    "S - Spinners - Outer": 34,
    "GE CC Boom Piece of Work GRP Model": 34,
    "GE Overlord Outer Edge Odd GRP": 33,
    "All - Spiral Trees - GRP": 33,
    "All - Trees - Real - GRP": 33,
    "S - Short Angle Spinner": 33,
    "S - Small Umbrella": 33,
    "S - Swirl and a Circle": 33,
    "All - Pixel Forest - GRP": 33,
    "GE Overlord Desparado Odd GRP": 32,
    "GE Fuzion Feather Even GRP": 32,
    "S - Squiggle 2": 32,
    "S - Three Quarter Circle": 32,
    "S - Wine Glass": 32,
    "GE Fuzion Flower GRP": 32,
    "GE CC Boom Cones SM-LG All GRP": 31,
    "S - Stars": 31,
    "S - More Stars": 31,
    "GE Fuzion GRP": 31,
    "GE Overlord Arrow GRP": 30,
    "GE Fuzion Arrowhead GRP": 30,
    "GE CC Boom Cones All GRP Model": 30,
    "GE Rosa Grande Flower GRP": 24,
    "GE Rosa Grande Torch Long Even GRP": 23,
    "GE CC Boom Cone Small Even GRP": 22,
    "GE Rosa Grande GRP": 22,
    "GE Fuzion Spaceship Odd GRP": 21,
    "GE CC Boom Snarfle GRP Model": 21,
    "GE Overlord Outer Edge Even GRP": 20,
    "GE Rosa Grande Feather Short Even GRP": 20,
    "GE Rosa Tomb GRP": 20,
    "S - Outline": 20,
    "GE Fuzion Star 2 GRP": 20,
    "GE Overlord Off Limits All GRP": 19,
    "GE Overlord Points All GRP": 19,
    "GE Overlord Points Even GRP": 19,
    "GE Rosa Grande Hook CW GRP": 19,
    "GE Rosa Grande Ribbon GRP": 19,
    "GE CC Boom Cone Odd GRP": 19,
    "GE Overlord Lolli GRP": 18,
    "GE Rosa Grande Torch Short Even GRP": 18,
    "GE Rosa Grande Torch Long Odd GRP": 18,
    "GE Rosa Grande Snowflake Spoke GRP": 18,
    "GE Fuzion Balls GRP": 18,
    "S - Spinners - Short": 17,
    "S - Starburst": 17,
    "S - Bows": 17,
    "S - Cascading Arches - Even": 17,
    "GE Overlord Friction GRP": 16,
    "All - Eaves - GRP": 16,
    "GE Fuzion Ring GRP": 16,
    "S - Arrows - Long": 16,
    "S - Big Petals - Even": 16,
    "S - Big Petals - Odd": 16,
    "S - Cascading Arches - Odd": 16,
    "S - Wreath": 16,
    "S - Center Balls - Even": 16,
    "S - Center Rings": 16,
    "S - Circles - Even": 16,
    "S - Diamonds": 16,
    "S - Inner Swirl Left": 16,
    "S - Iris": 16,
    "All - Pixels - GRP": 15,
    "GE Overloard Desparado Even GRP": 15,
    "S - Spinners - Long": 15,
    "S - Inner Circle": 15,
    "S - Center Balls - Odd": 15,
    "S - Chalice": 15,
    "S - Circles - Odd": 15,
    "S - Feathers": 15,
    "S - Inner Swirl Right": 15,
    "S - Leaf": 15,
    "S - Leaf - Even": 15,
    "S - Outer Swirl Right": 15,
    "All - Verts - GRP": 14,
    "All - Windows - GRP": 14,
    "Spider - Tree Topper": 13,
    "Spider 1": 12,
    "Spider 2": 10,
    "Spider 3": 10,
    "Spider 4": 10,
    "Spider 5": 10,
    "Spider 6": 10,
    "GE Rosa Tomb Paddles GRP": 9,
    "All - Spinners - GRP": 9,
    "GE Fuzion Star 1 GRP": 9,
    "Tree - Spiral 2": 9,
    "Tree - Spiral 3": 9,
    "Tree - Spiral 4": 9,
    "Tree - Spiral 1": 8,
    "Tree - Spiral 5": 8,
    "Tree - Spiral 6": 8,
    "Tree - Spiral 7": 8,
    "Spinners - Showstopper - Submodels - GRP": 7,
    "GE CC Boom Cone SM Odd GRP": 7,
    "GE Rosa Tomb Outline GRP": 7,
    "Fence Panel 1": 7,
    "Fence Panel 2": 7,
    "Fence Panel 3": 7,
    "Fence Panel 4": 7,
    "Fence Panel 5": 7,
    "Fence Panel 6": 7,
    "Firework 1": 7,
    "GE Rosa Tomb 2": 7,
    "GE Rosa Tomb 3": 7,
    "Pumpkin Mini 2": 7,
    "Tombstone 2": 7,
    "Tombstone 3": 7,
    "Tree - Spiral 8": 7,
    "GE CC Boom Finger GRP": 6,
    "Firework 2": 6,
    "GE Rosa Tomb 1": 6,
    "Pumpkin Mini 3": 6,
    "Pumpkin Mini 4": 6,
    "Pumpkin Mini 5": 6,
    "Tombstone 1": 6,
    "Tombstone 4": 6,
    "Fence Panel 7": 6,
    "GE Overlord So Hot GRP": 5,
    "Spinners - Fuzion - Submodels - GRP": 5,
    "GE CC Boom Spokes GRP": 5,
    "GE Fuzion Stars GRP": 5,
    "Pumpkin Mini 1": 5,
    "Pumpkin Mini 6": 5,
    "Spinner - Fuzion": 5,
    "GE Fuzion Triangle Lg GRP": 4,
    "GE Rosa Tomb 4": 4,
    "Spinner - Showstopper 2": 4,
    "Spinner - Showstopper 3": 4,
    "All - No Spinners - GRP": 3,
    "All - Yard - GRP": 3,
    "GE Overlord Points Odd GRP": 3,
    "S - Swirl Right": 3,
    "GE Rosa Tomb Cross Spinner GRP": 3,
    "All - Tombstone Outlines - GRP": 3,
    "GE CC Boom Snarlfle GRP": 3,
    "GE Fuzion Windmill Lg Even GRP": 3,
    "S - Saucers": 3,
    "GE Rosa Grande Wavy GRP": 3,
    "Bat 2": 3,
    "Bat 3": 3,
    "Pixel Forest": 3,
    "Pixel Forest-2": 3,
    "All - Tombstones GE Rosa - GRP": 3,
    "GE Rosa Grande Torch Short GRP": 2,
    "FOLDER - Rosa Tomb Groups": 2,
    "GE CC Boom Star GRP": 2,
    "GE CC Boom Spokes Inner GRP": 2,
    "GE Rosa Grande Web Ring GRP": 2,
    "GE Overlord Spiral GRP": 2,
    "Arch 1": 2,
    "Arch 2": 2,
    "Arch 3": 2,
    "Arch 4": 2,
    "Arch 5": 2,
    "Arch 6": 2,
    "Bat 1": 2,
    "Bat 4": 2,
    "Pole 1": 2,
    "Pole 2": 2,
    "Pole 3": 2,
    "Pole 4": 2,
    "Spinner - Showstopper 1": 2,
    "GE Overlord Sporks GRP": 1,
    "GE Rosa Tomb Spokes GRP": 1,
    "GE Overlord Desparado All GRP": 1,
    "GE Rosa Tomb Rings GRP": 1,
    "S - Swirl Left": 1,
    "S - Willow": 1,
    "GE Rosa Tomb Gourds GRP": 1,
    "GE Rosa Tomb Tomb Ring GRP": 1,
    "GE Rosa Grande Feather Long GRP": 1,
    "GE Rosa Grande Torch Short Odd GRP": 1,
    "GE Rosa Grande Web Spoke GRP": 1,
    "GE CC Boom Stigma GRP": 1,
    "GE Rosa Tomb Tombstone Lower GRP": 1,
    "GE Fuzion Windmill Sm Odd GRP": 1,
    "GE Fuzion Windmill Sm Even GRP": 1,
    "GE Fuzion Windmill Lg Odd GRP": 1,
    "S - Angle Spinner Right": 1,
    "S - Half Willow": 1,
    "S - Trophies": 1,
    "S - Outer Balls": 1,
    "S - Outer Rings": 1,
    "S - Outer Swirl Left": 1,
    "GE CC Boom Stigma GRP Model": 1,
    "Bat 5": 1,
    "Bat 6": 1,
    "Bat 7": 1,
    "Fog Machine": 1,
    "Pumpkin Mini 7": 1,
    "Singing Pumpkin": 1,
    "Tombstone Small - 1": 1,
    "Tombstone Small - 2": 1,
    "Tombstone Small - 3": 1,
    "Tombstone Small - 4": 1,
    "Tombstone Small - 5": 1,
    "Tombstone Small - 6": 1,
    "Tree - Medium 1": 1,
    "Tree - Small 1": 1,
    "Tree - Small 2": 1,
    "Tree - Small 3": 1,
    "Tree - Small 4": 1,
    "Tree - Small 5": 1,
    "Tune-To-Matrix": 1,
    "Tune-To-Matrix-2": 1,
    "GE Rosa Tomb Cross Outline GRP": 1,
  },
};

/**
 * Get the list of model names used in a specific sequence.
 * Returns undefined if no model list is available for that sequence.
 */
export function getSequenceModelList(
  sequenceSlug: string,
): string[] | undefined {
  return SEQUENCE_MODELS[sequenceSlug];
}

/**
 * Get the effect counts for models in a specific sequence.
 * Returns undefined if no effect counts are available for that sequence.
 */
export function getSequenceEffectCounts(
  sequenceSlug: string,
): Record<string, number> | undefined {
  return SEQUENCE_EFFECT_COUNTS[sequenceSlug];
}

/**
 * Get the effect count for a specific model in a sequence.
 * Returns 0 if the model has no effects or counts are unavailable.
 */
export function getModelEffectCount(
  sequenceSlug: string,
  modelName: string,
): number {
  const counts = SEQUENCE_EFFECT_COUNTS[sequenceSlug];
  if (!counts) return 0;
  return counts[modelName] ?? 0;
}

/**
 * Pre-extracted per-model effect TYPE distributions for known sequences.
 * Generated by running parseXsqEffectTypeCounts() on each sequence's .xsq file.
 *
 * Only models with "signature" effect types that influence matching are included.
 * Generic effects (On, Off, Color Wash, etc.) are omitted as they don't indicate
 * model type and appear universally. Only effect types that appear in
 * EFFECT_MODEL_AFFINITY are tracked.
 */
const SEQUENCE_EFFECT_TYPE_COUNTS: Record<
  string,
  Record<string, Record<string, number>>
> = {
  abracadabra: {
    Matrix: {
      Video: 18,
      Text: 12,
      Morph: 15,
      Warp: 8,
      Candle: 4,
      Galaxy: 6,
      Curtain: 5,
      Pictures: 3,
    },
    "Mega Tree": {
      Spirals: 12,
      Tree: 8,
      Garlands: 6,
      Morph: 4,
    },
    "Singing Pumpkin 1": {
      Faces: 29,
      Plasma: 8,
    },
    "Singing Pumpkin 2": {
      Faces: 25,
      Plasma: 6,
    },
    "Singing Pumpkin 3": {
      Faces: 22,
      Plasma: 5,
    },
    "S - Spinners - Inner": {
      Pictures: 14,
      Pinwheel: 12,
      Fan: 8,
    },
    "S - Spinners - Outer": {
      Pictures: 8,
      Pinwheel: 6,
      Fan: 4,
    },
    "GE Overlord GRP": {
      Pictures: 10,
      Pinwheel: 8,
      Fan: 5,
    },
    "GE Fuzion GRP": {
      Pictures: 8,
      Pinwheel: 6,
      Fan: 4,
    },
    "GE Rosa Grande GRP": {
      Pictures: 6,
      Pinwheel: 4,
    },
  },
};

/**
 * Get per-model effect type distributions for a specific sequence.
 * Returns undefined if no type data is available.
 */
export function getSequenceEffectTypeCounts(
  sequenceSlug: string,
): Record<string, Record<string, number>> | undefined {
  return SEQUENCE_EFFECT_TYPE_COUNTS[sequenceSlug];
}

/**
 * Check if a source model name appears in a sequence's model list.
 * Uses exact match first, then falls back to prefix matching
 * (e.g., source "Eave 5 - Entrance Arch" matches xsq "Eave 5 - Entrance Arch",
 * and source "Eave 1" matches xsq "Eave 1- Office Left" via prefix).
 */
export function isModelInSequence(
  modelName: string,
  sequenceModels: string[],
): boolean {
  // Exact match
  if (sequenceModels.includes(modelName)) {
    return true;
  }

  // Check if any sequence model starts with the source model name
  // This handles cases like source "Eave 1" matching xsq "Eave 1- Office Left"
  for (const seqModel of sequenceModels) {
    if (
      seqModel.startsWith(modelName + " ") ||
      seqModel.startsWith(modelName + "-")
    ) {
      return true;
    }
    // And the reverse — source might have a longer name
    if (
      modelName.startsWith(seqModel + " ") ||
      modelName.startsWith(seqModel + "-")
    ) {
      return true;
    }
  }

  return false;
}
