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
} from "@/lib/modiq";
import type { ParsedLayout, MappingResult, Confidence, DisplayType } from "@/lib/modiq";
import type { ParsedModel } from "@/lib/modiq";
import { sequences } from "@/data/sequences";
import { usePurchasedSequences } from "@/hooks/usePurchasedSequences";
import { useCart } from "@/contexts/CartContext";
import {
  useInteractiveMapping,
  type DestMapping,
} from "@/hooks/useInteractiveMapping";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useMappingTelemetry } from "@/hooks/useMappingTelemetry";
import MappingProgressBar from "@/components/modiq/MappingProgressBar";
import SourceModelPool from "@/components/modiq/SourceModelPool";
import SequenceSelector from "@/components/SequenceSelector";
import InteractiveMappingRow from "@/components/modiq/InteractiveMappingRow";
import ExportDialog from "@/components/modiq/ExportDialog";
import PostExportScreen from "@/components/modiq/PostExportScreen";

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

  // Export state
  const [exportFileName, setExportFileName] = useState("");

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
      : !!sourceLayout && !!userLayout;

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

    const steps: ProcessingStep[] = [
      {
        label: `Parsing your layout — ${userLayout.modelCount} models found`,
        status: "done",
      },
      { label: "Analyzing model types and positions", status: "active" },
      { label: `Matching against ${seqTitle}`, status: "pending" },
      { label: "Resolving submodel structures", status: "pending" },
      { label: "Generating optimal mapping", status: "pending" },
    ];
    setProcessingSteps([...steps]);

    await delay(400);

    steps[1].status = "done";
    steps[2].status = "active";
    setProcessingSteps([...steps]);
    await delay(500);

    // Build source models
    let srcModels: ParsedModel[];
    if (mapFromMode === "elm-ridge") {
      srcModels = getSourceModelsForSequence(displayType).map(
        sourceModelToParsedModel,
      );
    } else {
      srcModels = sourceLayout!.models;
    }
    setSourceModels(srcModels);
    const result = matchModels(srcModels, userLayout.models);

    steps[2].status = "done";
    steps[3].status = "active";
    setProcessingSteps([...steps]);
    await delay(300);

    steps[3].status = "done";
    steps[4].status = "active";
    setProcessingSteps([...steps]);
    await delay(300);

    steps[4].status = "done";
    setProcessingSteps([...steps]);
    await delay(200);

    setMappingResult(result);
    setStep("results");
  }, [userLayout, mapFromMode, sourceLayout, sourceFile, displayType, selectedSeq]);

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
                  (mapFromMode === "other-vendor" && sourceLayout)
                    ? "bg-green-500"
                    : "bg-accent"
                }`}
              >
                {(mapFromMode === "elm-ridge" && selectedSequence && isAccessible) ||
                (mapFromMode === "other-vendor" && sourceLayout) ? (
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
            {mapFromMode === "other-vendor" && !sourceFile && (
              <div className="mt-3 animate-[slideDown_0.25s_ease-out]" onClick={(e) => { e.stopPropagation(); sourceFileInputRef.current?.click(); }}>
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
                </div>
              </div>
            )}

          </div>

          {/* Step 2 — YOUR LAYOUT */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white transition-colors ${
                  userLayout ? "bg-green-500" : (mapFromMode === "elm-ridge" && selectedSequence && isAccessible) || (mapFromMode === "other-vendor" && sourceLayout) ? "bg-accent" : "bg-[#262626]"
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
            onReset={handleReset}
            onExported={(fileName) => {
              setExportFileName(fileName);
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
// Interactive Results View (V2 Refined + Performance Optimized)
// ═══════════════════════════════════════════════════════════════════

const CONFIDENCE_ORDER: Confidence[] = ["unmapped", "high", "medium", "low"];

const CONFIDENCE_STYLES: Record<
  Confidence,
  { text: string; label: string; dot: string }
> = {
  high: { text: "text-green-400", label: "HIGH", dot: "bg-green-400" },
  medium: { text: "text-amber-400", label: "MED", dot: "bg-amber-400" },
  low: { text: "text-red-400", label: "LOW", dot: "bg-red-400" },
  unmapped: {
    text: "text-foreground/30",
    label: "NONE",
    dot: "bg-foreground/30",
  },
};

const SECTION_LABELS: Record<Confidence, string> = {
  unmapped: "NEEDS MAPPING",
  high: "HIGH CONFIDENCE",
  medium: "MED CONFIDENCE",
  low: "LOW CONFIDENCE",
};

function InteractiveResults({
  initialResult,
  sourceModels,
  destModels,
  selectedSequence,
  mapFromMode,
  displayType,
  sourceFileName,
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
  onReset: () => void;
  onExported: (fileName: string) => void;
}) {
  const interactive = useInteractiveMapping(
    initialResult,
    sourceModels,
    destModels,
  );

  const dnd = useDragAndDrop();
  const telemetry = useMappingTelemetry(selectedSequence);

  // Sections: unmapped always expanded, others collapsed by default
  const [expandedSections, setExpandedSections] = useState<Set<Confidence>>(
    new Set(["unmapped"]),
  );
  const [focusedDest, setFocusedDest] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Left panel filter state
  const [leftSearch, setLeftSearch] = useState("");
  const [leftTypeFilter, setLeftTypeFilter] = useState<string>("all");

  // Mobile tap-to-select state
  const [selectedSourceForTap, setSelectedSourceForTap] = useState<
    string | null
  >(null);

  const seqTitle = useMemo(() => {
    if (mapFromMode === "elm-ridge") {
      const displayLabel = displayType === "halloween" ? "Halloween" : "Christmas";
      return `${ELM_RIDGE_LAYOUT_TITLE} (${displayLabel})`;
    }
    return sourceFileName || "Source Layout";
  }, [mapFromMode, sourceFileName, displayType]);

  const toggleSection = useCallback((tier: Confidence) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }, []);

  // Group dest mappings by confidence tier + skipped in single pass
  const { tiers, skippedMappings, autoMappedCount, manualCount } =
    useMemo(() => {
      const grouped: Record<Confidence, DestMapping[]> = {
        high: [],
        medium: [],
        low: [],
        unmapped: [],
      };
      const skipped: DestMapping[] = [];
      let auto = 0;
      let manual = 0;
      for (const dm of interactive.destMappings) {
        if (dm.isSkipped) {
          skipped.push(dm);
          continue;
        }
        grouped[dm.confidence].push(dm);
        if (dm.sourceModel && !dm.isManualOverride) auto++;
        if (dm.isManualOverride) manual++;
      }
      return {
        tiers: grouped,
        skippedMappings: skipped,
        autoMappedCount: auto,
        manualCount: manual,
      };
    }, [interactive.destMappings]);

  // Collect unique dest model types for filter
  const destModelTypes = useMemo(() => {
    const types = new Set<string>();
    for (const m of destModels) {
      if (!m.isGroup) types.add(m.type);
    }
    return Array.from(types).sort();
  }, [destModels]);

  // Filter helper for left panel
  const filterMappings = useCallback(
    (mappings: DestMapping[]) => {
      if (!leftSearch && leftTypeFilter === "all") return mappings;
      let filtered = mappings;
      if (leftSearch) {
        const q = leftSearch.toLowerCase();
        filtered = filtered.filter(
          (dm) =>
            dm.destModel.name.toLowerCase().includes(q) ||
            (dm.sourceModel?.name.toLowerCase().includes(q) ?? false),
        );
      }
      if (leftTypeFilter !== "all") {
        filtered = filtered.filter(
          (dm) =>
            dm.destModel.type === leftTypeFilter ||
            (dm.destModel.isGroup && leftTypeFilter === "Group"),
        );
      }
      return filtered;
    },
    [leftSearch, leftTypeFilter],
  );

  // Reverse assignment map for source pool: source name -> dest name
  const reverseAssignmentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const dm of interactive.destMappings) {
      if (dm.sourceModel) {
        map.set(dm.sourceModel.name, dm.destModel.name);
      }
    }
    return map;
  }, [interactive.destMappings]);

  // Best match for unmapped models — only depends on unmapped list + getSuggestions
  const bestMatches = useMemo(() => {
    const map = new Map<string, { name: string; score: number }>();
    for (const dm of tiers.unmapped) {
      const suggestions = interactive.getSuggestions(dm.destModel);
      if (suggestions.length > 0) {
        map.set(dm.destModel.name, {
          name: suggestions[0].model.name,
          score: suggestions[0].score,
        });
      }
    }
    return map;
  }, [tiers.unmapped, interactive.getSuggestions]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onTab: () => {
      const next = interactive.nextUnmappedDest();
      if (next) {
        setFocusedDest(next);
        setExpandedSections((prev) => new Set(prev).add("unmapped"));
        const el = document.getElementById(`dest-row-${next}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    onEnter: () => {},
    onSkip: () => {
      if (focusedDest) {
        interactive.skipModel(focusedDest);
        telemetry.trackAction({
          sequenceSlug: selectedSequence,
          action: "skip",
          targetModel: { name: focusedDest, displayAs: "", pixels: 0 },
          previousMapping: null,
          aiConfidence: null,
          aiSuggested: null,
          method: "dropdown_pick",
        });
        setFocusedDest(null);
      }
    },
    onUndo: () => {
      interactive.undo();
    },
  });

  // Stable per-row callbacks — avoid inline closures in render
  const handleRowAssign = useCallback(
    (destModelName: string, sourceModelName: string) => {
      interactive.assignSource(destModelName, sourceModelName);
      setFocusedDest(null);
      setSelectedSourceForTap(null);
    },
    [interactive],
  );

  const handleRowClear = useCallback(
    (destModelName: string) => {
      interactive.clearMapping(destModelName);
    },
    [interactive],
  );

  const handleRowSkip = useCallback(
    (destModelName: string) => {
      interactive.skipModel(destModelName);
    },
    [interactive],
  );

  // DnD drop handler
  const handleRowDrop = useCallback(
    (destModelName: string, e: React.DragEvent) => {
      const data = e.dataTransfer.getData("text/plain");
      const dragItem = dnd.parseDragDataTransfer(data);
      if (!dragItem) return;

      const currentMapping = interactive.destMappings.find(
        (dm) => dm.destModel.name === destModelName,
      );

      interactive.assignSource(destModelName, dragItem.sourceModelName);
      telemetry.trackAction({
        sequenceSlug: selectedSequence,
        action: currentMapping?.sourceModel ? "remap" : "drag_map",
        sourceModel: { name: dragItem.sourceModelName, type: "", pixels: 0 },
        targetModel: { name: destModelName, displayAs: "", pixels: 0 },
        previousMapping: currentMapping?.sourceModel?.name ?? null,
        aiConfidence: null,
        aiSuggested: null,
        method: "drag_drop",
      });

      dnd.handleDragEnd();
      setSelectedSourceForTap(null);
    },
    [dnd, interactive, selectedSequence, telemetry],
  );

  // Mobile tap-to-map
  const handleTapMap = useCallback(
    (destModelName: string) => {
      if (!selectedSourceForTap) return;
      interactive.assignSource(destModelName, selectedSourceForTap);
      telemetry.trackAction({
        sequenceSlug: selectedSequence,
        action: "click_map",
        sourceModel: { name: selectedSourceForTap, type: "", pixels: 0 },
        targetModel: { name: destModelName, displayAs: "", pixels: 0 },
        previousMapping: null,
        aiConfidence: null,
        aiSuggested: null,
        method: "dropdown_pick",
      });
      setSelectedSourceForTap(null);
    },
    [selectedSourceForTap, interactive, selectedSequence, telemetry],
  );

  const handleTapSelectSource = useCallback((modelName: string) => {
    setSelectedSourceForTap((prev) => (prev === modelName ? null : modelName));
  }, []);

  // Export handlers
  const doExport = useCallback(() => {
    const result = interactive.toMappingResult();
    const xmapContent = generateXmap(result, seqTitle);
    downloadXmap(xmapContent, seqTitle);
    const fileName = `modiq-${seqTitle.toLowerCase().replace(/\s+/g, "-")}-mapping.xmap`;
    telemetry.trackAction({
      sequenceSlug: selectedSequence,
      action: "export",
      previousMapping: null,
      aiConfidence: null,
      aiSuggested: null,
      method: "dropdown_pick",
    });
    onExported(fileName);
  }, [interactive, seqTitle, selectedSequence, telemetry, onExported]);

  const handleExport = useCallback(() => {
    if (tiers.unmapped.length > 0) {
      setShowExportDialog(true);
      return;
    }
    doExport();
  }, [tiers.unmapped.length, doExport]);

  const handleExportAnyway = useCallback(() => {
    setShowExportDialog(false);
    doExport();
  }, [doExport]);

  const handleSkipAllAndExport = useCallback(() => {
    for (const dm of tiers.unmapped) {
      interactive.skipModel(dm.destModel.name);
    }
    setShowExportDialog(false);
    setTimeout(() => doExport(), 50);
  }, [tiers.unmapped, interactive, doExport]);

  const handleExportReport = useCallback(() => {
    const result = interactive.toMappingResult();
    const report = generateMappingReport(result, seqTitle);
    downloadMappingReport(report, seqTitle);
  }, [interactive, seqTitle]);

  const handleKeepMapping = useCallback(() => {
    setShowExportDialog(false);
  }, []);

  return (
    <div className="space-y-0">
      {/* ── Sticky Top Bar — compact ~72px ────────────── */}
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
                className={`text-[13px] px-4 py-1.5 rounded-lg font-semibold transition-all ${
                  interactive.unmappedCount === 0
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "border border-accent text-accent hover:bg-accent/10"
                }`}
              >
                Export {interactive.unmappedCount > 0 && `(${interactive.unmappedCount} unmapped)`}
              </button>
            </div>
          </div>

          <MappingProgressBar
            mappedCount={interactive.mappedCount}
            totalCount={interactive.totalDest}
            skippedCount={interactive.skippedCount}
            highCount={interactive.highCount}
            mediumCount={interactive.mediumCount}
            lowCount={interactive.lowCount}
            percentage={interactive.mappedPercentage}
          />
        </div>
      </div>

      {/* ── Two-Panel Layout ───────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px] items-start">
        {/* Left panel: YOUR LAYOUT — viewport-capped with internal scroll */}
        <div className="min-w-0 flex flex-col lg:max-h-[calc(100vh-8.5rem)]">
          {/* Filter controls */}
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
                placeholder="Filter models..."
                value={leftSearch}
                onChange={(e) => setLeftSearch(e.target.value)}
                className="w-full text-[12px] pl-8 pr-3 py-1.5 h-8 rounded bg-surface border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30"
              />
            </div>
            {destModelTypes.length > 1 && (
              <select
                value={leftTypeFilter}
                onChange={(e) => setLeftTypeFilter(e.target.value)}
                className="text-[12px] px-2.5 py-1.5 h-8 rounded bg-surface border border-border focus:border-accent focus:outline-none text-foreground/60"
              >
                <option value="all">All Types</option>
                {destModelTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Scrollable confidence sections */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
          {/* Confidence tier sections — "Needs Mapping" first */}
          {CONFIDENCE_ORDER.map((tier) => {
            const tierMappings = filterMappings(tiers[tier]);
            const unfilteredCount = tiers[tier].length;
            if (unfilteredCount === 0) return null;

            const style = CONFIDENCE_STYLES[tier];
            const effectiveTotal =
              interactive.totalDest - interactive.skippedCount;
            const pct =
              effectiveTotal > 0
                ? ((unfilteredCount / effectiveTotal) * 100).toFixed(1)
                : "0.0";
            const isOpen = expandedSections.has(tier);
            const isNeedsMapping = tier === "unmapped";

            return (
              <div
                key={tier}
                className={`bg-surface rounded-lg border overflow-hidden ${
                  isNeedsMapping
                    ? "border-amber-500/30 ring-1 ring-amber-500/10"
                    : "border-border"
                }`}
              >
                {/* Section header — compact 36px */}
                <button
                  type="button"
                  onClick={() => toggleSection(tier)}
                  className={`w-full px-3 h-9 flex items-center gap-2 hover:bg-surface-light transition-colors ${
                    isNeedsMapping ? "bg-amber-500/5" : ""
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`}
                  />
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wider ${style.text}`}
                  >
                    {SECTION_LABELS[tier]}
                  </span>
                  <span className="text-[13px] font-bold text-foreground">
                    {unfilteredCount}
                  </span>
                  <span className="text-[11px] text-foreground/40">
                    ({pct}%)
                  </span>
                  <svg
                    className={`w-3 h-3 text-foreground/40 transition-transform ml-auto ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isOpen && (
                  <>
                    {isNeedsMapping && tierMappings.length > 0 && (
                      <div className="px-3 py-1.5 bg-surface-light text-[11px] text-foreground/40 border-t border-border">
                        {selectedSourceForTap
                          ? `Tap a row to map "${selectedSourceForTap}" — or tap source card to deselect`
                          : "Drag a source model here, or click to pick a match"}
                      </div>
                    )}
                    <div className="border-t border-border space-y-1.5 p-1.5">
                      {tierMappings.length > 0 ? (
                        tierMappings.map((dm) => (
                          <div
                            key={dm.destModel.name}
                            id={`dest-row-${dm.destModel.name}`}
                          >
                            <InteractiveMappingRow
                              destModel={dm.destModel}
                              sourceModel={dm.sourceModel}
                              confidence={dm.confidence}
                              reason={dm.reason}
                              submodelMappings={dm.submodelMappings}
                              isSkipped={dm.isSkipped}
                              isManualOverride={dm.isManualOverride}
                              isFocused={focusedDest === dm.destModel.name}
                              onAssign={(name) =>
                                handleRowAssign(dm.destModel.name, name)
                              }
                              onClear={() =>
                                handleRowClear(dm.destModel.name)
                              }
                              onSkip={() =>
                                handleRowSkip(dm.destModel.name)
                              }
                              getSuggestions={() =>
                                interactive.getSuggestions(dm.destModel)
                              }
                              availableSourceModels={
                                interactive.availableSourceModels
                              }
                              isDragActive={dnd.state.isDragging}
                              isDropTarget={
                                dnd.state.activeDropTarget === dm.destModel.name
                              }
                              onDragEnter={dnd.handleDragEnter}
                              onDragLeave={dnd.handleDragLeave}
                              onDrop={handleRowDrop}
                              selectedSourceModel={selectedSourceForTap}
                              onTapMap={handleTapMap}
                              bestMatch={bestMatches.get(dm.destModel.name)}
                            />
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-[13px] text-foreground/30 text-center">
                          No models match your filter
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Skipped section */}
          {skippedMappings.length > 0 && (
            <div className="bg-surface rounded-lg border border-border overflow-hidden opacity-60">
              <div className="px-3 h-9 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/20">
                  SKIPPED
                </span>
                <span className="text-[13px] font-bold text-foreground/40">
                  {skippedMappings.length}
                </span>
              </div>
              <div className="border-t border-border">
                {skippedMappings.map((dm) => (
                  <div
                    key={dm.destModel.name}
                    className="px-3 py-1.5 flex items-center justify-between border-b border-border/30 last:border-b-0"
                  >
                    <span className="text-[13px] text-foreground/30 line-through truncate">
                      {dm.destModel.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => interactive.unskipModel(dm.destModel.name)}
                      className="text-[10px] text-accent/60 hover:text-accent px-2 py-0.5 rounded"
                    >
                      unskip
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>{/* end scrollable confidence sections */}
        </div>

        {/* Right panel: Source model pool — sticky, capped at viewport */}
        <div className="lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-8.5rem)]">
          <SourceModelPool
            allSourceModels={interactive.allSourceModels}
            assignedSourceNames={interactive.assignedSourceNames}
            assignmentMap={reverseAssignmentMap}
            onDragStart={dnd.handleDragStart}
            onDragEnd={dnd.handleDragEnd}
            getDragDataTransfer={dnd.getDragDataTransfer}
            selectedSourceModel={selectedSourceForTap}
            onTapSelect={handleTapSelectSource}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={handleExport}
          className="flex-1 py-3.5 rounded-xl font-display font-bold text-base bg-accent hover:bg-accent/90 text-white transition-colors"
        >
          Download Mapping File (.xmap)
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

      {/* Keyboard shortcuts legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-foreground/25 py-1.5">
        <span>Tab: next unmapped</span>
        <span>&middot;</span>
        <span>S: skip</span>
        <span>&middot;</span>
        <span>Ctrl+Z: undo</span>
      </div>

      {/* Export Warning Dialog */}
      {showExportDialog && (
        <ExportDialog
          unmappedNames={tiers.unmapped.map((dm) => dm.destModel.name)}
          onExportAnyway={handleExportAnyway}
          onSkipAllAndExport={handleSkipAllAndExport}
          onKeepMapping={handleKeepMapping}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

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
