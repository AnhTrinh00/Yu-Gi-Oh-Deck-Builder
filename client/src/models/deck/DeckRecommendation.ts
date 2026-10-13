
export type RecommendationType =
  | "starter-consistency"
  | "missing-synergy"
  | "isolated-card"
  | "combo-accessibility"
  | "deck-size"
  | "collection-opportunity";

export type RecommendationPriority =
  | "high"
  | "medium"
  | "low";

export interface DeckRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  score: number;
  title: string;
  description: string;
  evidence: string[];
  relatedCardIds: number[];
}
