import { Suspense } from "react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const WireIQTool = dynamic(() => import("@/components/wireiq/WireIQTool"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-2 border-foreground/20 border-t-accent rounded-full animate-spin" />
      <p className="text-foreground/50 text-sm">Loading Wire:IQ...</p>
    </div>
  ),
});

export const metadata: Metadata = {
  title: "Wire:IQ — Wiring Diagram Generator",
  description:
    "Import your xLights files and get an interactive wiring diagram with power planning, cable routing, and a complete bill of materials.",
  keywords: [
    "xLights",
    "wiring diagram",
    "Wire:IQ",
    "pixel wiring",
    "power injection",
    "controller wiring",
    "light show wiring",
    "cable routing",
    "power planning",
  ],
  openGraph: {
    title: "Wire:IQ — Wiring Diagram Generator for xLights",
    description:
      "Stop guessing how to wire your display. Import your xLights files and get a complete wiring plan in seconds.",
  },
};

export default function WireIQPage() {
  return (
    <div className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-10 h-10 border-2 border-foreground/20 border-t-accent rounded-full animate-spin" />
            <p className="text-foreground/50 text-sm">Loading Wire:IQ...</p>
          </div>
        }
      >
        <WireIQTool />
      </Suspense>
    </div>
  );
}
