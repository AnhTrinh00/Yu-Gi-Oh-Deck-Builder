
import {
  describe,
  expect,
  it,
} from "vitest";

import type { Card } from "../../models/card/Card";
import type { Deck } from "../../models/deck/Deck";

import {
  buildAIDeckContext,
} from "../ai/aiDeckContextService";

const makeCard = (
  id: number,
  overrides: Partial<Card> = {}
): Card => ({
  id,
  name: `Test Card ${id}`,
  type: "Effect Monster",
  frameType: "effect",
  description: "A sample card effect.",
  race: "Warrior",
  imageUrl: "",
  imageUrlSmall: "",
  ...overrides,
});

const monster = makeCard(100);
const fusion = makeCard(200, {
  type: "Fusion Monster",
  frameType: "fusion",
});

const emptyDeck = (): Deck => ({
  name: "Test Deck",
  main: [],
  extra: [],
  side: [],
});

describe("buildAIDeckContext", () => {
  it("builds context for an empty deck", () => {
    const context = buildAIDeckContext(
      emptyDeck(),
      []
    );

    expect(context.version).toBe(1);
    expect(context.cards).toEqual([]);
    expect(context.statistics.totalCount).toBe(0);
    expect(context.statistics.isDeckValid).toBe(false);
  });

  it("includes deck cards and quantities", () => {
    const deck = emptyDeck();

    deck.main = [
      { card: monster, quantity: 3 },
    ];

    deck.extra = [
      { card: fusion, quantity: 1 },
    ];

    const context = buildAIDeckContext(deck, []);

    expect(context.statistics.mainCount).toBe(3);
    expect(context.statistics.extraCount).toBe(1);
    expect(context.statistics.uniqueCards).toBe(2);
    expect(context.cards).toHaveLength(2);
  });

  it("calculates missing copies from collection", () => {
    const deck = emptyDeck();

    deck.main = [
      { card: monster, quantity: 3 },
    ];

    const context = buildAIDeckContext(deck, [
      { card: monster, quantity: 1 },
    ]);

    expect(context.cards[0].ownedQuantity).toBe(1);
    expect(context.cards[0].missingQuantity).toBe(2);
    expect(context.statistics.missingCopies).toBe(2);
  });

  it("does not double-count ownership across sections", () => {
    const deck = emptyDeck();

    deck.main = [
      { card: monster, quantity: 2 },
    ];

    deck.side = [
      { card: monster, quantity: 1 },
    ];

    const context = buildAIDeckContext(deck, [
      { card: monster, quantity: 2 },
    ]);

    expect(context.statistics.missingCopies).toBe(1);
    expect(context.statistics.uniqueCards).toBe(1);
  });

  it("includes Advanced Format banlist restrictions", () => {
    const limitedCard = makeCard(300, {
      banlistInfo: {
        tcg: "Limited",
      },
    });

    const deck = emptyDeck();

    deck.main = [
      { card: limitedCard, quantity: 2 },
    ];

    const context = buildAIDeckContext(deck, []);

    expect(context.cards[0].banlistStatus).toBe("Limited");
    expect(context.cards[0].allowedCopies).toBe(1);
  });

  it("limits long card descriptions", () => {
    const card = makeCard(400, {
      description: "x".repeat(5000),
    });

    const deck = emptyDeck();

    deck.main = [{ card, quantity: 1 }];

    const context = buildAIDeckContext(deck, []);

    expect(context.cards[0].description.length).toBe(1000);
  });

  it("does not mutate the input deck", () => {
    const deck = emptyDeck();

    deck.main = [
      { card: monster, quantity: 3 },
    ];

    const before = JSON.stringify(deck);

    buildAIDeckContext(deck, []);

    expect(JSON.stringify(deck)).toBe(before);
  });
});
