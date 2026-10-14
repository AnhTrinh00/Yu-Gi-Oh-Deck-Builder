import type {
  DeckRecommendation,
} from "./deckRecommendation.js";

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

export interface ValidatedDeckRecommendation {
  recommendation: DeckRecommendation;
  status: "valid" | "invalid";
  reasons: RecommendationValidationReason[];
}

export interface DeckRecommendationValidationResult {
  recommendations: ValidatedDeckRecommendation[];
  validCount: number;
  invalidCount: number;
}
