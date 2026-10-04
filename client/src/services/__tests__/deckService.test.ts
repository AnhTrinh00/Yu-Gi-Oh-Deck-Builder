import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";

import {
  addCardToDeck,
  createEmptyDeck,
  getCardQuantityInDeck,
  getDeckCardCount,
  removeAllCardsFromDeck,
  removeCardFromDeck,
  validateDeck,
} from "../deckService";

const testCard: Card = {
  id: 1,
  name: "Test Card",
  type: "Effect Monster",
  frameType: "effect",
  description: "A test card used for unit testing.",
  race: "Spellcaster",
  imageUrl: "https://example.com/test-card.jpg",
  imageUrlSmall: "https://example.com/test-card-small.jpg",
};

const testCards: Card[] = Array.from(
  { length: 14 },
  (_, index) => ({
    ...testCard,
    id: index + 1,
    name: `Test Card ${index + 1}`,
  })
);

describe("createEmptyDeck", () => {
  it("creates an empty deck", () => {
    const deck = createEmptyDeck();

    expect(deck.name).toBe("Untitled Deck");
    expect(deck.main).toEqual([]);
    expect(deck.extra).toEqual([]);
    expect(deck.side).toEqual([]);
  });
});

describe("addCardToDeck", () => {
  it("adds a card to the main deck", () => {
    const deck = createEmptyDeck();

    const updatedDeck = addCardToDeck(
      deck,
      testCard,
      "main"
    );

    expect(updatedDeck.main).toHaveLength(1);
    expect(updatedDeck.main[0].card.id).toBe(1);
    expect(updatedDeck.main[0].quantity).toBe(1);
  });

  it("increases quantity when adding the same card", () => {
    let deck = createEmptyDeck();

    deck = addCardToDeck(deck, testCard, "main");
    deck = addCardToDeck(deck, testCard, "main");

    expect(deck.main).toHaveLength(1);
    expect(deck.main[0].quantity).toBe(2);
  });

  it("does not allow more than 3 copies", () => {
    let deck = createEmptyDeck();

    deck = addCardToDeck(deck, testCard, "main");
    deck = addCardToDeck(deck, testCard, "main");
    deck = addCardToDeck(deck, testCard, "main");
    deck = addCardToDeck(deck, testCard, "main");

    expect(getCardQuantityInDeck(deck, testCard.id)).toBe(3);
  });
});

describe("removeCardFromDeck", () => {
  it("decreases card quantity", () => {
    let deck = createEmptyDeck();

    deck = addCardToDeck(deck, testCard, "main");
    deck = addCardToDeck(deck, testCard, "main");

    deck = removeCardFromDeck(
      deck,
      testCard.id,
      "main"
    );

    expect(deck.main[0].quantity).toBe(1);
  });

  it("removes the card when quantity reaches zero", () => {
    let deck = createEmptyDeck();

    deck = addCardToDeck(deck, testCard, "main");

    deck = removeCardFromDeck(
      deck,
      testCard.id,
      "main"
    );

    expect(deck.main).toEqual([]);
  });

  it("does nothing when the card is not in the deck", () => {
    const deck = createEmptyDeck();

    const updatedDeck = removeCardFromDeck(
      deck,
      999,
      "main"
    );

    expect(updatedDeck).toEqual(deck);
  });
});

describe("removeAllCardsFromDeck", () => {
  it("removes all copies of a card", () => {
    let deck = createEmptyDeck();

    deck = addCardToDeck(deck, testCard, "main");
    deck = addCardToDeck(deck, testCard, "main");
    deck = addCardToDeck(deck, testCard, "main");

    deck = removeAllCardsFromDeck(
      deck,
      testCard.id,
      "main"
    );

    expect(deck.main).toEqual([]);
  });
});

describe("getDeckCardCount", () => {
  it("counts total cards rather than different cards", () => {
    let deck = createEmptyDeck();

    deck = addCardToDeck(deck, testCard, "main");
    deck = addCardToDeck(deck, testCard, "main");
    deck = addCardToDeck(deck, testCard, "main");

    expect(getDeckCardCount(deck, "main")).toBe(3);
  });
});

describe("validateDeck", () => {
  it("rejects a Main Deck with fewer than 40 cards", () => {
    const deck = createEmptyDeck();

    const validation = validateDeck(deck);

    expect(validation.isMainDeckValid).toBe(false);
    expect(validation.isDeckValid).toBe(false);
    expect(validation.mainCount).toBe(0);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

it("accepts a 40-card Main Deck", () => {
  let deck = createEmptyDeck();

  // Add 2 copies of each of the 14 test cards.
  // 14 × 2 = 28 cards.
  for (const card of testCards) {
    deck = addCardToDeck(
      deck,
      card,
      "main"
    );

    deck = addCardToDeck(
      deck,
      card,
      "main"
    );
  }

  // Add 1 additional copy of 12 cards.
  // 28 + 12 = 40 cards.
  for (let i = 0; i < 12; i++) {
    deck = addCardToDeck(
      deck,
      testCards[i],
      "main"
    );
  }

  expect(
    getDeckCardCount(deck, "main")
  ).toBe(40);

  const validation = validateDeck(deck);

  expect(validation.isMainDeckValid).toBe(true);
  expect(validation.isDeckValid).toBe(true);
});

it("allows up to 15 Extra Deck cards", () => {
  let deck = createEmptyDeck();

  for (const card of testCards) {
    deck = addCardToDeck(
      deck,
      card,
      "extra"
    );
  }

  const validation = validateDeck(deck);

  expect(validation.extraCount).toBe(14);
  expect(validation.isExtraDeckValid).toBe(true);
});

it("allows up to 15 Side Deck cards", () => {
  let deck = createEmptyDeck();

  for (const card of testCards) {
    deck = addCardToDeck(
      deck,
      card,
      "side"
    );
  }

  const validation = validateDeck(deck);

  expect(validation.sideCount).toBe(14);
  expect(validation.isSideDeckValid).toBe(true);
});

it("enforces the 3-copy limit across all deck sections", () => {
  let deck = createEmptyDeck();

  deck = addCardToDeck(
    deck,
    testCard,
    "main"
  );

  deck = addCardToDeck(
    deck,
    testCard,
    "main"
  );

  deck = addCardToDeck(
    deck,
    testCard,
    "extra"
  );

  expect(
    getCardQuantityInDeck(
      deck,
      testCard.id
    )
  ).toBe(3);

  deck = addCardToDeck(
    deck,
    testCard,
    "side"
  );

  expect(
    getCardQuantityInDeck(
      deck,
      testCard.id
    )
  ).toBe(3);
});