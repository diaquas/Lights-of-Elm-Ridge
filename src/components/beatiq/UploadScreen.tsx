"use client";

import { useState, useRef, useCallback } from "react";
import type { SongMetadata } from "@/lib/beatiq/types";

interface UploadScreenProps {
  metadata: SongMetadata | null;
  onAudioLoad: (file: File, url: string) => void;
  onMetadataLoad: (metadata: SongMetadata) => void;
  onGenerate: (file: File) => void;
}

export default function UploadScreen({
  metadata,
  onAudioLoad,
  onMetadataLoad,
  onGenerate,
}: UploadScreenProps) {
  const [dragActive, setDragActive] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("audio/") && !file.name.endsWith(".mp3")) {
        return;
      }

      setAudioFile(file);
      const url = URL.createObjectURL(file);
      onAudioLoad(file, url);

      // Extract metadata from filename (ID3 parsing would require a library)
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      const parts = nameWithoutExt.split(/\s*[-\u2014]\s*/);
      const meta: SongMetadata = {
        artist: parts.length > 1 ? parts[0].trim() : "Unknown Artist",
        title:
          parts.length > 1 ? parts.slice(1).join(" - ").trim() : nameWithoutExt,
        durationMs: 0,
      };

      // Use Audio element to get duration
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
            <div className="text-4xl mb-4">
              <svg
                className="w-12 h-12 mx-auto text-foreground/25"
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
            </div>
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
          </div>
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
        Analyze with Beat:IQ
      </button>

      {/* Feature Cards */}
      {!audioFile && (
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            title="Instrument Separation"
            description="Frequency-band analysis isolates kick, snare, hi-hat, bass, and melodic onsets from your mix."
          />
          <FeatureCard
            title="Beat & Tempo Detection"
            description="Automatic BPM detection with beat grid and bar boundaries aligned to your music."
          />
          <FeatureCard
            title="xLights Ready"
            description="Download a multi-track .xtiming file with named tracks — import directly into xLights."
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
