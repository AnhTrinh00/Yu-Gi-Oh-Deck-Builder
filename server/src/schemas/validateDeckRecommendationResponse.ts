import type {
  DeckRecommendationResponse,
} from "./deckRecommendation.js";

import type {
  DeckRecommendationPipelineResult,
} from "./deckRecommendationPipeline.js";

export interface ValidatedDeckRecommendationResponse
  extends DeckRecommendationResponse {
  validation: {
    grounding:
      DeckRecommendationPipelineResult["grounding"];

    independentValidation:
      DeckRecommendationPipelineResult["validation"];

    simulation:
      DeckRecommendationPipelineResult["simulation"];
  };
}