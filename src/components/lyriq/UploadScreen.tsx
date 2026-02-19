"use client";

import { useState, useRef, useCallback } from "react";
import type { LyricsData, SongMetadata } from "@/lib/lyriq/types";
import { parseID3Tags } from "@/lib/id3-parser";

interface UploadScreenProps {
  metadata: SongMetadata | null;
  lyrics: LyricsData | null;
  onAudioLoad: (file: File, url: string) => void;
  onMetadataLoad: (metadata: SongMetadata) => void;
  onLyricsChange: (text: string, source: "auto" | "moises" | "user") => void;
  onGenerate: (file: File, lyrics: string) => void;
}

/**
 * Screen 1: Upload — MP3 drop zone, metadata display, lyrics input.
 */
export default function UploadScreen({
  metadata,
  lyrics,
  onAudioLoad,
  onMetadataLoad,
  onLyricsChange,
  onGenerate,
}: UploadScreenProps) {
  const [dragActive, setDragActive] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [showLyricsInput, setShowLyricsInput] = useState(false);
  const [lyricsText, setLyricsText] = useState(lyrics?.text ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const parts = nameWithoutExt.split(/[-_]/);
      const hasId3 = !!(id3.artist || id3.title);

      const meta: SongMetadata = {
        title:
          id3.title ||
          (parts.length > 1 ? parts.slice(1).join(" ").trim() : nameWithoutExt),
        artist:
          id3.artist || (parts.length > 1 ? parts[0].trim() : "Unknown Artist"),
        album: id3.album,
        durationSec: 0,
        source: hasId3 ? "id3" : "filename",
      };

      // Read actual audio duration
      const audio = new Audio(url);
      await new Promise<void>((resolve) => {
        audio.addEventListener("loadedmetadata", () => {
          meta.durationSec = Math.round(audio.duration);
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

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleLyricsSubmit = useCallback(() => {
    onLyricsChange(lyricsText, "user");
  }, [lyricsText, onLyricsChange]);

  const canGenerate = audioFile && lyricsText.trim().length > 0;

  const TRIM_THRESHOLD_SEC = 15;
  const audioDurationSec = metadata?.durationSec ?? 0;
  const originalDurationSec = lyrics?.originalDurationSec ?? 0;
  const durationDiffSec =
    audioDurationSec > 0 && originalDurationSec > 0
      ? originalDurationSec - audioDurationSec
      : 0;
  const showTrimWarning = durationDiffSec > TRIM_THRESHOLD_SEC;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-200
          flex flex-col items-center justify-center py-16 px-8 cursor-pointer
          ${
            dragActive
              ? "border-accent bg-accent/5 scale-[1.01]"
              : audioFile
                ? "border-green-500/40 bg-green-500/5"
                : "border-border hover:border-foreground/30 hover:bg-surface-light"
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,.mp3"
          className="hidden"
          onChange={handleFileInput}
          aria-label="Upload MP3 file"
        />

        {!audioFile ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-foreground/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
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
          <>
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <p className="text-foreground/70 text-lg font-medium">
              {audioFile.name}
            </p>
            <p className="text-foreground/40 text-sm mt-1">
              {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          </>
        )}
      </div>

      {/* Metadata Display */}
      {metadata && (
        <div className="rounded-xl bg-surface border border-border p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-foreground font-medium text-lg leading-tight truncate">
                {metadata.title}
              </p>
              <p className="text-foreground/50 text-sm mt-0.5">
                {metadata.artist}
              </p>
              {metadata.durationSec > 0 && (
                <p className="text-foreground/40 text-xs mt-1 font-mono">
                  Duration: {formatDuration(metadata.durationSec)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Section */}
      {audioFile && (
        <div className="rounded-xl bg-surface border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-foreground/70 text-sm font-medium uppercase tracking-wider">
              Lyrics
            </h3>
            {!showLyricsInput && !lyricsText && (
              <span className="text-foreground/30 text-xs">
                Auto-fetch coming soon
              </span>
            )}
          </div>

          {!showLyricsInput && !lyricsText ? (
            <div className="space-y-3">
              <p className="text-foreground/40 text-sm">
                Lyrics will be auto-fetched in a future update. For now, paste
                your lyrics below.
              </p>
              <button
                onClick={() => setShowLyricsInput(true)}
                className="text-accent hover:text-accent-secondary text-sm font-medium transition-colors"
              >
                Paste your own lyrics
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {showTrimWarning && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <svg
                      className="w-4 h-4 text-amber-500 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                      />
                    </svg>
                    <div>
                      <p className="text-amber-500 text-sm font-medium">
                        Edited track detected
                      </p>
                      <p className="text-foreground/50 text-xs mt-1 leading-relaxed">
                        Your audio is {formatDuration(audioDurationSec)} but the
                        original track is {formatDuration(originalDurationSec)}.
                        If you cut sections from this song, remove the
                        corresponding lyrics below so the timing aligns
                        correctly.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <textarea
                value={lyricsText}
                onChange={(e) => {
                  setLyricsText(e.target.value);
                  if (!showLyricsInput) setShowLyricsInput(true);
                }}
                onBlur={handleLyricsSubmit}
                placeholder="Paste song lyrics here — one line per phrase..."
                rows={10}
                className="
                  w-full bg-background border border-border rounded-lg p-3
                  text-foreground text-sm font-mono leading-relaxed
                  placeholder:text-foreground/20
                  focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50
                  resize-y
                "
              />
              <p className="text-foreground/30 text-xs">
                {lyricsText.split("\n").filter((l) => l.trim()).length} lines
                {" / "}
                {lyricsText.split(/\s+/).filter((w) => w.trim()).length} words
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
      {audioFile && (
        <button
          onClick={() => {
            if (canGenerate && audioFile) {
              onGenerate(audioFile, lyricsText);
            }
          }}
          disabled={!canGenerate}
          className={`
            w-full py-4 rounded-xl text-lg font-semibold transition-all duration-200
            ${
              canGenerate
                ? "bg-accent hover:bg-accent-secondary text-white shadow-lg shadow-accent/20 hover:shadow-accent/30"
                : "bg-surface-light text-foreground/30 cursor-not-allowed"
            }
          `}
          style={{ fontFamily: "var(--font-display)" }}
        >
          Generate Lyr:IQ
        </button>
      )}

      {/* Feature Comparison */}
      {!audioFile && (
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            title="Weighted Phonemes"
            description="Vowels stretch, consonants stay crisp — faces actually look like they're singing."
          />
          <FeatureCard
            title="Background Vocals"
            description="First-in-category: automated timing tracks for backing vocals and harmonies."
          />
          <FeatureCard
            title="Singing Dictionary"
            description="Extended dictionary covers 'gonna', 'fa la la', and holiday words that trip up xLights."
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
      <h3
        className="text-foreground text-sm font-semibold mb-1.5"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>
      <p className="text-foreground/40 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
