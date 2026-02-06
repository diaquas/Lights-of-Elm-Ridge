"use client";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onAcceptSelected: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onAcceptSelected,
  onClearSelection,
}: BulkActionBarProps) {
  const allSelected = selectedCount === totalCount;

  return (
    <div className="sticky bottom-0 px-6 py-3 bg-surface/95 backdrop-blur border-t border-border">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Selection Info */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-foreground/70">
            <span className="font-semibold text-foreground">{selectedCount}</span> of{" "}
            {totalCount} selected
          </span>
          <button
            type="button"
            onClick={onSelectAll}
            className="text-sm text-accent hover:text-accent/80 transition-colors"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClearSelection}
            className="px-3 py-1.5 text-sm text-foreground/40 hover:text-foreground/60 transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onAcceptSelected}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Accept Selected
          </button>
        </div>
      </div>
    </div>
  );
}
