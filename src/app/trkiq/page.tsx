import type { Metadata } from "next";
import TrkIQTool from "@/components/TrkIQTool";

export const metadata: Metadata = {
  title: "TRK:IQ — Intelligent Timing Tracks for xLights",
  description:
    "Drop an MP3, get complete timing tracks with instrument detection, stem separation, and singing face phonemes. One .xtiming file — import once and go.",
  keywords: [
    "xLights",
    "timing tracks",
    "TRK:IQ",
    "xtiming",
    "stem separation",
    "singing faces",
    "phoneme",
    "Preston Blair",
    "light show tool",
    "AI audio",
  ],
  openGraph: {
    title: "TRK:IQ — Intelligent Timing Tracks for xLights",
    description:
      "Drop an MP3, get complete timing tracks — instruments, vocals, phonemes. One .xtiming file, import once into xLights and go.",
  },
};

export default function TrkIQPage() {
  return (
    <div className="min-h-screen">
      <TrkIQTool />
    </div>
  );
}
