import "./testSetup";

import { describe, expect, it } from "vitest";

import {
  DATABASE_NAME,
  DATABASE_VERSION,
} from "../../../models/persistence/DeckBuilderDB";

import {
  closeDatabase,
  getDatabase,
} from "../indexedDbService";

describe("IndexedDB initialization", () => {
  it("creates the database with the expected version", async () => {
    const database = await getDatabase();

    expect(database.name).toBe(DATABASE_NAME);
    expect(database.version).toBe(DATABASE_VERSION);
  });

  it("creates all eight object stores", async () => {
    const database = await getDatabase();

    const expectedStores = [
      "cards",
      "collection",
      "decks",
      "combos",
      "metadata",
      "cardEffects",
      "effectTemplates",
      "relationships",
    ];

    expect(Array.from(database.objectStoreNames).sort())
      .toEqual(expectedStores.sort());
  });

  it("creates the deck updatedAt index", async () => {
    const database = await getDatabase();

    const transaction = database.transaction(
      "decks",
      "readonly",
    );

    const indexes = Array.from(
      transaction.objectStore("decks").indexNames,
    );

    expect(indexes).toContain("by-updated-at");

    await transaction.done;
  });

  it("reuses the cached connection", async () => {
    const first = await getDatabase();
    const second = await getDatabase();

    expect(first).toBe(second);
  });

  it("reopens after closing the connection", async () => {
    const first = await getDatabase();

    await closeDatabase();

    const second = await getDatabase();

    expect(second).not.toBe(first);
    expect(second.name).toBe(DATABASE_NAME);
  });
});