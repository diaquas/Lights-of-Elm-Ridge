import { Suspense } from "react";
import type { Metadata } from "next";
import ModIQTool from "@/components/ModIQTool";

export const metadata: Metadata = {
  title: "ModIQ — Intelligent Sequence Mapping",
  description:
    "Stop mapping sequences manually. Sequence mapping in seconds — not hours. The first automated xLights mapping tool.",
  keywords: [
    "xLights",
    "sequence mapping",
    "ModIQ",
    "xmap",
    "model mapping",
    "RGB sequences",
    "automated mapping",
    "light show tool",
  ],
  openGraph: {
    title: "ModIQ — Intelligent Sequence Mapping for xLights",
    description:
      "Upload your layout, pick a sequence, get a mapping file in seconds. The first automated xLights mapping tool.",
    images: [
      {
        url: "/modiq-wordmark-v3-full.png",
        width: 800,
        height: 400,
        alt: "ModIQ by Lights of Elm Ridge",
      },
    ],
  },
};

export default function ModIQPage() {
  return (
    <div className="min-h-screen">
      <Suspense>
        <ModIQTool />
      </Suspense>
    </div>
  );
}
