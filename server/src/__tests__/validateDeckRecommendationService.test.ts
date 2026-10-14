import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import type {
  DeckRecommendationResponse,
} from "../schemas/deckRecommendation.js";

import {
  runDeckRecommendationPipeline,
} from "../services/deckRecommendationPipelineService.js";

import {
  buildValidatedDeckRecommendationResponse,
} from "../services/validateDeckRecommendationService.js";

vi.mock(
  "../services/deckRecommendationPipelineService.js",
  () => ({
    runDeckRecommendationPipeline: vi.fn(),
  })
);

const mockedPipeline = vi.mocked(
  runDeckRecommendationPipeline
);

describe("buildValidatedDeckRecommendationResponse", () => {
  it("preserves the original Gemini response", () => {
    const request = {
      question: "",
      context: {
        version: 1,
        deckName: "Test Deck",
        format: "advanced",
        cards: [],
        statistics: {
          mainCount: 0,
          extraCount: 0,
          sideCount: 0,
          totalCount: 0,
          uniqueCards: 0,
          missingCopies: 0,
          isDeckValid: false,
          validationErrors: [],
        },
        limitations: [],
      },
    } satisfies DeckAnalysisRequest;

    const response = {
      version: 1,
      summary: "Improve consistency.",
      recommendations: [],
      strengths: ["Good starter access."],
      weaknesses: [],
      warnings: [],
    } satisfies DeckRecommendationResponse;

    const pipeline = {
      grounding: {
        recommendations: [],
        groundedCount: 0,
        rejectedCount: 0,
      },
      validation: {
        recommendations: [],
        validCount: 0,
        invalidCount: 0,
      },
      simulation: {
        recommendations: [],
        appliedCount: 0,
        rejectedCount: 0,
        initialCounts: {
          main: 0,
          extra: 0,
          side: 0,
        },
        finalCounts: {
          main: 0,
          extra: 0,
          side: 0,
        },
      },
    };

    mockedPipeline.mockReturnValue(pipeline);

    const result =
      buildValidatedDeckRecommendationResponse(
        request,
        response
      );

    expect(result.summary).toBe(response.summary);
    expect(result.recommendations).toEqual(
      response.recommendations
    );

    expect(result.strengths).toEqual(
      response.strengths
    );

    expect(result.validation.grounding).toEqual(
      pipeline.grounding
    );

    expect(
      result.validation.independentValidation
    ).toEqual(pipeline.validation);

    expect(result.validation.simulation).toEqual(
      pipeline.simulation
    );
  });

  it("forwards existing grounding to the pipeline", () => {
    const grounding = {
        recommendations: [],
        groundedCount: 0,
        rejectedCount: 0,
    };

    const request = {
        question: "",
        context: {
        version: 1,
        deckName: "Test Deck",
        format: "advanced",
        cards: [],
        statistics: {
            mainCount: 0,
            extraCount: 0,
            sideCount: 0,
            totalCount: 0,
            uniqueCards: 0,
            missingCopies: 0,
            isDeckValid: false,
            validationErrors: [],
        },
        limitations: [],
        },
    } satisfies DeckAnalysisRequest;

    const response = {
        version: 1,
        summary: "Test",
        recommendations: [],
        strengths: [],
        weaknesses: [],
        warnings: [],
    } satisfies DeckRecommendationResponse;

    mockedPipeline.mockReturnValue({
        grounding,
        validation: {
        recommendations: [],
        validCount: 0,
        invalidCount: 0,
        },
        simulation: {
        recommendations: [],
        appliedCount: 0,
        rejectedCount: 0,
        initialCounts: {
            main: 0,
            extra: 0,
            side: 0,
        },
        finalCounts: {
            main: 0,
            extra: 0,
            side: 0,
        },
        },
    });

    buildValidatedDeckRecommendationResponse(
        request,
        response,
        grounding
    );

    expect(mockedPipeline).toHaveBeenCalledWith(
        request,
        response,
        grounding
    );
  });
});
