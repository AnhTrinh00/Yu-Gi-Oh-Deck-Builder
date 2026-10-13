
import { describe, expect, it } from "vitest";
import type { Card } from "../../models/Card";
import type { CollectionCard } from "../../models/CollectionCard";
import {
  addCardToDeck,
  createEmptyDeck,
} from "../deck/deckService";
import { checkDeckAddition } from "../deck/deckAdditionPolicyService";

const card: Card = {
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

function makeCollection(quantity: number): CollectionCard[] {
  return [{ card, quantity }];
}

describe("deckAdditionPolicyService", () => {
  it("allows adding an owned card to a valid section", () => {
    const deck = createEmptyDeck();

    const result = checkDeckAddition(
      deck,
      makeCollection(3),
      card,
      "main"
    );

    expect(result).toEqual({
      allowed: true,
      reason: null,
    });
  });

  it("rejects cards not owned by the user", () => {
    const result = checkDeckAddition(
      createEmptyDeck(),
      [],
      card,
      "main"
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("only own 0");
  });

  it("rejects adding more copies than owned", () => {
    let deck = createEmptyDeck();

    deck = addCardToDeck(deck, card, "main");

    const result = checkDeckAddition(
      deck,
      makeCollection(1),
      card,
      "main"
    );

    expect(result.allowed).toBe(false);
  });

  it("rejects a fourth copy", () => {
    let deck = createEmptyDeck();

    for (let i = 0; i < 3; i++) {
      deck = addCardToDeck(deck, card, "main");
    }

    const result = checkDeckAddition(
      deck,
      makeCollection(5),
      card,
      "main"
    );

    expect(result.allowed).toBe(false);
  });

  it("rejects a Main Deck monster in Extra Deck", () => {
    const result = checkDeckAddition(
      createEmptyDeck(),
      makeCollection(3),
      card,
      "extra"
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("cannot be placed");
  });

  it("does not mutate deck or collection", () => {
    const deck = createEmptyDeck();
    const collection = makeCollection(2);

    const beforeDeck = JSON.stringify(deck);
    const beforeCollection = JSON.stringify(collection);

    checkDeckAddition(deck, collection, card, "main");

    expect(JSON.stringify(deck)).toBe(beforeDeck);
    expect(JSON.stringify(collection)).toBe(beforeCollection);
  });
});
