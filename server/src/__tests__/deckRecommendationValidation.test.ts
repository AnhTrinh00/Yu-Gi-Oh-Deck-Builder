import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import type {
  DeckRecommendationGroundingResult,
} from "../schemas/deckRecommendationGrounding.js";

import {
  validateDeckRecommendations,
} from "../services/deckRecommendationValidationService.js";

const context: DeckAnalysisRequest["context"] = {
  version: 1,
  deckName: "Validation Test Deck",
  format: "advanced",
  cards: [
    {
      id: 100,
      name: "Starter",
      section: "main",
      quantity: 2,
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
    mainCount: 2,
    extraCount: 0,
    sideCount: 0,
    totalCount: 2,
    uniqueCards: 1,
    missingCopies: 0,
    isDeckValid: false,
    validationErrors: [],
  },
  availableCollectionCards: [
    {
      id: 200,
      name: "Extender",
      type: "Effect Monster",
      description: "Extends a combo.",
      ownedQuantity: 2,
      deckQuantity: 0,
      availableQuantity: 2,
      allowedCopies: 3,
    }, 
    {
      id: 300,
      name: "Fusion Boss",
      type: "Fusion Monster",
      description: "A Fusion Monster.",
      ownedQuantity: 2,
      deckQuantity: 0,
      availableQuantity: 2,
      allowedCopies: 3,
    }
  ],
  limitations: [],
};

function makeGrounding(
  action: "add" | "remove" | "replace",
  cardId: number,
  quantity: number,
  replacementCardId?: number,
  status: "grounded" | "rejected" = "grounded"
): DeckRecommendationGroundingResult {
  return {
    recommendations: [
      {
        recommendation: {
          action,
          cardId,
          section: "main",
          quantity,
          ...(replacementCardId !== undefined && {
            replacementCardId,
          }),
          reason: "Improve consistency.",
          confidence: "medium",
        },
        status,
        reasons: [],
      },
    ],
    groundedCount: status === "grounded" ? 1 : 0,
    rejectedCount: status === "rejected" ? 1 : 0,
  };
}

function withKnownCardLimit(
  cardId: number,
  allowedCopies: number
): DeckAnalysisRequest["context"] {
  const updated = structuredClone(context);

  const collectionCard =
    updated.availableCollectionCards?.find(
      card => card.id === cardId
    );

  if (!collectionCard) {
    throw new Error("Test card not found");
  }

  // The production context currently has no field for
  // collection-only banlist limits. Do not invent one.
  // This helper is reserved for the schema extension.
  void allowedCopies;

  return updated;
}

describe("validateDeckRecommendations", () => {
    it("accepts a grounded addition with a known card", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding("add", 200, 1)
    );

    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    });

    it("rejects unknown card references", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding("add", 999, 1)
    );

    expect(result.invalidCount).toBe(1);
    expect(result.recommendations[0].reasons)
        .toContain("UNKNOWN_CARD");
    });

    it("rejects removals exceeding deck quantity", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding("remove", 100, 3)
    );

    expect(result.invalidCount).toBe(1);
    expect(result.recommendations[0].reasons)
        .toContain("INSUFFICIENT_DECK_COPIES");
    });

    it("rejects removing cards not in the deck", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding("remove", 200, 1)
    );

    expect(result.invalidCount).toBe(1);
    expect(result.recommendations[0].reasons)
        .toContain("CARD_NOT_IN_SECTION");
    });

    it("rejects ungrounded recommendations", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding(
        "add",
        200,
        1,
        undefined,
        "rejected"
        )
    );

    expect(result.invalidCount).toBe(1);
    expect(result.recommendations[0].reasons)
        .toContain("NOT_GROUNDED");
    });

    it("rejects unknown replacement targets", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding("replace", 100, 1, 999)
    );

    expect(result.invalidCount).toBe(1);
    expect(result.recommendations[0].reasons)
        .toContain("UNKNOWN_REPLACEMENT");
    });

    it("does not mutate the deck context", () => {
    const before = structuredClone(context);

    validateDeckRecommendations(
        context,
        makeGrounding("remove", 100, 1)
    );

    expect(context).toEqual(before);
    });

    it("accepts adding available owned copies", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding("add", 200, 2)
    );

    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    });

    it("rejects additions exceeding available ownership", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding("add", 200, 3)
    );

    expect(result.invalidCount).toBe(1);

    expect(result.recommendations[0].reasons)
        .toContain("INSUFFICIENT_OWNED_COPIES");
    });

    it("accepts replacements with available owned copies", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding("replace", 100, 1, 200)
    );

    expect(result.validCount).toBe(1);
    });

    it("rejects replacements exceeding available ownership", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding("replace", 100, 2, 200)
    );

    // Override the collection availability for this test.
    // Only one copy of Extender remains available.
    const limitedContext = structuredClone(context);

    limitedContext.availableCollectionCards = [
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
    ];

    const limitedResult = validateDeckRecommendations(
        limitedContext,
        makeGrounding("replace", 100, 2, 200)
    );

    expect(limitedResult.invalidCount).toBe(1);

    expect(limitedResult.recommendations[0].reasons)
        .toContain("INSUFFICIENT_OWNED_COPIES");

    // Original context should remain unchanged.
    expect(result.validCount).toBe(1);
    });

    it("rejects additions when collection availability is missing", () => {
    const noCollectionContext = structuredClone(context);

    delete noCollectionContext.availableCollectionCards;

    const result = validateDeckRecommendations(
        noCollectionContext,
        makeGrounding("add", 200, 1)
    );

    expect(result.invalidCount).toBe(1);

    expect(result.recommendations[0].reasons)
        .toContain("INSUFFICIENT_OWNED_COPIES");
    });

    it("does not require ownership for removals", () => {
    const noCollectionContext = structuredClone(context);

    delete noCollectionContext.availableCollectionCards;

    const result = validateDeckRecommendations(
        noCollectionContext,
        makeGrounding("remove", 100, 1)
    );

    expect(result.validCount).toBe(1);
    });

    it("rejects adding an Extra Deck monster to Main Deck", () => {
    const grounding = makeGrounding("add", 300, 1);

    const result = validateDeckRecommendations(
        context,
        grounding
    );

    expect(result.invalidCount).toBe(1);

    expect(result.recommendations[0].reasons)
        .toContain("INVALID_SECTION");
    });

    it("allows adding an Extra Deck monster to Side Deck", () => {
    const grounding = makeGrounding("add", 300, 1);

    grounding.recommendations[0].recommendation.section =
        "side";

    const result = validateDeckRecommendations(
        context,
        grounding
    );

    expect(result.validCount).toBe(1);
    });

    it("rejects replacing a Main Deck card with a Fusion Monster", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding("replace", 100, 1, 300)
    );

    expect(result.invalidCount).toBe(1);

    expect(result.recommendations[0].reasons)
        .toContain("INVALID_SECTION");
    });

    it("allows replacing a Main Deck card with another Main Deck monster", () => {
    const result = validateDeckRecommendations(
        context,
        makeGrounding("replace", 100, 1, 200)
    );

    expect(result.validCount).toBe(1);
    });

    it("rejects additions when the banlist limit is unknown", () => {
    const unknownLimitContext = structuredClone(context);

    const extender =
        unknownLimitContext.availableCollectionCards?.find(
        card => card.id === 200
        );

    if (!extender) {
        throw new Error("Extender fixture is missing");
    }

    delete extender.allowedCopies;

    const result = validateDeckRecommendations(
        unknownLimitContext,
        makeGrounding("add", 200, 1)
    );

    expect(result.invalidCount).toBe(1);

    expect(result.recommendations[0].reasons)
        .toContain("BANLIST_LIMIT");
    });
});
