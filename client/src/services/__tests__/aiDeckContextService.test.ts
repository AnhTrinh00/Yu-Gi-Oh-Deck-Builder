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

import type { CollectionCard } from
  "../../models/card/CollectionCard";

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

describe("AI deck context collection availability", () => {
  const starter: Card = {
    id: 100,
    name: "Starter",
    type: "Effect Monster",
    frameType: "effect",
    description: "Starts the main combo.",
    race: "Warrior",
    imageUrl: "",
    imageUrlSmall: "",
  };

  const extender = {
    ...starter,
    id: 200,
    name: "Extender",
    description: "Extends a combo.",
  };

  const makeDeck = (): Deck => ({
    name: "Collection Test Deck",
    main: [],
    extra: [],
    side: [],
  });

  it("includes owned cards not currently in the deck", () => {
    const deck = makeDeck();

    deck.main.push({
      card: starter,
      quantity: 2,
    });

    const collection: CollectionCard[] = [
      { card: starter, quantity: 3 },
      { card: extender, quantity: 2 },
    ];

    const context = buildAIDeckContext(
      deck,
      collection
    );

    expect(context.availableCollectionCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 100,
          deckQuantity: 2,
          availableQuantity: 1,
        }),
        expect.objectContaining({
          id: 200,
          deckQuantity: 0,
          availableQuantity: 2,
        }),
      ])
    );
  });

  it("subtracts copies across Main and Side Decks", () => {
    const deck = makeDeck();

    deck.main.push({
      card: starter,
      quantity: 1,
    });

    deck.side.push({
      card: starter,
      quantity: 1,
    });

    const context = buildAIDeckContext(
      deck,
      [{ card: starter, quantity: 3 }]
    );

    expect(
      context.availableCollectionCards?.find(
        card => card.id === 100
      )?.availableQuantity
    ).toBe(1);
  });

  it("excludes cards with no unassigned copies", () => {
    const deck = makeDeck();

    deck.main.push({
      card: starter,
      quantity: 3,
    });

    const context = buildAIDeckContext(
      deck,
      [{ card: starter, quantity: 3 }]
    );

    expect(
      context.availableCollectionCards?.some(
        card => card.id === 100
      )
    ).toBe(false);
  });

  it("aggregates duplicate collection records", () => {
    const deck = makeDeck();

    deck.main.push({
      card: starter,
      quantity: 2,
    });

    const context = buildAIDeckContext(
      deck,
      [
        { card: starter, quantity: 1 },
        { card: starter, quantity: 2 },
      ]
    );

    expect(
      context.availableCollectionCards?.find(
        card => card.id === 100
      )?.availableQuantity
    ).toBe(1);
  });

  it("reports collection catalog truncation", () => {
    const deck = makeDeck();

    const collection: CollectionCard[] =
      Array.from({ length: 110 }, (_, index) => ({
        card: {
          ...starter,
          id: index + 1000,
          name: `Collection Card ${index}`,
        },
        quantity: 1,
      }));

    const context = buildAIDeckContext(
      deck,
      collection
    );

    expect(
      context.availableCollectionCards
    ).toHaveLength(100);

    expect(
      context.collectionCatalogTruncated
    ).toBe(true);
  });

  it("includes known collection banlist limits in AI context", () => {
  const limitedCard = makeCard(999, {
    name: "Limited Test Card",
    banlistInfo: {
      tcg: "Limited",
    },
  });

  const context = buildAIDeckContext(
    makeDeck(),
    [
      {
        card: limitedCard,
        quantity: 2,
      },
    ]
  );

  const availableCard =
    context.availableCollectionCards?.find(
      card => card.id === 999
    );

  expect(availableCard).toBeDefined();
  expect(availableCard?.ownedQuantity).toBe(2);
  expect(availableCard?.availableQuantity).toBe(2);
  expect(availableCard?.allowedCopies).toBe(1);
  });

  it.each([
  ["Forbidden", 0],
  ["Limited", 1],
  ["Semi-Limited", 2],
  ["Unlimited", 3],
  ] as const)(
  "preserves %s collection restriction with limit %i",
  (status, expectedLimit) => {
    const card = makeCard(900, {
      banlistInfo: {
        tcg: status,
      },
    });

    const context = buildAIDeckContext(
      makeDeck(),
      [
        {
          card,
          quantity: 3,
        },
      ]
    );

    const availableCard =
      context.availableCollectionCards?.find(
        entry => entry.id === 900
      );

    expect(availableCard?.allowedCopies).toBe(
      expectedLimit
    );
  }
  );

  it("does not invent a banlist limit when metadata is missing", () => {
  const unknownCard = makeCard(998);

  const context = buildAIDeckContext(
    makeDeck(),
    [
      {
        card: unknownCard,
        quantity: 1,
      },
    ]
  );

  const availableCard =
    context.availableCollectionCards?.find(
      card => card.id === 998
    );

  expect(availableCard).toBeDefined();
  expect(availableCard?.allowedCopies).toBeUndefined();
  });
});
