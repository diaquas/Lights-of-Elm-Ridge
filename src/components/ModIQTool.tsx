"use client";

import { useState, useCallback, useRef } from "react";
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
import type { ParsedLayout, MappingResult, Confidence } from "@/lib/modiq";
import { sequences } from "@/data/sequences";
import { usePurchasedSequences } from "@/hooks/usePurchasedSequences";
import { useCart } from "@/contexts/CartContext";
import SequenceSelector from "@/components/SequenceSelector";

type Step = "input" | "processing" | "results";

interface ProcessingStep {
  label: string;
  status: "pending" | "active" | "done";
}

export default function ModIQTool() {
  // Read URL query param for pre-selection (e.g. /modiq?sequence=abracadabra)
  const searchParams = useSearchParams();
  const initialSequence = searchParams.get("sequence") ?? "";
  const validInitial =
    initialSequence && sequences.some((s) => s.slug === initialSequence)
      ? initialSequence
      : "";

  const [step, setStep] = useState<Step>("input");
  const [selectedSequence, setSelectedSequence] = useState(validInitial);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [userLayout, setUserLayout] = useState<ParsedLayout | null>(null);
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(
    null,
  );
  const [error, setError] = useState<string>("");
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [expandedMappings, setExpandedMappings] = useState<Set<number>>(
    new Set(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ─── Ownership & Cart ─────────────────────────────────
  const {
    isLoggedIn,
    isLoading: purchasesLoading,
    hasPurchased,
  } = usePurchasedSequences();
  const { addItem, isInCart } = useCart();

  // Derive whether the selected sequence is accessible (free or owned)
  const selectedSeq = sequences.find((s) => s.slug === selectedSequence);
  const isAccessible = selectedSeq
    ? selectedSeq.price === 0 || hasPurchased(selectedSeq.id)
    : false;

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

  // ─── File Upload ────────────────────────────────────────
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // ─── Processing ─────────────────────────────────────────
  const runMapping = useCallback(async () => {
    if (!userLayout || !selectedSequence) return;

    setStep("processing");
    setError("");

    const steps: ProcessingStep[] = [
      {
        label: `Parsing your layout — ${userLayout.modelCount} models found`,
        status: "done",
      },
      { label: "Analyzing model types and positions", status: "active" },
      {
        label: `Matching against ${sequences.find((s) => s.slug === selectedSequence)?.title || selectedSequence}`,
        status: "pending",
      },
      { label: "Resolving submodel structures", status: "pending" },
      { label: "Generating optimal mapping", status: "pending" },
    ];
    setProcessingSteps([...steps]);

    // Simulate step progression with delays for UX
    await delay(400);

    steps[1].status = "done";
    steps[2].status = "active";
    setProcessingSteps([...steps]);
    await delay(500);

    // Actually run the matching
    const sourceModels = getSourceModelsForSequence(selectedSequence).map(
      sourceModelToParsedModel,
    );
    const result = matchModels(sourceModels, userLayout.models);

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
  }, [userLayout, selectedSequence]);

  // ─── Export ─────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!mappingResult) return;
    const seqName =
      sequences.find((s) => s.slug === selectedSequence)?.title ||
      selectedSequence;
    const xmapContent = generateXmap(mappingResult, seqName);
    downloadXmap(xmapContent, seqName);
  }, [mappingResult, selectedSequence]);

  const handleExportReport = useCallback(() => {
    if (!mappingResult) return;
    const seqName =
      sequences.find((s) => s.slug === selectedSequence)?.title ||
      selectedSequence;
    const report = generateMappingReport(mappingResult, seqName);
    downloadMappingReport(report, seqName);
  }, [mappingResult, selectedSequence]);

  // ─── Reset ──────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setStep("input");
    setMappingResult(null);
    setProcessingSteps([]);
    setExpandedMappings(new Set());
  }, []);

  const toggleExpanded = useCallback((idx: number) => {
    setExpandedMappings((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* ── Hero ───────────────────────────────────────── */}
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
          Upload your xLights layout, pick a sequence, and get a mapping file in
          seconds — not hours.
        </p>
        <p className="text-sm text-foreground/40 mt-2">
          by Lights of Elm Ridge
        </p>
      </div>

      {/* ── Input Step ─────────────────────────────────── */}
      {step === "input" && (
        <div className="space-y-8">
          {/* Step 1: Select Sequence */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-bold">
                1
              </span>
              <h2 className="text-lg font-semibold font-display">
                Select Your Sequence
              </h2>
            </div>
            <SequenceSelector
              sequences={sequences}
              value={selectedSequence}
              onChange={setSelectedSequence}
              isLoggedIn={isLoggedIn}
              isLoading={purchasesLoading}
              hasPurchased={hasPurchased}
            />
          </div>

          {/* Interstitial: unowned paid sequence selected */}
          {selectedSeq && !isAccessible && (
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-lg font-display font-semibold mb-1">
                {selectedSeq.title}{" "}
                <span className="text-foreground/50 font-normal">
                  — {selectedSeq.artist}
                </span>
              </h3>
              <p className="text-sm text-foreground/60 mt-2 mb-5">
                You don&apos;t own this sequence yet.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {isInCart(selectedSeq.id) ? (
                  <Link
                    href="/cart"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm bg-green-600 hover:bg-green-700 text-white transition-all"
                  >
                    <svg
                      className="w-4 h-4"
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
                    In Cart — View Cart
                  </Link>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-3 px-5 rounded-xl font-semibold text-sm bg-accent hover:bg-accent/90 text-white transition-all"
                  >
                    Add to Cart — ${selectedSeq.price.toFixed(2)}
                  </button>
                )}
                <Link
                  href={`/sequences/${selectedSeq.slug}`}
                  className="inline-flex items-center justify-center gap-1 py-3 px-5 rounded-xl font-medium text-sm text-foreground/60 hover:text-foreground bg-surface border border-border hover:bg-surface-light transition-all"
                >
                  View Sequence &rarr;
                </Link>
              </div>
              {!isLoggedIn && (
                <p className="text-xs text-zinc-500 mt-4">
                  Already purchased?{" "}
                  <Link
                    href="/login?redirect=/modiq"
                    className="text-zinc-400 hover:text-zinc-300 underline"
                  >
                    Log in to access it.
                  </Link>
                </p>
              )}
            </div>
          )}

          {/* Step 2: Upload Layout (only when sequence is accessible) */}
          {(!selectedSeq || isAccessible) && (
            <div className="bg-surface rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <h2 className="text-lg font-semibold font-display">
                  Upload Your Layout
                </h2>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-accent bg-accent/10"
                    : uploadedFile
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-border hover:border-foreground/30 hover:bg-surface-light"
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

                {uploadedFile && userLayout ? (
                  <div>
                    <svg
                      className="w-10 h-10 mx-auto mb-3 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-foreground font-medium">
                      {uploadedFile.name}
                    </p>
                    <p className="text-sm text-foreground/60 mt-1">
                      {userLayout.modelCount} models detected &middot;{" "}
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-xs text-foreground/40 mt-2">
                      Click to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <svg
                      className="w-10 h-10 mx-auto mb-3 text-foreground/30"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-foreground/70 font-medium">
                      Drag & drop your xlights_rgbeffects.xml
                    </p>
                    <p className="text-sm text-foreground/40 mt-1">
                      or click to browse
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs text-foreground/40 mt-3">
                Find this file in your xLights show folder. Your files are
                processed locally in your browser and never uploaded to any
                server.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Run Button */}
          <button
            onClick={runMapping}
            disabled={!selectedSequence || !isAccessible || !userLayout}
            className="w-full py-4 rounded-xl font-display font-bold text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-accent hover:bg-accent/90 text-white"
          >
            ModIQ It
          </button>
        </div>
      )}

      {/* ── Processing Step ────────────────────────────── */}
      {step === "processing" && (
        <div className="bg-surface rounded-xl border border-border p-8">
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

      {/* ── Results Step ───────────────────────────────── */}
      {step === "results" && mappingResult && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-xl font-display font-bold mb-1">
              Mapping Results
            </h2>
            <p className="text-sm text-foreground/60 mb-4">
              {sequences.find((s) => s.slug === selectedSequence)?.title} → Your
              Layout
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <StatBox
                label="Mapped"
                value={mappingResult.mappedCount}
                total={mappingResult.totalSource}
                color="text-foreground"
              />
              <StatBox
                label="High"
                value={mappingResult.highConfidence}
                color="text-green-400"
              />
              <StatBox
                label="Medium"
                value={mappingResult.mediumConfidence}
                color="text-amber-400"
              />
              <StatBox
                label="Low / Unmapped"
                value={
                  mappingResult.lowConfidence + mappingResult.unmappedSource
                }
                color="text-red-400"
              />
            </div>

            {mappingResult.unmappedDest > 0 && (
              <p className="text-xs text-foreground/40">
                {mappingResult.unmappedDest} models in your layout have no
                equivalent in this sequence.
              </p>
            )}
          </div>

          {/* Mapping Table */}
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="hidden sm:grid grid-cols-[100px_1fr_24px_1fr] gap-2 px-6 py-3 bg-surface-light text-xs text-foreground/50 uppercase tracking-wider font-medium border-b border-border">
              <span>Confidence</span>
              <span>Our Model</span>
              <span />
              <span>Your Model</span>
            </div>

            <div className="divide-y divide-border">
              {mappingResult.mappings.map((mapping, idx) => (
                <MappingRow
                  key={idx}
                  mapping={mapping}
                  isExpanded={expandedMappings.has(idx)}
                  onToggle={() => toggleExpanded(idx)}
                />
              ))}
            </div>
          </div>

          {/* Unused Dest Models */}
          {mappingResult.unusedDestModels.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-semibold text-foreground/60 mb-3">
                Your models not used in this sequence (
                {mappingResult.unusedDestModels.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {mappingResult.unusedDestModels.slice(0, 30).map((m, i) => (
                  <span
                    key={i}
                    className="text-xs bg-surface-light rounded px-2 py-1 text-foreground/50"
                  >
                    {m.name}
                  </span>
                ))}
                {mappingResult.unusedDestModels.length > 30 && (
                  <span className="text-xs text-foreground/40">
                    +{mappingResult.unusedDestModels.length - 30} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExport}
              className="flex-1 py-4 rounded-xl font-display font-bold text-lg bg-accent hover:bg-accent/90 text-white transition-all"
            >
              Download Mapping File (.xmap)
            </button>
            <button
              onClick={handleExportReport}
              className="px-6 py-4 rounded-xl font-medium text-foreground/60 hover:text-foreground bg-surface border border-border hover:bg-surface-light transition-all"
            >
              Export Report (.csv)
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-4 rounded-xl font-medium text-foreground/60 hover:text-foreground bg-surface border border-border hover:bg-surface-light transition-all"
            >
              Start Over
            </button>
          </div>

          {/* How to import */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="text-sm font-semibold text-foreground/60 mb-2">
              How to import into xLights
            </h3>
            <ol className="text-sm text-foreground/50 space-y-1 list-decimal list-inside">
              <li>Open your sequence in xLights</li>
              <li>
                Go to <strong>Import</strong> tab and select the purchased
                sequence file
              </li>
              <li>
                In the mapping dialog, click <strong>Load Mapping</strong>
              </li>
              <li>Select the .xmap file you just downloaded</li>
              <li>Review and tweak any low-confidence mappings</li>
              <li>Click OK to apply</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── How It Works (visible on input step) ───────── */}
      {step === "input" && (
        <div className="mt-16 space-y-8">
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

// ─── Sub-components ───────────────────────────────────────────────

function StatBox({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total?: number;
  color: string;
}) {
  return (
    <div className="bg-background rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>
        {value}
        {total !== undefined && (
          <span className="text-sm text-foreground/40">/{total}</span>
        )}
      </div>
      <div className="text-xs text-foreground/50 mt-1">{label}</div>
    </div>
  );
}

const CONFIDENCE_STYLES: Record<
  Confidence,
  { bg: string; text: string; label: string; dot: string }
> = {
  high: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    label: "HIGH",
    dot: "bg-green-400",
  },
  medium: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    label: "MED",
    dot: "bg-amber-400",
  },
  low: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    label: "LOW",
    dot: "bg-red-400",
  },
  unmapped: {
    bg: "bg-foreground/5",
    text: "text-foreground/30",
    label: "NONE",
    dot: "bg-foreground/30",
  },
};

function MappingRow({
  mapping,
  isExpanded,
  onToggle,
}: {
  mapping: {
    sourceModel: {
      name: string;
      type: string;
      pixelCount: number;
      isGroup: boolean;
    };
    destModel: {
      name: string;
      type: string;
      pixelCount: number;
      isGroup: boolean;
    } | null;
    confidence: Confidence;
    reason: string;
    submodelMappings: {
      sourceName: string;
      destName: string;
      confidence: Confidence;
      pixelDiff: string;
    }[];
  };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const style = CONFIDENCE_STYLES[mapping.confidence];
  const hasSubmodels = mapping.submodelMappings.length > 0;

  return (
    <div>
      <div
        className={`px-4 sm:px-6 py-3 sm:grid sm:grid-cols-[100px_1fr_24px_1fr] sm:gap-2 items-center ${
          hasSubmodels ? "cursor-pointer hover:bg-surface-light" : ""
        }`}
        onClick={hasSubmodels ? onToggle : undefined}
      >
        {/* Confidence badge */}
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${style.bg} ${style.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        </div>

        {/* Source model */}
        <div className="mb-1 sm:mb-0">
          <span className="text-sm font-medium">
            {mapping.sourceModel.name}
          </span>
          {!mapping.sourceModel.isGroup && (
            <span className="text-xs text-foreground/40 ml-2">
              {mapping.sourceModel.pixelCount}px &middot;{" "}
              {mapping.sourceModel.type}
            </span>
          )}
        </div>

        {/* Arrow */}
        <div className="hidden sm:flex items-center justify-center text-foreground/30">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </div>

        {/* Dest model */}
        <div>
          {mapping.destModel ? (
            <>
              <span className="text-sm font-medium">
                {mapping.destModel.name}
              </span>
              {!mapping.destModel.isGroup && (
                <span className="text-xs text-foreground/40 ml-2">
                  {mapping.destModel.pixelCount}px &middot;{" "}
                  {mapping.destModel.type}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-foreground/30 italic">
              (no match)
            </span>
          )}
          {mapping.reason && (
            <p className="text-[11px] text-foreground/40 mt-0.5">
              {mapping.reason}
            </p>
          )}
          {hasSubmodels && (
            <span className="text-[11px] text-accent/60 mt-0.5 inline-block">
              {mapping.submodelMappings.length} submodels{" "}
              {isExpanded ? "▲" : "▼"}
            </span>
          )}
        </div>
      </div>

      {/* Expanded submodel view */}
      {isExpanded && hasSubmodels && (
        <div className="px-6 pb-4 bg-background/50 border-t border-border/50">
          <div className="py-2 space-y-1">
            {mapping.submodelMappings.map((sub, i) => {
              const subStyle = CONFIDENCE_STYLES[sub.confidence];
              return (
                <div
                  key={i}
                  className="grid grid-cols-[60px_1fr_24px_1fr] gap-2 items-center text-xs py-1"
                >
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${subStyle.bg} ${subStyle.text}`}
                  >
                    <span className={`w-1 h-1 rounded-full ${subStyle.dot}`} />
                    {subStyle.label}
                  </span>
                  <span className="text-foreground/70">{sub.sourceName}</span>
                  <span className="text-foreground/20 text-center">&rarr;</span>
                  <span className="text-foreground/70">
                    {sub.destName || (
                      <span className="text-foreground/30 italic">
                        unmapped
                      </span>
                    )}
                    <span className="text-foreground/30 ml-1">
                      ({sub.pixelDiff})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
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
