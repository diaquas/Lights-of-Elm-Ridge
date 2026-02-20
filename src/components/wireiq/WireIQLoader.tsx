"use client";

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

export default function WireIQLoader() {
  return <WireIQTool />;
}
