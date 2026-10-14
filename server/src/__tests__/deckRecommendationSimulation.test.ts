import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import type {
  DeckRecommendationValidationResult,
} from "../schemas/deckRecommendationValidation.js";

import {
  simulateDeckRecommendations,
} from "../services/deckRecommendationSimulationService.js";

const makeRequest = (): DeckAnalysisRequest => ({
  question: "",
  context: {
    version: 1,
    deckName: "Simulation Test",
    format: "advanced",
    cards: [
      {
        id: 100,
        name: "Starter",
        section: "main",
        quantity: 1,
        type: "Effect Monster",
        race: "Warrior",
        description: "Starts a combo.",
        ownedQuantity: 3,
        missingQuantity: 0,
        banlistStatus: "Unlimited",
        allowedCopies: 3,
      },
    ],
    statistics: {
      mainCount: 1,
      extraCount: 0,
      sideCount: 0,
      totalCount: 1,
      uniqueCards: 1,
      missingCopies: 0,
      isDeckValid: false,
      validationErrors: [],
    },
    limitations: [],
    availableCollectionCards: [
      {
        id: 200,
        name: "Extender",
        type: "Effect Monster",
        description: "Extends a combo.",
        ownedQuantity: 1,
        deckQuantity: 0,
        availableQuantity: 1,
        allowedCopies: 3,
      },
    ],
    collectionCatalogTruncated: false,
  },
});

function makeValidation(
  recommendations:
    DeckRecommendationValidationResult["recommendations"]
): DeckRecommendationValidationResult {
  return {
    recommendations,
    validCount: recommendations.filter(
      item => item.status === "valid"
    ).length,
    invalidCount: recommendations.filter(
      item => item.status === "invalid"
    ).length,
  };
}

const addExtender = {
  action: "add" as const,
  cardId: 200,
  section: "main" as const,
  quantity: 1,
  reason: "Improve extension.",
  confidence: "high" as const,
};

