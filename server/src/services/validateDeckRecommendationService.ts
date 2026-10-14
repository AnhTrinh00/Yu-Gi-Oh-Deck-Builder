import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import type {
  DeckRecommendationResponse,
} from "../schemas/deckRecommendation.js";

import type {
  DeckRecommendationGroundingResult,
} from "../schemas/deckRecommendationGrounding.js";

import type {
  ValidatedDeckRecommendationResponse,
} from "../schemas/validateDeckRecommendationResponse.js";

import {
  runDeckRecommendationPipeline,
} from "./deckRecommendationPipelineService.js";

export function buildValidatedDeckRecommendationResponse(
  request: DeckAnalysisRequest,
  response: DeckRecommendationResponse,
  existingGrounding?: DeckRecommendationGroundingResult
): ValidatedDeckRecommendationResponse {
  const pipeline = runDeckRecommendationPipeline(
    request,
    response,
    existingGrounding
  );

  return {
    ...response,
    validation: {
      grounding: pipeline.grounding,
      independentValidation: pipeline.validation,
      simulation: pipeline.simulation,
    },
  };
}