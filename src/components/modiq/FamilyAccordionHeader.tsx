"use client";

interface FamilyAccordionHeaderProps {
  prefix: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function FamilyAccordionHeader({
  prefix,
  count,
  isExpanded,
  onToggle,
}: FamilyAccordionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-foreground/50 hover:text-foreground/70 transition-colors rounded-md hover:bg-foreground/5"
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
      <span className="px-1.5 py-0.5 text-[10px] bg-foreground/8 text-foreground/40 rounded flex-shrink-0">
        {count}
      </span>
    </button>
  );
}
