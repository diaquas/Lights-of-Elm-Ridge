/**
 * ModIQ — xMap File Generator
 *
 * Generates xLights-compatible .xmap mapping files from ModIQ results.
 *
 * IMPORTANT: The xmap format is TAB-SEPARATED TEXT, not XML.
 * Format learned from 6 real-world xmap files:
 *
 *   Line 1: "false" (boolean flag, likely "hide unmapped")
 *   Line 2: Number of source models (count)
 *   Lines 3..N+2: Source model names, one per line
 *   Lines N+3..: Tab-separated mapping rows:
 *     Col 1: Source model name
 *     Col 2: Source submodel name (empty for top-level)
 *     Col 3: Source sub-submodel (usually empty)
 *     Col 4: Destination model name (uses "/" for submodel paths)
 *     Col 5: Color (always "white")
 *
 * Example mapping row (tabs shown as →):
 *   Spinner - Showstopper 1→01 Cascading Arches→→Showstopper Spinner Left/01 Cascading Arches→white
 */

import type { MappingResult, ModelMapping } from "./matcher";

const TAB = "\t";

/**
 * Generate an xmap file string from ModIQ mapping results.
 */
export function generateXmap(
  result: MappingResult,
  sequenceName: string,
): string {
  const lines: string[] = [];

  // Get only the mapped entries (including unmapped source models that we list)
  const allSourceMappings = result.mappings;

  // Line 1: Boolean flag
  lines.push("false");

  // Line 2: Count of source models
  lines.push(String(allSourceMappings.length));

  // Lines 3..N+2: Source model names
  for (const mapping of allSourceMappings) {
    lines.push(mapping.sourceModel.name);
  }

  // Mapping rows
  for (const mapping of allSourceMappings) {
    const srcName = mapping.sourceModel.name;
    const destName = mapping.destModel?.name || "";

    // Top-level model mapping
    lines.push([srcName, "", "", destName, "white"].join(TAB));

    // Submodel mappings
    for (const subMap of mapping.submodelMappings) {
      if (subMap.destName) {
        // Source submodel → Destination model/submodel
        lines.push(
          [
            srcName,
            subMap.sourceName,
            "",
            `${destName}/${subMap.destName}`,
            "white",
          ].join(TAB),
        );
      }
      // Skip unmapped submodels in the output (xLights handles these gracefully)
    }
  }

  // Trailing newline
  lines.push("");

  return lines.join("\n");
}

/**
 * Create a downloadable Blob from an xmap string.
 */
export function createXmapBlob(xmapContent: string): Blob {
  return new Blob([xmapContent], { type: "text/plain;charset=utf-8" });
}

/**
 * Trigger a browser download for an xmap file.
 */
export function downloadXmap(xmapContent: string, sequenceName: string): void {
  const blob = createXmapBlob(xmapContent);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = sequenceName
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_");
  a.href = url;
  a.download = `ModIQ_${safeName}.xmap`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines.
 */
function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate a CSV report of mapping results with a blank Training Comments column.
 * Columns:
 *   Row, Confidence, Score, Source Model, Source Type, Source Pixels,
 *   Dest Model, Dest Type, Dest Pixels, Reason,
 *   Name, Spatial, Shape, Type, Pixels, Training Comments
 *
 * Submodel rows appear directly below their parent with "sub" in the Row column.
 * Unused dest models appear at the bottom with "unused" in the Row column.
 */
export function generateMappingReport(
  result: MappingResult,
  sequenceName: string,
): string {
  const rows: string[][] = [];

  // Header
  rows.push([
    "Row",
    "Confidence",
    "Score",
    "Source Model",
    "Source Type",
    "Source Pixels",
    "Dest Model",
    "Dest Type",
    "Dest Pixels",
    "Reason",
    "F:Name",
    "F:Spatial",
    "F:Shape",
    "F:Type",
    "F:Pixels",
    "Correct Dest Model",
    "Training Comments",
  ]);

  // Mapping rows
  for (let i = 0; i < result.mappings.length; i++) {
    const m = result.mappings[i];
    const srcType = m.sourceModel.isGroup ? "GRP" : m.sourceModel.type;
    const destType = m.destModel
      ? m.destModel.isGroup
        ? "GRP"
        : m.destModel.type
      : "";

    rows.push([
      String(i + 1),
      m.confidence.toUpperCase(),
      m.score.toFixed(2),
      m.sourceModel.name,
      srcType,
      String(m.sourceModel.pixelCount),
      m.destModel?.name || "",
      destType,
      m.destModel ? String(m.destModel.pixelCount) : "",
      m.reason,
      m.factors.name.toFixed(2),
      m.factors.spatial.toFixed(2),
      m.factors.shape.toFixed(2),
      m.factors.type.toFixed(2),
      m.factors.pixels.toFixed(2),
      "",
      "",
    ]);

    // Submodel rows
    for (const sub of m.submodelMappings) {
      rows.push([
        `${i + 1}-sub`,
        sub.confidence.toUpperCase(),
        "",
        sub.sourceName,
        "",
        sub.pixelDiff.split("→")[0]?.trim() || "",
        sub.destName || "",
        "",
        sub.pixelDiff.split("→")[1]?.trim() || "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }
  }

  // Unused dest models
  if (result.unusedDestModels.length > 0) {
    for (const m of result.unusedDestModels) {
      const type = m.isGroup ? "GRP" : m.type;
      rows.push([
        "unused",
        "",
        "",
        "",
        "",
        "",
        m.name,
        type,
        String(m.pixelCount),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

/**
 * Trigger a browser download for a CSV report file.
 */
export function downloadMappingReport(
  reportContent: string,
  sequenceName: string,
): void {
  const blob = new Blob([reportContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = sequenceName
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_");
  a.href = url;
  a.download = `ModIQ_Report_${safeName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
