/**
 * Shared panel style constants for consistent alignment across all mapping phases.
 * Both left and right panels use these values to ensure headers, search bars,
 * and cards start on the same row.
 */

export const PANEL_STYLES = {
  header: {
    wrapper: "px-6 py-3 border-b border-border flex-shrink-0",
    title: "text-base font-semibold text-foreground flex items-center gap-2",
    subtitle: "text-[12px] text-foreground/50 mt-0.5",
  },
  search: {
    wrapper: "px-4 py-2 border-b border-border flex-shrink-0",
    input:
      "w-full text-[12px] pl-8 pr-3 py-1.5 h-8 rounded bg-background border border-border focus:border-accent focus:outline-none placeholder:text-foreground/30",
    icon: "absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30",
  },
  card: {
    wrapper:
      "p-3 rounded-lg border transition-all duration-200 cursor-pointer",
    title: "text-[13px] font-medium text-foreground truncate",
    subtitle: "text-[11px] text-foreground/40",
    badge: "px-1.5 py-0.5 text-[10px] font-bold rounded",
  },
  scrollArea: "flex-1 overflow-y-auto px-4 py-3",
} as const;

/** Badge color variants for entity types */
export const TYPE_BADGE_COLORS = {
  GRP: "bg-blue-500/15 text-blue-400",
  SUB: "bg-purple-500/15 text-purple-400",
  MODEL: "bg-foreground/8 text-foreground/50",
} as const;
