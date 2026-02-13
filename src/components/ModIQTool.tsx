"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
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
  getSequenceEffectCounts,
  buildEffectTree,
  getActiveSourceModels,
  computeDisplayCoverage,
  findBoostSuggestions,
  findSpinnerBoostSuggestions,
  parseXsqModels,
  parseXsqEffectCounts,
  detectModelSuperGroups,
} from "@/lib/modiq";
import type {
  ParsedLayout,
  MappingResult,
  DisplayType,
  EffectTree,
} from "@/lib/modiq";
import type { ParsedModel } from "@/lib/modiq";
import type {
  BoostSuggestion,
  SpinnerBoostSuggestion,
  DisplayCoverage,
} from "@/lib/modiq";
import { isDmxModel, getActiveSourceNamesForExport } from "@/lib/modiq";
import { sequences } from "@/data/sequences";
import { getMockupVideoId } from "@/data/youtube-loader";
import { usePurchasedSequences } from "@/hooks/usePurchasedSequences";
// useCart removed — cart interstitial no longer on landing page
import {
  useInteractiveMapping,
  type SourceLayerMapping,
  type InteractiveMappingState,
} from "@/hooks/useInteractiveMapping";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useMappingTelemetry } from "@/hooks/useMappingTelemetry";
import MappingProgressBar from "@/components/modiq/MappingProgressBar";
import SourceLayerRow from "@/components/modiq/SourceLayerRow";
import DraggableUserCard from "@/components/modiq/DraggableUserCard";
// SequenceSelector no longer used — LOER flow uses grid picker
import ExportDialog from "@/components/modiq/ExportDialog";
import CoverageBoostPrompt from "@/components/modiq/CoverageBoostPrompt";
import PostExportScreen from "@/components/modiq/PostExportScreen";
import CascadeToastContainer, {
  useCascadeToasts,
} from "@/components/modiq/CascadeToast";
import { MappingPhaseProvider, useMappingPhase } from "@/contexts/MappingPhaseContext";
import { ProgressTrackerProvider } from "@/components/modiq/ProgressTrackerProvider";
import { PhaseContainer } from "@/components/modiq/PhaseContainer";
import { PhaseNavigation } from "@/components/modiq/PhaseNavigation";
import { useModiqSessions } from "@/hooks/useModiqSessions";

type Step = "input" | "processing" | "results" | "exported";
type MapFromMode = "elm-ridge" | "other-vendor";
type InputSubStep = "source-select" | "loer-flow" | "vendor-flow";

// Default identifier for Elm Ridge layout (same models for all sequences)
const ELM_RIDGE_LAYOUT_ID = "elm-ridge";
const ELM_RIDGE_LAYOUT_TITLE = "Lights of Elm Ridge";

interface ProcessingStep {
  label: string;
  status: "pending" | "active" | "done";
}

interface ProcessingStats {
  layoutModels: number;
  sequenceModels: number;
  matchesFound: number;
  matchEstimate: number; // expected total — drives continuous counter animation
  progress: number; // 0-100
}

