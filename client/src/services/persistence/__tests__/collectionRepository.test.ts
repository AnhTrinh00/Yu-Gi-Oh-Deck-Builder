import "./testSetup";

import { describe, expect, it } from "vitest";

import type { Card } from "../../../models/card/Card";

import { getDatabase } from "../indexedDbService";

import {
  addCollectionQuantity,
  clearPersistedCollection,
  getCollectionQuantity,
  getPersistedCollection,
  removeCollectionQuantity,
  setCollectionQuantity,
} from "../collectionRepository";

const card: Card = {
  id: 89631139,
  name: "Blue-Eyes White Dragon",
  type: "Normal Monster",
  frameType: "normal",
  description: "Legendary dragon",
  race: "Dragon",
  imageUrl: "https://example.com/card.jpg",
  imageUrlSmall: "https://example.com/card-small.jpg",
};

describe("collectionRepository", () => {
  it("returns zero for an unowned card", async () => {
    expect(await getCollectionQuantity(card.id)).toBe(0);
  });

  it("stores card metadata and collection quantity", async () => {
    await setCollectionQuantity(card, 3);

    expect(await getCollectionQuantity(card.id)).toBe(3);
    expect(await getPersistedCollection()).toEqual([
      { card, quantity: 3 },
    ]);
  });

  it("adds quantities to an existing collection entry", async () => {
    await setCollectionQuantity(card, 2);
    await addCollectionQuantity(card, 3);

    expect(await getCollectionQuantity(card.id)).toBe(5);
  });

  it("removes quantities without going below zero", async () => {
    await setCollectionQuantity(card, 3);
    await removeCollectionQuantity(card.id, 2);

    expect(await getCollectionQuantity(card.id)).toBe(1);

    await removeCollectionQuantity(card.id, 5);

    expect(await getCollectionQuantity(card.id)).toBe(0);
  });

  it("rejects invalid quantities without changing stored data", async () => {
    await setCollectionQuantity(card, 2);

    await expect(
      addCollectionQuantity(card, -1),
    ).rejects.toThrow();

    await expect(
      setCollectionQuantity(card, 1.5),
    ).rejects.toThrow();

    expect(await getCollectionQuantity(card.id)).toBe(2);
  });

  it("detects missing cached card metadata", async () => {
    await setCollectionQuantity(card, 2);

    const database = await getDatabase();
    await database.delete("cards", card.id);

    await expect(getPersistedCollection())
      .rejects.toThrow(/Missing cached card/);
  });

  it("clears collection without deleting card metadata", async () => {
    await setCollectionQuantity(card, 3);

    await clearPersistedCollection();

    const database = await getDatabase();

    expect(await getCollectionQuantity(card.id)).toBe(0);
    expect(await database.get("cards", card.id))
      .toBeDefined();
  });
});