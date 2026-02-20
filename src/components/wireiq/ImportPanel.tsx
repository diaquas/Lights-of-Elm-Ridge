"use client";

import { useCallback, useState } from "react";

interface ImportPanelProps {
  onFilesLoaded: (rgbEffectsXml: string, networksXml: string) => void;
  isProcessing: boolean;
}

export function ImportPanel({ onFilesLoaded, isProcessing }: ImportPanelProps) {
  const [rgbEffectsFile, setRgbEffectsFile] = useState<File | null>(null);
  const [networksFile, setNetworksFile] = useState<File | null>(null);
  const [rgbEffectsXml, setRgbEffectsXml] = useState<string | null>(null);
  const [networksXml, setNetworksXml] = useState<string | null>(null);

  const handleRgbEffectsUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setRgbEffectsFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const xml = event.target?.result as string;
        setRgbEffectsXml(xml);
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleNetworksUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setNetworksFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const xml = event.target?.result as string;
        setNetworksXml(xml);
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleGenerate = useCallback(() => {
    if (rgbEffectsXml && networksXml) {
      onFilesLoaded(rgbEffectsXml, networksXml);
    }
  }, [rgbEffectsXml, networksXml, onFilesLoaded]);

  const canGenerate = rgbEffectsXml && networksXml && !isProcessing;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Wire:IQ</h1>
        <p className="text-foreground/60 max-w-md">
          Import your xLights configuration files to generate an interactive
          wiring diagram with power planning and cable routing.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        {/* rgbeffects upload */}
        <DropZone
          label="Layout File"
          accept=".xml"
          hint="xlights_rgbeffects.xml"
          file={rgbEffectsFile}
          onChange={handleRgbEffectsUpload}
          loaded={!!rgbEffectsXml}
        />

        {/* networks upload */}
        <DropZone
          label="Networks File"
          accept=".xml"
          hint="xlights_networks.xml"
          file={networksFile}
          onChange={handleNetworksUpload}
          loaded={!!networksXml}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={`px-8 py-3 rounded-lg text-sm font-semibold transition-all ${
          canGenerate
            ? "bg-accent text-white hover:bg-accent/90 cursor-pointer"
            : "bg-foreground/10 text-foreground/30 cursor-not-allowed"
        }`}
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating Diagram...
          </span>
        ) : (
          "Generate Wiring Diagram"
        )}
      </button>
    </div>
  );
}

function DropZone({
  label,
  accept,
  hint,
  file,
  onChange,
  loaded,
}: {
  label: string;
  accept: string;
  hint: string;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loaded: boolean;
}) {
  return (
    <label
      className={`flex-1 flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
        loaded
          ? "border-green-500/50 bg-green-500/5"
          : "border-foreground/20 bg-foreground/5 hover:border-foreground/40"
      }`}
    >
      <input
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />
      <div className="text-center">
        <div className="text-2xl mb-2">{loaded ? "\u2705" : "\u{1F4C4}"}</div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-foreground/50 mt-1">
          {file ? file.name : hint}
        </div>
      </div>
    </label>
  );
}
