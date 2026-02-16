"use client";

interface FamilyAccordionHeaderProps {
  prefix: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSkipFamily?: () => void;
}

export function FamilyAccordionHeader({
  prefix,
  count,
  isExpanded,
  onToggle,
  onSkipFamily,
}: FamilyAccordionHeaderProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex-1 flex items-center gap-2 px-3 py-1.5 text-[12px] text-foreground/50 hover:text-foreground/70 transition-colors rounded-md hover:bg-foreground/5"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium truncate">{prefix}</span>
        <span className="px-1.5 py-0.5 text-xs bg-foreground/8 text-foreground/40 rounded flex-shrink-0">
          {count}
        </span>
      </button>
      {onSkipFamily && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSkipFamily();
          }}
          title={`Skip all ${count} in ${prefix}`}
          className="p-1 text-foreground/30 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors flex-shrink-0"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
