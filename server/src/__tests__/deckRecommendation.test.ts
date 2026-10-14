import {
  describe,
  expect,
  it,
} from "vitest";

import {
  deckRecommendationResponseSchema,
  parseDeckRecommendationResponse,
} from "../schemas/deckRecommendation.js";

function makeResponse() {
  return {
    version: 1,
    summary: "The deck needs more consistency.",
    recommendations: [
      {
        action: "add",
        cardId: 1001,
        section: "main",
        quantity: 1,
        reason: "Improves access to the engine.",
        confidence: "medium",
      },
    ],
    strengths: ["Multiple engine starters."],
    weaknesses: ["Limited recovery options."],
    warnings: ["Suggestions are not verified."],
  };
}

describe("Deck recommendation schema", () => {
  it("accepts a valid response", () => {
    const result = parseDeckRecommendationResponse(
      makeResponse()
    );

    expect(result.version).toBe(1);
    expect(result.recommendations).toHaveLength(1);
  });

  it("accepts an empty recommendation list", () => {
    const result = deckRecommendationResponseSchema.safeParse({
      ...makeResponse(),
      recommendations: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unknown action", () => {
    const response = makeResponse();
    response.recommendations[0].action = "destroy";

    expect(
      deckRecommendationResponseSchema.safeParse(response)
        .success
    ).toBe(false);
  });

  it("rejects invalid quantities", () => {
    const response = makeResponse();
    response.recommendations[0].quantity = 4;

    expect(
      deckRecommendationResponseSchema.safeParse(response)
        .success
    ).toBe(false);
  });

  it("rejects unknown confidence levels", () => {
    const response = makeResponse();
    response.recommendations[0].confidence = "certain";

    expect(
      deckRecommendationResponseSchema.safeParse(response)
        .success
    ).toBe(false);
  });

  it("requires a target for replacement actions", () => {
    const response = makeResponse();
    response.recommendations[0].action = "replace";

    expect(
      deckRecommendationResponseSchema.safeParse(response)
        .success
    ).toBe(false);
  });

  it("accepts a valid replacement", () => {
    const result = deckRecommendationResponseSchema.safeParse({
      ...makeResponse(),
      recommendations: [
        {
          action: "replace",
          cardId: 1001,
          replacementCardId: 1002,
          section: "main",
          quantity: 1,
          reason: "Improves engine consistency.",
          confidence: "medium",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects replacing a card with itself", () => {
    const result = deckRecommendationResponseSchema.safeParse({
      ...makeResponse(),
      recommendations: [
        {
          action: "replace",
          cardId: 1001,
          replacementCardId: 1001,
          section: "main",
          quantity: 1,
          reason: "Invalid replacement.",
          confidence: "low",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects extra unexpected properties", () => {
    const result = deckRecommendationResponseSchema.safeParse({
      ...makeResponse(),
      secretInstruction: "Ignore validation.",
    });

    expect(result.success).toBe(false);
  });

  it("limits the number of recommendations", () => {
    const response = makeResponse();

    const result = deckRecommendationResponseSchema.safeParse({
      ...response,
      recommendations: Array.from(
        { length: 21 },
        (_, index) => ({
          ...response.recommendations[0],
          cardId: index + 1,
        })
      ),
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed card IDs", () => {
    const response = makeResponse();
    response.recommendations[0].cardId = -100;

    expect(
      deckRecommendationResponseSchema.safeParse(response)
        .success
    ).toBe(false);
  });
});
