import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";

import {
  addCardToDeck,
  canAddCardToSection,
  createEmptyDeck,
  getCardQuantityInDeck,
  getDeckCardCount,
  removeAllCardsFromDeck,
  removeCardFromDeck,
  validateCardPlacement,
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

const createTestCard = (
    id: number,
    name: string,
    banlistStatus?:
        | "Forbidden"
        | "Limited"
        | "Semi-Limited"
): Card => {
    return {
        id,
        name,
        type: "Effect Monster",
        frameType: "effect",
        description: "Test card",
        race: "Warrior",
        imageUrl: "",
        imageUrlSmall: "",
        banlistInfo: banlistStatus
            ? {
                  tcg: banlistStatus,
              }
            : undefined,
    };
};

const testCards: Card[] = Array.from(
  { length: 14 },
  (_, index) => ({
    ...testCard,
    id: index + 1,
    name: `Test Card ${index + 1}`,
  })
);

const fusionCard: Card = {
  ...testCard,
  id: 100,
  name: "Test Fusion Monster",
  type: "Fusion Monster",
};

const synchroCard: Card = {
  ...testCard,
  id: 101,
  name: "Test Synchro Monster",
  type: "Synchro Monster",
};

const xyzCard: Card = {
  ...testCard,
  id: 102,
  name: "Test Xyz Monster",
  type: "XYZ Monster",
};

const linkCard: Card = {
  ...testCard,
  id: 103,
  name: "Test Link Monster",
  type: "Link Monster",
};

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

  it("does not add an Extra Deck monster to the Main Deck", () => {
    const deck = createEmptyDeck();

    const updatedDeck = addCardToDeck(
      deck,
      fusionCard,
      "main"
    );

    expect(updatedDeck.main).toHaveLength(0);
    expect(updatedDeck.extra).toHaveLength(0);
  });

  it("adds an Extra Deck monster to the Extra Deck", () => {
    const deck = createEmptyDeck();

    const updatedDeck = addCardToDeck(
      deck,
      fusionCard,
      "extra"
    );

    expect(updatedDeck.extra).toHaveLength(1);
    expect(
      updatedDeck.extra[0].card.id
    ).toBe(fusionCard.id);
  });
});

describe("card placement rules", () => {
  it("allows normal monsters in the Main Deck", () => {
    expect(
      canAddCardToSection(
        testCard,
        "main"
      )
    ).toBe(true);
  });

  it("allows Fusion Monsters in the Extra Deck", () => {
    expect(
      canAddCardToSection(
        fusionCard,
        "extra"
      )
    ).toBe(true);
  });

  it("allows Synchro Monsters in the Extra Deck", () => {
    expect(
      canAddCardToSection(
        synchroCard,
        "extra"
      )
    ).toBe(true);
  });

  it("allows Xyz Monsters in the Extra Deck", () => {
    expect(
      canAddCardToSection(
        xyzCard,
        "extra"
      )
    ).toBe(true);
  });

  it("allows Link Monsters in the Extra Deck", () => {
    expect(
      canAddCardToSection(
        linkCard,
        "extra"
      )
    ).toBe(true);
  });

  it("does not allow Fusion Monsters in the Main Deck", () => {
    expect(
      canAddCardToSection(
        fusionCard,
        "main"
      )
    ).toBe(false);
  });

  it("does not allow Synchro Monsters in the Main Deck", () => {
    expect(
      canAddCardToSection(
        synchroCard,
        "main"
      )
    ).toBe(false);
  });

  it("does not allow Xyz Monsters in the Main Deck", () => {
    expect(
      canAddCardToSection(
        xyzCard,
        "main"
      )
    ).toBe(false);
  });

  it("does not allow Link Monsters in the Main Deck", () => {
    expect(
      canAddCardToSection(
        linkCard,
        "main"
      )
    ).toBe(false);
  });

  it("returns an error for invalid placement", () => {
    expect(
      validateCardPlacement(
        fusionCard,
        "main"
      )
    ).toBe(
      "Test Fusion Monster cannot be placed in the Main Deck."
    );
  });

  it("returns null for valid placement", () => {
    expect(
      validateCardPlacement(
        fusionCard,
        "extra"
      )
    ).toBe(null);
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

  it("detects an Extra Deck monster incorrectly placed in the Main Deck", () => {
    const deck = {
      ...createEmptyDeck(),
      main: [
        {
          card: fusionCard,
          quantity: 1,
        },
      ],
    };

    const validation = validateDeck(deck);

    expect(validation.isDeckValid).toBe(false);

    expect(
      validation.errors
    ).toContain(
      "Test Fusion Monster cannot be placed in the Main Deck."
    );
  });
});

describe("Banlist rules", () => {
  it("allows up to 3 copies of an Unlimited card", () => {
      const card = createTestCard(
          1001,
          "Unlimited Test Card"
      );

      let deck = createEmptyDeck();

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

      expect(
          getCardQuantityInDeck(
              deck,
              card.id
          )
      ).toBe(3);
  });

  it("allows only 2 copies of a Semi-Limited card", () => {
    const card = createTestCard(
        1002,
        "Semi-Limited Test Card",
        "Semi-Limited"
    );

    let deck = createEmptyDeck();

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

    deck = addCardToDeck(
        deck,
        card,
        "main"
    );

    expect(
        getCardQuantityInDeck(
            deck,
            card.id
        )
    ).toBe(2);
  });

  it("allows only 1 copy of a Limited card", () => {
    const card = createTestCard(
        1003,
        "Limited Test Card",
        "Limited"
    );

    let deck = createEmptyDeck();

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

    expect(
        getCardQuantityInDeck(
            deck,
            card.id
        )
    ).toBe(1);
  });

  it("does not allow a Forbidden card", () => {
    const card = createTestCard(
        1004,
        "Forbidden Test Card",
        "Forbidden"
    );

    let deck = createEmptyDeck();

    deck = addCardToDeck(
        deck,
        card,
        "main"
    );

    expect(
        getCardQuantityInDeck(
            deck,
            card.id
        )
    ).toBe(0);
  });

  it("counts copies across Main, Extra, and Side Deck", () => {
    const card = createTestCard(
        1005,
        "Cross Section Test Card",
        "Semi-Limited"
    );

    let deck = createEmptyDeck();

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

    deck = addCardToDeck(
        deck,
        card,
        "side"
    );

    expect(
        getCardQuantityInDeck(
            deck,
            card.id
        )
    ).toBe(2);

    expect(
        getDeckCardCount(
            deck,
            "main"
        )
    ).toBe(2);

    expect(
        getDeckCardCount(
            deck,
            "side"
        )
    ).toBe(0);
  });

  it("detects a banlist violation during deck validation", () => {
      const card = createTestCard(
          1006,
          "Limited Test Card",
          "Limited"
      );

      const deck = createEmptyDeck();

      deck.main.push({
          card,
          quantity: 2,
      });

      const validation = validateDeck(
          deck
      );

      expect(
          validation.isDeckValid
      ).toBe(false);

      expect(
          validation.errors.some(
              (error) =>
                  error.includes(
                      "Limited Test Card"
                  )
          )
      ).toBe(true);
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
  const extraCards: Card[] = Array.from(
    { length: 15 },
    (_, index) => ({
      ...fusionCard,
      id: 200 + index,
      name: `Test Fusion ${index + 1}`,
    })
  );

  let deck = createEmptyDeck();

  for (const card of extraCards) {
    deck = addCardToDeck(
      deck,
      card,
      "extra"
    );
  }

  const validation = validateDeck(deck);

  expect(validation.extraCount).toBe(15);
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
    "side"
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