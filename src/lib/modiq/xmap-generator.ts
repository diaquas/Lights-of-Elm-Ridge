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
 * Generate a human-readable text report of mapping results.
 * Designed to be pasted into a doc/chat for annotation and review.
 */
export function generateMappingReport(
  result: MappingResult,
  sequenceName: string,
): string {
  const lines: string[] = [];

  lines.push(`ModIQ Mapping Report: ${sequenceName}`);
  lines.push("=".repeat(60));
  lines.push("");
  lines.push("Summary:");
  lines.push(`  Source models: ${result.totalSource}`);
  lines.push(`  Dest models:   ${result.totalDest}`);
  lines.push(`  Mapped:        ${result.mappedCount}/${result.totalSource}`);
  lines.push(`  High:          ${result.highConfidence}`);
  lines.push(`  Medium:        ${result.mediumConfidence}`);
  lines.push(`  Low:           ${result.lowConfidence}`);
  lines.push(`  Unmapped:      ${result.unmappedSource}`);
  lines.push(`  Unused dest:   ${result.unmappedDest}`);
  lines.push("");
  lines.push("=".repeat(60));
  lines.push("MAPPINGS");
  lines.push("=".repeat(60));
  lines.push("");

  for (let i = 0; i < result.mappings.length; i++) {
    const m = result.mappings[i];
    const num = String(i + 1).padStart(2, " ");
    const conf = m.confidence.toUpperCase().padEnd(8);
    const score = m.score.toFixed(2);
    const srcName = m.sourceModel.name;
    const destName = m.destModel?.name || "(no match)";
    const srcType = m.sourceModel.isGroup ? "GRP" : m.sourceModel.type;
    const destType = m.destModel
      ? m.destModel.isGroup
        ? "GRP"
        : m.destModel.type
      : "";

    lines.push(`#${num}  [${conf}]  score=${score}`);
    lines.push(
      `      SRC: ${srcName}  (${srcType}, ${m.sourceModel.pixelCount}px)`,
    );
    lines.push(
      `      DST: ${destName}${destType ? `  (${destType}, ${m.destModel!.pixelCount}px)` : ""}`,
    );

    if (m.reason) {
      lines.push(`      WHY: ${m.reason}`);
    }

    lines.push(
      `      FACTORS: name=${m.factors.name.toFixed(2)} spatial=${m.factors.spatial.toFixed(2)} shape=${m.factors.shape.toFixed(2)} type=${m.factors.type.toFixed(2)} pixels=${m.factors.pixels.toFixed(2)}`,
    );

    if (m.submodelMappings.length > 0) {
      lines.push(`      SUBMODELS (${m.submodelMappings.length}):`);
      for (const sub of m.submodelMappings) {
        const subConf = sub.confidence.toUpperCase().padEnd(8);
        const dest = sub.destName || "(unmapped)";
        lines.push(
          `        [${subConf}] ${sub.sourceName} --> ${dest}  (${sub.pixelDiff})`,
        );
      }
    }

    lines.push("");
  }

  if (result.unusedDestModels.length > 0) {
    lines.push("=".repeat(60));
    lines.push(`UNUSED DEST MODELS (${result.unusedDestModels.length})`);
    lines.push("=".repeat(60));
    lines.push("");
    for (const m of result.unusedDestModels) {
      const type = m.isGroup ? "GRP" : m.type;
      lines.push(`  - ${m.name}  (${type}, ${m.pixelCount}px)`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Trigger a browser download for a text report file.
 */
export function downloadMappingReport(
  reportContent: string,
  sequenceName: string,
): void {
  const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = sequenceName
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_");
  a.href = url;
  a.download = `ModIQ_Report_${safeName}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
