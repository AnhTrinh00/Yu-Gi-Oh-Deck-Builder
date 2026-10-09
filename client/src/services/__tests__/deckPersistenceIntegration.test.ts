// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";

import {
  addCardToDeck,
  clearSavedDeck,
  createEmptyDeck,
  loadDeck,
  saveDeck,
} from "../deckService";

const testCard: Card = {
  id: 89631139,
  name: "Blue-Eyes White Dragon",
  type: "Normal Monster",
  frameType: "normal",
  description: "",
  race: "Dragon",
  imageUrl: "",
  imageUrlSmall: "",
};

describe("Deck persistence integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("preserves deck name and card quantities", () => {
    let deck = createEmptyDeck();

    deck = {
      ...deck,
      name: "Blue-Eyes Test Deck",
    };

    deck = addCardToDeck(deck, testCard, "main");
    deck = addCardToDeck(deck, testCard, "main");

    saveDeck(deck);

    const loaded = loadDeck();

    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe("Blue-Eyes Test Deck");
    expect(loaded?.main[0].quantity).toBe(2);
  });

  it("clears saved deck data", () => {
    saveDeck(createEmptyDeck());

    clearSavedDeck();

    expect(loadDeck()).toBeNull();
  });
});
