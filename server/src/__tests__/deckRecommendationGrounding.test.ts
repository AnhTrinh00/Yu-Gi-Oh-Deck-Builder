
import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import type {
  DeckRecommendationResponse,
  DeckRecommendation,
} from "../schemas/deckRecommendation.js";

import {
  groundDeckRecommendations,
} from "../services/deckRecommendationGroundingService.js";

function makeContext(): DeckAnalysisRequest["context"] {
  return {
    version: 1,
    deckName: "Test Deck",
    format: "advanced",
    cards: [
      {
        id: 100,
        name: "Starter",
        section: "main",
        quantity: 2,
        type: "Effect Monster",
        race: "Warrior",
        description: "Starter effect.",
        ownedQuantity: 3,
        missingQuantity: 0,
        banlistStatus: "Unlimited",
        allowedCopies: 3,
      },
      {
        id: 200,
        name: "Extra Deck Monster",
        section: "extra",
        quantity: 1,
        type: "Fusion Monster",
        race: "Dragon",
        description: "Fusion effect.",
        ownedQuantity: 1,
        missingQuantity: 0,
        banlistStatus: "Unlimited",
        allowedCopies: 3,
      },
    ],
    statistics: {
      mainCount: 2,
      extraCount: 1,
      sideCount: 0,
      totalCount: 3,
      uniqueCards: 2,
      missingCopies: 0,
      isDeckValid: false,
      validationErrors: [],
    },
    limitations: [],
  };
}

function makeRecommendation(
  overrides: Partial<DeckRecommendation> = {}
): DeckRecommendation {
  return {
    action: "remove",
    cardId: 100,
    section: "main",
    quantity: 1,
    reason: "Example recommendation.",
    confidence: "medium",
    ...overrides,
  };
}

function makeResponse(
  recommendations: DeckRecommendation[]
): DeckRecommendationResponse {
  return {
    version: 1,
    summary: "Example analysis.",
    recommendations,
    strengths: [],
    weaknesses: [],
    warnings: [],
  };
}

describe("groundDeckRecommendations", () => {
  it("accepts a grounded removal", () => {
    const result = groundDeckRecommendations(
      makeContext(),
      makeResponse([makeRecommendation()])
    );

    expect(result.groundedCount).toBe(1);
    expect(result.rejectedCount).toBe(0);
    expect(result.recommendations[0].reasons).toEqual([]);
  });

  it("rejects unknown card IDs", () => {
    const result = groundDeckRecommendations(
      makeContext(),
      makeResponse([
        makeRecommendation({ cardId: 999 }),
      ])
    );

    expect(result.recommendations[0].reasons)
      .toContain("UNKNOWN_CARD");
  });

  it("rejects removal from an incorrect section", () => {
    const result = groundDeckRecommendations(
      makeContext(),
      makeResponse([
        makeRecommendation({ section: "side" }),
      ])
    );

    expect(result.recommendations[0].reasons)
      .toContain("CARD_NOT_IN_SECTION");
  });

  it("rejects removing too many copies", () => {
    const result = groundDeckRecommendations(
      makeContext(),
      makeResponse([
        makeRecommendation({ quantity: 3 }),
      ])
    );

    expect(result.recommendations[0].reasons)
      .toContain("INSUFFICIENT_COPIES");
  });

  it("rejects unknown replacement targets", () => {
    const result = groundDeckRecommendations(
      makeContext(),
      makeResponse([
        makeRecommendation({
          action: "replace",
          replacementCardId: 999,
        }),
      ])
    );

    expect(result.recommendations[0].reasons)
      .toContain("UNKNOWN_REPLACEMENT");
  });

  it("accepts a grounded replacement reference", () => {
    const result = groundDeckRecommendations(
      makeContext(),
      makeResponse([
        makeRecommendation({
          action: "replace",
          replacementCardId: 200,
        }),
      ])
    );

    expect(result.groundedCount).toBe(1);
  });

  it("does not mutate the AI response", () => {
    const response = makeResponse([
      makeRecommendation(),
    ]);

    const before = JSON.stringify(response);

    groundDeckRecommendations(
      makeContext(),
      response
    );

    expect(JSON.stringify(response)).toBe(before);
  });

  it("returns empty results for no recommendations", () => {
    const result = groundDeckRecommendations(
      makeContext(),
      makeResponse([])
    );

    expect(result.recommendations).toEqual([]);
    expect(result.groundedCount).toBe(0);
    expect(result.rejectedCount).toBe(0);
  });
});
