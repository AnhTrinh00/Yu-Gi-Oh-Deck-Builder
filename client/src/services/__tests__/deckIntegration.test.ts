
import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";
import type { CollectionCard } from "../../models/CollectionCard";

import {
  addCardToDeck,
  createEmptyDeck,
  getDeckCardCount,
  removeCardFromDeck,
} from "../deck/deckService";

import { checkDeckAddition } from "../deck/deckAdditionPolicyService";
import { validateDeckOwnership } from "../deck/deckOwnershipService";
import { getDeckStatistics } from "../deck/deckStatisticsService";

const blueEyes: Card = {
  id: 89631139,
  name: "Blue-Eyes White Dragon",
  type: "Normal Monster",
  frameType: "normal",
  description: "",
  race: "Dragon",
  attribute: "LIGHT",
  level: 8,
  atk: 3000,
  def: 2500,
  imageUrl: "",
  imageUrlSmall: "",
};

const darkMagician: Card = {
  id: 46986414,
  name: "Dark Magician",
  type: "Normal Monster",
  frameType: "normal",
  description: "",
  race: "Spellcaster",
  attribute: "DARK",
  level: 7,
  atk: 2500,
  def: 2100,
  imageUrl: "",
  imageUrlSmall: "",
};

describe("Deck integration", () => {

  it("adds owned cards and updates deck statistics", () => {
    const collection: CollectionCard[] = [
      { card: blueEyes, quantity: 3 },
    ];

    let deck = createEmptyDeck();

    const permission = checkDeckAddition(
      deck,
      collection,
      blueEyes,
      "main"
    );

    expect(permission.allowed).toBe(true);

    deck = addCardToDeck(deck, blueEyes, "main");

    expect(getDeckCardCount(deck, "main")).toBe(1);

    const statistics = getDeckStatistics(deck);

    expect(statistics.monsterCount).toBe(1);
    expect(statistics.uniqueMainCards).toBe(1);
  });

  it("prevents adding more copies than owned", () => {
    const collection: CollectionCard[] = [
      { card: blueEyes, quantity: 1 },
    ];

    let deck = createEmptyDeck();

    deck = addCardToDeck(deck, blueEyes, "main");

    const permission = checkDeckAddition(
      deck,
      collection,
      blueEyes,
      "main"
    );

    expect(permission.allowed).toBe(false);
  });

  it("detects ownership mismatches after collection changes", () => {
    let deck = createEmptyDeck();

    deck = addCardToDeck(deck, blueEyes, "main");
    deck = addCardToDeck(deck, blueEyes, "main");
    deck = addCardToDeck(deck, blueEyes, "main");

    const collection: CollectionCard[] = [
      { card: blueEyes, quantity: 2 },
    ];

    const report = validateDeckOwnership(
      deck,
      collection
    );

    expect(report.valid).toBe(false);
    expect(report.totalMissingCopies).toBe(1);
  });

  it("resolves ownership mismatches after removing deck cards", () => {
    let deck = createEmptyDeck();

    deck = addCardToDeck(deck, blueEyes, "main");
    deck = addCardToDeck(deck, blueEyes, "main");
    deck = addCardToDeck(deck, blueEyes, "main");

    const collection: CollectionCard[] = [
      { card: blueEyes, quantity: 2 },
    ];

    expect(
      validateDeckOwnership(deck, collection).valid
    ).toBe(false);

    deck = removeCardFromDeck(
      deck,
      blueEyes.id,
      "main"
    );

    expect(
      validateDeckOwnership(deck, collection).valid
    ).toBe(true);
  });

  it("keeps statistics synchronized with multiple cards", () => {
    let deck = createEmptyDeck();

    deck = addCardToDeck(deck, blueEyes, "main");
    deck = addCardToDeck(deck, darkMagician, "main");

    const statistics = getDeckStatistics(deck);

    expect(statistics.monsterCount).toBe(2);
    expect(statistics.uniqueMainCards).toBe(2);
  });
});
