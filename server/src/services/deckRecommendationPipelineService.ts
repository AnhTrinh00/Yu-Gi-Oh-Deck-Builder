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
  DeckRecommendationPipelineResult,
} from "../schemas/deckRecommendationPipeline.js";

import {
  groundDeckRecommendations,
} from "./deckRecommendationGroundingService.js";

import {
  validateDeckRecommendations,
} from "./deckRecommendationValidationService.js";

import {
  simulateDeckRecommendations,
} from "./deckRecommendationSimulationService.js";

export function runDeckRecommendationPipeline(
  request: DeckAnalysisRequest,
  response: DeckRecommendationResponse,
  existingGrounding?: DeckRecommendationGroundingResult
): DeckRecommendationPipelineResult {
  const grounding =
    existingGrounding ??
    groundDeckRecommendations(
      request.context,
      response
    );

  const validation = validateDeckRecommendations(
    request.context,
    grounding
  );

  const simulation = simulateDeckRecommendations(
    request,
    validation
  );

  return {
    grounding,
    validation,
    simulation,
  };
}