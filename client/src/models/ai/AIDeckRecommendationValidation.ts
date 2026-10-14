import type {
  AIDeckRecommendation,
  AIDeckRecommendationAnalysis,
  AIDeckRecommendationGrounding,
} from "./AIDeckRecommendation";

export type {
  AIDeckRecommendation,
  AIDeckRecommendationAnalysis,
} from "./AIDeckRecommendation";

export type RecommendationValidationReason =
  | "NOT_GROUNDED"
  | "UNKNOWN_CARD"
  | "UNKNOWN_REPLACEMENT"
  | "CARD_NOT_IN_SECTION"
  | "INSUFFICIENT_DECK_COPIES"
  | "INSUFFICIENT_OWNED_COPIES"
  | "INVALID_SECTION"
  | "BANLIST_LIMIT"
  | "COPY_LIMIT"
  | "DECK_SIZE_LIMIT";

export interface GroundedRecommendation {
  recommendation: AIDeckRecommendation;
  status: "grounded" | "rejected";
  reasons: string[];
}

export interface DeckRecommendationGroundingResult {
  recommendations: GroundedRecommendation[];
  groundedCount: number;
  rejectedCount: number;
}

export interface ValidatedRecommendation {
  recommendation: AIDeckRecommendation;
  status: "valid" | "invalid";
  reasons: RecommendationValidationReason[];
}

export interface DeckRecommendationValidationResult {
  recommendations: ValidatedRecommendation[];
  validCount: number;
  invalidCount: number;
}

export interface SimulatedRecommendation {
  recommendation: AIDeckRecommendation;
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

export interface ValidatedDeckRecommendationApiResponse {
  analysis: AIDeckRecommendationAnalysis;
  grounding: AIDeckRecommendationGrounding;
  validation: DeckRecommendationValidationResult;
  simulation: DeckRecommendationSimulationResult;
}