import { Suspense } from "react";
import type { Metadata } from "next";
import LyrIQTool from "@/components/lyriq/LyrIQTool";

export const metadata: Metadata = {
  title: "Lyr:IQ — Singing Face Timing Generator",
  description:
    "Drop an MP3, get complete singing face timing tracks for xLights. Linguistically-weighted phonemes, background vocal support, and extended dictionary — all in 60 seconds.",
  keywords: [
    "xLights",
    "singing faces",
    "lip sync",
    "phonemes",
    "Preston Blair",
    "xtiming",
    "lyrics timing",
    "singing face timing",
    "Lyr:IQ",
    "vocal alignment",
    "Christmas lights",
    "light show",
  ],
  openGraph: {
    title: "Lyr:IQ — Singing Face Timing Generator for xLights",
    description:
      "Drop your MP3. Get complete singing face timing tracks — phrases, words, and phonemes — for lead AND background vocals. Phonemes are linguistically weighted so your faces actually look like they're singing.",
  },
};

export default function LyrIQPage() {
  return (
    <div className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-10 h-10 border-2 border-foreground/20 border-t-accent rounded-full animate-spin" />
            <p className="text-foreground/50 text-sm">Loading Lyr:IQ...</p>
          </div>
        }
      >
        <LyrIQTool />
      </Suspense>
    </div>
  );
}
