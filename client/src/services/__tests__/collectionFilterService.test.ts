
import { describe, expect, it } from "vitest";
import type { Card } from "../../models/Card";
import type { CollectionCard } from "../../models/CollectionCard";
import {
  DEFAULT_COLLECTION_FILTERS,
  filterCollection,
  getCollectionArchetypes,
  getCollectionCategory,
  getCollectionStatistics,
} from "../collectionFilterService";

function makeCard(
  id: number,
  name: string,
  type: string,
  archetype?: string
): Card {
  return {
    id,
    name,
    type,
    frameType: "normal",
    description: "",
    race: "Warrior",
    archetype,
    imageUrl: "",
    imageUrlSmall: "",
  };
}

const collection: CollectionCard[] = [
  {
    card: makeCard(1, "Alpha Warrior", "Effect Monster", "Alpha"),
    quantity: 3,
  },
  {
    card: makeCard(2, "Beta Fusion", "Fusion Monster", "Beta"),
    quantity: 2,
  },
  {
    card: makeCard(3, "Magic Search", "Spell Card"),
    quantity: 1,
  },
  {
    card: makeCard(4, "Trap Defense", "Trap Card"),
    quantity: 2,
  },
];

describe("collectionFilterService", () => {
  it("classifies card types", () => {
    expect(getCollectionCategory("Effect Monster")).toBe("monster");
    expect(getCollectionCategory("Fusion Monster")).toBe("extra");
    expect(getCollectionCategory("Spell Card")).toBe("spell");
    expect(getCollectionCategory("Trap Card")).toBe("trap");
  });

  it("calculates collection statistics", () => {
    expect(getCollectionStatistics(collection)).toEqual({
      totalCopies: 8,
      uniqueCards: 4,
      monsters: 5,
      spells: 1,
      traps: 2,
      extraDeck: 2,
    });
  });

  it("filters by card name", () => {
    const result = filterCollection(collection, {
      ...DEFAULT_COLLECTION_FILTERS,
      search: "alpha",
    });

    expect(result.map((item) => item.card.id)).toEqual([1]);
  });

  it("includes Extra Deck monsters in Monster filter", () => {
    const result = filterCollection(collection, {
      ...DEFAULT_COLLECTION_FILTERS,
      category: "monster",
    });

    expect(result.map((item) => item.card.id)).toEqual([1, 2]);
  });

  it("filters Extra Deck monsters separately", () => {
    const result = filterCollection(collection, {
      ...DEFAULT_COLLECTION_FILTERS,
      category: "extra",
    });

    expect(result.map((item) => item.card.id)).toEqual([2]);
  });

  it("filters by archetype", () => {
    const result = filterCollection(collection, {
      ...DEFAULT_COLLECTION_FILTERS,
      archetype: "Beta",
    });

    expect(result.map((item) => item.card.id)).toEqual([2]);
  });

  it("sorts by quantity descending", () => {
    const result = filterCollection(collection, {
      ...DEFAULT_COLLECTION_FILTERS,
      sort: "quantity-desc",
    });

    expect(result[0].card.id).toBe(1);
    expect(result.at(-1)?.card.id).toBe(3);
  });

  it("returns distinct archetypes", () => {
    expect(getCollectionArchetypes(collection)).toEqual([
      "Alpha",
      "Beta",
    ]);
  });

  it("does not mutate the original collection order", () => {
    const originalIds = collection.map((item) => item.card.id);

    filterCollection(collection, {
      ...DEFAULT_COLLECTION_FILTERS,
      sort: "name-desc",
    });

    expect(collection.map((item) => item.card.id)).toEqual(
      originalIds
    );
  });
});
