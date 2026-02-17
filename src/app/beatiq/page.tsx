import { Suspense } from "react";
import type { Metadata } from "next";
import BeatIQTool from "@/components/beatiq/BeatIQTool";

export const metadata: Metadata = {
  title: "Beat:IQ — Instrument Timing Track Generator",
  description:
    "Drop an MP3, get individual timing tracks for every instrument — kick, snare, hi-hat, bass, melody, beats, bars, and song sections. All importable to xLights in 60 seconds.",
  keywords: [
    "xLights",
    "timing tracks",
    "beat detection",
    "BPM",
    "onset detection",
    "xtiming",
    "drum timing",
    "instrument separation",
    "Beat:IQ",
    "Christmas lights",
    "light show",
    "sequencing",
  ],
  openGraph: {
    title: "Beat:IQ — Instrument Timing Track Generator for xLights",
    description:
      "Drop your MP3. Get timing tracks for every instrument in your song — kick, snare, hi-hat, bass, melody — plus beats, bars, and song sections. All in one multi-track .xtiming file.",
  },
};

export default function BeatIQPage() {
  return (
    <div className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-10 h-10 border-2 border-foreground/20 border-t-accent rounded-full animate-spin" />
            <p className="text-foreground/50 text-sm">Loading Beat:IQ...</p>
          </div>
        }
      >
        <BeatIQTool />
      </Suspense>
    </div>
  );
}
