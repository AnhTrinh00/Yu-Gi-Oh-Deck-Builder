
import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";
import type { CollectionCard } from "../../models/CollectionCard";
import type { Combo } from "../../models/Combo";

import { generateDeckRecommendations } from "../deck/deckRecommendationService";

function card(
  id: number,
  banlistInfo?: Card["banlistInfo"]
): Card {
  return {
    id,
    name: `Card ${id}`,
    type: "Effect Monster",
    frameType: "effect",
    description: "",
    race: "Warrior",
    imageUrl: "",
    imageUrlSmall: "",
    banlistInfo,
  };
}

const a = card(1);
const b = card(2);
const c = card(3);
const forbidden = card(4, {
  tcg: "Forbidden",
});

const deck: Deck = {
  name: "Test Deck",
  main: [
    { card: a, quantity: 3 },
    { card: b, quantity: 2 },
  ],
  extra: [],
  side: [],
};

const collection: CollectionCard[] = [
  { card: a, quantity: 3 },
  { card: b, quantity: 2 },
  { card: c, quantity: 2 },
  { card: forbidden, quantity: 1 },
];

const base = {
  deck,
  collection,
  relationships: [],
  combos: [],
  format: "advanced" as const,
};

describe("deckRecommendationService", () => {
  it("identifies cards without recorded relationships", () => {
    const results = generateDeckRecommendations(base);

    expect(
      results.some(
        (item) => item.id === "isolated-1"
      )
    ).toBe(true);
  });

  it("does not flag connected cards as isolated", () => {
    const results = generateDeckRecommendations({
      ...base,
      relationships: [
        {
          sourceCardId: 1,
          targetCardId: 2,
          type: "supports",
        },
      ],
    });

    expect(
      results.some(
        (item) => item.type === "isolated-card"
      )
    ).toBe(false);
  });

  it("recommends owned cards with recorded synergy", () => {
    const results = generateDeckRecommendations({
      ...base,
      relationships: [
        {
          sourceCardId: 3,
          targetCardId: 1,
          type: "supports",
        },
      ],
    });

    expect(
      results.some(
        (item) => item.id === "collection-3"
      )
    ).toBe(true);
  });

  it("does not recommend forbidden cards", () => {
    const results = generateDeckRecommendations({
      ...base,
      relationships: [
        {
          sourceCardId: 4,
          targetCardId: 1,
          type: "supports",
        },
      ],
    });

    expect(
      results.some(
        (item) => item.id === "collection-4"
      )
    ).toBe(false);
  });

  it("identifies unavailable combo starters", () => {
    const combo: Combo = {
      id: "test-combo",
      name: "Example Combo",
      description: "",
      starters: [
        {
          cardId: 3,
          quantity: 1,
          zone: "hand",
        },
      ],
      requirements: [],
      steps: [],
      endBoardCardIds: [],
      createdAt: "",
      updatedAt: "",
    };

    const results = generateDeckRecommendations({
      ...base,
      combos: [combo],
    });

    expect(
      results.some(
        (item) => item.id === "combo-test-combo"
      )
    ).toBe(true);
  });

  it("recommends reviewing Main Deck size above 40", () => {
    const largeDeck: Deck = {
      ...deck,
      main: Array.from(
        { length: 41 },
        (_, index) => ({
          card: card(index + 100),
          quantity: 1,
        })
      ),
    };

    const results = generateDeckRecommendations({
      ...base,
      deck: largeDeck,
    });

    expect(
      results.some(
        (item) => item.type === "deck-size"
      )
    ).toBe(true);
  });

  it("returns recommendations sorted by score", () => {
    const results = generateDeckRecommendations(base);

    for (let index = 1; index < results.length; index++) {
      expect(results[index - 1].score).toBeGreaterThanOrEqual(
        results[index].score
      );
    }
  });
});
