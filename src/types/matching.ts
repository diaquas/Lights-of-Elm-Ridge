export interface MatchReasoning {
  components: ReasoningComponent[];
  whyNotHigher?: string[];
  summary: string;
  /** Pixel counts for the source and destination models (when available) */
  pixelComparison?: { source: number; dest: number };
}

export interface ReasoningComponent {
  factor: string;
  description: string;
  score: number;
  maxScore: number;
}
