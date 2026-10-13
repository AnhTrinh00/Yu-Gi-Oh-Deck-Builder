
import { describe, expect, it } from "vitest";
import type { Card } from "../../models/card/Card";
import type { CollectionCard } from "../../models/card/CollectionCard";
import type { Deck } from "../../models/deck/Deck";
import { validateDeckOwnership } from "../deck/deckOwnershipService";

const cardA: Card = {
  id: 1,
  name: "Card A",
  type: "Normal Monster",
  frameType: "normal",
  description: "",
  race: "Dragon",
  imageUrl: "",
  imageUrlSmall: "",
};

const cardB: Card = {
  ...cardA,
  id: 2,
  name: "Card B",
};

function makeDeck(
  mainQuantity: number,
  sideQuantity = 0
): Deck {
  return {
    name: "Test Deck",
    main: mainQuantity > 0
      ? [{ card: cardA, quantity: mainQuantity }]
      : [],
    extra: [],
    side: sideQuantity > 0
      ? [{ card: cardA, quantity: sideQuantity }]
      : [],
  };
}

function makeCollection(
  quantity: number
): CollectionCard[] {
  return quantity > 0
    ? [{ card: cardA, quantity }]
    : [];
}

describe("deckOwnershipService", () => {
  it("accepts a deck with sufficient owned copies", () => {
    const report = validateDeckOwnership(
      makeDeck(2),
      makeCollection(3)
    );

    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("detects when the collection has too few copies", () => {
    const report = validateDeckOwnership(
      makeDeck(3),
      makeCollection(2)
    );

    expect(report.valid).toBe(false);
    expect(report.totalMissingCopies).toBe(1);
    expect(report.issues[0]).toMatchObject({
      cardId: 1,
      owned: 2,
      used: 3,
      missing: 1,
    });
  });

  it("counts copies across Main and Side Deck", () => {
    const report = validateDeckOwnership(
      makeDeck(2, 1),
      makeCollection(2)
    );

    expect(report.valid).toBe(false);
    expect(report.issues[0].used).toBe(3);
  });

  it("detects cards missing from the collection", () => {
    const report = validateDeckOwnership(
      makeDeck(1),
      []
    );

    expect(report.valid).toBe(false);
    expect(report.issues[0].owned).toBe(0);
  });

  it("reports multiple missing cards", () => {
    const deck: Deck = {
      name: "Test Deck",
      main: [
        { card: cardA, quantity: 3 },
        { card: cardB, quantity: 2 },
      ],
      extra: [],
      side: [],
    };

    const report = validateDeckOwnership(
      deck,
      [{ card: cardA, quantity: 1 }]
    );

    expect(report.affectedCards).toBe(2);
    expect(report.totalMissingCopies).toBe(4);
  });

  it("does not modify the deck or collection", () => {
    const deck = makeDeck(3);
    const collection = makeCollection(2);

    const beforeDeck = JSON.stringify(deck);
    const beforeCollection = JSON.stringify(collection);

    validateDeckOwnership(deck, collection);

    expect(JSON.stringify(deck)).toBe(beforeDeck);
    expect(JSON.stringify(collection)).toBe(beforeCollection);
  });
});
