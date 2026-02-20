"use client";

import { useCallback, useState } from "react";
import { ImportPanel } from "./ImportPanel";
import { DiagramCanvas } from "./DiagramCanvas";
import { parseRgbEffectsXml } from "@/lib/modiq/parser";
import { parseNetworksXml } from "@lightsofelmridge/xlights-file-gen/src/parsers/networks-parser";
import { resolvePortBindings } from "@lightsofelmridge/xlights-file-gen/src/parsers/port-resolver";
import { calculatePowerPlan } from "@lightsofelmridge/xwire/src/engine/power-calculator";
import { calculateCableRoutes } from "@lightsofelmridge/xwire/src/engine/cable-router";
import { generateBillOfMaterials } from "@lightsofelmridge/xwire/src/engine/bill-of-materials";
import { transformToDiagram } from "@/lib/wireiq/diagram-transformer";
import { calculateLayout } from "@/lib/wireiq/layout-engine";
import type { WireIQDiagram } from "@/lib/wireiq/types";

type ToolState = "import" | "processing" | "diagram" | "error";

export default function WireIQTool() {
  const [state, setState] = useState<ToolState>("import");
  const [diagram, setDiagram] = useState<WireIQDiagram | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Store raw data for re-layout
  const [rawData, setRawData] = useState<{
    rgbEffectsXml: string;
    networksXml: string;
  } | null>(null);

  const generateDiagram = useCallback(
    async (rgbEffectsXml: string, networksXml: string) => {
      setState("processing");
      setError(null);
      setRawData({ rgbEffectsXml, networksXml });

      try {
        // 1. Parse both XML files
        const layout = parseRgbEffectsXml(rgbEffectsXml);
        const networkConfig = parseNetworksXml(networksXml);

        // 2. Resolve port bindings (model → controller:port)
        const portBindings = resolvePortBindings(
          layout.models,
          networkConfig.controllers,
        );

        // 3. Run xwire engines
        const powerPlan = calculatePowerPlan(portBindings);
        const cableRuns = calculateCableRoutes(
          portBindings,
          layout.models,
          networkConfig.controllers,
        );
        const bom = generateBillOfMaterials(cableRuns, powerPlan);

        // 4. Transform to React Flow diagram
        const rawDiagram = transformToDiagram(
          networkConfig,
          portBindings,
          powerPlan,
          cableRuns,
          bom,
        );

        // 5. Run ELK.js layout
        const positionedNodes = await calculateLayout(
          rawDiagram.nodes,
          rawDiagram.edges,
        );

        setDiagram({
          nodes: positionedNodes,
          edges: rawDiagram.edges,
          stats: rawDiagram.stats,
        });
        setState("diagram");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
        setState("error");
      }
    },
    [],
  );

  const handleResetLayout = useCallback(async () => {
    if (!rawData) return;
    await generateDiagram(rawData.rgbEffectsXml, rawData.networksXml);
  }, [rawData, generateDiagram]);

  const handleBack = useCallback(() => {
    setState("import");
    setDiagram(null);
    setError(null);
  }, []);

  if (state === "import" || state === "processing") {
    return (
      <ImportPanel
        onFilesLoaded={generateDiagram}
        isProcessing={state === "processing"}
      />
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="text-red-400 text-lg font-semibold">
          Error generating diagram
        </div>
        <div className="text-foreground/60 text-sm max-w-md text-center">
          {error}
        </div>
        <button
          onClick={handleBack}
          className="px-6 py-2 rounded-lg bg-foreground/10 text-foreground/70 hover:bg-foreground/20 transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (state === "diagram" && diagram) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-foreground/10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-foreground/50 hover:text-foreground/80 transition-colors text-sm"
            >
              {"\u2190"} Back
            </button>
            <h1 className="text-sm font-semibold text-foreground">
              Wire:IQ — Wiring Diagram
            </h1>
          </div>
          <div className="text-xs text-foreground/40">
            {diagram.stats.totalPixels.toLocaleString()} pixels across{" "}
            {diagram.stats.totalControllers} controller
            {diagram.stats.totalControllers !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Diagram canvas */}
        <div className="flex-1 relative">
          <DiagramCanvas
            initialNodes={diagram.nodes}
            initialEdges={diagram.edges}
            stats={diagram.stats}
            onResetLayout={handleResetLayout}
          />
        </div>
      </div>
    );
  }

  return null;
}
