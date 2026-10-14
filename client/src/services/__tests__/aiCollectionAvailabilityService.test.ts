import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildAICollectionAvailability,
} from "../ai/aiCollectionAvailabilityService";

describe("buildAICollectionAvailability", () => {
  it("calculates available copies after deck allocation", () => {
    const result = buildAICollectionAvailability(
      [
        {
          id: 100,
          name: "Starter",
          type: "Effect Monster",
          description: "Starts a combo.",
          ownedQuantity: 3,
          allowedCopies: 3,
        },
      ],
      [
        { id: 100, quantity: 1 },
        { id: 100, quantity: 1 },
      ]
    );

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].deckQuantity).toBe(2);
    expect(result.cards[0].availableQuantity).toBe(1);
  });

  it("preserves Forbidden card limits", () => {
    const result = buildAICollectionAvailability(
      [
        {
          id: 200,
          name: "Forbidden Card",
          type: "Effect Monster",
          description: "Test card.",
          ownedQuantity: 1,
          allowedCopies: 0,
        },
      ],
      []
    );

    expect(result.cards[0].allowedCopies).toBe(0);
  });

  it("preserves Limited card limits", () => {
    const result = buildAICollectionAvailability(
      [
        {
          id: 300,
          name: "Limited Card",
          type: "Effect Monster",
          description: "Test card.",
          ownedQuantity: 2,
          allowedCopies: 1,
        },
      ],
      []
    );

    expect(result.cards[0].allowedCopies).toBe(1);
  });

  it("preserves Semi-Limited card limits", () => {
    const result = buildAICollectionAvailability(
      [
        {
          id: 400,
          name: "Semi-Limited Card",
          type: "Effect Monster",
          description: "Test card.",
          ownedQuantity: 3,
          allowedCopies: 2,
        },
      ],
      []
    );

    expect(result.cards[0].allowedCopies).toBe(2);
  });

  it("preserves Unlimited card limits", () => {
    const result = buildAICollectionAvailability(
      [
        {
          id: 500,
          name: "Unlimited Card",
          type: "Effect Monster",
          description: "Test card.",
          ownedQuantity: 3,
          allowedCopies: 3,
        },
      ],
      []
    );

    expect(result.cards[0].allowedCopies).toBe(3);
  });

  it("does not invent missing banlist limits", () => {
    const result = buildAICollectionAvailability(
      [
        {
          id: 600,
          name: "Unknown Status Card",
          type: "Effect Monster",
          description: "Test card.",
          ownedQuantity: 1,
        },
      ],
      []
    );

    expect(result.cards[0].allowedCopies).toBeUndefined();
  });

  it("excludes cards with no available copies", () => {
    const result = buildAICollectionAvailability(
      [
        {
          id: 700,
          name: "Fully Allocated Card",
          type: "Effect Monster",
          description: "Test card.",
          ownedQuantity: 2,
          allowedCopies: 3,
        },
      ],
      [{ id: 700, quantity: 2 }]
    );

    expect(result.cards).toHaveLength(0);
  });

  it("does not mutate input arrays", () => {
    const collection = [
      {
        id: 800,
        name: "Test Card",
        type: "Effect Monster",
        description: "Test.",
        ownedQuantity: 2,
        allowedCopies: 3,
      },
    ];

    const deckCards = [
      { id: 800, quantity: 1 },
    ];

    const originalCollection =
      structuredClone(collection);

    const originalDeckCards =
      structuredClone(deckCards);

    buildAICollectionAvailability(
      collection,
      deckCards
    );

    expect(collection).toEqual(originalCollection);
    expect(deckCards).toEqual(originalDeckCards);
  });
});
