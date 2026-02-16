"use client";

import { useState, useMemo } from "react";
import type { ParsedLayout } from "@/lib/modiq";

interface ParsedModelPreviewProps {
  layout: ParsedLayout;
  fileName: string;
  onContinue: () => void;
  onUploadDifferent: () => void;
}

export default function ParsedModelPreview({
  layout,
  fileName,
  onContinue,
  onUploadDifferent,
}: ParsedModelPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  const groupedModels = useMemo(() => {
    const groups = new Map<string, { count: number; totalPixels: number }>();
    for (const model of layout.models) {
      if (model.isGroup) continue;
      const type = model.type || "Other";
      const existing = groups.get(type) ?? { count: 0, totalPixels: 0 };
      existing.count += 1;
      existing.totalPixels += model.pixelCount;
      groups.set(type, existing);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [layout.models]);

  const summary = groupedModels
    .map(([type, { count }]) => `${count} ${count === 1 ? type : type + "s"}`)
    .join(" \u00b7 ");

  const nonGroupModels = layout.models.filter((m) => !m.isGroup);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden animate-[slideDown_0.25s_ease-out]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-green-400 flex-shrink-0"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span className="text-[13px] text-foreground font-medium truncate">
            {fileName}
          </span>
          <span className="text-[11px] text-green-400 flex-shrink-0">
            {layout.modelCount} models parsed
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-foreground/40 hover:text-foreground/70 transition-colors flex items-center gap-1"
        >
          {expanded ? "Collapse" : "Preview models"}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Type summary */}
      <div className="px-4 py-2.5 text-[11px] text-foreground/50">
        {summary}
      </div>

      {/* Expandable model list */}
      {expanded && (
        <div className="border-t border-border max-h-56 overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-foreground/30 border-b border-border">
                <th className="text-left px-4 py-1.5 font-medium">Name</th>
                <th className="text-left px-4 py-1.5 font-medium">Type</th>
                <th className="text-right px-4 py-1.5 font-medium">Pixels</th>
              </tr>
            </thead>
            <tbody>
              {nonGroupModels.map((model) => (
                <tr
                  key={model.name}
                  className="border-b border-border/50 hover:bg-foreground/[0.02]"
                >
                  <td className="px-4 py-1.5 text-foreground/70 truncate max-w-[200px]">
                    {model.name}
                  </td>
                  <td className="px-4 py-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/50">
                      {model.type || "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-1.5 text-right text-foreground/40 tabular-nums">
                    {model.pixelCount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onUploadDifferent}
          className="text-[12px] text-foreground/40 hover:text-foreground/70 transition-colors"
        >
          Wrong file? Upload different
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="px-4 py-2 bg-accent hover:bg-accent/90 text-white text-[12px] font-semibold rounded-lg transition-all duration-200"
        >
          Looks right &mdash; Continue
        </button>
      </div>
    </div>
  );
}
