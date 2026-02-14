"use client";

import { memo, useEffect, useRef } from "react";

interface ExportDialogProps {
  unmappedNames: string[];
  onExportAnyway: () => void;
  onSkipAllAndExport: () => void;
  onKeepMapping: () => void;
}

export default memo(function ExportDialog({
  unmappedNames,
  onExportAnyway,
  onSkipAllAndExport,
  onKeepMapping,
}: ExportDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap + escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onKeepMapping();
    };
    document.addEventListener("keydown", handler);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handler);
  }, [onKeepMapping]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      style={{ willChange: "opacity" }}
      onClick={onKeepMapping}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 outline-none"
        style={{ willChange: "transform" }}
      >
        <div>
          <h3 id="export-dialog-title" className="text-lg font-display font-bold mb-2">
            {unmappedNames.length} of your models don&apos;t have a mapping yet
          </h3>
          <p className="text-sm text-foreground/60">
            These won&apos;t receive any effects from this sequence.
          </p>
        </div>

        {/* Unmapped model list */}
        <div className="bg-background rounded-lg border border-border px-4 py-3 max-h-32 overflow-y-auto">
          <p className="text-sm text-foreground/50 leading-relaxed">
            {unmappedNames.join(", ")}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onExportAnyway}
            className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm bg-accent hover:bg-accent/90 text-white transition-colors"
          >
            Export Anyway
          </button>
          <button
            onClick={onSkipAllAndExport}
            className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm text-foreground/70 bg-surface-light border border-border hover:bg-surface hover:text-foreground transition-colors"
          >
            Skip All & Export
          </button>
          <button
            onClick={onKeepMapping}
            className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm text-foreground/50 hover:text-foreground bg-transparent border border-border hover:bg-surface-light transition-colors"
          >
            Keep Mapping
          </button>
        </div>
      </div>
    </div>
  );
});