export default function ModIQTool() {
  // Read URL query param (kept for backwards compatibility)
  const searchParams = useSearchParams();
  const initialSequence = searchParams.get("sequence") ?? "";

  const [step, setStep] = useState<Step>("input");
  const [mapFromMode, setMapFromMode] = useState<MapFromMode>("elm-ridge");
  const [displayType, setDisplayType] = useState<DisplayType>("halloween");
  const [inputSubStep, setInputSubStep] = useState<InputSubStep>(
    initialSequence ? "loer-flow" : "source-select",
  );
  const [vendorStep, setVendorStep] = useState<1 | 2>(1);

  // Sequence selection & ownership
  const [selectedSequence, setSelectedSequence] = useState(initialSequence);
  const {
    isLoggedIn,
    isLoading: purchasesLoading,
    hasPurchased,
  } = usePurchasedSequences();
  const selectedSeq = sequences.find((s) => s.slug === selectedSequence);
  const isAccessible = selectedSeq
    ? selectedSeq.price === 0 || hasPurchased(selectedSeq.id)
    : false;

  // Sequence categories for LOER picker grid
  const purchasedSeqs = useMemo(
    () =>
      sequences
        .filter((s) => s.price > 0 && hasPurchased(s.id))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [hasPurchased],
  );
  const freeSeqs = useMemo(
    () =>
      sequences
        .filter((s) => s.price === 0)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [],
  );

  const handleSequenceChange = useCallback((slug: string) => {
    setSelectedSequence(slug);
    const seq = sequences.find((s) => s.slug === slug);
    if (seq) {
      setDisplayType(seq.category === "Christmas" ? "christmas" : "halloween");
    }
  }, []);

  // Source layout from "other vendor" upload
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceLayout, setSourceLayout] = useState<ParsedLayout | null>(null);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const [sourceIsDragging, setSourceIsDragging] = useState(false);

  // Vendor .xsq sequence file (required for other-vendor mode)
  const [vendorXsqFile, setVendorXsqFile] = useState<File | null>(null);
  const [vendorXsqModels, setVendorXsqModels] = useState<string[] | null>(null);
  const [vendorEffectCounts, setVendorEffectCounts] = useState<Record<
    string,
    number
  > | null>(null);
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
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    layoutModels: 0,
    sequenceModels: 0,
    matchesFound: 0,
    matchEstimate: 0,
    progress: 0,
  });

  // Store source models for the interactive mapping hook
  const [sourceModels, setSourceModels] = useState<ParsedModel[]>([]);

  // Effect tree for effect-aware mapping
  const [effectTree, setEffectTree] = useState<EffectTree | null>(null);

  // Export state
  const [exportFileName, setExportFileName] = useState("");
  // Boost state (passed from InteractiveResults to PostExportScreen)
  const [exportDisplayCoverage, setExportDisplayCoverage] = useState<
    number | undefined
  >(undefined);
  const [exportSequenceCoverage, setExportSequenceCoverage] = useState<
    { mapped: number; total: number } | undefined
  >(undefined);
  const [exportBoostLines, setExportBoostLines] = useState<
    { userGroupName: string; sourceGroupName: string }[]
  >([]);
  const [exportGroupsMapped, setExportGroupsMapped] = useState<number>(0);
  const [exportGroupsCoveredChildren, setExportGroupsCoveredChildren] =
    useState<number>(0);
  const [exportDirectMapped, setExportDirectMapped] = useState<number>(0);

  // ─── Save States / Session Recovery ────────────────────
  const sessions = useModiqSessions();
  const sessionIdRef = useRef<string | null>(null);

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
        const effectCnts = parseXsqEffectCounts(content);
        setVendorXsqModels(models);
        setVendorEffectCounts(effectCnts);
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
    setProcessingStats({
      layoutModels: userLayout.modelCount,
      sequenceModels: 0,
      matchesFound: 0,
      matchEstimate: 0,
      progress: 0,
    });

    const displayLabel =
      displayType === "halloween" ? "Halloween" : "Christmas";
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

    const totalStepCount = hasEffectData ? 6 : 5;
    let completedSteps = 0;
    const pct = () => Math.round((completedSteps / totalStepCount) * 100);

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
    completedSteps = 1; // "Parsing" is already done
    setProcessingStats((s) => ({ ...s, progress: pct() }));

    // Helper to advance processing steps sequentially
    let si = 0; // starts at step 0 (already "done")
    const advance = async (ms: number) => {
      steps[si].status = "done";
      si++;
      completedSteps++;
      if (si < steps.length) steps[si].status = "active";
      setProcessingSteps([...steps]);
      setProcessingStats((s) => ({ ...s, progress: pct() }));
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
      // Get effect counts to filter out false-positive groups
      // (groups that appear in SEQUENCE_MODELS as containers but have 0 direct effects)
      const seqEffectCounts =
        mapFromMode === "elm-ridge" && selectedSequence
          ? getSequenceEffectCounts(selectedSequence)
          : mapFromMode === "other-vendor" && vendorEffectCounts
            ? vendorEffectCounts
            : undefined;
      tree = buildEffectTree(allSrcModels, seqModelList, seqEffectCounts);
      srcModels = getActiveSourceModels(allSrcModels, tree);
    } else {
      srcModels = allSrcModels;
    }

    // Update sequence model count
    setProcessingStats((s) => ({ ...s, sequenceModels: srcModels.length }));

    if (hasEffectData && tree) {
      // Update the effect tree step label with results
      steps[si].label =
        `Effect tree: ${tree.summary.effectiveMappingItems} active layers from ${tree.summary.totalModelsInLayout} models`;
      await delay(300);
    }

    setEffectTree(tree);
    setSourceModels(srcModels);

    await advance(300); // "Matching against ..." → active

    // Tell the counter to start its continuous climb toward ~85% of estimate
    const estimate = Math.round(srcModels.length * 0.85);
    setProcessingStats((s) => ({ ...s, matchEstimate: estimate }));

    // Let the climb animation run visibly before the sync matchModels call
    // blocks the main thread. Use setTimeout to flush pending rAF frames.
    await delay(800);
    const srcSuperGroups = detectModelSuperGroups(srcModels);
    const destSuperGroups = detectModelSuperGroups(userLayout.models);
    const superGroupSets = { source: srcSuperGroups, dest: destSuperGroups };
    const result = await new Promise<ReturnType<typeof matchModels>>((resolve) => {
      setTimeout(() => resolve(matchModels(srcModels, userLayout.models, superGroupSets)), 0);
    });

    // Animate from climb position up to actual result (600ms ease-out in counter)
    setProcessingStats((s) => ({
      ...s,
      matchesFound: result.mappedCount,
      matchEstimate: 0,
    }));
    await delay(650);

    await advance(300); // "Resolving submodel structures" → active
    await delay(200);

    await advance(200); // "Generating optimal mapping" → active
    await delay(200);

    // Mark final step done
    steps[si].status = "done";
    completedSteps++;
    setProcessingSteps([...steps]);
    setProcessingStats((s) => ({ ...s, progress: 100 }));
    await delay(200);

    setMappingResult(result);

    // Create a cloud session for auto-save (non-blocking)
    if (sessions.userId) {
      sessions
        .createSession({
          sourceType: mapFromMode,
          sequenceSlug:
            mapFromMode === "elm-ridge" ? selectedSequence || null : null,
          sequenceTitle: seqTitle,
          layoutFilename: uploadedFile?.name ?? "layout.xml",
          totalCount: srcModels.length,
        })
        .then((id) => {
          sessionIdRef.current = id;
        });
    }

    setStep("results");
  }, [
    userLayout,
    mapFromMode,
    sourceLayout,
    sourceFile,
    displayType,
    selectedSeq,
    vendorXsqModels,
    vendorEffectCounts,
    sessions,
    selectedSequence,
    uploadedFile,
  ]);

  // ─── Reset ──────────────────────────────────────────────
  const handleReset = useCallback(() => {
    sessionIdRef.current = null;
    setStep("input");
    setInputSubStep("source-select");
    setVendorStep(1);
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
          <div className="mb-3">
            <Image
              src="/modiq-wordmark-v3-full.png"
              alt="ModIQ"
              width={280}
              height={80}
              className="mx-auto"
              priority
            />
          </div>
          <p className="text-xl text-gray-200 tracking-[0.015em] max-w-2xl mx-auto">
            Sequence mapping in seconds — not hours.
          </p>
        </div>
      )}

      {/* ── Session Recovery Banner ──────────────────────── */}
      {step === "input" &&
        inputSubStep === "source-select" &&
        sessions.activeSession && (
          <div className="max-w-[860px] mx-auto mb-8">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 flex items-center gap-5">
              <div className="h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  Incomplete Session Found
                </h3>
                <p className="text-[13px] text-foreground/50 mt-0.5">
                  {sessions.activeSession.sequence_title} &middot;{" "}
                  {sessions.activeSession.mapped_count} of{" "}
                  {sessions.activeSession.total_count} mapped (
                  {sessions.activeSession.coverage_percent}%)
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-foreground/10 overflow-hidden max-w-xs">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{
                      width: `${sessions.activeSession.coverage_percent}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    sessions.abandonSession(sessions.activeSession!.id)
                  }
                  className="px-3 py-1.5 text-[12px] text-foreground/40 hover:text-foreground/60 border border-border hover:border-foreground/20 rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // TODO: implement full state restoration from session data
                    // For now, just abandon and start fresh
                    sessions.abandonSession(sessions.activeSession!.id);
                  }}
                  className="px-4 py-1.5 text-[12px] font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                >
                  Resume
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ── Input Step ─────────────────────────────────── */}
      {step === "input" && (
        <>
          {/* ── Source Selection Landing ──────────────────── */}
          {inputSubStep === "source-select" && (
            <div className="max-w-[860px] mx-auto space-y-12">
              {/* Source Selection Cards */}
              <div className="grid md:grid-cols-5 gap-6">
                {/* LOER Card — Prominent (3 cols) */}
                <button
                  type="button"
                  onClick={() => {
                    setMapFromMode("elm-ridge");
                    setInputSubStep("loer-flow");
                  }}
                  className="relative md:col-span-3 bg-accent/5 border-2 border-accent rounded-2xl p-8 text-left transition-all hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(239,68,68,0.15)] group"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wide whitespace-nowrap">
                    &#9733; RECOMMENDED &#9733;
                  </div>
                  <div className="mb-4 mt-2">
                    <Image
                      src="/modiq-wordmark-v3-full.png"
                      alt="Lights of Elm Ridge"
                      width={140}
                      height={40}
                      className="opacity-90"
                    />
                  </div>
                  <h3 className="text-lg font-display font-bold text-foreground mb-2">
                    Lights of Elm Ridge Sequence
                  </h3>
                  <p className="text-sm text-foreground/50">
                    Choose from your purchased or free sequences &mdash;
                    optimized for the best results
                  </p>
                  <div className="mt-4 text-accent text-sm font-semibold group-hover:translate-x-1 transition-transform">
                    Get Started &rarr;
                  </div>
                </button>

                {/* Other Vendor Card — Subtle (2 cols) */}
                <button
                  type="button"
                  onClick={() => {
                    setMapFromMode("other-vendor");
                    setInputSubStep("vendor-flow");
                  }}
                  className="md:col-span-2 bg-surface border border-border rounded-2xl p-8 text-left transition-all hover:border-foreground/20 hover:scale-[1.01] group"
                >
                  <div className="mb-4 mt-2">
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-foreground/30"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-display font-bold text-foreground mb-2">
                    Other Vendor
                  </h3>
                  <p className="text-sm text-foreground/50">
                    Upload a sequence package from another vendor to map to your
                    layout
                  </p>
                  <div className="mt-4 text-foreground/40 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                    Upload Files &rarr;
                  </div>
                </button>
              </div>

              {/* How It Works */}
              <div className="space-y-6">
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
                    description="Mod:IQ analyzes model types, pixel counts, spatial positions, names, and submodel structures to find the best mapping."
                  />
                  <HowItWorksCard
                    number="3"
                    title="Download & Import"
                    description="Get a .xmap file that imports directly into xLights' mapping dialog. Tweak only the few low-confidence matches."
                  />
                </div>
                <div className="text-center text-xs text-foreground/30 pt-6 border-t border-border">
                  Your files are processed locally in your browser and never
                  uploaded to any server.
                </div>
              </div>
            </div>
          )}

          {/* ── LOER Flow ────────────────────────────────── */}
          {inputSubStep === "loer-flow" && (
            <div className="max-w-[860px] mx-auto space-y-8">
              {/* Flow header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSequence && isAccessible) {
                      setSelectedSequence("");
                    } else {
                      setInputSubStep("source-select");
                      setSelectedSequence("");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground/70 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  {selectedSequence && isAccessible
                    ? "Change Sequence"
                    : "Back to Start"}
                </button>
                <span className="text-sm text-foreground/30">
                  Step {selectedSequence && isAccessible ? "2" : "1"} of 2
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{
                    width: selectedSequence && isAccessible ? "100%" : "0%",
                  }}
                />
              </div>

              {!selectedSequence || !isAccessible ? (
                /* Step 1: Choose Your Sequence */
                <div className="space-y-8">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Choose Your Sequence
                  </h2>

                  {/* Purchased Sequences */}
                  {isLoggedIn && purchasedSeqs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-foreground/40"
                        >
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                        <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider">
                          Your Purchased Sequences
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {purchasedSeqs.map((seq) => {
                          const mockupId = getMockupVideoId(seq.slug);
                          const thumb =
                            seq.thumbnailUrl ||
                            (mockupId
                              ? `https://img.youtube.com/vi/${mockupId}/maxresdefault.jpg`
                              : null) ||
                            (seq.youtubeId
                              ? `https://img.youtube.com/vi/${seq.youtubeId}/maxresdefault.jpg`
                              : null);
                          return (
                            <button
                              key={seq.slug}
                              type="button"
                              onClick={() => handleSequenceChange(seq.slug)}
                              className="group/card bg-surface rounded-xl border border-border overflow-hidden text-left hover:border-accent/30 transition-all hover:scale-[1.02]"
                            >
                              <div className="relative aspect-[4/3] bg-[#111] overflow-hidden">
                                {thumb ? (
                                  <Image
                                    src={thumb}
                                    alt={seq.title}
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                                    loading="lazy"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center text-3xl">
                                    {seq.category === "Halloween"
                                      ? "\uD83C\uDF83"
                                      : "\uD83C\uDF84"}
                                  </div>
                                )}
                              </div>
                              <div className="p-3">
                                <div className="text-sm font-semibold text-foreground truncate">
                                  {seq.title}
                                </div>
                                <div className="text-xs text-foreground/40 truncate">
                                  {seq.artist}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Free Sequences */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-foreground/40"
                      >
                        <polyline points="20 12 20 22 4 22 4 12" />
                        <rect x="2" y="7" width="20" height="5" />
                        <line x1="12" y1="22" x2="12" y2="7" />
                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                      </svg>
                      <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider">
                        Free Sequences
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {freeSeqs.map((seq) => {
                        const mockupId = getMockupVideoId(seq.slug);
                        const thumb =
                          seq.thumbnailUrl ||
                          (mockupId
                            ? `https://img.youtube.com/vi/${mockupId}/maxresdefault.jpg`
                            : null) ||
                          (seq.youtubeId
                            ? `https://img.youtube.com/vi/${seq.youtubeId}/maxresdefault.jpg`
                            : null);
                        return (
                          <button
                            key={seq.slug}
                            type="button"
                            onClick={() => handleSequenceChange(seq.slug)}
                            className="group/card bg-surface rounded-xl border border-border overflow-hidden text-left hover:border-green-500/30 transition-all hover:scale-[1.02]"
                          >
                            <div className="relative aspect-[4/3] bg-[#111] overflow-hidden">
                              {thumb ? (
                                <Image
                                  src={thumb}
                                  alt={seq.title}
                                  fill
                                  sizes="(max-width: 768px) 50vw, 25vw"
                                  className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                                  loading="lazy"
                                  unoptimized
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-3xl">
                                  {seq.category === "Halloween"
                                    ? "\uD83C\uDF83"
                                    : "\uD83C\uDF84"}
                                </div>
                              )}
                              <span className="absolute top-2 right-2 text-[10px] bg-green-500/90 text-white px-2 py-0.5 rounded-full font-semibold">
                                FREE
                              </span>
                            </div>
                            <div className="p-3">
                              <div className="text-sm font-semibold text-foreground truncate">
                                {seq.title}
                              </div>
                              <div className="text-xs text-foreground/40 truncate">
                                {seq.artist}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Login nudge */}
                  {!isLoggedIn && !purchasesLoading && (
                    <div className="text-center text-sm text-foreground/40">
                      <Link
                        href="/login?redirect=/modiq"
                        className="text-accent/70 hover:text-accent"
                      >
                        Log in
                      </Link>{" "}
                      to see your purchased sequences
                    </div>
                  )}

                  {/* Browse link */}
                  <div className="text-center">
                    <Link
                      href="/sequences"
                      className="text-sm text-foreground/30 hover:text-foreground/50 transition-colors"
                    >
                      Browse All Sequences &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                /* Step 2: Upload YOUR Layout */
                <div className="space-y-6">
                  {/* Selected sequence badge */}
                  <div className="bg-accent/[0.04] border border-accent/20 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="text-xl">
                      {selectedSeq?.category === "Halloween"
                        ? "\uD83C\uDF83"
                        : "\uD83C\uDF84"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {selectedSeq?.title}
                      </div>
                      <div className="text-xs text-foreground/40 truncate">
                        {selectedSeq?.artist}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSequence("")}
                      className="text-foreground/30 hover:text-foreground/60 text-xs"
                    >
                      Change
                    </button>
                  </div>

                  <h2 className="text-xl font-display font-bold text-foreground">
                    Upload <span className="text-accent">YOUR</span> Layout
                  </h2>

                  {/* Upload zone */}
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
                        &#10003; {userLayout.modelCount} models found
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null);
                          setUserLayout(null);
                        }}
                        className="text-foreground/30 hover:text-foreground/60 text-base px-1"
                      >
                        &times;
                      </button>
                    </div>
                  )}

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
                    {canRun ? (
                      <>
                        Mod<span className="text-white/90">:</span>IQ It &rarr;
                      </>
                    ) : (
                      <>
                        Mod<span className="text-white/40">:</span>IQ It
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Other Vendor Flow ─────────────────────────── */}
          {inputSubStep === "vendor-flow" && (
            <div className="max-w-[860px] mx-auto space-y-8">
              {/* Flow header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (vendorStep === 2) {
                      setVendorStep(1);
                    } else {
                      setInputSubStep("source-select");
                      setVendorStep(1);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground/70 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  {vendorStep === 2 ? "Back" : "Back to Start"}
                </button>
                <span className="text-sm text-foreground/30">
                  Step {vendorStep} of 2
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: vendorStep === 1 ? "50%" : "100%" }}
                />
              </div>

              {vendorStep === 1 ? (
                /* Step 1: Upload Vendor's Sequence Files */
                <div className="space-y-6">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Upload the Vendor&apos;s Sequence Files
                  </h2>

                  {/* Dual upload zones — side by side */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Vendor Layout (.xml) */}
                    <div>
                      <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">
                        Vendor&apos;s Layout
                      </p>
                      {!sourceFile || !sourceLayout ? (
                        <div
                          onClick={() => sourceFileInputRef.current?.click()}
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
                          className={`rounded-xl p-6 text-center cursor-pointer transition-all min-h-[140px] flex flex-col items-center justify-center ${
                            sourceIsDragging
                              ? "bg-accent/[0.04] border-2 border-dashed border-accent"
                              : "bg-white/[0.015] border-2 border-dashed border-[#333] hover:border-accent/30"
                          }`}
                        >
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
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-foreground/20 mb-2"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <p className="text-[12px] text-foreground/40">
                            <span className="text-foreground/60 font-semibold">
                              xlights_rgbeffects.xml
                            </span>
                          </p>
                          <p className="text-[10px] text-foreground/25 mt-0.5">
                            Drop here or click to browse
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl p-4 bg-green-500/5 border border-green-500/20 min-h-[140px] flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-green-400 flex-shrink-0"
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
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-foreground truncate">
                              {sourceFile.name}
                            </p>
                            <p className="text-[11px] text-foreground/40">
                              {sourceLayout.models.length} models in layout
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
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

                    {/* Vendor Sequence (.xsq) */}
                    <div>
                      <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">
                        Vendor&apos;s Sequence
                      </p>
                      {!vendorXsqFile ? (
                        <div
                          onClick={() => vendorXsqInputRef.current?.click()}
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
                          className={`rounded-xl p-6 text-center cursor-pointer transition-all min-h-[140px] flex flex-col items-center justify-center ${
                            vendorXsqIsDragging
                              ? "bg-accent/[0.04] border-2 border-dashed border-accent"
                              : "bg-white/[0.015] border-2 border-dashed border-[#333] hover:border-accent/30"
                          }`}
                        >
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
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-foreground/20 mb-2"
                          >
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect
                              x="1"
                              y="5"
                              width="15"
                              height="14"
                              rx="2"
                              ry="2"
                            />
                          </svg>
                          <p className="text-[12px] text-foreground/40">
                            <span className="text-foreground/60 font-semibold">
                              .xsq sequence file
                            </span>
                          </p>
                          <p className="text-[10px] text-foreground/25 mt-0.5">
                            Drop here or click to browse
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl p-4 bg-green-500/5 border border-green-500/20 min-h-[140px] flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-green-400 flex-shrink-0"
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
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-foreground truncate">
                              {vendorXsqFile.name}
                            </p>
                            <p className="text-[11px] text-green-400/70">
                              {vendorXsqModels?.length ?? 0} active layers
                              detected
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setVendorXsqFile(null);
                              setVendorXsqModels(null);
                            }}
                            className="text-foreground/30 hover:text-red-400 text-sm"
                          >
                            &times;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lightbulb hint */}
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-amber-400 flex-shrink-0 mt-0.5"
                    >
                      <path d="M9 18h6" />
                      <path d="M10 22h4" />
                      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                    </svg>
                    <p className="text-[13px] text-foreground/50">
                      Both files should be in the sequence package you
                      downloaded from the vendor.
                    </p>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Next button */}
                  <button
                    type="button"
                    onClick={() => setVendorStep(2)}
                    disabled={!vendorXsqFile || !sourceLayout}
                    className={`w-full py-3.5 rounded-xl font-display font-bold text-base transition-all ${
                      vendorXsqFile && sourceLayout
                        ? "bg-accent text-white hover:bg-accent/90"
                        : "bg-[#1a1a1a] text-foreground/20 cursor-not-allowed"
                    }`}
                  >
                    {vendorXsqFile && sourceLayout
                      ? "Next \u2192"
                      : "Upload both files to continue"}
                  </button>
                </div>
              ) : (
                /* Step 2: Upload YOUR Layout */
                <div className="space-y-6">
                  {/* Uploaded vendor files summary */}
                  <div className="bg-accent/[0.04] border border-accent/20 rounded-xl px-4 py-3 flex items-center gap-3">
                    <svg
                      className="w-4 h-4 text-accent flex-shrink-0"
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
                    <span className="text-[13px] text-foreground/60 flex-1">
                      Vendor files ready &mdash; {sourceLayout?.models.length}{" "}
                      models, {vendorXsqModels?.length ?? 0} active layers
                    </span>
                    <button
                      type="button"
                      onClick={() => setVendorStep(1)}
                      className="text-foreground/30 hover:text-foreground/60 text-xs"
                    >
                      Change
                    </button>
                  </div>

                  <h2 className="text-xl font-display font-bold text-foreground">
                    Upload <span className="text-accent">YOUR</span> Layout
                  </h2>

                  {/* Upload zone */}
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
                        &#10003; {userLayout.modelCount} models found
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null);
                          setUserLayout(null);
                        }}
                        className="text-foreground/30 hover:text-foreground/60 text-base px-1"
                      >
                        &times;
                      </button>
                    </div>
                  )}

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
                    {canRun ? (
                      <>
                        Mod<span className="text-white/90">:</span>IQ It &rarr;
                      </>
                    ) : (
                      <>
                        Mod<span className="text-white/40">:</span>IQ It
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Processing Step (Enhanced) ────────────────────── */}
      {step === "processing" && (
        <div className="max-w-3xl mx-auto">
          {/* ── Circular Progress + Title ── */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-40 h-40 mb-5">
              {/* Pulsing background ring */}
              <div className="absolute inset-0 rounded-full border-2 border-accent/20 proc-pulse-ring" />
              {/* Track */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-border"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  stroke="url(#proc-grad)"
                  style={{
                    strokeDasharray: 2 * Math.PI * 70,
                    strokeDashoffset:
                      2 * Math.PI * 70 * (1 - processingStats.progress / 100),
                    transition: "stroke-dashoffset 0.5s ease-out",
                  }}
                />
                <defs>
                  <linearGradient
                    id="proc-grad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-display text-foreground">
                  {processingStats.progress}%
                </span>
                <span className="text-xs text-foreground/40 mt-0.5">
                  processing
                </span>
              </div>
            </div>
            <h2 className="text-xl font-display font-bold text-foreground">
              Mod<span className="text-accent">:IQ</span> is working...
            </h2>
          </div>

          {/* ── Live Statistics Cards ── */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* Layout models */}
            <div
              className="proc-stat-enter bg-surface rounded-xl border border-border p-4 text-center"
              style={{ animationDelay: "0s" }}
            >
              <div className="flex justify-center mb-2">
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
              </div>
              <div className="text-2xl font-bold text-foreground font-display">
                {processingStats.layoutModels}
              </div>
              <div className="text-[11px] text-foreground/40 mt-0.5">
                Your Models
              </div>
            </div>
            {/* Matches found — highlighted */}
            <div
              className="proc-stat-enter bg-surface rounded-xl border border-accent/30 p-4 text-center relative overflow-hidden"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="absolute inset-0 bg-accent/5" />
              <div className="relative">
                <div className="flex justify-center mb-2">
                  <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 17H7A5 5 0 017 7h2" />
                    <path d="M15 7h2a5 5 0 010 10h-2" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <div
                  className={`text-2xl font-bold text-accent font-display ${processingStats.matchesFound > 0 ? "proc-counter-bump" : ""}`}
                >
                  <AnimatedCounter value={processingStats.matchesFound} estimate={processingStats.matchEstimate} />
                </div>
                <div className="text-[11px] text-foreground/40 mt-0.5">
                  Matches Found
                </div>
              </div>
            </div>
            {/* Sequence models */}
            <div
              className="proc-stat-enter bg-surface rounded-xl border border-border p-4 text-center"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex justify-center mb-2">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m1.5 0c-.621 0-1.125-.504-1.125-1.125v-1.5"
                  />
                </svg>
              </div>
              <div className="text-2xl font-bold text-foreground font-display">
                {processingStats.sequenceModels}
              </div>
              <div className="text-[11px] text-foreground/40 mt-0.5">
                Sequence Models
              </div>
            </div>
          </div>

          {/* ── Animated Step List ── */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="space-y-3">
              {processingSteps.map((ps, i) => (
                <div
                  key={i}
                  className="proc-step-enter flex items-center gap-3"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {ps.status === "done" && (
                    <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0 proc-check-enter">
                      <svg
                        className="w-3.5 h-3.5 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                  {ps.status === "active" && (
                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {ps.status === "pending" && (
                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                      <div
                        className="w-2 h-2 rounded-full bg-foreground/20 proc-dot-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    </div>
                  )}
                  <span
                    className={
                      ps.status === "active"
                        ? "text-foreground font-medium"
                        : ps.status === "done"
                          ? "text-foreground/70"
                          : "text-foreground/30"
                    }
                  >
                    {ps.label}
                  </span>
                </div>
              ))}
            </div>
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
            selectedSequence={
              mapFromMode === "elm-ridge"
                ? selectedSequence || ELM_RIDGE_LAYOUT_ID
                : ELM_RIDGE_LAYOUT_ID
            }
            mapFromMode={mapFromMode}
            displayType={displayType}
            sourceFileName={sourceFile?.name}
            effectTree={effectTree}
            xsqFilename={
              mapFromMode === "other-vendor" && vendorXsqFile
                ? vendorXsqFile.name
                : selectedSequence || "sequence"
            }
            sessionIdRef={sessionIdRef}
            sessions={sessions}
            onReset={handleReset}
            vendorEffectCounts={
              mapFromMode === "other-vendor" ? vendorEffectCounts : undefined
            }
            vendorXsqModels={
              mapFromMode === "other-vendor" ? vendorXsqModels : undefined
            }
            onExported={(fileName, meta) => {
              setExportFileName(fileName);
              setExportDisplayCoverage(meta?.displayCoverage);
              setExportSequenceCoverage(meta?.sequenceCoverage);
              setExportBoostLines(meta?.boostLines ?? []);
              setExportGroupsMapped(meta?.groupsMappedCount ?? 0);
              setExportGroupsCoveredChildren(
                meta?.groupsCoveredChildCount ?? 0,
              );
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
  sessionIdRef,
  sessions,
  onReset,
  onExported,
  vendorEffectCounts,
  vendorXsqModels,
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
  sessionIdRef: React.RefObject<string | null>;
  sessions: ReturnType<typeof useModiqSessions>;
  onReset: () => void;
  onExported: (
    fileName: string,
    meta?: {
      displayCoverage?: number;
      sequenceCoverage?: { mapped: number; total: number };
      boostLines?: { userGroupName: string; sourceGroupName: string }[];
      groupsMappedCount?: number;
      groupsCoveredChildCount?: number;
      directMappedCount?: number;
    },
  ) => void;
  vendorEffectCounts?: Record<string, number> | null;
  vendorXsqModels?: string[] | null;
}) {
  const interactive = useInteractiveMapping(
    initialResult,
    sourceModels,
    destModels,
    effectTree,
    selectedSequence,
    vendorEffectCounts,
  );

  // Auto-save mapping state to cloud on meaningful changes
  useEffect(() => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const state = interactive.getSerializedState();
    sessions.saveSession(
      sid,
      { ...state, autoAcceptRejected: [] },
      {
        mappedCount: interactive.mappedLayerCount,
        coveragePercent: interactive.effectsCoverage.percent,
        currentPhase: "mapping",
      },
    );
  }, [
    interactive.mappedLayerCount,
    interactive.skippedLayerCount,
    interactive.effectsCoverage.percent,
    interactive.getSerializedState,
    sessions,
    sessionIdRef,
  ]);

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
      const willResolve =
        layer?.isGroup && layer.coveredChildCount > 0 && !layer.isMapped;

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
  const [boostDisplayCoverage, setBoostDisplayCoverage] =
    useState<DisplayCoverage | null>(null);
  const [boostGroupSuggestions, setBoostGroupSuggestions] = useState<
    BoostSuggestion[]
  >([]);
  const [boostSpinnerSuggestions, setBoostSpinnerSuggestions] = useState<
    SpinnerBoostSuggestion[]
  >([]);
  const [focusedSourceLayer, setFocusedSourceLayer] = useState<string | null>(
    null,
  );

  // Global focus mode — expands work area to full viewport, hides chrome
  const [focusMode, setFocusMode] = useState(false);
  const toggleFocusMode = useCallback(() => setFocusMode((p) => !p), []);

  // Focus mode keyboard shortcuts (F to toggle, Escape to exit)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setFocusMode((p) => !p);
      }
      if (e.key === "Escape" && focusMode) {
        e.preventDefault();
        setFocusMode(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [focusMode]);

  // Left panel sections open state
  const [showMappedSection, setShowMappedSection] = useState(false);
  const [showSkippedSection, setShowSkippedSection] = useState(false);

  // Left panel filter
  const [leftSearch, setLeftSearch] = useState("");

  // Right panel search
  const [rightSearch, setRightSearch] = useState("");

  const seqTitle = useMemo(() => {
    if (mapFromMode === "elm-ridge") {
      const displayLabel =
        displayType === "halloween" ? "Halloween" : "Christmas";
      return `${ELM_RIDGE_LAYOUT_TITLE} (${displayLabel})`;
    }
    return sourceFileName || "Source Layout";
  }, [mapFromMode, sourceFileName, displayType]);

  // Coverage percentage — now uses display coverage (user-centric)
  const coveragePercent = interactive.displayCoverage.percent;

  // Export button style based on display coverage (no scary "remaining" counts)
  const exportButtonStyle = useMemo(() => {
    if (coveragePercent >= 90) {
      return {
        className: "bg-green-500 text-white hover:bg-green-600",
        label: "Export",
        icon: true,
      };
    } else if (coveragePercent >= 50) {
      return {
        className: "bg-amber-500 text-white hover:bg-amber-600",
        label: "Export",
        icon: false,
      };
    } else {
      return {
        className: "bg-zinc-600 text-zinc-300 hover:bg-zinc-500",
        label: "Export",
        icon: false,
      };
    }
  }, [coveragePercent]);

  // Group source layers by status and sort unmapped by best match score
  const { unmappedLayers, mappedLayers, skippedLayers } =
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    useMemo(() => {
      const unmapped: SourceLayerMapping[] = [];
      const mapped: SourceLayerMapping[] = [];
      const skippedList: SourceLayerMapping[] = [];
      for (const sl of interactive.sourceLayerMappings) {
        if (sl.isSkipped) {
          skippedList.push(sl);
        } else if (sl.isMapped) {
          mapped.push(sl);
        } else {
          unmapped.push(sl);
        }
      }

      // Sort unmapped layers by: match tier → effect count → groups first → alphabetical
      const unmappedWithScores = unmapped.map((sl) => {
        const suggestions = interactive.getSuggestionsForLayer(sl.sourceModel);
        const bestScore = suggestions.length > 0 ? suggestions[0].score : 0;
        return { sl, bestScore };
      });

      unmappedWithScores.sort((a, b) => {
        // Primary: best match score (descending) — tier-based comparison
        const scoreDiff = b.bestScore - a.bestScore;
        if (Math.abs(scoreDiff) > 0.01) return scoreDiff;

        // Secondary: effect count (descending) — high-effect items rise to top
        const effectDiff = b.sl.effectCount - a.sl.effectCount;
        if (effectDiff !== 0) return effectDiff;

        // Tertiary: groups before individual models
        if (a.sl.isGroup && !b.sl.isGroup) return -1;
        if (!a.sl.isGroup && b.sl.isGroup) return 1;

        // Quaternary: alphabetical
        return a.sl.sourceModel.name.localeCompare(b.sl.sourceModel.name);
      });

      return {
        unmappedLayers: unmappedWithScores.map((item) => item.sl),
        mappedLayers: mapped,
        skippedLayers: skippedList,
      };
    }, [interactive.sourceLayerMappings, interactive.getSuggestionsForLayer]);

  // Group mapped layers by confidence tier for TICKET-000
  type ConfidenceTier = "high" | "medium" | "low" | "manual";
  interface MappedLayerWithConfidence {
    layer: SourceLayerMapping;
    confidence: number; // 0-1 score, -1 for manual
    tier: ConfidenceTier;
  }

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
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
        const match = suggestions.find(
          (s) => s.model.name === firstAssigned.name,
        );
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

  // Right panel: user models partitioned by mapped status
  const {
    unmappedUserGroups,
    unmappedUserModels,
    mappedUserGroups,
    mappedUserModels,
  } = useMemo(() => {
    const uGroups: ParsedModel[] = [];
    const uModels: ParsedModel[] = [];
    const mGroups: ParsedModel[] = [];
    const mModels: ParsedModel[] = [];
    const q = rightSearch.toLowerCase();

    for (const m of destModels) {
      if (isDmxModel(m)) continue;
      if (
        q &&
        !m.name.toLowerCase().includes(q) &&
        !m.type.toLowerCase().includes(q)
      )
        continue;

      const isMapped =
        interactive.destToSourcesMap.has(m.name) &&
        (interactive.destToSourcesMap.get(m.name)?.size ?? 0) > 0;

      if (m.isGroup) {
        if (isMapped) mGroups.push(m);
        else uGroups.push(m);
      } else {
        if (isMapped) mModels.push(m);
        else uModels.push(m);
      }
    }
    return {
      unmappedUserGroups: uGroups,
      unmappedUserModels: uModels,
      mappedUserGroups: mGroups,
      mappedUserModels: mModels,
    };
  }, [destModels, rightSearch, interactive.destToSourcesMap]);

  // State for right panel collapsible sections
  const [showUnmappedUserSection, setShowUnmappedUserSection] = useState(true);
  const [showMappedUserSection, setShowMappedUserSection] = useState(false);

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
      if (focusedSourceLayer) {
        const sl = interactive.sourceLayerMappings.find(
          (s) => s.sourceModel.name === focusedSourceLayer,
        );
        if (sl) {
          const suggestions = interactive.getSuggestionsForLayer(
            sl.sourceModel,
          );
          if (suggestions.length > 0) {
            assignWithCascadeFeedback(
              focusedSourceLayer,
              suggestions[0].model.name,
            );
            setFocusedSourceLayer(null);
          }
        }
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
  const doExport = useCallback(
    (boostLines?: { userGroupName: string; sourceGroupName: string }[]) => {
      const result = interactive.toMappingResult();
      // Only export mappings for source layers that have effects (reduces red rows in xLights)
      const activeSourceNames = effectTree
        ? getActiveSourceNamesForExport(effectTree)
        : undefined;

      // Build a set of model/submodel names that exist in the sequence.
      // Used to filter submodel-level xmap rows: only include submodel rows
      // when the submodel has its own effects in the .xsq. Submodels that
      // inherit effects from their parent don't have <Element> entries in the
      // xsq, so referencing them in the xmap causes red rows in xLights.
      let sequenceModelNames: Set<string> | undefined;
      if (vendorXsqModels) {
        // Vendor flow: model names parsed from uploaded .xsq
        sequenceModelNames = new Set(vendorXsqModels);
      } else if (mapFromMode === "elm-ridge") {
        // LOER flow: use pre-extracted model list
        const loerModels = getSequenceModelList(selectedSequence);
        if (loerModels) {
          sequenceModelNames = new Set(loerModels);
        }
      }

      const xmapContent = generateXmap(
        result,
        seqTitle,
        activeSourceNames,
        sequenceModelNames,
      );
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
      // Use the interactive hook's user-centric display coverage
      onExported(fileName, {
        displayCoverage: interactive.displayCoverage.percent,
        sequenceCoverage: {
          mapped: interactive.mappedLayerCount,
          total: interactive.totalSourceLayers,
        },
        boostLines: boostLines ?? [],
        groupsMappedCount: interactive.groupsMappedCount,
        groupsCoveredChildCount: interactive.groupsCoveredChildCount,
        directMappedCount: interactive.directMappedCount,
      });
    },
    [
      interactive,
      seqTitle,
      xsqFilename,
      selectedSequence,
      mapFromMode,
      vendorXsqModels,
      telemetry,
      onExported,
      destModels,
      effectTree,
    ],
  );

  const handleExport = useCallback(() => {
    if (interactive.unmappedLayerCount > 0) {
      setShowExportDialog(true);
      return;
    }
    // Check for boost opportunities (display coverage gaps)
    const coverage = computeDisplayCoverage(
      destModels,
      interactive.destToSourcesMap,
      isDmxModel,
    );
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
    (
      acceptedGroups: BoostSuggestion[],
      acceptedSpinners: SpinnerBoostSuggestion[],
    ) => {
      const boostLines: { userGroupName: string; sourceGroupName: string }[] =
        [];

      // Apply group boost: create many-to-one links
      for (const s of acceptedGroups) {
        interactive.assignUserModelToLayer(
          s.sourceGroup.name,
          s.userGroup.name,
        );
        boostLines.push({
          userGroupName: s.userGroup.name,
          sourceGroupName: s.sourceGroup.name,
        });
      }

      // Apply spinner boost: create many-to-one links
      for (const s of acceptedSpinners) {
        interactive.assignUserModelToLayer(
          s.sourceModel.name,
          s.userModel.name,
        );
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
    <MappingPhaseProvider interactive={interactive} focusMode={focusMode} toggleFocusMode={toggleFocusMode}>
      <div className={focusMode ? "fixed inset-0 z-50 bg-background flex flex-col" : "space-y-0"}>
        {/* ── Focus Mode: Global Coverage Bar ── */}
        {focusMode && (
          <GlobalFocusBar
            interactive={interactive}
            onExitFocus={() => setFocusMode(false)}
          />
        )}

        {/* ── V4 Phased Wizard Header (hidden in focus mode) ─────────────────────── */}
        {!focusMode && (
          <div className="sticky top-0 z-40 bg-background/95 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-4">
            <div className="max-w-7xl mx-auto">
              {/* Title Bar */}
              <div className="flex items-center justify-between py-2.5 border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <h2 className="text-[15px] font-display font-bold flex-shrink-0">
                    Mod<span className="text-accent">:</span>
                    <span className="text-accent">IQ</span>
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
                    )}
                    {exportButtonStyle.label}
                  </button>
                </div>
              </div>

              {/* Phase Stepper + Progress Tracker */}
              <ProgressTrackerProvider />
            </div>
          </div>
        )}

        {/* ── V4 Phase Content ─────────────────────────────── */}
        <div className={
          focusMode
            ? "bg-surface overflow-hidden flex flex-col flex-1 min-h-0"
            : "bg-surface rounded-xl border border-border overflow-hidden flex flex-col h-[calc(100vh-11rem)]"
        }>
          <PhaseNavigation />
          <div className="flex-1 min-h-0 overflow-hidden">
            <PhaseContainer
              reviewProps={{
                onExport: handleExport,
                onExportReport: handleExportReport,
                onReset: onReset,
                seqTitle,
                coveragePercent,
              }}
            />
          </div>
        </div>

        {/* V3 legacy layout preserved below for backwards compat — hidden in V4 */}
        <div className="hidden">
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
                {/* ─── NEEDS MAPPING (sorted by match confidence) ─────────────────────────── */}
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
                        Sorted by match confidence — work top to bottom for best
                        results.
                      </div>

                      {/* Single sorted list by match score */}
                      <div className="space-y-0 divide-y divide-border/30">
                        {filterLayers(unmappedLayers).map((sl) => (
                          <SourceLayerRow
                            key={sl.sourceModel.name}
                            layer={sl}
                            isFocused={
                              focusedSourceLayer === sl.sourceModel.name
                            }
                            onFocus={() =>
                              setFocusedSourceLayer(sl.sourceModel.name)
                            }
                            onDrop={handleLayerDrop}
                            onAcceptSuggestion={handleAcceptSuggestion}
                            onSkip={() =>
                              interactive.skipSourceLayer(sl.sourceModel.name)
                            }
                            onClear={() =>
                              interactive.clearLayerMapping(sl.sourceModel.name)
                            }
                            onRemoveLink={interactive.removeLinkFromLayer}
                            getSuggestions={() =>
                              interactive.getSuggestionsForLayer(sl.sourceModel)
                            }
                            isDragActive={dnd.state.isDragging}
                            draggedModelName={
                              dnd.state.dragItem?.sourceModelName
                            }
                            onDragEnter={dnd.handleDragEnter}
                            onDragLeave={dnd.handleDragLeave}
                            effectContext={interactive.getEffectContext(sl.sourceModel.name)}
                          />
                        ))}
                      </div>
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
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
                              <span className="text-[11px] text-foreground/50">
                                ≥70%
                              </span>
                              <span className="text-[12px] font-bold text-foreground/70">
                                {mappedByConfidence.high.length}
                              </span>
                              <svg
                                className={`w-2.5 h-2.5 text-foreground/30 transition-transform ml-auto ${showHighTier ? "rotate-180" : ""}`}
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
                            {showHighTier && (
                              <div className="divide-y divide-border/20">
                                {mappedByConfidence.high.map(
                                  ({ layer, confidence }) => (
                                    <MappedItemRow
                                      key={layer.sourceModel.name}
                                      layer={layer}
                                      confidence={confidence}
                                      onClear={() =>
                                        interactive.clearLayerMapping(
                                          layer.sourceModel.name,
                                        )
                                      }
                                      onRemoveLink={
                                        interactive.removeLinkFromLayer
                                      }
                                    />
                                  ),
                                )}
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
                              <span className="text-[11px] text-foreground/50">
                                40-69%
                              </span>
                              <span className="text-[12px] font-bold text-foreground/70">
                                {mappedByConfidence.medium.length}
                              </span>
                              <svg
                                className={`w-2.5 h-2.5 text-foreground/30 transition-transform ml-auto ${showMediumTier ? "rotate-180" : ""}`}
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
                            {showMediumTier && (
                              <div className="divide-y divide-border/20">
                                {mappedByConfidence.medium.map(
                                  ({ layer, confidence }) => (
                                    <MappedItemRow
                                      key={layer.sourceModel.name}
                                      layer={layer}
                                      confidence={confidence}
                                      onClear={() =>
                                        interactive.clearLayerMapping(
                                          layer.sourceModel.name,
                                        )
                                      }
                                      onRemoveLink={
                                        interactive.removeLinkFromLayer
                                      }
                                    />
                                  ),
                                )}
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
                              <span className="text-[11px] text-foreground/50">
                                &lt;40%
                              </span>
                              <span className="text-[12px] font-bold text-foreground/70">
                                {mappedByConfidence.low.length}
                              </span>
                              <svg
                                className={`w-2.5 h-2.5 text-foreground/30 transition-transform ml-auto ${showLowTier ? "rotate-180" : ""}`}
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
                            {showLowTier && (
                              <div className="divide-y divide-border/20">
                                {mappedByConfidence.low.map(
                                  ({ layer, confidence }) => (
                                    <MappedItemRow
                                      key={layer.sourceModel.name}
                                      layer={layer}
                                      confidence={confidence}
                                      onClear={() =>
                                        interactive.clearLayerMapping(
                                          layer.sourceModel.name,
                                        )
                                      }
                                      onRemoveLink={
                                        interactive.removeLinkFromLayer
                                      }
                                    />
                                  ),
                                )}
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
                              <span className="text-[11px] text-foreground/50">
                                user mapped
                              </span>
                              <span className="text-[12px] font-bold text-foreground/70">
                                {mappedByConfidence.manual.length}
                              </span>
                              <svg
                                className={`w-2.5 h-2.5 text-foreground/30 transition-transform ml-auto ${showManualTier ? "rotate-180" : ""}`}
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
                            {showManualTier && (
                              <div className="divide-y divide-border/20">
                                {mappedByConfidence.manual.map(({ layer }) => (
                                  <MappedItemRow
                                    key={layer.sourceModel.name}
                                    layer={layer}
                                    confidence={-1}
                                    onClear={() =>
                                      interactive.clearLayerMapping(
                                        layer.sourceModel.name,
                                      )
                                    }
                                    onRemoveLink={
                                      interactive.removeLinkFromLayer
                                    }
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
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
                              onClick={() =>
                                interactive.unskipSourceLayer(
                                  sl.sourceModel.name,
                                )
                              }
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
                      All {interactive.mappedLayerCount} sequence layers have a
                      destination in your layout.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ Right Panel: Your Models (The Answer Pool) ═══ */}
            <div className="lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-8.5rem)] overflow-hidden">
              <div className="bg-surface rounded-xl border border-border overflow-hidden flex flex-col h-full max-h-[calc(100vh-8.5rem)]">
                {/* Header */}
                <div className="px-3 py-2.5 border-b border-border flex-shrink-0">
                  <h3 className="font-display font-bold text-[15px]">
                    Your Models
                  </h3>
                  <p className="text-[11px] text-foreground/40 mt-0.5">
                    {unmappedUserGroups.length +
                      unmappedUserModels.length +
                      mappedUserGroups.length +
                      mappedUserModels.length}{" "}
                    models &middot; Drag or click to link
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

                {/* Cards area - stable list of available targets */}
                <div className="flex-1 overflow-y-auto">
                  {/* ═══ UNMAPPED Section (expanded by default) ═══ */}
                  {(unmappedUserGroups.length > 0 ||
                    unmappedUserModels.length > 0) && (
                    <div className="border-b border-border/50">
                      <button
                        type="button"
                        onClick={() =>
                          setShowUnmappedUserSection(!showUnmappedUserSection)
                        }
                        className="w-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-green-400/80 bg-green-500/10 sticky top-0 z-10 flex items-center justify-between hover:bg-green-500/15 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          Unmapped (
                          {unmappedUserGroups.length +
                            unmappedUserModels.length}
                          )
                        </span>
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${showUnmappedUserSection ? "rotate-180" : ""}`}
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
                      {showUnmappedUserSection && (
                        <div>
                          {/* Unmapped Groups */}
                          {unmappedUserGroups.length > 0 && (
                            <div>
                              <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-foreground/30 bg-surface-light/50">
                                Groups ({unmappedUserGroups.length})
                              </div>
                              <div className="px-2 py-1">
                                {unmappedUserGroups.map((m) => (
                                  <DraggableUserCard
                                    key={m.name}
                                    model={m}
                                    onDragStart={dnd.handleDragStart}
                                    onDragEnd={dnd.handleDragEnd}
                                    getDragDataTransfer={
                                      dnd.getDragDataTransfer
                                    }
                                    onClickAssign={
                                      focusedSourceLayer
                                        ? () =>
                                            assignWithCascadeFeedback(
                                              focusedSourceLayer,
                                              m.name,
                                            )
                                        : undefined
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Unmapped Models */}
                          {unmappedUserModels.length > 0 && (
                            <div>
                              <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-foreground/30 bg-surface-light/50">
                                Models ({unmappedUserModels.length})
                              </div>
                              <div className="px-2 py-1">
                                {unmappedUserModels.map((m) => (
                                  <DraggableUserCard
                                    key={m.name}
                                    model={m}
                                    onDragStart={dnd.handleDragStart}
                                    onDragEnd={dnd.handleDragEnd}
                                    getDragDataTransfer={
                                      dnd.getDragDataTransfer
                                    }
                                    onClickAssign={
                                      focusedSourceLayer
                                        ? () =>
                                            assignWithCascadeFeedback(
                                              focusedSourceLayer,
                                              m.name,
                                            )
                                        : undefined
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ═══ ALREADY MAPPED Section (collapsed by default) ═══ */}
                  {(mappedUserGroups.length > 0 ||
                    mappedUserModels.length > 0) && (
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setShowMappedUserSection(!showMappedUserSection)
                        }
                        className="w-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground/40 bg-surface-light sticky top-0 z-10 flex items-center justify-between hover:bg-surface-light/80 transition-colors"
                      >
                        <span>
                          Already Mapped (
                          {mappedUserGroups.length + mappedUserModels.length})
                        </span>
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${showMappedUserSection ? "rotate-180" : ""}`}
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
                      {showMappedUserSection && (
                        <div className="opacity-60">
                          {/* Mapped Groups */}
                          {mappedUserGroups.length > 0 && (
                            <div>
                              <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-foreground/30 bg-surface-light/50">
                                Groups ({mappedUserGroups.length})
                              </div>
                              <div className="px-2 py-1">
                                {mappedUserGroups.map((m) => (
                                  <DraggableUserCard
                                    key={m.name}
                                    model={m}
                                    onDragStart={dnd.handleDragStart}
                                    onDragEnd={dnd.handleDragEnd}
                                    getDragDataTransfer={
                                      dnd.getDragDataTransfer
                                    }
                                    assignedSources={interactive.destToSourcesMap.get(
                                      m.name,
                                    )}
                                    onRemoveLink={
                                      interactive.removeLinkFromLayer
                                    }
                                    onClickAssign={
                                      focusedSourceLayer
                                        ? () =>
                                            assignWithCascadeFeedback(
                                              focusedSourceLayer,
                                              m.name,
                                            )
                                        : undefined
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Mapped Models */}
                          {mappedUserModels.length > 0 && (
                            <div>
                              <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-foreground/30 bg-surface-light/50">
                                Models ({mappedUserModels.length})
                              </div>
                              <div className="px-2 py-1">
                                {mappedUserModels.map((m) => (
                                  <DraggableUserCard
                                    key={m.name}
                                    model={m}
                                    onDragStart={dnd.handleDragStart}
                                    onDragEnd={dnd.handleDragEnd}
                                    getDragDataTransfer={
                                      dnd.getDragDataTransfer
                                    }
                                    assignedSources={interactive.destToSourcesMap.get(
                                      m.name,
                                    )}
                                    onRemoveLink={
                                      interactive.removeLinkFromLayer
                                    }
                                    onClickAssign={
                                      focusedSourceLayer
                                        ? () =>
                                            assignWithCascadeFeedback(
                                              focusedSourceLayer,
                                              m.name,
                                            )
                                        : undefined
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary */}
                  {interactive.assignedUserModelNames.size > 0 && (
                    <div className="px-3 py-1.5 text-[10px] text-foreground/25 text-center border-t border-border/50">
                      {interactive.assignedUserModelNames.size} of{" "}
                      {unmappedUserGroups.length +
                        unmappedUserModels.length +
                        mappedUserGroups.length +
                        mappedUserModels.length}{" "}
                      models linked
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
                coveragePercent >= 90
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : coveragePercent >= 50
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "bg-zinc-600 hover:bg-zinc-500 text-zinc-300"
              }`}
            >
              {coveragePercent >= 90 && (
                <svg
                  className="w-5 h-5"
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
              Download .xmap File
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
        </div>
        {/* end hidden V3 legacy layout */}

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
    </MappingPhaseProvider>
  );
}

// ─── Global Focus Bar ─────────────────────────────────────────────

function GlobalFocusBar({
  interactive,
  onExitFocus,
}: {
  interactive: InteractiveMappingState;
  onExitFocus: () => void;
}) {
  const { currentPhase, phaseProgress, overallProgress } = useMappingPhase();
  const dispPct = interactive.displayCoverage.percent;
  const seqPct = interactive.effectsCoverage.percent;
  const phaseLabel =
    currentPhase === "individuals" ? "Models" :
    currentPhase === "spinners" ? "Spinners" :
    currentPhase === "finalize" ? "Display Coverage" : "Review";

  return (
    <div className="px-4 py-1.5 border-b border-border bg-surface flex-shrink-0 flex items-center gap-4">
      {/* Phase indicator */}
      <span className="text-[11px] font-semibold text-accent/70 uppercase tracking-wider flex-shrink-0">{phaseLabel}</span>
      <span className="text-foreground/10">|</span>
      {/* Phase progress */}
      <span className="text-[11px] text-foreground/50 tabular-nums flex-shrink-0">
        Phase: {phaseProgress.completed}/{phaseProgress.total}
      </span>
      <div className="w-20 h-1.5 bg-foreground/10 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full bg-accent/60 rounded-full transition-all duration-300" style={{ width: `${phaseProgress.percentage}%` }} />
      </div>
      <span className="text-foreground/10">|</span>
      {/* Display coverage */}
      <span className="text-[11px] text-foreground/50 tabular-nums flex-shrink-0">
        Display: {dispPct}% ({interactive.displayCoverage.covered}/{interactive.displayCoverage.total})
      </span>
      <div className="w-24 h-1.5 bg-foreground/10 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full bg-green-400 rounded-full transition-all duration-300" style={{ width: `${dispPct}%` }} />
      </div>
      <span className="text-foreground/10">|</span>
      {/* Effects coverage */}
      <span className="text-[11px] text-foreground/50 tabular-nums flex-shrink-0">
        Effects: {seqPct}% ({interactive.effectsCoverage.covered}/{interactive.effectsCoverage.total})
      </span>
      <div className="w-24 h-1.5 bg-foreground/10 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${seqPct}%` }} />
      </div>
      {/* Overall */}
      <span className="text-foreground/10">|</span>
      <span className="text-[11px] text-foreground/40 tabular-nums flex-shrink-0">
        Overall: {overallProgress.completed}/{overallProgress.total}
      </span>
      {/* Exit button */}
      <button
        type="button"
        onClick={onExitFocus}
        className="ml-auto text-[11px] font-medium px-2.5 py-1 rounded bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground/70 transition-colors flex-shrink-0"
      >
        Exit Focus
      </button>
      <span className="text-[9px] text-foreground/20 flex-shrink-0">Esc</span>
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
  const confidencePercent =
    confidence >= 0 ? Math.round(confidence * 100) : null;
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
        <svg
          className="w-4 h-4 text-green-400 flex-shrink-0"
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {layer.isGroup && (
              <span className="text-[9px] font-bold text-teal-400/70 bg-teal-500/10 px-1 py-0.5 rounded">
                GRP
              </span>
            )}
            <span className="text-[13px] text-foreground truncate">
              {layer.sourceModel.name}
            </span>
            {confidencePercent !== null && (
              <span className={`text-[10px] ${confidenceColor} opacity-70`}>
                {confidencePercent}%
              </span>
            )}
            {isExpandable && (
              <svg
                className={`w-3 h-3 text-foreground/30 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
            )}
          </div>
          <div className="text-[11px] text-foreground/40 truncate">
            &rarr; Your &quot;{layer.assignedUserModels[0]?.name}&quot;
            {hasMultipleDests && (
              <span className="text-teal-400/60 ml-1">
                +{layer.assignedUserModels.length - 1}
              </span>
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
              <div className="text-foreground/40 mb-1">
                Mapped to {layer.assignedUserModels.length} models:
              </div>
              {layer.assignedUserModels.map((m, i) => (
                <div
                  key={m.name}
                  className="flex items-center gap-2 py-0.5 pl-2 border-l-2 border-foreground/10"
                >
                  <span className="text-foreground/30 w-4 tabular-nums">
                    {i + 1}.
                  </span>
                  <span className="text-foreground/60 truncate flex-1">
                    {m.name}
                  </span>
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
              <div className="text-foreground/40 mb-1">
                Children auto-resolved:
              </div>
              {layer.membersWithoutEffects.map((child) => (
                <div
                  key={child}
                  className="flex items-center gap-2 py-0.5 text-green-400/70"
                >
                  <svg
                    className="w-3 h-3 flex-shrink-0"
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
                  <span className="truncate">{child}</span>
                </div>
              ))}
            </div>
          )}

          {/* Children with individual effects (if any) */}
          {layer.membersWithEffects.length > 0 && (
            <div>
              <div className="text-amber-400/60 mb-1">
                Children needing separate mapping:
              </div>
              {layer.membersWithEffects.map((child) => (
                <div
                  key={child}
                  className="flex items-center gap-2 py-0.5 text-amber-400/60"
                >
                  <svg
                    className="w-3 h-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
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
    <div className="bg-surface rounded-xl border border-border p-6 text-center flex flex-col">
      <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center text-lg font-bold mx-auto mb-3">
        {number}
      </div>
      <h3 className="font-display font-bold mb-2 h-[3.5rem] flex items-end justify-center leading-tight">
        {title}
      </h3>
      <p className="text-sm text-foreground/60 flex-1">{description}</p>
    </div>
  );
}

// ─── Animated Counter ────────────────────────────────────
// Continuous climb toward estimate using requestAnimationFrame with ease-out.
// When real value arrives, sets it directly (no second animation).

function AnimatedCounter({
  value,
  estimate = 0,
  className,
}: {
  value: number;
  estimate?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);
  const displayedRef = useRef(0);

  // Continuous climb while processing (estimate > 0, value still 0)
  // Slowly climbs toward ~85% of estimate over ~8s with ease-out
  useEffect(() => {
    if (estimate <= 0 || value > 0) return;

    const target = Math.round(estimate * 0.85);
    const duration = 8000; // 8s continuous climb
    const startTime = performance.now();
    const from = displayedRef.current;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // ease-out: fast start, slows toward end — never fully stops
      const eased = 1 - (1 - t) ** 2.5;
      const current = Math.round(from + (target - from) * eased);
      displayedRef.current = current;
      setDisplayed(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [estimate, value]);

  // When final value arrives, animate from current position to final
  useEffect(() => {
    if (value > 0) {
      cancelAnimationFrame(rafRef.current);
      const from = displayedRef.current;
      const to = value;
      if (from === to) return;

      // Animate over 600ms with ease-out
      const duration = 600;
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - (1 - t) ** 3;
        const current = Math.round(from + (to - from) * eased);
        displayedRef.current = current;
        setDisplayed(current);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    } else if (estimate <= 0) {
      displayedRef.current = 0;
      setDisplayed(0);
    }
  }, [value, estimate]);

  return <span className={className}>{displayed}</span>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
