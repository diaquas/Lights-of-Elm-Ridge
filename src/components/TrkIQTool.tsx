"use client";

import { useState, useCallback, useRef } from "react";

// ─── TRK:IQ Wordmark ────────────────────────────────────

function TrkIQWordmark({ size = "lg" }: { size?: "lg" | "sm" }) {
  const textClass =
    size === "lg"
      ? "text-[56px] sm:text-[64px] leading-none"
      : "text-[28px] leading-none";
  return (
    <span className={`font-display font-black tracking-tight ${textClass}`}>
      <span className="text-foreground">TRK</span>
      <span className="text-accent">:</span>
      <span className="text-accent">IQ</span>
    </span>
  );
}

// ─── How It Works Card ───────────────────────────────────

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

// ─── Feature Card ────────────────────────────────────────

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

// ─── Icons ───────────────────────────────────────────────

function MusicNoteIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function WaveformIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12h2l3-9 3 18 3-12 3 6 2-3h4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function DropZoneMusicIcon() {
  return (
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
  );
}

// ─── Main Component ──────────────────────────────────────

export default function TrkIQTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".mp3")) return;
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCountRef.current = 0;
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* ── Hero ───────────────────────────────────────── */}
      <div className="text-center mb-12">
        <div className="mb-3">
          <TrkIQWordmark size="lg" />
        </div>
        <p className="text-xl text-gray-200 tracking-[0.015em] max-w-2xl mx-auto">
          Complete timing tracks for xLights — in seconds.
        </p>
      </div>

      {/* ── Landing Content ────────────────────────────── */}
      {!file && (
        <div className="max-w-[860px] mx-auto space-y-12">
          {/* How It Works */}
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold text-center">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <HowItWorksCard
                number="1"
                title="Drop Your MP3"
                description="Upload any song. We read the ID3 tags and auto-fetch lyrics so you don't have to."
                icon={<MusicNoteIcon />}
              />
              <HowItWorksCard
                number="2"
                title="AI Stem Separation"
                description="Your audio is split into isolated instruments and vocals using AI — drums, bass, guitar, keys, and more."
                icon={<WaveformIcon />}
              />
              <HowItWorksCard
                number="3"
                title="Download & Import"
                description="Get a single .xtiming file with every track named and ready. Import once into xLights and go."
                icon={<DownloadIcon />}
              />
            </div>
            <div className="text-center text-xs text-foreground/30 pt-4 border-t border-border">
              Audio is processed via secure AI services. Your files are never
              stored or shared.
            </div>
          </div>

          {/* Upload Card — single centered drop zone */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              className={`relative w-full max-w-[540px] bg-accent/5 border-2 border-dashed border-accent rounded-2xl p-10 text-center transition-all hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(239,68,68,0.15)] cursor-pointer group ${
                isDragging
                  ? "scale-[1.02] shadow-[0_8px_32px_rgba(239,68,68,0.2)] bg-accent/10"
                  : ""
              }`}
            >
              <div className="mb-5">
                <TrkIQWordmark size="sm" />
              </div>
              <div className="flex justify-center mb-4">
                <DropZoneMusicIcon />
              </div>
              <p className="text-lg font-display font-bold text-foreground mb-1">
                Drop your MP3 here
              </p>
              <p className="text-sm text-foreground/40">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,audio/mpeg"
                onChange={handleInputChange}
                className="hidden"
              />
            </button>
          </div>

          {/* Feature Cards */}
          <div className="space-y-6">
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
          </div>
        </div>
      )}

      {/* ── File Selected (placeholder for processing UI) ── */}
      {file && (
        <div className="max-w-[860px] mx-auto">
          <div className="bg-surface rounded-xl border border-border p-8 text-center">
            <div className="mb-4">
              <TrkIQWordmark size="sm" />
            </div>
            <div className="flex items-center justify-center gap-3 mb-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-accent"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span className="text-foreground font-semibold">
                {file.name}
              </span>
              <span className="text-foreground/30 text-sm">
                ({(file.size / (1024 * 1024)).toFixed(1)} MB)
              </span>
            </div>
            <p className="text-sm text-foreground/50 mb-6">
              Processing pipeline coming soon — stem separation, onset
              detection, and phoneme generation.
            </p>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-sm text-accent hover:text-accent-secondary transition-colors font-semibold"
            >
              &larr; Choose a different file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
