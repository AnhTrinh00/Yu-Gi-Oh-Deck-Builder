
import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";
import type {
  CardRelationship,
} from "../../models/CardRelationship";

import { createEmptyDeck } from "../deck/deckService";

import {
  analyzeDeckRelationships,
} from "../deck/deckRelationshipAnalysisService";

function mockCard(id: number): Card {
  return {
    id,
    name: `Card ${id}`,
    type: "Effect Monster",
    frameType: "effect",
    description: "Test effect.",
    race: "Warrior",
    imageUrl: "",
    imageUrlSmall: "",
  };
}

const cardA = mockCard(1);
const cardB = mockCard(2);
const cardC = mockCard(3);
const cardD = mockCard(4);

const relationships: CardRelationship[] = [
  {
    sourceCardId: 1,
    targetCardId: 2,
    type: "searches",
  },
  {
    sourceCardId: 2,
    targetCardId: 3,
    type: "summons",
  },
];

function createTestDeck() {
  const deck = createEmptyDeck();

  deck.main = [
    { card: cardA, quantity: 3 },
    { card: cardB, quantity: 2 },
    { card: cardC, quantity: 1 },
    { card: cardD, quantity: 1 },
  ];

  return deck;
}

describe("deckRelationshipAnalysisService", () => {
  it("handles an empty deck", () => {
    const analysis = analyzeDeckRelationships(
      createEmptyDeck(),
      relationships
    );

    expect(analysis.totalUniqueCards).toBe(0);
    expect(analysis.totalRelationships).toBe(0);
    expect(analysis.connectedCardCount).toBe(0);
    expect(analysis.disconnectedCardCount).toBe(0);
  });

  it("counts unique cards correctly", () => {
    const analysis = analyzeDeckRelationships(
      createTestDeck(),
      relationships
    );

    expect(analysis.totalUniqueCards).toBe(4);
  });

  it("counts relationships within the deck", () => {
    const analysis = analyzeDeckRelationships(
      createTestDeck(),
      relationships
    );

    expect(analysis.totalRelationships).toBe(2);
  });

  it("identifies connected cards", () => {
    const analysis = analyzeDeckRelationships(
      createTestDeck(),
      relationships
    );

    expect(analysis.connectedCardCount).toBe(3);
  });

  it("identifies disconnected cards", () => {
    const analysis = analyzeDeckRelationships(
      createTestDeck(),
      relationships
    );

    expect(analysis.disconnectedCardCount).toBe(1);
    expect(analysis.disconnectedCardIds).toEqual([4]);
  });

  it("counts relationship types", () => {
    const analysis = analyzeDeckRelationships(
      createTestDeck(),
      relationships
    );

    expect(
      analysis.relationshipTypeCounts.searches
    ).toBe(1);

    expect(
      analysis.relationshipTypeCounts.summons
    ).toBe(1);
  });

  it("calculates reachable cards", () => {
    const analysis = analyzeDeckRelationships(
      createTestDeck(),
      relationships
    );

    const cardAAnalysis =
      analysis.cardConnections.find(
        (card) => card.cardId === 1
      );

    expect(cardAAnalysis?.reachableCardCount).toBe(2);
    expect(cardAAnalysis?.outgoingCount).toBe(1);
    expect(cardAAnalysis?.incomingCount).toBe(0);
  });

  it("ignores relationships outside the deck", () => {
    const external: CardRelationship = {
      sourceCardId: 1,
      targetCardId: 999,
      type: "supports",
    };

    const analysis = analyzeDeckRelationships(
      createTestDeck(),
      [...relationships, external]
    );

    expect(analysis.totalRelationships).toBe(2);
  });

  it("does not count duplicate card copies as unique cards", () => {
    const deck = createEmptyDeck();

    deck.main = [{ card: cardA, quantity: 3 }];
    deck.side = [{ card: cardA, quantity: 1 }];

    const analysis = analyzeDeckRelationships(
      deck,
      relationships
    );

    expect(analysis.totalUniqueCards).toBe(1);
  });
});
