
import type {
  DeckRecommendation,
} from "./deckRecommendation.js";

export type RecommendationGroundingStatus =
  | "grounded"
  | "rejected";

export type RecommendationGroundingReason =
  | "UNKNOWN_CARD"
  | "CARD_NOT_IN_SECTION"
  | "INSUFFICIENT_COPIES"
  | "UNKNOWN_REPLACEMENT"
  | "SAME_CARD"
  | "SECTION_MISMATCH";

export interface GroundedDeckRecommendation {
  recommendation: DeckRecommendation;
  status: RecommendationGroundingStatus;
  reasons: RecommendationGroundingReason[];
}

export interface DeckRecommendationGroundingResult {
  recommendations: GroundedDeckRecommendation[];
  groundedCount: number;
  rejectedCount: number;
}