describe("simulateDeckRecommendations", () => {
  it("rejects the second addition when ownership is exhausted", () => {
    const request = makeRequest();

    const validation = makeValidation([
      {
        recommendation: addExtender,
        status: "valid",
        reasons: [],
      },
      {
        recommendation: addExtender,
        status: "valid",
        reasons: [],
      },
    ]);

    const result = simulateDeckRecommendations(
      request,
      validation
    );

    expect(
      result.recommendations.map(item => item.status)
    ).toEqual(["applied", "rejected"]);

    expect(
      result.recommendations[1].reasons
    ).toContain("INSUFFICIENT_OWNED_COPIES");

    expect(result.finalCounts.main).toBe(2);
  });

  it("applies a valid removal", () => {
    const request = makeRequest();

    const validation = makeValidation([
      {
        recommendation: {
          action: "remove",
          cardId: 100,
          section: "main",
          quantity: 1,
          reason: "Remove Starter.",
          confidence: "high" as const,
        },
        status: "valid",
        reasons: [],
      },
    ]);

    const result = simulateDeckRecommendations(
      request,
      validation
    );

    expect(result.appliedCount).toBe(1);
    expect(result.finalCounts.main).toBe(0);
  });

  it("rejects a second removal after copies are exhausted", () => {
    const request = makeRequest();

    const removal = {
      action: "remove" as const,
      cardId: 100,
      section: "main" as const,
      quantity: 1,
      reason: "Remove Starter.",
      confidence: "high" as const,
    };

    const validation = makeValidation([
      {
        recommendation: removal,
        status: "valid",
        reasons: [],
      },
      {
        recommendation: removal,
        status: "valid",
        reasons: [],
      },
    ]);

    const result = simulateDeckRecommendations(
      request,
      validation
    );

    expect(
      result.recommendations.map(item => item.status)
    ).toEqual(["applied", "rejected"]);

    expect(
      result.recommendations[1].reasons
    ).toContain("INSUFFICIENT_DECK_COPIES");
  });

  it("does not mutate the original request", () => {
    const request = makeRequest();

    const before = structuredClone(request);

    const validation = makeValidation([
      {
        recommendation: addExtender,
        status: "valid",
        reasons: [],
      },
    ]);

    simulateDeckRecommendations(
      request,
      validation
    );

    expect(request).toEqual(before);
  });

  it("preserves the original validation result", () => {
    const request = makeRequest();

    const validation = makeValidation([
      {
        recommendation: addExtender,
        status: "valid",
        reasons: [],
      },
    ]);

    const before = structuredClone(validation);

    simulateDeckRecommendations(
      request,
      validation
    );

    expect(validation).toEqual(before);
  });

  it("rejects additions exceeding cumulative banlist limits", () => {
  const request = makeRequest();

  const extender =
    request.context.availableCollectionCards?.find(
      card => card.id === 200
    );

  if (!extender) {
    throw new Error("Missing Extender fixture");
  }

  extender.ownedQuantity = 3;
  extender.availableQuantity = 3;
  extender.allowedCopies = 1;

  const validation = makeValidation([
    {
      recommendation: addExtender,
      status: "valid",
      reasons: [],
    },
    {
      recommendation: addExtender,
      status: "valid",
      reasons: [],
    },
  ]);

  const result = simulateDeckRecommendations(
    request,
    validation
  );

  expect(result.recommendations[0].status).toBe("applied");
  expect(result.recommendations[1].status).toBe("rejected");

  expect(result.recommendations[1].reasons).toContain(
    "BANLIST_LIMIT"
  );
  });

  it("rejects additions exceeding Main Deck capacity", () => {
  const request = makeRequest();

  request.context.cards = Array.from(
    { length: 20 },
    (_, index) => ({
      ...request.context.cards[0],
      id: 1000 + index,
      name: `Monster ${index}`,
      quantity: 3,
      ownedQuantity: 3,
      allowedCopies: 3,
    })
  );

  request.context.statistics.mainCount = 60;
  request.context.statistics.totalCount = 60;

  const validation = makeValidation([
    {
      recommendation: addExtender,
      status: "valid",
      reasons: [],
    },
  ]);

  const result = simulateDeckRecommendations(
    request,
    validation
  );

  expect(result.recommendations[0].status).toBe("rejected");

  expect(result.recommendations[0].reasons).toContain(
    "DECK_SIZE_LIMIT"
  );

  expect(result.finalCounts.main).toBe(60);
  });

  it("rolls back replacement when ownership is insufficient", () => {
  const request = makeRequest();

  const extender =
    request.context.availableCollectionCards?.find(
      card => card.id === 200
    );

  if (!extender) {
    throw new Error("Missing Extender fixture");
  }

  extender.ownedQuantity = 0;
  extender.availableQuantity = 0;

  const validation = makeValidation([
    {
      recommendation: {
        action: "replace",
        cardId: 100,
        replacementCardId: 200,
        section: "main",
        quantity: 1,
        reason: "Replace Starter with Extender.",
        confidence: "high",
      },
      status: "valid",
      reasons: [],
    },
  ]);

  const result = simulateDeckRecommendations(
    request,
    validation
  );

  expect(result.recommendations[0].status).toBe("rejected");

  expect(result.recommendations[0].reasons).toContain(
    "INSUFFICIENT_OWNED_COPIES"
  );

  expect(result.finalCounts.main).toBe(1);
  });

  it("applies a valid replacement without changing section size", () => {
  const request = makeRequest();

  const validation = makeValidation([
    {
      recommendation: {
        action: "replace",
        cardId: 100,
        replacementCardId: 200,
        section: "main",
        quantity: 1,
        reason: "Replace Starter with Extender.",
        confidence: "high",
      },
      status: "valid",
      reasons: [],
    },
  ]);

  const result = simulateDeckRecommendations(
    request,
    validation
  );

  expect(result.recommendations[0].status).toBe("applied");
  expect(result.finalCounts.main).toBe(1);
  });

  it("rejects recommendations already marked invalid", () => {
  const request = makeRequest();

  const validation = makeValidation([
    {
      recommendation: addExtender,
      status: "invalid",
      reasons: ["NOT_GROUNDED"],
    },
  ]);

  const result = simulateDeckRecommendations(
    request,
    validation
  );

  expect(result.recommendations[0].status).toBe("rejected");

  expect(result.recommendations[0].reasons).toContain(
    "NOT_GROUNDED"
  );

  expect(result.finalCounts).toEqual(
    result.initialCounts
  );
  });
 
  it("rejects a second replacement when its source was already removed", () => {
  const request = makeRequest();

  const replacement = {
    action: "replace" as const,
    cardId: 100,
    replacementCardId: 200,
    section: "main" as const,
    quantity: 1,
    reason: "Replace Starter.",
    confidence: "high" as const,
  };

  const validation = makeValidation([
    {
      recommendation: replacement,
      status: "valid",
      reasons: [],
    },
    {
      recommendation: replacement,
      status: "valid",
      reasons: [],
    },
  ]);

  const result = simulateDeckRecommendations(
    request,
    validation
  );

  expect(
    result.recommendations.map(item => item.status)
  ).toEqual(["applied", "rejected"]);

  expect(result.recommendations[1].reasons).toContain(
    "INSUFFICIENT_DECK_COPIES"
  );
  });
});