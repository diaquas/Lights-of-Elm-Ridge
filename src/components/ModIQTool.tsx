"use client";

import { useState, useCallback, useRef, useMemo } from "react";
// Performance note: React.memo applied to all child components;
// stable callbacks via useCallback; rAF-throttled DnD state updates
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  parseRgbEffectsXml,
  getSourceModelsForSequence,
  sourceModelToParsedModel,
  matchModels,
  generateXmap,
  downloadXmap,
  generateMappingReport,
  downloadMappingReport,
  getSequenceModelList,
  buildEffectTree,
  getActiveSourceModels,
  computeDisplayCoverage,
  findBoostSuggestions,
  findSpinnerBoostSuggestions,
  parseXsqModels,
} from "@/lib/modiq";
import type { ParsedLayout, MappingResult, DisplayType, EffectTree } from "@/lib/modiq";
import type { ParsedModel } from "@/lib/modiq";
import type { BoostSuggestion, SpinnerBoostSuggestion, DisplayCoverage } from "@/lib/modiq";
import { isDmxModel, getActiveSourceNamesForExport } from "@/lib/modiq";
import { sequences } from "@/data/sequences";
import { usePurchasedSequences } from "@/hooks/usePurchasedSequences";
import { useCart } from "@/contexts/CartContext";
import {
  useInteractiveMapping,
  type SourceLayerMapping,
} from "@/hooks/useInteractiveMapping";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useMappingTelemetry } from "@/hooks/useMappingTelemetry";
import MappingProgressBar from "@/components/modiq/MappingProgressBar";
import SourceLayerRow from "@/components/modiq/SourceLayerRow";
import DraggableUserCard from "@/components/modiq/DraggableUserCard";
import SequenceSelector from "@/components/SequenceSelector";
import ExportDialog from "@/components/modiq/ExportDialog";
import CoverageBoostPrompt from "@/components/modiq/CoverageBoostPrompt";
import PostExportScreen from "@/components/modiq/PostExportScreen";
import CascadeToastContainer, { useCascadeToasts } from "@/components/modiq/CascadeToast";

type Step = "input" | "processing" | "results" | "exported";
type MapFromMode = "elm-ridge" | "other-vendor";

// Default identifier for Elm Ridge layout (same models for all sequences)
const ELM_RIDGE_LAYOUT_ID = "elm-ridge";
const ELM_RIDGE_LAYOUT_TITLE = "Lights of Elm Ridge";

interface ProcessingStep {
  label: string;
  status: "pending" | "active" | "done";
}

