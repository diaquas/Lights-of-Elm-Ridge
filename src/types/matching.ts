export interface MatchReasoning {
  components: ReasoningComponent[];
  whyNotHigher?: string[];
  summary: string;
}

export interface ReasoningComponent {
  factor: string;
  description: string;
  score: number;
  maxScore: number;
}
