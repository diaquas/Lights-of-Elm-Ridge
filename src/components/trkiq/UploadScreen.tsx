"use client";

import { useState, useRef, useCallback } from "react";
import type { SongMetadata, LyricsData } from "@/lib/trkiq/types";
import { parseID3Tags } from "@/lib/id3-parser";

interface UploadScreenProps {
  metadata: SongMetadata | null;
  lyrics: LyricsData | null;
  lyricsFetching?: boolean;
  stemsAvailable: boolean;
  onAudioLoad: (file: File, url: string) => void;
  onMetadataLoad: (metadata: SongMetadata) => void;
  onLyricsChange: (lyrics: LyricsData) => void;
  onGenerate: (file: File) => void;
}

export default function UploadScreen({
  metadata,
  lyrics,
  lyricsFetching,
  stemsAvailable,
  onAudioLoad,
  onMetadataLoad,
  onLyricsChange,
  onGenerate,
}: UploadScreenProps) {
  const [dragActive, setDragActive] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  // null = user hasn't toggled; auto-expand when LRCLIB lyrics arrive
  const [userToggledLyrics, setUserToggledLyrics] = useState<boolean | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lrclibHasLyrics =
    lyrics?.source === "lrclib" && lyrics.plainText.trim().length > 0;
  const showLyricsEditor =
    userToggledLyrics ?? (lrclibHasLyrics || lyrics?.source === "user");

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("audio/") && !file.name.endsWith(".mp3")) {
        return;
      }

      setAudioFile(file);
      const url = URL.createObjectURL(file);
      onAudioLoad(file, url);

      // Extract metadata from ID3 tags, falling back to filename parsing
      const id3 = await parseID3Tags(file);
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      const parts = nameWithoutExt.split(/\s*[-\u2014]\s*/);
      const meta: SongMetadata = {
        artist:
          id3.artist || (parts.length > 1 ? parts[0].trim() : "Unknown Artist"),
        title:
          id3.title ||
          (parts.length > 1
            ? parts.slice(1).join(" - ").trim()
            : nameWithoutExt),
        album: id3.album,
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
    <div className="max-w-[860px] mx-auto space-y-12">
      {/* ── How It Works ──────────────────────────────── */}
      {!audioFile && (
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <HowItWorksCard
              number="1"
              title="Drop Your MP3"
              description="Upload any song. We read the ID3 tags and auto-fetch lyrics so you don't have to."
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              }
            />
            <HowItWorksCard
              number="2"
              title="AI Stem Separation"
              description="Your audio is split into isolated instruments and vocals using AI — drums, bass, guitar, keys, and more."
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12h2l3-9 3 18 3-12 3 6 2-3h4" />
                </svg>
              }
            />
            <HowItWorksCard
              number="3"
              title="Download &amp; Import"
              description="Get a single .xtiming file with every track named and ready. Import once into xLights and go."
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
            />
          </div>
          <div className="text-center text-xs text-foreground/30 pt-4 border-t border-border">
            Audio is processed via secure AI services. Your files are never
            stored or shared.
          </div>
        </div>
      )}

      {/* ── Upload Card ───────────────────────────────── */}
      <div className="flex justify-center">
        <div className="w-full max-w-[540px]">
          <div
            role="button"
            tabIndex={0}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={!audioFile ? handleClick : undefined}
            onKeyDown={!audioFile ? handleKeyDown : undefined}
            className={`rounded-2xl border-2 border-dashed transition-all duration-200 text-center ${
              audioFile
                ? "border-green-500/40 bg-green-500/5 p-6"
                : dragActive
                  ? "border-accent bg-accent/10 scale-[1.02] shadow-[0_8px_32px_rgba(239,68,68,0.2)] p-10 cursor-pointer"
                  : "border-accent bg-accent/5 p-10 cursor-pointer hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(239,68,68,0.15)]"
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
                <div className="mb-5">
                  <span className="text-[28px] font-display font-black tracking-tight leading-none">
                    <span className="text-foreground">TRK</span>
                    <span className="text-accent">:</span>
                    <span className="text-accent">IQ</span>
                  </span>
                </div>
                <div className="flex justify-center mb-4">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-foreground/20"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <p className="text-lg font-display font-bold text-foreground mb-1">
                  Drop your MP3 here
                </p>
                <p className="text-sm text-foreground/40">or click to browse</p>
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-xs text-accent hover:text-accent-secondary transition-colors ml-2"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Metadata Card ─────────────────────────────── */}
      {metadata && (
        <div className="max-w-[540px] mx-auto rounded-xl bg-surface border border-border p-5">
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

      {/* ── Lyrics Editor (optional) ──────────────────── */}
      {metadata && (
        <div className="max-w-[540px] mx-auto rounded-xl bg-surface border border-border overflow-hidden">
          <button
            onClick={() => setUserToggledLyrics(!showLyricsEditor)}
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
                Lyrics
              </span>
              {lyricsFetching && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Fetching from LRCLIB...
                </span>
              )}
              {!lyricsFetching && lyrics?.source === "lrclib" && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  LRCLIB
                  {lyrics.syncedLines ? " (synced)" : ""}
                </span>
              )}
              {!lyricsFetching && lyrics?.source === "user" && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/40 text-xs">
                  Custom
                </span>
              )}
              {!lyricsFetching && !lyrics && metadata && (
                <span className="text-foreground/30 text-xs font-normal">
                  No lyrics found
                </span>
              )}
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
                placeholder="Paste lyrics here to include singing face timing tracks in your export, or wait for auto-fetch from LRCLIB."
                value={lyrics?.plainText ?? ""}
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
                {lyrics?.source === "lrclib"
                  ? "Auto-fetched from LRCLIB. Edit to override."
                  : 'Tip: name your file "Artist - Title.mp3" for best auto-fetch results.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Generate Button ───────────────────────────── */}
      {audioFile && (
        <div className="max-w-[540px] mx-auto">
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
        </div>
      )}

      {/* ── Feature Cards ─────────────────────────────── */}
      {!audioFile && (
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            title="Instrument Timing"
            description="Kick, snare, hi-hat, bass, and melodic onsets detected from isolated stems. Way beyond what VAMP plugins can do."
          />
          <FeatureCard
            title="Singing Faces"
            description="Lyrics auto-fetched, processed through our phoneme engine for Preston Blair mouth positions. Lead AND background vocals."
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

// ─── Subcomponents ───────────────────────────────────────

function HowItWorksCard({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-6 text-center flex flex-col">
      <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center text-lg font-bold mx-auto mb-3">
        {number}
      </div>
      <h3 className="font-display font-bold mb-2 h-[3.5rem] flex items-end justify-center leading-tight">
        {title}
      </h3>
      <div className="flex justify-center mb-3 text-foreground/25">{icon}</div>
      <p className="text-sm text-foreground/60 flex-1">{description}</p>
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
    <div className="bg-surface rounded-xl border border-border p-6 text-center flex flex-col">
      <h3 className="font-display font-bold mb-2">{title}</h3>
      <p className="text-sm text-foreground/60 flex-1">{description}</p>
    </div>
  );
}