export default function ModIQTool() {
  // Read URL query param (kept for backwards compatibility)
  const searchParams = useSearchParams();
  const initialSequence = searchParams.get("sequence") ?? "";

  const [step, setStep] = useState<Step>("input");
  const [mapFromMode, setMapFromMode] = useState<MapFromMode>("elm-ridge");
  const [displayType, setDisplayType] = useState<DisplayType>("halloween");

  // Sequence selection & ownership
  const [selectedSequence, setSelectedSequence] = useState(initialSequence);
  const { isLoggedIn, isLoading: purchasesLoading, hasPurchased } = usePurchasedSequences();
  const { addItem, isInCart } = useCart();
  const selectedSeq = sequences.find((s) => s.slug === selectedSequence);
  const isAccessible = selectedSeq
    ? selectedSeq.price === 0 || hasPurchased(selectedSeq.id)
    : false;

  const handleSequenceChange = useCallback((slug: string) => {
    setSelectedSequence(slug);
    const seq = sequences.find((s) => s.slug === slug);
    if (seq) {
      setDisplayType(seq.category === "Christmas" ? "christmas" : "halloween");
    }
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedSeq || selectedSeq.price === 0) return;
    addItem({
      id: selectedSeq.id,
      slug: selectedSeq.slug,
      title: selectedSeq.title,
      artist: selectedSeq.artist,
      price: selectedSeq.price,
      category: selectedSeq.category,
      thumbnailUrl: selectedSeq.thumbnailUrl ?? null,
    });
  }, [selectedSeq, addItem]);

  // Source layout from "other vendor" upload
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceLayout, setSourceLayout] = useState<ParsedLayout | null>(null);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const [sourceIsDragging, setSourceIsDragging] = useState(false);

  // Vendor .xsq sequence file (required for other-vendor mode)
  const [vendorXsqFile, setVendorXsqFile] = useState<File | null>(null);
  const [vendorXsqModels, setVendorXsqModels] = useState<string[] | null>(null);
  const vendorXsqInputRef = useRef<HTMLInputElement>(null);
  const [vendorXsqIsDragging, setVendorXsqIsDragging] = useState(false);

  // User's target layout ("Map TO")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [userLayout, setUserLayout] = useState<ParsedLayout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [mappingResult, setMappingResult] = useState<MappingResult | null>(
    null,
  );
  const [error, setError] = useState<string>("");
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);

  // Store source models for the interactive mapping hook
  const [sourceModels, setSourceModels] = useState<ParsedModel[]>([]);

  // Effect tree for effect-aware mapping
  const [effectTree, setEffectTree] = useState<EffectTree | null>(null);

  // Export state
  const [exportFileName, setExportFileName] = useState("");
  // Boost state (passed from InteractiveResults to PostExportScreen)
  const [exportDisplayCoverage, setExportDisplayCoverage] = useState<number | undefined>(undefined);
  const [exportSequenceCoverage, setExportSequenceCoverage] = useState<{ mapped: number; total: number } | undefined>(undefined);
  const [exportBoostLines, setExportBoostLines] = useState<{ userGroupName: string; sourceGroupName: string }[]>([]);
  const [exportGroupsMapped, setExportGroupsMapped] = useState<number>(0);
  const [exportGroupsCoveredChildren, setExportGroupsCoveredChildren] = useState<number>(0);
  const [exportDirectMapped, setExportDirectMapped] = useState<number>(0);

  // ─── Source File Upload (Other Vendor) ─────────────────
  const handleSourceFile = useCallback((file: File) => {
    setError("");
    if (!file.name.endsWith(".xml")) {
      setError("Please upload an XML file (xlights_rgbeffects.xml).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const layout = parseRgbEffectsXml(content, file.name);
        if (layout.models.length === 0) {
          setError("No models found in this source file.");
          return;
        }
        setSourceLayout(layout);
        setSourceFile(file);
      } catch (err) {
        setError(
          `Failed to parse source file: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    };
    reader.readAsText(file);
  }, []);

  // ─── Vendor .xsq Sequence File Upload ─────────────────
  const handleVendorXsqFile = useCallback((file: File) => {
    setError("");
    if (!file.name.endsWith(".xsq")) {
      setError("Please upload an xLights sequence file (.xsq).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const models = parseXsqModels(content);
        if (models.length === 0) {
          setError("No model effects found in this sequence file.");
          return;
        }
        setVendorXsqModels(models);
        setVendorXsqFile(file);
      } catch (err) {
        setError(
          `Failed to parse sequence file: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    };
    reader.readAsText(file);
  }, []);

  // ─── User Layout File Upload (Map TO) ─────────────────
  const handleFile = useCallback((file: File) => {
    setError("");
    if (!file.name.endsWith(".xml")) {
      setError(
        "Please upload an XML file (xlights_rgbeffects.xml from your xLights show folder).",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const layout = parseRgbEffectsXml(content, file.name);
        if (layout.models.length === 0) {
          setError(
            "No models found in this file. Make sure you're uploading your xlights_rgbeffects.xml file.",
          );
          return;
        }
        setUserLayout(layout);
        setUploadedFile(file);
      } catch (err) {
        setError(
          `Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    };
    reader.readAsText(file);
  }, []);

  // ─── Can we run? ───────────────────────────────────────
  const canRun =
    mapFromMode === "elm-ridge"
      ? !!selectedSequence && isAccessible && !!userLayout
      : !!vendorXsqFile && !!sourceLayout && !!userLayout;

  // ─── Processing ─────────────────────────────────────────
  const runMapping = useCallback(async () => {
    if (!userLayout) return;

    setStep("processing");
    setError("");

    const displayLabel = displayType === "halloween" ? "Halloween" : "Christmas";
    const seqTitle =
      mapFromMode === "elm-ridge" && selectedSeq
        ? `${selectedSeq.title} — ${displayLabel}`
        : mapFromMode === "elm-ridge"
          ? `${ELM_RIDGE_LAYOUT_TITLE} (${displayLabel})`
          : sourceFile?.name || "Source Layout";

    // Check if effect-aware filtering will be applied
    const hasEffectData =
      mapFromMode === "elm-ridge" && selectedSequence
        ? !!getSequenceModelList(selectedSequence)
        : mapFromMode === "other-vendor" && !!vendorXsqModels;

    const steps: ProcessingStep[] = [
      {
        label: `Parsing your layout — ${userLayout.modelCount} models found`,
        status: "done",
      },
      { label: "Analyzing model types and positions", status: "active" },
      ...(hasEffectData
        ? [
            {
              label: "Building effect tree from sequence data",
              status: "pending" as const,
            },
          ]
        : []),
      { label: `Matching against ${seqTitle}`, status: "pending" },
      { label: "Resolving submodel structures", status: "pending" },
      { label: "Generating optimal mapping", status: "pending" },
    ];
    setProcessingSteps([...steps]);

    // Helper to advance processing steps sequentially
    let si = 0; // starts at step 0 (already "done")
    const advance = async (ms: number) => {
      steps[si].status = "done";
      si++;
      if (si < steps.length) steps[si].status = "active";
      setProcessingSteps([...steps]);
      await delay(ms);
    };

    await advance(400); // "Analyzing model types and positions" → active
    await delay(500);

    // Build source models
    let allSrcModels: ParsedModel[];
    if (mapFromMode === "elm-ridge") {
      allSrcModels = getSourceModelsForSequence(displayType).map(
        sourceModelToParsedModel,
      );
    } else {
      allSrcModels = sourceLayout!.models;
    }

    // Build effect tree if sequence model list is available
    let tree: EffectTree | null = null;
    let srcModels: ParsedModel[];
    const seqModelList =
      mapFromMode === "elm-ridge" && selectedSequence
        ? getSequenceModelList(selectedSequence)
        : mapFromMode === "other-vendor" && vendorXsqModels
          ? vendorXsqModels
          : undefined;

    if (hasEffectData) {
      await advance(300); // "Building effect tree" → active
    }

    if (seqModelList) {
      tree = buildEffectTree(allSrcModels, seqModelList);
      srcModels = getActiveSourceModels(allSrcModels, tree);
    } else {
      srcModels = allSrcModels;
    }

    if (hasEffectData && tree) {
      // Update the effect tree step label with results
      steps[si].label = `Effect tree: ${tree.summary.effectiveMappingItems} active layers from ${tree.summary.totalModelsInLayout} models`;
      await delay(300);
    }

    setEffectTree(tree);
    setSourceModels(srcModels);

    await advance(300); // "Matching against ..." → active
    const result = matchModels(srcModels, userLayout.models);

    await advance(300); // "Resolving submodel structures" → active
    await delay(200);

    await advance(200); // "Generating optimal mapping" → active
    await delay(200);

    // Mark final step done
    steps[si].status = "done";
    setProcessingSteps([...steps]);
    await delay(200);

    setMappingResult(result);
    setStep("results");
  }, [userLayout, mapFromMode, sourceLayout, sourceFile, displayType, selectedSeq, vendorXsqModels]);

  // ─── Reset ──────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setStep("input");
    setMappingResult(null);
    setProcessingSteps([]);
    setSourceModels([]);
    setExportFileName("");
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* ── Hero ───────────────────────────────────────── */}
      {(step === "input" || step === "processing") && (
        <div className="text-center mb-12">
          <div className="mb-6">
            <Image
              src="/modiq-wordmark-v3-full.png"
              alt="ModIQ"
              width={280}
              height={80}
              className="mx-auto"
              priority
            />
          </div>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Upload your xLights layout, pick a sequence, and get a mapping file
            in seconds — not hours.
          </p>
          <p className="text-sm text-foreground/40 mt-2">
            by Lights of Elm Ridge
          </p>
        </div>
      )}

      {/* ── Input Step ─────────────────────────────────── */}
      {step === "input" && (
        <div className="space-y-8 max-w-[860px] mx-auto">
          {/* Step 1 — MAP FROM */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white transition-colors ${
                  (mapFromMode === "elm-ridge" && selectedSequence && isAccessible) ||
                  (mapFromMode === "other-vendor" && vendorXsqFile && sourceLayout)
                    ? "bg-green-500"
                    : "bg-accent"
                }`}
              >
                {(mapFromMode === "elm-ridge" && selectedSequence && isAccessible) ||
                (mapFromMode === "other-vendor" && vendorXsqFile && sourceLayout) ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  "1"
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground/60">
                What are you mapping{" "}
                <span className="text-white font-bold">FROM</span>?
              </h2>
            </div>

            {/* Radio options */}
            <div className="space-y-3">
              {/* ═══ Lights of Elm Ridge ═══ */}
              <label
                className={`flex items-start gap-3 rounded-xl p-4 cursor-pointer transition-all ${
                  mapFromMode === "elm-ridge"
                    ? "bg-accent/[0.04] border border-accent/20"
                    : "bg-surface border border-border hover:border-foreground/10"
                }`}
                onClick={() => setMapFromMode("elm-ridge")}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  mapFromMode === "elm-ridge" ? "border-accent" : "border-foreground/20"
                }`}>
                  {mapFromMode === "elm-ridge" && (
                    <div className="w-2 h-2 rounded-full bg-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-foreground">
                    Lights of Elm Ridge Sequence
                  </div>
                  <div className="text-[12px] text-foreground/40 mt-0.5">
                    Select from your purchased or free sequences
                  </div>
                  {mapFromMode === "elm-ridge" && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <SequenceSelector
                        sequences={sequences}
                        value={selectedSequence}
                        onChange={handleSequenceChange}
                        isLoggedIn={isLoggedIn}
                        isLoading={purchasesLoading}
                        hasPurchased={hasPurchased}
                      />
                    </div>
                  )}
                </div>
              </label>

              {/* ═══ Other Vendor ═══ */}
              <label
                className={`flex items-start gap-3 rounded-xl p-4 cursor-pointer transition-all ${
                  mapFromMode === "other-vendor"
                    ? "bg-indigo-500/[0.04] border border-indigo-500/20"
                    : "bg-surface border border-border hover:border-foreground/10"
                }`}
                onClick={() => setMapFromMode("other-vendor")}
                onDragOver={(e) => {
                  e.preventDefault();
                  setSourceIsDragging(true);
                  setMapFromMode("other-vendor");
                }}
                onDragLeave={() => setSourceIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setSourceIsDragging(false);
                  setMapFromMode("other-vendor");
                  const file = e.dataTransfer.files[0];
                  if (file) handleSourceFile(file);
                }}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  mapFromMode === "other-vendor" ? "border-indigo-500" : "border-foreground/20"
                }`}>
                  {mapFromMode === "other-vendor" && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-foreground">
                    Other Vendor
                  </div>
                  <div className="text-[12px] text-foreground/40 mt-0.5">
                    Upload their xlights_rgbeffects.xml
                  </div>
                </div>
                <input
                  ref={sourceFileInputRef}
                  type="file"
                  accept=".xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSourceFile(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* Interstitial: sequence not owned */}
            {mapFromMode === "elm-ridge" && selectedSeq && !isAccessible && (
              <div className="mt-4 bg-surface rounded-xl border border-border p-6 animate-[slideDown_0.25s_ease-out]">
                <div className="text-center">
                  <p className="text-[15px] font-semibold text-foreground mb-1">
                    {selectedSeq.title}
                    <span className="text-foreground/40 font-normal"> — {selectedSeq.artist}</span>
                  </p>
                  <p className="text-[13px] text-foreground/50 mb-4">
                    You don&apos;t own this sequence yet.
                  </p>
                  {isInCart(selectedSeq.id) ? (
                    <Link
                      href="/cart"
                      className="inline-flex items-center gap-1.5 text-[13px] text-green-400 hover:text-green-300"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      In Cart — View Cart
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      Add to Cart — ${selectedSeq.price.toFixed(2)}
                    </button>
                  )}
                  {!isLoggedIn && !purchasesLoading && (
                    <p className="text-[11px] text-foreground/30 mt-3">
                      <Link href="/login?redirect=/modiq" className="text-accent/60 hover:text-accent">
                        Log in
                      </Link>{" "}
                      to see your purchases
                    </p>
                  )}
                  <div className="mt-3">
                    <Link
                      href={`/sequences/${selectedSeq.slug}`}
                      className="text-[12px] text-foreground/30 hover:text-foreground/50"
                    >
                      View Sequence &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Vendor upload zone — appears below when vendor selected */}
            {mapFromMode === "other-vendor" && (
              <div className="mt-3 animate-[slideDown_0.25s_ease-out] space-y-3">
                {/* Step A: .xsq file (required) */}
                {!vendorXsqFile ? (
                  <div onClick={(e) => { e.stopPropagation(); vendorXsqInputRef.current?.click(); }}>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setVendorXsqIsDragging(true);
                      }}
                      onDragLeave={() => setVendorXsqIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setVendorXsqIsDragging(false);
                        const file = e.dataTransfer.files[0];
                        if (file) handleVendorXsqFile(file);
                      }}
                      className={`rounded-xl p-5 text-center cursor-pointer transition-all ${
                        vendorXsqIsDragging
                          ? "bg-indigo-500/[0.04] border border-dashed border-indigo-500"
                          : "bg-white/[0.015] border border-dashed border-[#333] hover:border-indigo-500/30"
                      }`}
                    >
                      <p className="text-[13px] text-foreground/40">
                        <span className="text-red-400 font-medium">Required:</span>{" "}
                        Drop{" "}
                        <span className="text-foreground/60 font-semibold">.xsq sequence file</span>{" "}
                        here or click to browse
                      </p>
                      <p className="text-[11px] text-foreground/30 mt-1">
                        Enables smart filtering to only map models with effects
                      </p>
                    </div>
                    <input
                      ref={vendorXsqInputRef}
                      type="file"
                      accept=".xsq"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVendorXsqFile(file);
                      }}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl p-3 bg-green-500/5 border border-green-500/20 flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground truncate">{vendorXsqFile.name}</p>
                      <p className="text-[11px] text-green-400/70">
                        {vendorXsqModels?.length ?? 0} active layers detected
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVendorXsqFile(null);
                        setVendorXsqModels(null);
                      }}
                      className="text-foreground/30 hover:text-red-400 text-sm"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {/* Step B: xlights_rgbeffects.xml (shows after .xsq uploaded) */}
                {vendorXsqFile && !sourceFile && (
                  <div onClick={(e) => { e.stopPropagation(); sourceFileInputRef.current?.click(); }}>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setSourceIsDragging(true);
                      }}
                      onDragLeave={() => setSourceIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setSourceIsDragging(false);
                        const file = e.dataTransfer.files[0];
                        if (file) handleSourceFile(file);
                      }}
                      className={`rounded-xl p-5 text-center cursor-pointer transition-all ${
                        sourceIsDragging
                          ? "bg-indigo-500/[0.04] border border-dashed border-indigo-500"
                          : "bg-white/[0.015] border border-dashed border-[#333] hover:border-indigo-500/30"
                      }`}
                    >
                      <p className="text-[13px] text-foreground/40">
                        Drop{" "}
                        <span className="text-foreground/60 font-semibold">
                          xlights_rgbeffects.xml
                        </span>{" "}
                        here or click to browse
                      </p>
                      <p className="text-[11px] text-foreground/30 mt-1">
                        From the vendor&apos;s sequence folder (contains model definitions)
                      </p>
                    </div>
                  </div>
                )}

                {/* Show uploaded layout file */}
                {vendorXsqFile && sourceFile && sourceLayout && (
                  <div className="rounded-xl p-3 bg-green-500/5 border border-green-500/20 flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground truncate">{sourceFile.name}</p>
                      <p className="text-[11px] text-foreground/40">
                        {sourceLayout.models.length} models in layout
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSourceFile(null);
                        setSourceLayout(null);
                      }}
                      className="text-foreground/30 hover:text-red-400 text-sm"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Step 2 — YOUR LAYOUT */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white transition-colors ${
                  userLayout ? "bg-green-500" : (mapFromMode === "elm-ridge" && selectedSequence && isAccessible) || (mapFromMode === "other-vendor" && vendorXsqFile && sourceLayout) ? "bg-accent" : "bg-[#262626]"
                }`}
              >
                {userLayout ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  "2"
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground/60">
                Upload{" "}
                <span className="text-white font-bold">YOUR</span> layout
              </h2>
            </div>

            {!uploadedFile || !userLayout ? (
              <div
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl p-7 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "bg-accent/[0.04] border-2 border-dashed border-accent"
                    : "bg-white/[0.015] border-2 border-dashed border-[#262626] hover:border-foreground/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                  className="hidden"
                />
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-2 text-foreground/30"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <p className="text-[13px] text-foreground/40">
                  Drop your{" "}
                  <span className="text-foreground/60 font-semibold">
                    xlights_rgbeffects.xml
                  </span>{" "}
                  here or click to browse
                </p>
                <p className="text-[11px] text-foreground/20 mt-1">
                  Found in your xLights show folder
                </p>
              </div>
            ) : (
              <div className="bg-accent/[0.04] border border-accent/[0.15] rounded-xl px-4 py-3.5 flex items-center gap-2.5 animate-[slideDown_0.25s_ease-out]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-accent flex-shrink-0"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span className="text-[13px] text-accent/80 flex-1 truncate">
                  {uploadedFile.name}
                </span>
                <span className="text-[11px] text-green-400">
                  ✓ {userLayout.modelCount} models found
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFile(null);
                    setUserLayout(null);
                  }}
                  className="text-foreground/30 hover:text-foreground/60 text-base px-1"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ModIQ It Button */}
          <button
            onClick={runMapping}
            disabled={!canRun}
            className={`w-full py-4 rounded-xl font-display font-bold text-lg transition-all ${
              canRun
                ? "bg-gradient-to-r from-accent to-red-700 text-white shadow-[0_4px_24px_rgba(239,68,68,0.2)] hover:shadow-[0_8px_32px_rgba(239,68,68,0.3)] hover:-translate-y-[1px]"
                : "bg-[#1a1a1a] text-foreground/20 cursor-not-allowed"
            }`}
          >
            {canRun ? "ModIQ It \u2192" : "ModIQ It"}
          </button>

          {/* Keyboard hints */}
          <p className="text-center text-[11px] text-foreground/15 tracking-wide">
            Tab: next step · Enter: confirm · Esc: clear
          </p>
        </div>
      )}

      {/* ── Processing Step ────────────────────────────── */}
      {step === "processing" && (
        <div className="bg-surface rounded-xl border border-border p-8 max-w-5xl mx-auto">
          <h2 className="text-xl font-display font-bold mb-6">
            ModIQ is working...
          </h2>
          <div className="space-y-3">
            {processingSteps.map((ps, i) => (
              <div key={i} className="flex items-center gap-3">
                {ps.status === "done" && (
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {ps.status === "active" && (
                  <div className="w-5 h-5 flex-shrink-0">
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {ps.status === "pending" && (
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-foreground/20" />
                  </div>
                )}
                <span
                  className={
                    ps.status === "pending"
                      ? "text-foreground/40"
                      : "text-foreground"
                  }
                >
                  {ps.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Results Step (V2 Refined Interactive Mapping) ── */}
      {step === "results" &&
        mappingResult &&
        sourceModels.length > 0 &&
        userLayout && (
          <InteractiveResults
            initialResult={mappingResult}
            sourceModels={sourceModels}
            destModels={userLayout.models}
            selectedSequence={mapFromMode === "elm-ridge" ? selectedSequence || ELM_RIDGE_LAYOUT_ID : ELM_RIDGE_LAYOUT_ID}
            mapFromMode={mapFromMode}
            displayType={displayType}
            sourceFileName={sourceFile?.name}
            effectTree={effectTree}
            xsqFilename={mapFromMode === "other-vendor" && vendorXsqFile ? vendorXsqFile.name : selectedSequence || "sequence"}
            onReset={handleReset}
            onExported={(fileName, meta) => {
              setExportFileName(fileName);
              setExportDisplayCoverage(meta?.displayCoverage);
              setExportSequenceCoverage(meta?.sequenceCoverage);
              setExportBoostLines(meta?.boostLines ?? []);
              setExportGroupsMapped(meta?.groupsMappedCount ?? 0);
              setExportGroupsCoveredChildren(meta?.groupsCoveredChildCount ?? 0);
              setExportDirectMapped(meta?.directMappedCount ?? 0);
              setStep("exported");
            }}
          />
        )}

      {/* ── Post-Export Screen ───────────────────────────── */}
      {step === "exported" && (
        <PostExportScreen
          sequenceTitle={
            mapFromMode === "elm-ridge" && selectedSeq
              ? `${selectedSeq.title} — ${displayType === "halloween" ? "Halloween" : "Christmas"}`
              : mapFromMode === "elm-ridge"
                ? `${ELM_RIDGE_LAYOUT_TITLE} (${displayType === "halloween" ? "Halloween" : "Christmas"})`
                : sourceFile?.name || "Source Layout"
          }
          fileName={exportFileName}
          onDownloadAgain={() => setStep("results")}
          onMapAnother={handleReset}
          skippedCount={0}
          displayCoverage={exportDisplayCoverage}
          sequenceCoverage={exportSequenceCoverage}
          boostLines={exportBoostLines}
          groupsMappedCount={exportGroupsMapped}
          groupsCoveredChildCount={exportGroupsCoveredChildren}
          directMappedCount={exportDirectMapped}
        />
      )}

      {/* ── How It Works (visible on input step) ───────── */}
      {step === "input" && (
        <div className="mt-16 space-y-8 max-w-5xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <HowItWorksCard
              number="1"
              title="Select & Upload"
              description="Pick the sequence you purchased and upload your xlights_rgbeffects.xml file from your show folder."
            />
            <HowItWorksCard
              number="2"
              title="AI Matching"
              description="ModIQ analyzes model types, pixel counts, spatial positions, names, and submodel structures to find the best mapping."
            />
            <HowItWorksCard
              number="3"
              title="Download & Import"
              description="Get a .xmap file that imports directly into xLights' mapping dialog. Tweak only the few low-confidence matches."
            />
          </div>

          <div className="text-center text-xs text-foreground/30 pt-8 border-t border-border">
            Your files are processed locally in your browser and never uploaded
            to any server.
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Interactive Results View (V3 Source-First Layout)
// ═══════════════════════════════════════════════════════════════════

function InteractiveResults({
  initialResult,
  sourceModels,
  destModels,
  selectedSequence,
  mapFromMode,
  displayType,
  sourceFileName,
  effectTree,
  xsqFilename,
  onReset,
  onExported,
}: {
  initialResult: MappingResult;
  sourceModels: ParsedModel[];
  destModels: ParsedModel[];
  selectedSequence: string;
  mapFromMode: MapFromMode;
  displayType: DisplayType;
  sourceFileName?: string;
  effectTree: EffectTree | null;
  xsqFilename: string;
  onReset: () => void;
  onExported: (fileName: string, meta?: {
    displayCoverage?: number;
    sequenceCoverage?: { mapped: number; total: number };
    boostLines?: { userGroupName: string; sourceGroupName: string }[];
    groupsMappedCount?: number;
    groupsCoveredChildCount?: number;
    directMappedCount?: number;
  }) => void;
}) {
  const interactive = useInteractiveMapping(
    initialResult,
    sourceModels,
    destModels,
    effectTree,
  );

  const dnd = useDragAndDrop();
  const telemetry = useMappingTelemetry(selectedSequence);
  const { toasts, showCascadeToast, dismissToast } = useCascadeToasts();

  // V3 mode: use source-first layout when effect tree is available
  const isV3 = interactive.sourceLayerMappings.length > 0;

  // Wrapper to show cascade toast when mapping a group with resolved children
  const assignWithCascadeFeedback = useCallback(
    (sourceName: string, destName: string) => {
      // Check if this source is a group that will resolve children
      const layer = interactive.sourceLayerMappings.find(
        (sl) => sl.sourceModel.name === sourceName,
      );
      const willResolve = layer?.isGroup && layer.coveredChildCount > 0 && !layer.isMapped;

      // Do the assignment
      interactive.assignUserModelToLayer(sourceName, destName);

      // Show toast if this was a first mapping that resolved children
      if (willResolve && layer) {
        showCascadeToast(sourceName, layer.coveredChildCount);
      }
    },
    [interactive, showCascadeToast],
  );

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBoostPrompt, setShowBoostPrompt] = useState(false);
  const [boostDisplayCoverage, setBoostDisplayCoverage] = useState<DisplayCoverage | null>(null);
  const [boostGroupSuggestions, setBoostGroupSuggestions] = useState<BoostSuggestion[]>([]);
  const [boostSpinnerSuggestions, setBoostSpinnerSuggestions] = useState<SpinnerBoostSuggestion[]>([]);
  const [focusedSourceLayer, setFocusedSourceLayer] = useState<string | null>(null);

  // Left panel sections open state
  const [showMappedSection, setShowMappedSection] = useState(false);
  const [showSkippedSection, setShowSkippedSection] = useState(false);

  // Left panel filter
  const [leftSearch, setLeftSearch] = useState("");

  // Right panel search
  const [rightSearch, setRightSearch] = useState("");

  const seqTitle = useMemo(() => {
    if (mapFromMode === "elm-ridge") {
      const displayLabel = displayType === "halloween" ? "Halloween" : "Christmas";
      return `${ELM_RIDGE_LAYOUT_TITLE} (${displayLabel})`;
    }
    return sourceFileName || "Source Layout";
  }, [mapFromMode, sourceFileName, displayType]);

  // Calculate coverage percentage for export button styling
  const coveragePercent = useMemo(() => {
    const effective = interactive.totalSourceLayers - interactive.skippedLayerCount;
    if (effective === 0) return 100;
    return (interactive.mappedLayerCount / effective) * 100;
  }, [interactive.totalSourceLayers, interactive.skippedLayerCount, interactive.mappedLayerCount]);

  // Export button style based on coverage
  const exportButtonStyle = useMemo(() => {
    if (coveragePercent >= 100) {
      return {
        className: "bg-green-500 text-white hover:bg-green-600",
        label: "Export",
        icon: true,
      };
    } else if (coveragePercent >= 50) {
      return {
        className: "bg-amber-500 text-white hover:bg-amber-600",
        label: `Export (${interactive.unmappedLayerCount} remaining)`,
        icon: false,
      };
    } else {
      return {
        className: "bg-zinc-600 text-zinc-300 hover:bg-zinc-500",
        label: `Export Partial (${interactive.unmappedLayerCount} remaining)`,
        icon: false,
      };
    }
  }, [coveragePercent, interactive.unmappedLayerCount]);

  // Group source layers by status
  const { unmappedLayers, mappedLayers, skippedLayers, unmappedGroups, unmappedIndividuals } =
    useMemo(() => {
      const unmapped: SourceLayerMapping[] = [];
      const mapped: SourceLayerMapping[] = [];
      const skippedList: SourceLayerMapping[] = [];
      const groups: SourceLayerMapping[] = [];
      const individuals: SourceLayerMapping[] = [];
      for (const sl of interactive.sourceLayerMappings) {
        if (sl.isSkipped) {
          skippedList.push(sl);
        } else if (sl.isMapped) {
          mapped.push(sl);
        } else {
          unmapped.push(sl);
          if (sl.isGroup) groups.push(sl);
          else individuals.push(sl);
        }
      }
      return {
        unmappedLayers: unmapped,
        mappedLayers: mapped,
        skippedLayers: skippedList,
        unmappedGroups: groups,
        unmappedIndividuals: individuals,
      };
    }, [interactive.sourceLayerMappings]);

  // Group mapped layers by confidence tier for TICKET-000
  type ConfidenceTier = "high" | "medium" | "low" | "manual";
  interface MappedLayerWithConfidence {
    layer: SourceLayerMapping;
    confidence: number; // 0-1 score, -1 for manual
    tier: ConfidenceTier;
  }

  const mappedByConfidence = useMemo(() => {
    const result: Record<ConfidenceTier, MappedLayerWithConfidence[]> = {
      high: [],
      medium: [],
      low: [],
      manual: [],
    };

    for (const layer of mappedLayers) {
      // Get the score for the first assigned user model
      const suggestions = interactive.getSuggestionsForLayer(layer.sourceModel);
      const firstAssigned = layer.assignedUserModels[0];
      let confidence = -1;
      let tier: ConfidenceTier = "manual";

      if (firstAssigned) {
        const match = suggestions.find((s) => s.model.name === firstAssigned.name);
        if (match) {
          confidence = match.score;
          if (confidence >= 0.7) tier = "high";
          else if (confidence >= 0.4) tier = "medium";
          else tier = "low";
        }
      }

      result[tier].push({ layer, confidence, tier });
    }

    // Sort each tier by confidence descending (manual stays as-is)
    result.high.sort((a, b) => b.confidence - a.confidence);
    result.medium.sort((a, b) => b.confidence - a.confidence);
    result.low.sort((a, b) => b.confidence - a.confidence);

    return result;
  }, [mappedLayers, interactive.getSuggestionsForLayer]);

  // State for confidence tier collapse
  const [showHighTier, setShowHighTier] = useState(true);
  const [showMediumTier, setShowMediumTier] = useState(true);
  const [showLowTier, setShowLowTier] = useState(false); // collapsed by default
  const [showManualTier, setShowManualTier] = useState(true);

  // Filter layers by search
  const filterLayers = useCallback(
    (layers: SourceLayerMapping[]) => {
      if (!leftSearch) return layers;
      const q = leftSearch.toLowerCase();
      return layers.filter(
        (sl) =>
          sl.sourceModel.name.toLowerCase().includes(q) ||
          sl.assignedUserModels.some((m) => m.name.toLowerCase().includes(q)),
      );
    },
    [leftSearch],
  );

  // Best matches for focused source layer (dynamic right panel section)
  const bestMatchesForFocused = useMemo(() => {
    if (!focusedSourceLayer) return [];
    const sl = interactive.sourceLayerMappings.find(
      (s) => s.sourceModel.name === focusedSourceLayer,
    );
    if (!sl) return [];
    return interactive.getSuggestionsForLayer(sl.sourceModel).slice(0, 5);
  }, [focusedSourceLayer, interactive.sourceLayerMappings, interactive.getSuggestionsForLayer]);

  // Global suggestions: top unmapped source layers with their best user matches (for when nothing selected)
  const globalSuggestions = useMemo(() => {
    if (focusedSourceLayer) return []; // Don't compute when focused
    const suggestions: { sourceLayer: SourceLayerMapping; bestMatch: { model: ParsedModel; score: number } }[] = [];

    for (const sl of interactive.sourceLayerMappings) {
      if (sl.isMapped || sl.isSkipped) continue;
      const matches = interactive.getSuggestionsForLayer(sl.sourceModel);
      if (matches.length > 0 && matches[0].score >= 0.5) {
        suggestions.push({
          sourceLayer: sl,
          bestMatch: { model: matches[0].model, score: matches[0].score },
        });
      }
    }

    // Sort by score descending, prioritize groups
    suggestions.sort((a, b) => {
      // Groups first
      if (a.sourceLayer.isGroup && !b.sourceLayer.isGroup) return -1;
      if (!a.sourceLayer.isGroup && b.sourceLayer.isGroup) return 1;
      // Then by score
      return b.bestMatch.score - a.bestMatch.score;
    });

    return suggestions.slice(0, 5);
  }, [focusedSourceLayer, interactive.sourceLayerMappings, interactive.getSuggestionsForLayer]);

  // Right panel: user models categorized (all models always visible, never hidden by assignment)
  const { userGroups, userModels } = useMemo(() => {
    const groups: ParsedModel[] = [];
    const models: ParsedModel[] = [];
    const q = rightSearch.toLowerCase();
    for (const m of destModels) {
      if (isDmxModel(m)) continue;
      if (q && !m.name.toLowerCase().includes(q) && !m.type.toLowerCase().includes(q)) continue;
      if (m.isGroup) {
        groups.push(m);
      } else {
        models.push(m);
      }
    }
    return { userGroups: groups, userModels: models };
  }, [destModels, rightSearch]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onTab: () => {
      const next = interactive.nextUnmappedLayer();
      if (next) {
        setFocusedSourceLayer(next);
        const el = document.getElementById(`source-layer-${next}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    onEnter: () => {
      // Accept best match for focused layer
      if (focusedSourceLayer && bestMatchesForFocused.length > 0) {
        assignWithCascadeFeedback(
          focusedSourceLayer,
          bestMatchesForFocused[0].model.name,
        );
        setFocusedSourceLayer(null);
      }
    },
    onSkip: () => {
      if (focusedSourceLayer) {
        interactive.skipSourceLayer(focusedSourceLayer);
        setFocusedSourceLayer(null);
      }
    },
    onUndo: () => {
      interactive.undo();
    },
  });

  // Handle drop on a source layer: user drags their model FROM right panel
  const handleLayerDrop = useCallback(
    (sourceLayerName: string, e: React.DragEvent) => {
      const data = e.dataTransfer.getData("text/plain");
      // Parse: data is "modiq-drag:modelName"
      const dragItem = dnd.parseDragDataTransfer(data);
      if (!dragItem) return;
      // In V3, the dragged item is a USER model being dropped onto a source layer
      assignWithCascadeFeedback(sourceLayerName, dragItem.sourceModelName);
      dnd.handleDragEnd();
    },
    [dnd, assignWithCascadeFeedback],
  );

  // Handle clicking the suggestion pill to accept best match
  const handleAcceptSuggestion = useCallback(
    (sourceLayerName: string, userModelName: string) => {
      assignWithCascadeFeedback(sourceLayerName, userModelName);
    },
    [assignWithCascadeFeedback],
  );

  // Export handlers
  const doExport = useCallback((boostLines?: { userGroupName: string; sourceGroupName: string }[]) => {
    const result = interactive.toMappingResult();
    // Only export mappings for source layers that have effects (reduces red rows in xLights)
    const activeSourceNames = effectTree ? getActiveSourceNamesForExport(effectTree) : undefined;
    const xmapContent = generateXmap(result, seqTitle, activeSourceNames);
    downloadXmap(xmapContent, xsqFilename);
    const baseName = xsqFilename.replace(/\.xsq$/i, "");
    const fileName = `modiq_${baseName}.xmap`;
    telemetry.trackAction({
      sequenceSlug: selectedSequence,
      action: "export",
      previousMapping: null,
      aiConfidence: null,
      aiSuggested: null,
      method: "dropdown_pick",
    });
    // Compute final display coverage for post-export screen
    const finalCoverage = computeDisplayCoverage(destModels, interactive.destToSourcesMap, isDmxModel);
    onExported(fileName, {
      displayCoverage: finalCoverage.percentage,
      sequenceCoverage: {
        mapped: interactive.mappedLayerCount,
        total: interactive.totalSourceLayers,
      },
      boostLines: boostLines ?? [],
      groupsMappedCount: interactive.groupsMappedCount,
      groupsCoveredChildCount: interactive.groupsCoveredChildCount,
      directMappedCount: interactive.directMappedCount,
    });
  }, [interactive, seqTitle, xsqFilename, selectedSequence, telemetry, onExported, destModels, effectTree]);

  const handleExport = useCallback(() => {
    if (interactive.unmappedLayerCount > 0) {
      setShowExportDialog(true);
      return;
    }
    // Check for boost opportunities (display coverage gaps)
    const coverage = computeDisplayCoverage(destModels, interactive.destToSourcesMap, isDmxModel);
    if (coverage.unmappedUserGroups.length > 0) {
      // Build source->dests map from dest->sources (invert the map)
      const sourceDestLinks = new Map<string, Set<string>>();
      for (const [destName, srcs] of interactive.destToSourcesMap) {
        for (const srcName of srcs) {
          const s = sourceDestLinks.get(srcName) ?? new Set();
          s.add(destName);
          sourceDestLinks.set(srcName, s);
        }
      }

      // Find mapped source groups for suggestions
      const mappedSourceGroups = interactive.sourceLayerMappings
        .filter((sl) => sl.isMapped && sl.isGroup)
        .map((sl) => sl.sourceModel);
      const groupSuggestions = findBoostSuggestions(
        coverage.unmappedUserGroups,
        mappedSourceGroups,
        interactive.allSourceModels,
        destModels,
        sourceDestLinks,
      );
      const spinnerSuggestions = findSpinnerBoostSuggestions(
        destModels,
        sourceDestLinks,
        isDmxModel,
      );

      if (groupSuggestions.length > 0 || spinnerSuggestions.length > 0) {
        setBoostDisplayCoverage(coverage);
        setBoostGroupSuggestions(groupSuggestions);
        setBoostSpinnerSuggestions(spinnerSuggestions);
        setShowBoostPrompt(true);
        return;
      }
    }
    doExport();
  }, [interactive, doExport, destModels]);

  const handleExportAnyway = useCallback(() => {
    setShowExportDialog(false);
    setShowBoostPrompt(false);
    doExport();
  }, [doExport]);

  const handleSkipAllAndExport = useCallback(() => {
    for (const sl of unmappedLayers) {
      interactive.skipSourceLayer(sl.sourceModel.name);
    }
    setShowExportDialog(false);
    setTimeout(() => doExport(), 50);
  }, [unmappedLayers, interactive, doExport]);

  const handleExportReport = useCallback(() => {
    const result = interactive.toMappingResult();
    const report = generateMappingReport(result, seqTitle);
    downloadMappingReport(report, seqTitle);
  }, [interactive, seqTitle]);

  const handleKeepMapping = useCallback(() => {
    setShowExportDialog(false);
    setShowBoostPrompt(false);
  }, []);

  // Boost prompt: accept selected suggestions, apply mappings, then export
  const handleBoostAcceptAndExport = useCallback(
    (acceptedGroups: BoostSuggestion[], acceptedSpinners: SpinnerBoostSuggestion[]) => {
      const boostLines: { userGroupName: string; sourceGroupName: string }[] = [];

      // Apply group boost: create many-to-one links
      for (const s of acceptedGroups) {
        interactive.assignUserModelToLayer(s.sourceGroup.name, s.userGroup.name);
        boostLines.push({
          userGroupName: s.userGroup.name,
          sourceGroupName: s.sourceGroup.name,
        });
      }

      // Apply spinner boost: create many-to-one links
      for (const s of acceptedSpinners) {
        interactive.assignUserModelToLayer(s.sourceModel.name, s.userModel.name);
        boostLines.push({
          userGroupName: s.userModel.name,
          sourceGroupName: s.sourceModel.name,
        });
      }

      setShowBoostPrompt(false);
      // Small delay to let state settle before export
      setTimeout(() => doExport(boostLines), 50);
    },
    [interactive, doExport],
  );

  const handleBoostSkipAndExport = useCallback(() => {
    setShowBoostPrompt(false);
    doExport();
  }, [doExport]);

  return (
    <div className="space-y-0">
      {/* ── Sticky Status Bar ────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-background/95 border-b border-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-[15px] font-display font-bold flex-shrink-0">
                ModIQ
              </h2>
              <span className="text-[13px] text-foreground/50 truncate">
                {seqTitle} &rarr; Your Layout
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {interactive.canUndo && (
                <button
                  type="button"
                  onClick={interactive.undo}
                  className="hidden sm:block text-xs px-2.5 py-1 rounded-lg text-foreground/40 hover:text-foreground hover:bg-surface-light border border-border transition-colors"
                >
                  Undo
                </button>
              )}
              <button
                onClick={handleExport}
                className={`text-[13px] px-4 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${exportButtonStyle.className}`}
              >
                {exportButtonStyle.icon && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {exportButtonStyle.label}
              </button>
            </div>
          </div>

          {isV3 ? (
            <MappingProgressBar
              mode="v3"
              mappedLayerCount={interactive.mappedLayerCount}
              totalSourceLayers={interactive.totalSourceLayers}
              skippedLayerCount={interactive.skippedLayerCount}
              groupsMappedCount={interactive.groupsMappedCount}
              groupsCoveredChildCount={interactive.groupsCoveredChildCount}
              directMappedCount={interactive.directMappedCount}
              unmappedLayerCount={interactive.unmappedLayerCount}
            />
          ) : (
            <MappingProgressBar
              mode="v2"
              mappedCount={interactive.mappedCount}
              totalCount={interactive.totalDest}
              skippedCount={interactive.skippedCount}
              highCount={interactive.highCount}
              mediumCount={interactive.mediumCount}
              lowCount={interactive.lowCount}
              coveredByGroupCount={interactive.coveredByGroupCount}
              percentage={interactive.mappedPercentage}
            />
          )}
        </div>
      </div>

      {/* ── Two-Panel Layout (V3: 60/40 split) ────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px] items-start">
        {/* ═══ Left Panel: Sequence Layers (The Task List) ═══ */}
        <div className="min-w-0 flex flex-col lg:max-h-[calc(100vh-8.5rem)]">
          {/* Intro + filter */}
          <div className="flex items-center gap-2 mb-2 flex-shrink-0">
            <div className="relative flex-1">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Filter layers..."
                value={leftSearch}
                onChange={(e) => setLeftSearch(e.target.value)}
                className="w-full text-[12px] pl-8 pr-3 py-1.5 h-8 rounded bg-surface border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
              />
            </div>
          </div>

          {/* Scrollable sections */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
            {/* ─── NEEDS MAPPING ─────────────────────────── */}
            {unmappedLayers.length > 0 && (
              <div className="bg-surface rounded-lg border border-amber-500/30 ring-1 ring-amber-500/10 overflow-hidden">
                <div className="px-3 h-9 flex items-center gap-2 bg-amber-500/5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                    NEEDS MAPPING
                  </span>
                  <span className="text-[13px] font-bold text-foreground">
                    {unmappedLayers.length}
                  </span>
                </div>

                <div className="border-t border-border">
                  <div className="px-3 py-1.5 text-[11px] text-foreground/40 bg-surface-light border-b border-border">
                    Assign your models to each source layer. Groups first — they carry the most effects.
                  </div>

                  {/* Groups tier */}
                  {filterLayers(unmappedGroups).length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-400/70 bg-teal-500/5 border-b border-border/50">
                        GROUPS ({filterLayers(unmappedGroups).length})
                      </div>
                      <div className="space-y-0 divide-y divide-border/30">
                        {filterLayers(unmappedGroups).map((sl) => (
                          <SourceLayerRow
                            key={sl.sourceModel.name}
                            layer={sl}
                            isFocused={focusedSourceLayer === sl.sourceModel.name}
                            onFocus={() => setFocusedSourceLayer(sl.sourceModel.name)}
                            onDrop={handleLayerDrop}
                            onAcceptSuggestion={handleAcceptSuggestion}
                            onSkip={() => interactive.skipSourceLayer(sl.sourceModel.name)}
                            onClear={() => interactive.clearLayerMapping(sl.sourceModel.name)}
                            onRemoveLink={interactive.removeLinkFromLayer}
                            getSuggestions={() => interactive.getSuggestionsForLayer(sl.sourceModel)}
                            isDragActive={dnd.state.isDragging}
                            draggedModelName={dnd.state.dragItem?.sourceModelName}
                            onDragEnter={dnd.handleDragEnter}
                            onDragLeave={dnd.handleDragLeave}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Individual models tier */}
                  {filterLayers(unmappedIndividuals).length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/40 bg-surface-light border-b border-border/50">
                        INDIVIDUAL MODELS ({filterLayers(unmappedIndividuals).length})
                      </div>
                      <div className="space-y-0 divide-y divide-border/30">
                        {filterLayers(unmappedIndividuals).map((sl) => (
                          <SourceLayerRow
                            key={sl.sourceModel.name}
                            layer={sl}
                            isFocused={focusedSourceLayer === sl.sourceModel.name}
                            onFocus={() => setFocusedSourceLayer(sl.sourceModel.name)}
                            onDrop={handleLayerDrop}
                            onAcceptSuggestion={handleAcceptSuggestion}
                            onSkip={() => interactive.skipSourceLayer(sl.sourceModel.name)}
                            onClear={() => interactive.clearLayerMapping(sl.sourceModel.name)}
                            onRemoveLink={interactive.removeLinkFromLayer}
                            getSuggestions={() => interactive.getSuggestionsForLayer(sl.sourceModel)}
                            isDragActive={dnd.state.isDragging}
                            draggedModelName={dnd.state.dragItem?.sourceModelName}
                            onDragEnter={dnd.handleDragEnter}
                            onDragLeave={dnd.handleDragLeave}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── MAPPED with confidence tiers ────────────────────────────────── */}
            {mappedLayers.length > 0 && (
              <div className="bg-surface rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowMappedSection(!showMappedSection)}
                  className="w-full px-3 h-9 flex items-center gap-2 hover:bg-surface-light transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-green-400">
                    MAPPED
                  </span>
                  <span className="text-[13px] font-bold text-foreground">
                    {mappedLayers.length}
                  </span>
                  <svg
                    className={`w-3 h-3 text-foreground/40 transition-transform ml-auto ${showMappedSection ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showMappedSection && (
                  <div className="border-t border-border">
                    {/* HIGH CONFIDENCE (≥70%) */}
                    {mappedByConfidence.high.length > 0 && (
                      <div className="border-b border-border/30">
                        <button
                          type="button"
                          onClick={() => setShowHighTier(!showHighTier)}
                          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-surface-light transition-colors border-l-2 border-green-500"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400">
                            High Confidence
                          </span>
                          <span className="text-[11px] text-foreground/50">≥70%</span>
                          <span className="text-[12px] font-bold text-foreground/70">
                            {mappedByConfidence.high.length}
                          </span>
                          <svg
                            className={`w-2.5 h-2.5 text-foreground/30 transition-transform ml-auto ${showHighTier ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showHighTier && (
                          <div className="divide-y divide-border/20">
                            {mappedByConfidence.high.map(({ layer, confidence }) => (
                              <MappedItemRow
                                key={layer.sourceModel.name}
                                layer={layer}
                                confidence={confidence}
                                onClear={() => interactive.clearLayerMapping(layer.sourceModel.name)}
                                onRemoveLink={interactive.removeLinkFromLayer}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* MEDIUM CONFIDENCE (40-69%) */}
                    {mappedByConfidence.medium.length > 0 && (
                      <div className="border-b border-border/30">
                        <button
                          type="button"
                          onClick={() => setShowMediumTier(!showMediumTier)}
                          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-surface-light transition-colors border-l-2 border-amber-500"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                            Medium Confidence
                          </span>
                          <span className="text-[11px] text-foreground/50">40-69%</span>
                          <span className="text-[12px] font-bold text-foreground/70">
                            {mappedByConfidence.medium.length}
                          </span>
                          <svg
                            className={`w-2.5 h-2.5 text-foreground/30 transition-transform ml-auto ${showMediumTier ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showMediumTier && (
                          <div className="divide-y divide-border/20">
                            {mappedByConfidence.medium.map(({ layer, confidence }) => (
                              <MappedItemRow
                                key={layer.sourceModel.name}
                                layer={layer}
                                confidence={confidence}
                                onClear={() => interactive.clearLayerMapping(layer.sourceModel.name)}
                                onRemoveLink={interactive.removeLinkFromLayer}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* LOW CONFIDENCE (<40%) */}
                    {mappedByConfidence.low.length > 0 && (
                      <div className="border-b border-border/30">
                        <button
                          type="button"
                          onClick={() => setShowLowTier(!showLowTier)}
                          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-surface-light transition-colors border-l-2 border-zinc-500"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                            Low Confidence
                          </span>
                          <span className="text-[11px] text-foreground/50">&lt;40%</span>
                          <span className="text-[12px] font-bold text-foreground/70">
                            {mappedByConfidence.low.length}
                          </span>
                          <svg
                            className={`w-2.5 h-2.5 text-foreground/30 transition-transform ml-auto ${showLowTier ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showLowTier && (
                          <div className="divide-y divide-border/20">
                            {mappedByConfidence.low.map(({ layer, confidence }) => (
                              <MappedItemRow
                                key={layer.sourceModel.name}
                                layer={layer}
                                confidence={confidence}
                                onClear={() => interactive.clearLayerMapping(layer.sourceModel.name)}
                                onRemoveLink={interactive.removeLinkFromLayer}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* MANUAL (user-dragged with no algorithmic match) */}
                    {mappedByConfidence.manual.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowManualTier(!showManualTier)}
                          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-surface-light transition-colors border-l-2 border-teal-500"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">
                            Manual
                          </span>
                          <span className="text-[11px] text-foreground/50">user mapped</span>
                          <span className="text-[12px] font-bold text-foreground/70">
                            {mappedByConfidence.manual.length}
                          </span>
                          <svg
                            className={`w-2.5 h-2.5 text-foreground/30 transition-transform ml-auto ${showManualTier ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showManualTier && (
                          <div className="divide-y divide-border/20">
                            {mappedByConfidence.manual.map(({ layer }) => (
                              <MappedItemRow
                                key={layer.sourceModel.name}
                                layer={layer}
                                confidence={-1}
                                onClear={() => interactive.clearLayerMapping(layer.sourceModel.name)}
                                onRemoveLink={interactive.removeLinkFromLayer}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── SKIPPED ───────────────────────────────── */}
            {skippedLayers.length > 0 && (
              <div className="bg-surface rounded-lg border border-border overflow-hidden opacity-60">
                <button
                  type="button"
                  onClick={() => setShowSkippedSection(!showSkippedSection)}
                  className="w-full px-3 h-9 flex items-center gap-2 hover:bg-surface-light transition-colors"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/20">
                    SKIPPED
                  </span>
                  <span className="text-[13px] font-bold text-foreground/40">
                    {skippedLayers.length}
                  </span>
                  <svg
                    className={`w-3 h-3 text-foreground/40 transition-transform ml-auto ${showSkippedSection ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showSkippedSection && (
                  <div className="border-t border-border">
                    {skippedLayers.map((sl) => (
                      <div
                        key={sl.sourceModel.name}
                        className="px-3 py-1.5 flex items-center justify-between border-b border-border/30 last:border-b-0"
                      >
                        <span className="text-[13px] text-foreground/30 line-through truncate">
                          {sl.sourceModel.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => interactive.unskipSourceLayer(sl.sourceModel.name)}
                          className="text-[10px] text-accent/60 hover:text-accent px-2 py-0.5 rounded"
                        >
                          unskip
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* All done state */}
            {unmappedLayers.length === 0 && mappedLayers.length > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-4 py-6 text-center">
                <div className="text-green-400 text-lg font-display font-bold mb-1">
                  Full sequence coverage!
                </div>
                <p className="text-[13px] text-foreground/50">
                  All {interactive.mappedLayerCount} sequence layers have a destination in your layout.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ Right Panel: Your Models (The Answer Pool) ═══ */}
        <div className="lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-8.5rem)]">
          <div className="bg-surface rounded-xl border border-border overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-border flex-shrink-0">
              <h3 className="font-display font-bold text-[15px]">Your Models</h3>
              <p className="text-[11px] text-foreground/40 mt-0.5">
                {userGroups.length + userModels.length} models &middot; Drag or click to link
              </p>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-border flex-shrink-0">
              <input
                type="text"
                placeholder="Search your models..."
                value={rightSearch}
                onChange={(e) => setRightSearch(e.target.value)}
                className="w-full text-[12px] px-2.5 py-1.5 h-8 rounded bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
              />
            </div>

            {/* Cards area */}
            <div className="flex-1 min-h-[440px] overflow-y-auto">
              {/* Dynamic Best Matches */}
              {focusedSourceLayer && bestMatchesForFocused.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-accent/70 bg-accent/5 sticky top-0 z-10 border-b border-border/50">
                    Best Matches for: {focusedSourceLayer}
                  </div>
                  <div className="px-2 py-1.5 space-y-0.5 border-b border-border">
                    {bestMatchesForFocused.map((match) => (
                      <DraggableUserCard
                        key={match.model.name}
                        model={match.model}
                        score={match.score}
                        onDragStart={dnd.handleDragStart}
                        onDragEnd={dnd.handleDragEnd}
                        getDragDataTransfer={dnd.getDragDataTransfer}
                        assignedSources={interactive.destToSourcesMap.get(match.model.name)}
                        onRemoveLink={interactive.removeLinkFromLayer}
                        onClickAssign={() => {
                          if (focusedSourceLayer) {
                            assignWithCascadeFeedback(focusedSourceLayer, match.model.name);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!focusedSourceLayer && globalSuggestions.length > 0 && (
                <div className="border-b border-border/50">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-400/70 bg-teal-500/5 sticky top-0 z-10 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Suggested Next Steps
                  </div>
                  <div className="px-2 py-1.5 space-y-1">
                    {globalSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.sourceLayer.sourceModel.name}
                        type="button"
                        onClick={() => {
                          // Option 1: Just focus the source layer
                          setFocusedSourceLayer(suggestion.sourceLayer.sourceModel.name);
                          const el = document.getElementById(
                            `source-layer-${suggestion.sourceLayer.sourceModel.name}`,
                          );
                          el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg bg-surface hover:bg-surface-light border border-border/50 hover:border-border transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[12px]">
                            {suggestion.sourceLayer.isGroup && (
                              <span className="text-[8px] font-bold text-teal-400/70 bg-teal-500/10 px-1 py-0.5 rounded">
                                GRP
                              </span>
                            )}
                            <span className="font-semibold text-foreground truncate">
                              {suggestion.sourceLayer.sourceModel.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-foreground/40 truncate">
                            &rarr; {suggestion.bestMatch.model.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[11px] font-semibold text-green-400">
                            {(suggestion.bestMatch.score * 100).toFixed(0)}%
                          </span>
                          <svg className="w-3.5 h-3.5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!focusedSourceLayer && globalSuggestions.length === 0 && (
                <div className="px-3 py-2.5 text-[11px] text-foreground/30 text-center border-b border-border/50">
                  Click a source layer to see best matches
                </div>
              )}

              {/* Groups */}
              {userGroups.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/40 bg-surface-light sticky top-0 z-10">
                    Groups ({userGroups.length})
                  </div>
                  <div className="px-2 py-1">
                    {userGroups.map((m) => (
                      <DraggableUserCard
                        key={m.name}
                        model={m}
                        onDragStart={dnd.handleDragStart}
                        onDragEnd={dnd.handleDragEnd}
                        getDragDataTransfer={dnd.getDragDataTransfer}
                        assignedSources={interactive.destToSourcesMap.get(m.name)}
                        onRemoveLink={interactive.removeLinkFromLayer}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Models */}
              {userModels.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/40 bg-surface-light sticky top-0 z-10">
                    Models ({userModels.length})
                  </div>
                  <div className="px-2 py-1">
                    {userModels.map((m) => (
                      <DraggableUserCard
                        key={m.name}
                        model={m}
                        onDragStart={dnd.handleDragStart}
                        onDragEnd={dnd.handleDragEnd}
                        getDragDataTransfer={dnd.getDragDataTransfer}
                        assignedSources={interactive.destToSourcesMap.get(m.name)}
                        onRemoveLink={interactive.removeLinkFromLayer}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {interactive.assignedUserModelNames.size > 0 && (
                <div className="px-3 py-1.5 text-[10px] text-foreground/25 text-center border-t border-border/50">
                  {interactive.assignedUserModelNames.size} of {userGroups.length + userModels.length} models linked
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={handleExport}
          className={`flex-1 py-3.5 rounded-xl font-display font-bold text-base transition-colors flex items-center justify-center gap-2 ${
            coveragePercent >= 100
              ? "bg-green-500 hover:bg-green-600 text-white"
              : coveragePercent >= 50
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-zinc-600 hover:bg-zinc-500 text-zinc-300"
          }`}
        >
          {coveragePercent >= 100 && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {coveragePercent >= 100
            ? "Download Mapping File (.xmap)"
            : `Download Mapping File (${interactive.unmappedLayerCount} remaining)`}
        </button>
        <button
          onClick={handleExportReport}
          className="px-5 py-3.5 rounded-xl font-medium text-foreground/60 hover:text-foreground bg-surface border border-border hover:bg-surface-light transition-colors"
        >
          Export Report (.csv)
        </button>
        <button
          onClick={onReset}
          className="px-5 py-3.5 rounded-xl font-medium text-foreground/60 hover:text-foreground bg-surface border border-border hover:bg-surface-light transition-colors"
        >
          Start Over
        </button>
      </div>

      {/* Keyboard shortcuts */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-foreground/25 py-1.5">
        <span>Tab: next unmapped</span>
        <span>&middot;</span>
        <span>Enter: accept suggestion</span>
        <span>&middot;</span>
        <span>S: skip</span>
        <span>&middot;</span>
        <span>Ctrl+Z: undo</span>
      </div>

      {/* Export Warning Dialog */}
      {showExportDialog && (
        <ExportDialog
          unmappedNames={unmappedLayers.map((sl) => sl.sourceModel.name)}
          onExportAnyway={handleExportAnyway}
          onSkipAllAndExport={handleSkipAllAndExport}
          onKeepMapping={handleKeepMapping}
        />
      )}

      {showBoostPrompt && boostDisplayCoverage && (
        <CoverageBoostPrompt
          displayCoverage={boostDisplayCoverage}
          sequenceCoverage={{
            mapped: interactive.mappedLayerCount,
            total: interactive.totalSourceLayers,
          }}
          groupSuggestions={boostGroupSuggestions}
          spinnerSuggestions={boostSpinnerSuggestions}
          destModels={destModels}
          onAcceptAndExport={handleBoostAcceptAndExport}
          onSkipAndExport={handleBoostSkipAndExport}
          onKeepMapping={handleKeepMapping}
        />
      )}

      {/* Cascade feedback toasts */}
      <CascadeToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

/** Expandable row for mapped items in the MAPPED section */
function MappedItemRow({
  layer,
  confidence,
  onClear,
  onRemoveLink,
}: {
  layer: SourceLayerMapping;
  confidence: number; // 0-1 score, -1 for manual
  onClear: () => void;
  onRemoveLink: (sourceName: string, destName: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMultipleDests = layer.assignedUserModels.length > 1;
  const hasResolvedChildren = layer.coveredChildCount > 0;
  const isExpandable = hasMultipleDests || hasResolvedChildren;

  // Confidence badge styling
  const confidencePercent = confidence >= 0 ? Math.round(confidence * 100) : null;
  const confidenceColor =
    confidence >= 0.7
      ? "text-green-400"
      : confidence >= 0.4
        ? "text-amber-400"
        : confidence >= 0
          ? "text-zinc-400"
          : "text-teal-400";

  return (
    <div>
      {/* Main row */}
      <div
        className={`px-3 py-2 flex items-center gap-2 ${isExpandable ? "cursor-pointer hover:bg-surface-light" : ""}`}
        onClick={isExpandable ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {layer.isGroup && (
              <span className="text-[9px] font-bold text-teal-400/70 bg-teal-500/10 px-1 py-0.5 rounded">GRP</span>
            )}
            <span className="text-[13px] text-foreground truncate">{layer.sourceModel.name}</span>
            {confidencePercent !== null && (
              <span className={`text-[10px] ${confidenceColor} opacity-70`}>{confidencePercent}%</span>
            )}
            {isExpandable && (
              <svg
                className={`w-3 h-3 text-foreground/30 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
          <div className="text-[11px] text-foreground/40 truncate">
            &rarr; Your &quot;{layer.assignedUserModels[0]?.name}&quot;
            {hasMultipleDests && (
              <span className="text-teal-400/60 ml-1">+{layer.assignedUserModels.length - 1}</span>
            )}
            {hasResolvedChildren && (
              <span className="text-teal-400/60 ml-1">
                ({layer.coveredChildCount} resolved)
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="text-[10px] text-foreground/30 hover:text-red-400 px-1"
          title="Remove all mappings"
        >
          &times;
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-2 ml-6 text-[11px] space-y-1.5">
          {/* Multiple destinations */}
          {hasMultipleDests && (
            <div>
              <div className="text-foreground/40 mb-1">Mapped to {layer.assignedUserModels.length} models:</div>
              {layer.assignedUserModels.map((m, i) => (
                <div key={m.name} className="flex items-center gap-2 py-0.5 pl-2 border-l-2 border-foreground/10">
                  <span className="text-foreground/30 w-4 tabular-nums">{i + 1}.</span>
                  <span className="text-foreground/60 truncate flex-1">{m.name}</span>
                  <span className="text-foreground/30">{m.pixelCount}px</span>
                  <button
                    type="button"
                    onClick={() => onRemoveLink(layer.sourceModel.name, m.name)}
                    className="text-foreground/20 hover:text-red-400"
                    title={`Remove ${m.name}`}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Resolved children for groups */}
          {hasResolvedChildren && layer.membersWithoutEffects.length > 0 && (
            <div>
              <div className="text-foreground/40 mb-1">Children auto-resolved:</div>
              {layer.membersWithoutEffects.map((child) => (
                <div key={child} className="flex items-center gap-2 py-0.5 text-green-400/70">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="truncate">{child}</span>
                </div>
              ))}
            </div>
          )}

          {/* Children with individual effects (if any) */}
          {layer.membersWithEffects.length > 0 && (
            <div>
              <div className="text-amber-400/60 mb-1">Children needing separate mapping:</div>
              {layer.membersWithEffects.map((child) => (
                <div key={child} className="flex items-center gap-2 py-0.5 text-amber-400/60">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="truncate">{child}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HowItWorksCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-6 text-center">
      <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center text-lg font-bold mx-auto mb-3">
        {number}
      </div>
      <h3 className="font-display font-bold mb-2">{title}</h3>
      <p className="text-sm text-foreground/60">{description}</p>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
