import { Suspense } from "react";
import type { Metadata } from "next";
import TrkIQTool from "@/components/trkiq/TrkIQTool";

export const metadata: Metadata = {
  title: "TRK:IQ — Complete Timing Track Generator",
  description:
    "Drop an MP3, get every timing track you need for xLights — kick, snare, hi-hat, bass, melody, beats, bars, song sections, AND singing face phonemes. One file, ready to sequence.",
  keywords: [
    "xLights",
    "timing tracks",
    "beat detection",
    "singing faces",
    "xtiming",
    "drum timing",
    "instrument separation",
    "Demucs",
    "phonemes",
    "lip sync",
    "BPM",
    "TRK:IQ",
    "Christmas lights",
    "light show",
    "sequencing",
  ],
  openGraph: {
    title: "TRK:IQ — Complete Timing Track Generator for xLights",
    description:
      "Drop your MP3. Get every timing track — instruments, beats, bars, sections, AND singing face phonemes — in one .xtiming file. Ready to sequence.",
  },
};

export default function TrkIQPage() {
  return (
    <div className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-10 h-10 border-2 border-foreground/20 border-t-accent rounded-full animate-spin" />
            <p className="text-foreground/50 text-sm">Loading TRK:IQ...</p>
          </div>
        }
      >
        <TrkIQTool />
      </Suspense>
    </div>
  );
}
