/**
 * xLights .xsq Sequence File Parser
 *
 * Parses xLights .xsq sequence files to extract model names and effect data.
 * This is the canonical implementation — the web app re-exports from here.
 *
 * xsq format: XML with <Element type="model" name="ModelName"> entries
 * in the ElementEffects section.
 */

const EXCLUDED_PREFIXES = ["FOLDER -", "Pixel2DMX", "Fog Machine"];

/**
 * Extract model names from an xsq XML string.
 * Returns a deduplicated, sorted array of model names used in the sequence.
 */
export function parseXsqModels(xsqXml: string): string[] {
  const modelNames = new Set<string>();

  const regex = /type="model"\s+name="([^"]+)"/g;
  let match;
  while ((match = regex.exec(xsqXml)) !== null) {
    const name = decodeXmlEntities(match[1]);
    if (EXCLUDED_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
    modelNames.add(name);
  }

  // Extract SubModelEffectLayer names (submodel effects stored separately)
  const subModelRegex = /<SubModelEffectLayer\s+name="([^"]+)"/g;
  while ((match = subModelRegex.exec(xsqXml)) !== null) {
    modelNames.add(decodeXmlEntities(match[1]));
  }

  return Array.from(modelNames).sort();
}

/**
 * Extract per-model effect counts from an xsq XML string.
 * Returns a Record mapping model names to their direct effect count.
 */
export function parseXsqEffectCounts(xsqXml: string): Record<string, number> {
  const counts: Record<string, number> = {};

  if (typeof DOMParser === "undefined") return counts;

  const parser = new DOMParser();
  const doc = parser.parseFromString(xsqXml, "text/xml");
  const elements = doc.querySelectorAll('Element[type="model"]');

  for (const el of elements) {
    const name = el.getAttribute("name");
    if (!name) continue;
    if (EXCLUDED_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;

    let effectCount = 0;
    const effectLayers = el.querySelectorAll(":scope > EffectLayer");
    for (const layer of effectLayers) {
      effectCount += layer.querySelectorAll(":scope > Effect").length;
    }

    if (effectCount > 0) {
      counts[name] = effectCount;
    }
  }

  return counts;
}

/**
 * Extract per-model effect type distributions from an xsq XML string.
 * Returns a Record mapping model names to their effect type breakdowns.
 */
export function parseXsqEffectTypeCounts(
  xsqXml: string,
): Record<string, Record<string, number>> {
  const typeCounts: Record<string, Record<string, number>> = {};

  if (typeof DOMParser === "undefined") return typeCounts;

  const parser = new DOMParser();
  const doc = parser.parseFromString(xsqXml, "text/xml");
  const elements = doc.querySelectorAll('Element[type="model"]');

  for (const el of elements) {
    const name = el.getAttribute("name");
    if (!name) continue;
    if (EXCLUDED_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;

    const effectTypes: Record<string, number> = {};
    const effectLayers = el.querySelectorAll(":scope > EffectLayer");
    for (const layer of effectLayers) {
      const effects = layer.querySelectorAll(":scope > Effect");
      for (const effect of effects) {
        const effectName = effect.getAttribute("name") ?? "Unknown";
        effectTypes[effectName] = (effectTypes[effectName] ?? 0) + 1;
      }
    }

    if (Object.keys(effectTypes).length > 0) {
      typeCounts[name] = effectTypes;
    }
  }

  return typeCounts;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
