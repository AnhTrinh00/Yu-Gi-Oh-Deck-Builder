
import type {
  DeckRecommendationGroundingResult,
} from "./deckRecommendationGrounding.js";

import type {
  DeckRecommendationValidationResult,
} from "./deckRecommendationValidation.js";

import type {
  DeckRecommendationSimulationResult,
} from "./deckRecommendationSimulation.js";

export interface DeckRecommendationPipelineResult {
  grounding: DeckRecommendationGroundingResult;
  validation: DeckRecommendationValidationResult;
  simulation: DeckRecommendationSimulationResult;
}
