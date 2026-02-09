export interface MatchReasoning {
  components: ReasoningComponent[];
  whyNotHigher?: string[];
  summary: string;
  /** Pixel counts for the source and destination models (when available) */
  pixelComparison?: { source: number; dest: number };
  /** Effect-based affinity analysis (when effect type data is available) */
  effectAffinity?: { bonus: number; reasons: string[] };
}

export interface ReasoningComponent {
  factor: string;
  description: string;
  score: number;
  maxScore: number;
}
