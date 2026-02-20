"use client";

import type { DiagramStats } from "@/lib/wireiq/types";

interface DiagramStatsProps {
  stats: DiagramStats;
}

export function DiagramStatsPanel({ stats }: DiagramStatsProps) {
  const items = [
    { label: "Controllers", value: stats.totalControllers },
    { label: "Receivers", value: stats.totalReceivers },
    { label: "Props", value: stats.totalProps },
    { label: "Total Pixels", value: stats.totalPixels.toLocaleString() },
    { label: "Total Watts", value: `${stats.totalWatts}W` },
    { label: "Power Supplies", value: stats.totalPowerSupplies },
    { label: "Injection Points", value: stats.totalInjectionPoints },
    { label: "Cable (data)", value: `${stats.totalCableRunsFeet}ft` },
    {
      label: "Overloaded Ports",
      value: stats.overloadedPorts,
      warn: stats.overloadedPorts > 0,
    },
    { label: "Est. BOM Cost", value: `$${stats.estimatedBomCost}` },
  ];

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-3">
      <div className="text-xs font-semibold text-white/70 mb-2">
        Display Summary
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between text-xs">
            <span className="text-white/50">{item.label}</span>
            <span
              className={
                "warn" in item && item.warn
                  ? "text-red-400 font-medium"
                  : "text-white/80"
              }
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
