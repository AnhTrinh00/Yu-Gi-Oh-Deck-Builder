
import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import type {
  DeckRecommendationResponse,
} from "../schemas/deckRecommendation.js";

import type {
  DeckRecommendationGroundingResult,
} from "../schemas/deckRecommendationGrounding.js";

import {
  deckRecommendationResponseSchema,
} from "../schemas/deckRecommendation.js";

import {
  groundDeckRecommendations,
} from "./deckRecommendationGroundingService.js";

export interface DeckRecommendationProvider {
  recommend(
    request: DeckAnalysisRequest
  ): Promise<DeckRecommendationResponse>;
}

export interface DeckRecommendationResult {
  analysis: DeckRecommendationResponse;
  grounding: DeckRecommendationGroundingResult;
}

export async function generateDeckRecommendations(
  request: DeckAnalysisRequest,
  provider: DeckRecommendationProvider
): Promise<DeckRecommendationResult> {
  const response = await provider.recommend(request);

  // Validate provider output even when using a mock
  // or a different LLM implementation.
  const analysis =
    deckRecommendationResponseSchema.parse(response);

  const grounding = groundDeckRecommendations(
    request.context,
    analysis
  );

  return {
    analysis,
    grounding,
  };
}
