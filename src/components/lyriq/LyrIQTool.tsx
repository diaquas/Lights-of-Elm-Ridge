"use client";

import { useState, useCallback } from "react";
import type {
  LyriqScreen,
  LyriqSession,
  LyriqStats,
  PipelineProgress,
  SongMetadata,
  VocalTrack,
} from "@/lib/lyriq/types";
import { processAlignedWords, computeStats } from "@/lib/lyriq";
import type { AlignedWord } from "@/lib/lyriq";
import UploadScreen from "./UploadScreen";
import ProcessingScreen from "./ProcessingScreen";
import EditorScreen from "./EditorScreen";

const INITIAL_PIPELINE: PipelineProgress[] = [
  { step: "separating", status: "pending" },
  { step: "fetching-lyrics", status: "pending" },
  { step: "aligning-lead", status: "pending" },
  { step: "aligning-background", status: "pending" },
  { step: "generating-phonemes", status: "pending" },
  { step: "optimizing", status: "pending" },
];

function createInitialSession(): LyriqSession {
  return {
    screen: "upload",
    audioFile: null,
    audioUrl: null,
    metadata: null,
    lyrics: null,
    pipeline: INITIAL_PIPELINE,
    tracks: [],
    stats: null,
  };
}

/**
 * LyrIQTool — Main orchestrator for the Lyr:IQ singing face timing generator.
 *
 * Manages screen transitions: Upload → Processing → Editor
 */
export default function LyrIQTool() {
  const [session, setSession] = useState<LyriqSession>(createInitialSession);

  const setScreen = useCallback((screen: LyriqScreen) => {
    setSession((prev) => ({ ...prev, screen }));
  }, []);

  const setMetadata = useCallback((metadata: SongMetadata) => {
    setSession((prev) => ({ ...prev, metadata }));
  }, []);

  const setAudio = useCallback((file: File, url: string) => {
    setSession((prev) => ({ ...prev, audioFile: file, audioUrl: url }));
  }, []);

  const setLyrics = useCallback(
    (text: string, source: "auto" | "moises" | "user") => {
      setSession((prev) => ({
        ...prev,
        lyrics: { text, source, confirmed: source === "user" },
      }));
    },
    [],
  );

  const updatePipeline = useCallback((updates: PipelineProgress[]) => {
    setSession((prev) => ({ ...prev, pipeline: updates }));
  }, []);

  const setTracks = useCallback((tracks: VocalTrack[], stats: LyriqStats) => {
    setSession((prev) => ({ ...prev, tracks, stats }));
  }, []);

  /**
   * Demo processing: simulates the pipeline with mock data.
   * In production this will call Moises API + forced alignment.
   */
  const startProcessing = useCallback(
    async (_file: File, lyricsText: string) => {
      setScreen("processing");

      const steps = [...INITIAL_PIPELINE];
      const advance = (index: number, status: "active" | "done" | "error") => {
        steps[index] = { ...steps[index], status };
        updatePipeline([...steps]);
      };

      // Simulate pipeline steps
      for (let i = 0; i < steps.length; i++) {
        advance(i, "active");
        // Simulated delay — will be replaced with real API calls
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
        advance(i, "done");
      }

      // Generate demo vocal track from the provided lyrics
      const demoWords = generateDemoAlignment(lyricsText);
      const leadTrack = processAlignedWords(demoWords, "lead");
      const stats = computeStats([leadTrack]);

      setTracks([leadTrack], stats);
      setScreen("editor");
    },
    [setScreen, updatePipeline, setTracks],
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
          <span className="text-foreground">Lyr</span>
          <span className="text-accent">:</span>
          <span className="text-foreground">IQ</span>
        </h1>
        <p className="text-foreground/50 mt-2 text-sm sm:text-base">
          Singing face timing generator for xLights
        </p>
      </div>

      {/* Screen Router */}
      {session.screen === "upload" && (
        <UploadScreen
          metadata={session.metadata}
          lyrics={session.lyrics}
          onAudioLoad={setAudio}
          onMetadataLoad={setMetadata}
          onLyricsChange={setLyrics}
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

/* ── Demo Data Generator ────────────────────────────────────────── */

/**
 * Generate mock word-level alignment from lyrics text.
 * Used for demo/preview before real alignment API is connected.
 * Spreads words evenly across a simulated song duration.
 */
function generateDemoAlignment(lyricsText: string): AlignedWord[] {
  const lines = lyricsText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const allWords: string[] = [];
  for (const line of lines) {
    const words = line.split(/\s+/).filter((w) => w.length > 0);
    allWords.push(...words);
  }

  if (allWords.length === 0) return [];

  // Simulate ~3 minutes of song, with words spread across it
  const songDurationMs = 180_000;
  const wordDurationMs = 350; // average sung word
  const totalActiveMs = allWords.length * wordDurationMs;
  const scale = Math.min(1, songDurationMs / (totalActiveMs * 1.5));
  const adjustedWordMs = wordDurationMs * scale;

  // Add gaps between lines
  let cursor = 2000; // start 2s in
  const result: AlignedWord[] = [];
  for (const line of lines) {
    const words = line.split(/\s+/).filter((w) => w.length > 0);
    for (const word of words) {
      const clean = word.replace(/[^\w']/g, "");
      if (!clean) continue;

      const startMs = Math.round(cursor);
      const endMs = Math.round(cursor + adjustedWordMs);
      result.push({
        text: clean,
        startMs,
        endMs,
        confidence: 0.7 + Math.random() * 0.3,
      });
      cursor = endMs + 30; // small gap between words
    }
    // Larger gap between lines
    cursor += 400;
  }

  return result;
}
