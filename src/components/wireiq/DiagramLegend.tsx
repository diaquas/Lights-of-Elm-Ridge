"use client";

import { WIRE_COLORS } from "@/lib/wireiq/types";

export function DiagramLegend() {
  const items = [
    { label: "Ethernet", color: WIRE_COLORS.ethernet, dash: false },
    { label: "Pixel Data", color: WIRE_COLORS.data, dash: false },
    { label: "Power", color: WIRE_COLORS.power, dash: false },
    { label: "Injection", color: WIRE_COLORS.injection, dash: true },
  ];

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-3">
      <div className="text-xs font-semibold text-white/70 mb-2">Legend</div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <svg width="24" height="8">
              <line
                x1="0"
                y1="4"
                x2="24"
                y2="4"
                stroke={item.color}
                strokeWidth="2"
                strokeDasharray={item.dash ? "4 2" : undefined}
              />
            </svg>
            <span className="text-xs text-white/60">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
