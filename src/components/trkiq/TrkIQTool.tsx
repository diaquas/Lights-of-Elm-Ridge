"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  TrkiqScreen,
  TrkiqSession,
  SongMetadata,
  LyricsData,
  PipelineProgress,
  BeatTrack,
  BeatiqStats,
  VocalTrack,
  LyriqStats,
} from "@/lib/trkiq/types";
import { runPipeline } from "@/lib/trkiq/pipeline";
import { checkDemucsAvailable } from "@/lib/trkiq/replicate-client";
import { fetchLyrics, searchLyrics } from "@/lib/trkiq/lrclib-client";
import UploadScreen from "./UploadScreen";
import ProcessingScreen from "./ProcessingScreen";
import EditorScreen from "./EditorScreen";

const INITIAL_PIPELINE: PipelineProgress[] = [
  { step: "decode", status: "pending" },
  { step: "stems", status: "pending" },
  { step: "analyze", status: "pending" },
  { step: "lyrics", status: "pending" },
  { step: "generate", status: "pending" },
];

function createInitialSession(): TrkiqSession {
  return {
    screen: "upload",
    audioFile: null,
    audioUrl: null,
    metadata: null,
    lyrics: null,
    pipeline: INITIAL_PIPELINE,
    stemsAvailable: false,
    predictionId: null,
    beatTracks: [],
    vocalTracks: [],
    beatStats: null,
    lyriqStats: null,
    usedStems: false,
  };
}

/**
 * TrkIQTool — Unified instrument + vocal timing track generator.
 *
 * One upload → parallel analysis → combined .xtiming export.
 * Merges Beat:IQ (instrument timing) + Lyr:IQ (singing face timing).
 */
export default function TrkIQTool() {
  const [session, setSession] = useState<TrkiqSession>(createInitialSession);

  // Check if Demucs is available (user is authenticated)
  useEffect(() => {
    checkDemucsAvailable().then((available) => {
      setSession((prev) => ({ ...prev, stemsAvailable: available }));
    });
  }, []);

  const setScreen = useCallback((screen: TrkiqScreen) => {
    setSession((prev) => ({ ...prev, screen }));
  }, []);

  const setMetadata = useCallback((metadata: SongMetadata) => {
    setSession((prev) => ({ ...prev, metadata, lyricsFetching: true }));

    // Auto-fetch lyrics from LRCLIB using the extracted metadata
    const { artist, title } = metadata;
    if (artist && title) {
      (async () => {
        const result =
          (await fetchLyrics(artist, title)) ||
          (await searchLyrics(`${artist} ${title}`));

        setSession((prev) => {
          // Don't overwrite user-pasted lyrics
          if (prev.lyrics?.source === "user") {
            return { ...prev, lyricsFetching: false };
          }
          return { ...prev, lyrics: result, lyricsFetching: false };
        });
      })();
    } else {
      setSession((prev) => ({ ...prev, lyricsFetching: false }));
    }
  }, []);

  const setAudio = useCallback((file: File, url: string) => {
    setSession((prev) => ({ ...prev, audioFile: file, audioUrl: url }));
  }, []);

  const setLyrics = useCallback((lyrics: LyricsData) => {
    setSession((prev) => ({ ...prev, lyrics }));
  }, []);

  const updatePipeline = useCallback((updates: PipelineProgress[]) => {
    setSession((prev) => ({ ...prev, pipeline: updates }));
  }, []);

  const setResults = useCallback(
    (
      beatTracks: BeatTrack[],
      vocalTracks: VocalTrack[],
      metadata: SongMetadata,
      lyrics: LyricsData | null,
      beatStats: BeatiqStats,
      lyriqStats: LyriqStats | null,
      usedStems: boolean,
    ) => {
      setSession((prev) => ({
        ...prev,
        beatTracks,
        vocalTracks,
        metadata,
        lyrics,
        beatStats,
        lyriqStats,
        usedStems,
      }));
    },
    [],
  );

  /**
   * Start the TRK:IQ unified pipeline.
   */
  const startProcessing = useCallback(
    async (file: File) => {
      setScreen("processing");

      try {
        const result = await runPipeline(
          file,
          session.metadata || {
            title: file.name,
            artist: "Unknown Artist",
            durationMs: 0,
          },
          updatePipeline,
          session.lyrics,
        );

        setResults(
          result.beatTracks,
          result.vocalTracks,
          result.metadata,
          result.lyrics,
          result.beatStats,
          result.lyriqStats,
          result.combined.usedStems,
        );
        setScreen("editor");
      } catch {
        // Error is reflected in the pipeline progress (step marked as "error")
        // Stay on processing screen so the user can see what failed
      }
    },
    [session.metadata, session.lyrics, setScreen, updatePipeline, setResults],
  );

  const handleReset = useCallback(() => {
    if (session.audioUrl) {
      URL.revokeObjectURL(session.audioUrl);
    }
    setSession(createInitialSession());
    // Re-check stems availability
    checkDemucsAvailable().then((available) => {
      setSession((prev) => ({ ...prev, stemsAvailable: available }));
    });
  }, [session.audioUrl]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="text-foreground">TRK</span>
          <span className="text-accent">:</span>
          <span className="text-foreground">IQ</span>
        </h1>
        <p className="text-foreground/50 mt-2 text-sm sm:text-base">
          Complete timing track generator for xLights
        </p>
      </div>

      {/* Screen Router */}
      {session.screen === "upload" && (
        <UploadScreen
          metadata={session.metadata}
          lyrics={session.lyrics}
          lyricsFetching={session.lyricsFetching}
          stemsAvailable={session.stemsAvailable}
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
