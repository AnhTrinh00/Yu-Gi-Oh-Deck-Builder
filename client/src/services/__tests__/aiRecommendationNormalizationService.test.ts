import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ValidatedDeckRecommendationApiResponse,
} from "../../models/ai/AIDeckRecommendationValidation";

import {
  normalizeAIRecommendations,
} from "../ai/aiRecommendationNormalizationService";

const addRecommendation = {
  action: "add" as const,
  cardId: 100,
  section: "main" as const,
  quantity: 1,
  reason: "Improves consistency.",
  confidence: "high" as const,
};

const removeRecommendation = {
  action: "remove" as const,
  cardId: 200,
  section: "main" as const,
  quantity: 1,
  reason: "Reduces unnecessary cards.",
  confidence: "medium" as const,
};

function makeResponse():
  ValidatedDeckRecommendationApiResponse {
  return {
    analysis: {
      version: 1,
      summary: "Improve the deck.",
      recommendations: [
        addRecommendation,
        removeRecommendation,
      ],
      strengths: [],
      weaknesses: [],
      warnings: [],
    },

    grounding: {
      recommendations: [
        {
          recommendation: addRecommendation,
          status: "grounded",
          reasons: [],
        },
        {
          recommendation: removeRecommendation,
          status: "grounded",
          reasons: [],
        },
      ],
      groundedCount: 2,
      rejectedCount: 0,
    },

    validation: {
      recommendations: [
        {
          recommendation: addRecommendation,
          status: "valid",
          reasons: [],
        },
        {
          recommendation: removeRecommendation,
          status: "valid",
          reasons: [],
        },
      ],
      validCount: 2,
      invalidCount: 0,
    },

    simulation: {
      recommendations: [
        {
          recommendation: addRecommendation,
          status: "applied",
          reasons: [],
        },
        {
          recommendation: removeRecommendation,
          status: "applied",
          reasons: [],
        },
      ],
      appliedCount: 2,
      rejectedCount: 0,

      initialCounts: {
        main: 40,
        extra: 10,
        side: 0,
      },

      finalCounts: {
        main: 40,
        extra: 10,
        side: 0,
      },
    },
  };
}

describe("normalizeAIRecommendations", () => {
  it("accepts recommendations passing all stages", () => {
    const result = normalizeAIRecommendations(
      makeResponse()
    );

    expect(result.acceptedCount).toBe(2);
    expect(result.rejectedCount).toBe(0);

    expect(
      result.recommendations[0].status
    ).toBe("accepted");
  });

  it("rejects independently invalid recommendations", () => {
    const response = makeResponse();

    response.validation.recommendations[0] = {
      recommendation: addRecommendation,
      status: "invalid",
      reasons: ["INSUFFICIENT_OWNED_COPIES"],
    };

    response.simulation.recommendations[0] = {
      recommendation: addRecommendation,
      status: "rejected",
      reasons: ["INSUFFICIENT_OWNED_COPIES"],
    };

    const result =
      normalizeAIRecommendations(response);

    expect(result.acceptedCount).toBe(1);
    expect(result.rejectedCount).toBe(1);

    expect(
      result.recommendations[0].reasonMessages
    ).toContain(
      "You do not own enough copies to make this change."
    );
  });

  it("rejects recommendations failing simulation", () => {
    const response = makeResponse();

    response.simulation.recommendations[1] = {
      recommendation: removeRecommendation,
      status: "rejected",
      reasons: ["INSUFFICIENT_DECK_COPIES"],
    };

    const result =
      normalizeAIRecommendations(response);

    expect(result.recommendations[1].status).toBe(
      "rejected"
    );

    expect(result.recommendations[1].validationStatus)
      .toBe("valid");

    expect(result.recommendations[1].simulationStatus)
      .toBe("rejected");
  });

  it("rejects recommendations failing grounding", () => {
    const response = makeResponse();

    response.grounding.recommendations[0] = {
      recommendation: addRecommendation,
      status: "rejected",
      reasons: ["UNKNOWN_CARD"],
    };

    const result =
      normalizeAIRecommendations(response);

    expect(result.recommendations[0].status).toBe(
      "rejected"
    );

    expect(
      result.recommendations[0].reasonMessages
    ).toContain(
      "The card could not be verified."
    );
  });

  it("preserves recommendation order", () => {
    const result =
      normalizeAIRecommendations(makeResponse());

    expect(
      result.recommendations.map(
        item => item.recommendation.cardId
      )
    ).toEqual([100, 200]);
  });

  it("rejects missing stage results", () => {
    const response = makeResponse();

    response.simulation.recommendations.pop();

    expect(() =>
      normalizeAIRecommendations(response)
    ).toThrow(
      "AI recommendation results are not aligned."
    );
  });

  it("rejects misaligned recommendation order", () => {
    const response = makeResponse();

    response.validation.recommendations.reverse();

    expect(() =>
      normalizeAIRecommendations(response)
    ).toThrow(
      "AI recommendation mismatch at index 0."
    );
  });

  it("does not mutate the original response", () => {
    const response = makeResponse();

    const original = structuredClone(response);

    normalizeAIRecommendations(response);

    expect(response).toEqual(original);
  });

  it("supports empty recommendation results", () => {
    const response = makeResponse();

    response.analysis.recommendations = [];
    response.grounding.recommendations = [];
    response.validation.recommendations = [];
    response.simulation.recommendations = [];

    const result =
      normalizeAIRecommendations(response);

    expect(result.recommendations).toEqual([]);
    expect(result.acceptedCount).toBe(0);
    expect(result.rejectedCount).toBe(0);
  });
});