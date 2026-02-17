"use client";

import { useState, useRef, useCallback } from "react";
import type { SongMetadata, LyricsData } from "@/lib/trkiq/types";

interface UploadScreenProps {
  metadata: SongMetadata | null;
  lyrics: LyricsData | null;
  stemsAvailable: boolean;
  onAudioLoad: (file: File, url: string) => void;
  onMetadataLoad: (metadata: SongMetadata) => void;
  onLyricsChange: (lyrics: LyricsData) => void;
  onGenerate: (file: File) => void;
}

export default function UploadScreen({
  metadata,
  lyrics,
  stemsAvailable,
  onAudioLoad,
  onMetadataLoad,
  onLyricsChange,
  onGenerate,
}: UploadScreenProps) {
  const [dragActive, setDragActive] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("audio/") && !file.name.endsWith(".mp3")) {
        return;
      }

      setAudioFile(file);
      const url = URL.createObjectURL(file);
      onAudioLoad(file, url);

      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      const parts = nameWithoutExt.split(/\s*[-\u2014]\s*/);
      const meta: SongMetadata = {
        artist: parts.length > 1 ? parts[0].trim() : "Unknown Artist",
        title:
          parts.length > 1 ? parts.slice(1).join(" - ").trim() : nameWithoutExt,
        durationMs: 0,
      };

      const audio = new Audio(url);
      await new Promise<void>((resolve) => {
        audio.addEventListener("loadedmetadata", () => {
          meta.durationMs = Math.round(audio.duration * 1000);
          resolve();
        });
        audio.addEventListener("error", () => resolve());
      });

      onMetadataLoad(meta);
    },
    [onAudioLoad, onMetadataLoad],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const canGenerate = audioFile !== null && metadata !== null;

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`rounded-2xl border-2 border-dashed transition-all duration-200 py-16 px-8 cursor-pointer text-center ${
          dragActive
            ? "border-accent bg-accent/5 scale-[1.01]"
            : audioFile
              ? "border-green-500/40 bg-green-500/5"
              : "border-border hover:border-foreground/30 hover:bg-surface-light"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3"
          onChange={handleInputChange}
          className="hidden"
        />

        {!audioFile ? (
          <>
            <svg
              className="w-12 h-12 mx-auto text-foreground/25 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <p className="text-foreground/70 text-lg font-medium">
              Drop your MP3 here
            </p>
            <p className="text-foreground/40 text-sm mt-1">
              or click to browse
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <svg
              className="w-6 h-6 text-green-500 flex-shrink-0"
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
            <span className="text-foreground/70">{audioFile.name}</span>
          </div>
        )}
      </div>

      {/* Metadata Card */}
      {metadata && (
        <div className="rounded-xl bg-surface border border-border p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-medium truncate">
                {metadata.title}
              </p>
              <p className="text-foreground/50 text-sm truncate">
                {metadata.artist}
              </p>
              {metadata.durationMs > 0 && (
                <p className="text-foreground/40 text-xs mt-1 font-mono">
                  Duration: {formatDuration(metadata.durationMs)}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              {stemsAvailable ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  AI Stems
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/40 text-xs font-medium">
                  Client-side
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optional: Paste lyrics */}
      {metadata && (
        <div className="rounded-xl bg-surface border border-border overflow-hidden">
          <button
            onClick={() => setShowLyricsEditor(!showLyricsEditor)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-4 h-4 text-foreground/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-foreground/70 text-sm font-medium">
                Lyrics{" "}
                <span className="text-foreground/30 font-normal">
                  (auto-fetched from LRCLIB, or paste your own)
                </span>
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-foreground/30 transition-transform ${showLyricsEditor ? "rotate-180" : ""}`}
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

          {showLyricsEditor && (
            <div className="px-5 pb-4 border-t border-border pt-3">
              <textarea
                rows={8}
                placeholder="Paste lyrics here to include singing face timing tracks in your export. Leave blank to auto-fetch from LRCLIB."
                value={lyrics?.source === "user" ? lyrics.plainText : ""}
                onChange={(e) =>
                  onLyricsChange({
                    plainText: e.target.value,
                    syncedLines: null,
                    source: "user",
                  })
                }
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-foreground/25 resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50"
              />
              <p className="text-foreground/25 text-xs mt-2">
                Tip: name your file &quot;Artist - Title.mp3&quot; for best
                auto-fetch results.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
      <button
        disabled={!canGenerate}
        onClick={() => audioFile && onGenerate(audioFile)}
        className={`w-full py-4 rounded-xl text-lg font-semibold transition-all duration-200 ${
          canGenerate
            ? "bg-accent hover:bg-accent-secondary text-white shadow-lg shadow-accent/20"
            : "bg-surface-light text-foreground/30 cursor-not-allowed"
        }`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        Generate Timing Tracks
      </button>

      {/* Feature Cards */}
      {!audioFile && (
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            title="Instrument Timing"
            description="Kick, snare, hi-hat, bass, and melodic onsets detected from your audio. AI stem separation when signed in."
          />
          <FeatureCard
            title="Singing Faces"
            description="Lyrics auto-fetched from LRCLIB, processed through our phoneme engine for Preston Blair mouth positions."
          />
          <FeatureCard
            title="One File, Everything"
            description="Download a single .xtiming with all tracks named and ready — import once into xLights and go."
          />
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-surface border border-border p-5">
      <p className="text-foreground font-medium text-sm">{title}</p>
      <p className="text-foreground/40 text-xs mt-1.5 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
