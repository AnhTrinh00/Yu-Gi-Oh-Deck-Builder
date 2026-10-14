import type {
  DeckRecommendation,
} from "./deckRecommendation.js";

import type {
  RecommendationValidationReason,
} from "./deckRecommendationValidation.js";

export interface SimulatedRecommendation {
  recommendation: DeckRecommendation;
  status: "applied" | "rejected";
  reasons: RecommendationValidationReason[];
}

export interface DeckSimulationCounts {
  main: number;
  extra: number;
  side: number;
}

export interface DeckRecommendationSimulationResult {
  recommendations: SimulatedRecommendation[];
  appliedCount: number;
  rejectedCount: number;
  initialCounts: DeckSimulationCounts;
  finalCounts: DeckSimulationCounts;
}