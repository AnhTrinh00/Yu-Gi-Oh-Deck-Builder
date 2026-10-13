
import { describe, expect, it } from "vitest";
import type { Card } from "../../models/Card";
import { createEmptyDeck } from "../deck/deckService";
import {
  createRelationship,
  getOutgoingRelationships,
  getIncomingRelationships,
  getCardRelationships,
  getRelationshipsByType,
  getDeckRelationships,
  getConnectedCardIds,
} from "../relationship/cardRelationshipService";

function mockCard(id: number, name: string): Card {
  return {
    id,
    name,
    type: "Effect Monster",
    frameType: "effect",
    description: "Test effect.",
    race: "Warrior",
    imageUrl: "",
    imageUrlSmall: "",
  };
}

describe("cardRelationshipService", () => {
  const cardA = mockCard(1, "Card A");
  const cardB = mockCard(2, "Card B");
  const cardC = mockCard(3, "Card C");

  const relationships = [
    createRelationship(cardA, cardB, "searches"),
    createRelationship(cardB, cardC, "summons"),
    createRelationship(cardA, cardC, "enables"),
  ];

  it("creates a relationship", () => {
    const relationship = createRelationship(
      cardA,
      cardB,
      "searches",
      "Card A searches Card B."
    );

    expect(relationship).toEqual({
      sourceCardId: 1,
      targetCardId: 2,
      type: "searches",
      description: "Card A searches Card B.",
    });
  });

  it("finds outgoing relationships", () => {
    const results = getOutgoingRelationships(
      1,
      relationships
    );

    expect(results).toHaveLength(2);
    expect(results.every(
      (r) => r.sourceCardId === 1
    )).toBe(true);
  });

  it("finds incoming relationships", () => {
    const results = getIncomingRelationships(
      3,
      relationships
    );

    expect(results).toHaveLength(2);
  });

  it("finds all relationships involving a card", () => {
    const results = getCardRelationships(
      2,
      relationships
    );

    expect(results).toHaveLength(2);
  });

  it("filters relationships by type", () => {
    const results = getRelationshipsByType(
      relationships,
      "searches"
    );

    expect(results).toHaveLength(1);
    expect(results[0].targetCardId).toBe(2);
  });

  it("finds relationships within a deck", () => {
    const deck = createEmptyDeck();

    deck.main = [
      { card: cardA, quantity: 3 },
      { card: cardB, quantity: 2 },
    ];

    const results = getDeckRelationships(
      deck,
      relationships
    );

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("searches");
  });

  it("finds directly connected cards", () => {
    const results = getConnectedCardIds(
      1,
      relationships
    );

    expect(results).toEqual([2, 3]);
  });

  it("returns empty arrays for unrelated cards", () => {
    expect(
      getCardRelationships(999, relationships)
    ).toEqual([]);

    expect(
      getConnectedCardIds(999, relationships)
    ).toEqual([]);
  });

  it("does not mutate the relationship collection", () => {
    const originalLength = relationships.length;

    getOutgoingRelationships(1, relationships);

    expect(relationships).toHaveLength(originalLength);
  });
});
