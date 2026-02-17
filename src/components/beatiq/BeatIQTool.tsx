"use client";

import { useState, useCallback } from "react";
import type {
  BeatiqScreen,
  BeatiqSession,
  BeatiqStats,
  BeatTrack,
  PipelineProgress,
  SongMetadata,
} from "@/lib/beatiq/types";
import { analyzeAudio } from "@/lib/beatiq/beat-processor";
import { DEFAULT_CONFIG } from "@/lib/beatiq/audio-analyzer";
import UploadScreen from "./UploadScreen";
import ProcessingScreen from "./ProcessingScreen";
import EditorScreen from "./EditorScreen";

const INITIAL_PIPELINE: PipelineProgress[] = [
  { step: "decode", status: "pending" },
  { step: "spectrum", status: "pending" },
  { step: "tempo", status: "pending" },
  { step: "onsets", status: "pending" },
  { step: "tracks", status: "pending" },
];

function createInitialSession(): BeatiqSession {
  return {
    screen: "upload",
    audioFile: null,
    audioUrl: null,
    metadata: null,
    pipeline: INITIAL_PIPELINE,
    tracks: [],
    stats: null,
  };
}

/**
 * BeatIQTool — Main orchestrator for the Beat:IQ instrument timing generator.
 *
 * Manages screen transitions: Upload → Processing → Editor
 */
export default function BeatIQTool() {
  const [session, setSession] = useState<BeatiqSession>(createInitialSession);

  const setScreen = useCallback((screen: BeatiqScreen) => {
    setSession((prev) => ({ ...prev, screen }));
  }, []);

  const setMetadata = useCallback((metadata: SongMetadata) => {
    setSession((prev) => ({ ...prev, metadata }));
  }, []);

  const setAudio = useCallback((file: File, url: string) => {
    setSession((prev) => ({ ...prev, audioFile: file, audioUrl: url }));
  }, []);

  const updatePipeline = useCallback((updates: PipelineProgress[]) => {
    setSession((prev) => ({ ...prev, pipeline: updates }));
  }, []);

  const setResults = useCallback(
    (tracks: BeatTrack[], stats: BeatiqStats, metadata: SongMetadata) => {
      setSession((prev) => ({ ...prev, tracks, stats, metadata }));
    },
    [],
  );

  /**
   * Start the Beat:IQ analysis pipeline.
   * Runs entirely client-side using Web Audio API + custom DSP.
   */
  const startProcessing = useCallback(
    async (file: File) => {
      setScreen("processing");

      try {
        const result = await analyzeAudio(
          file,
          session.metadata || {
            title: file.name,
            artist: "Unknown Artist",
            durationMs: 0,
          },
          updatePipeline,
          DEFAULT_CONFIG,
        );

        setResults(result.tracks, result.stats, result.metadata);
        setScreen("editor");
      } catch (err) {
        // On error, update the pipeline to show the failure
        const errorStep = session.pipeline.find((p) => p.status === "active");
        if (errorStep) {
          const updated = session.pipeline.map((p) =>
            p.step === errorStep.step ? { ...p, status: "error" as const } : p,
          );
          updatePipeline(updated);
        }
        throw err;
      }
    },
    [session.metadata, session.pipeline, setScreen, updatePipeline, setResults],
  );

  const handleReset = useCallback(() => {
    if (session.audioUrl) {
      URL.revokeObjectURL(session.audioUrl);
    }
    setSession(createInitialSession());
  }, [session.audioUrl]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="text-foreground">Beat</span>
          <span className="text-accent">:</span>
          <span className="text-foreground">IQ</span>
        </h1>
        <p className="text-foreground/50 mt-2 text-sm sm:text-base">
          Instrument timing track generator for xLights
        </p>
      </div>

      {/* Screen Router */}
      {session.screen === "upload" && (
        <UploadScreen
          metadata={session.metadata}
          onAudioLoad={setAudio}
          onMetadataLoad={setMetadata}
          onGenerate={startProcessing}
        />
      )}

      {session.screen === "processing" && (
        <ProcessingScreen
          pipeline={session.pipeline}
          metadata={session.metadata}
        />
      )}

      {session.screen === "editor" && (
        <EditorScreen session={session} onReset={handleReset} />
      )}
    </div>
  );
}
