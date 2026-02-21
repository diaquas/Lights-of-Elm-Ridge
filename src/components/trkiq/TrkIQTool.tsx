"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  TrkiqScreen,
  TrkiqSession,
  SongMetadata,
  LyricsData,
  PipelineProgress,
  CompletionStats,
  BeatTrack,
  BeatiqStats,
  VocalTrack,
  LyriqStats,
} from "@/lib/trkiq/types";
import { runPipeline } from "@/lib/trkiq/pipeline";
import { checkDemucsAvailable } from "@/lib/trkiq/replicate-client";
import { fetchLyrics, searchLyrics } from "@/lib/trkiq/lrclib-client";
import { fetchAlbumArt } from "@/lib/trkiq/itunes-client";
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
    usedEssentia: false,
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
  const [albumArtUrl, setAlbumArtUrl] = useState<string | null>(null);
  const [completionStats, setCompletionStats] =
    useState<CompletionStats | null>(null);
  const [pipelineStartedAt, setPipelineStartedAt] = useState<number | null>(
    null,
  );

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

    const { artist, title } = metadata;

    // Fetch album art from iTunes (fire and forget)
    if (artist && title) {
      fetchAlbumArt(artist, title).then((url) => {
        if (url) setAlbumArtUrl(url);
      });
    }

    // Auto-fetch lyrics from LRCLIB using the extracted metadata.
    // Chain: exact match → artist+title search → title-only search
    // (title-only catches covers where the artist doesn't match LRCLIB)
    //
    // The || chain short-circuits on the first truthy result, which ensures
    // the exact match (most likely the correct song) wins even if it only
    // has plain text.  We then try an artist+title search separately to
    // upgrade to synced lines — but never a title-only search, which can
    // return a completely different song.
    if (artist && title) {
      (async () => {
        let result =
          (await fetchLyrics(artist, title)) ||
          (await searchLyrics(`${artist} ${title}`)) ||
          (await searchLyrics(title));

        // If the primary result has no synced lines, try artist+title
        // search for a synced version.  Skip title-only search here —
        // it risks pulling synced lines from a different song entirely.
        if (result && (!result.syncedLines || result.syncedLines.length === 0)) {
          try {
            const synced = await searchLyrics(`${artist} ${title}`);
            if (synced?.syncedLines && synced.syncedLines.length > 0) {
              result = { ...result, syncedLines: synced.syncedLines };
            }
          } catch {
            // Synced upgrade failed — continue with plain text
          }
        }

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
      usedEssentia: boolean,
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
        usedEssentia,
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
      setCompletionStats(null);
      const startTime = Date.now();
      setPipelineStartedAt(startTime);

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
          result.combined.usedEssentia,
        );

        // Build completion stats for the banner
        const totalTimeS = Math.round((Date.now() - startTime) / 1000);
        setCompletionStats({
          totalTimeS,
          totalMarks:
            result.combined.totalMarks + result.combined.totalPhonemes,
          trackCount:
            result.combined.instrumentTracks + result.combined.vocalTracks,
        });

        // Stay on processing screen — completion banner handles download
        // User clicks "Download" or "Process another song" to navigate
      } catch {
        // Error is reflected in the pipeline progress (step marked as "error")
        // Stay on processing screen so the user can see what failed
      }
    },
    [session.metadata, session.lyrics, setScreen, updatePipeline, setResults],
  );

  /** Navigate to editor so the user can pick tracks and download */
  const handleReviewDownload = useCallback(() => {
    setScreen("editor");
  }, [setScreen]);

  const handleReset = useCallback(() => {
    if (session.audioUrl) {
      URL.revokeObjectURL(session.audioUrl);
    }
    setSession(createInitialSession());
    setAlbumArtUrl(null);
    setCompletionStats(null);
    setPipelineStartedAt(null);
    // Re-check stems availability
    checkDemucsAvailable().then((available) => {
      setSession((prev) => ({ ...prev, stemsAvailable: available }));
    });
  }, [session.audioUrl]);

  return (
    <div
      className={
        session.screen === "processing"
          ? ""
          : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      }
    >
      {/* ── Hero (upload + editor only) ───────────────── */}
      {session.screen === "upload" && (
        <div className="text-center mb-12">
          <div className="mb-3">
            <span className="text-[42px] font-display font-extrabold tracking-tight leading-none">
              <span className="text-foreground">TRK</span>
              <span className="text-foreground/30">:</span>
              <span className="text-accent">IQ</span>
            </span>
          </div>
          <p className="text-[15px] text-foreground/40 tracking-[0.015em] max-w-2xl mx-auto">
            Complete timing tracks for xLights &mdash; in seconds.
          </p>
        </div>
      )}

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
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <ProcessingScreen
            pipeline={session.pipeline}
            metadata={session.metadata}
            albumArtUrl={albumArtUrl}
            completionStats={completionStats}
            onReviewDownload={handleReviewDownload}
            onNewSong={handleReset}
          />
        </div>
      )}

      {session.screen === "editor" && (
        <EditorScreen session={session} onReset={handleReset} />
      )}
    </div>
  );
}
