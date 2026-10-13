
import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";
import type { CardRelationship } from "../../models/CardRelationship";

import {
  DEFAULT_GRAPH_FILTERS,
  filterRelationshipGraph,
} from "../relationship/relationshipGraphFilterService";

const makeCard = (
  id: number,
  description: string,
  archetype?: string
): Card => ({
  id,
  name: `Card ${id}`,
  type: "Effect Monster",
  frameType: "effect",
  description,
  race: "Warrior",
  archetype,
  imageUrl: "",
  imageUrlSmall: "",
});

const starter = makeCard(1, "Starter card", "Test");
const searcher = makeCard(
  2,
  "Add 1 monster from your Deck to your hand.",
  "Test"
);
const extender = makeCard(
  3,
  "Special Summon this card from your hand.",
  "Test"
);
const sideCard = makeCard(4, "Side Deck card");

const deck: Deck = {
  name: "Test Deck",
  main: [
    { card: starter, quantity: 1 },
    { card: searcher, quantity: 2 },
  ],
  extra: [{ card: extender, quantity: 1 }],
  side: [{ card: sideCard, quantity: 1 }],
};

const relationships: CardRelationship[] = [
  { sourceCardId: 1, targetCardId: 2, type: "searches" },
  { sourceCardId: 2, targetCardId: 3, type: "summons" },
  { sourceCardId: 3, targetCardId: 4, type: "supports" },
];

describe("relationshipGraphFilterService", () => {
  it("includes all deck cards by default", () => {
    const result = filterRelationshipGraph(
      deck,
      relationships,
      DEFAULT_GRAPH_FILTERS
    );

    expect(result.cards).toHaveLength(4);
    expect(result.relationships).toHaveLength(3);
  });

  it("filters by relationship type", () => {
    const result = filterRelationshipGraph(
      deck,
      relationships,
      {
        ...DEFAULT_GRAPH_FILTERS,
        relationshipType: "searches",
      }
    );

    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].type).toBe("searches");
  });

  it("filters by deck section", () => {
    const result = filterRelationshipGraph(
      deck,
      relationships,
      {
        ...DEFAULT_GRAPH_FILTERS,
        deckSection: "main",
      }
    );

    expect(result.cards.map((card) => card.id)).toEqual([1, 2]);
    expect(result.relationships).toHaveLength(1);
  });

  it("filters by card role", () => {
    const result = filterRelationshipGraph(
      deck,
      relationships,
      {
        ...DEFAULT_GRAPH_FILTERS,
        cardRole: "searcher",
      }
    );

    expect(result.cards.map((card) => card.id)).toEqual([2]);
    expect(result.relationships).toHaveLength(0);
  });

  it("combines all three filters", () => {
    const result = filterRelationshipGraph(
      deck,
      relationships,
      {
        relationshipType: "searches",
        deckSection: "main",
        cardRole: "engine",
      }
    );

    expect(result.cards.map((card) => card.id)).toEqual([1, 2]);
    expect(result.relationships).toHaveLength(1);
  });

  it("excludes relationships with filtered-out endpoints", () => {
    const result = filterRelationshipGraph(
      deck,
      relationships,
      {
        ...DEFAULT_GRAPH_FILTERS,
        deckSection: "side",
      }
    );

    expect(result.cards.map((card) => card.id)).toEqual([4]);
    expect(result.relationships).toEqual([]);
  });
});
