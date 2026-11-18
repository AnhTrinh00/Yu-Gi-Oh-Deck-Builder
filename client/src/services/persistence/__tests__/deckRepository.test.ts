import "./testSetup";

import { describe, expect, it } from "vitest";

import type { Card } from "../../../models/card/Card";
import type { Deck } from "../../../models/deck/Deck";

import {
  createSavedDeck,
  deleteSavedDeck,
  duplicateSavedDeck,
  getSavedDeck,
  getStoredDeck,
  listSavedDecks,
  updateSavedDeck,
} from "../deckRepository";

import { getDatabase } from "../indexedDbService";

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

function makeDeck(name = "Test Deck"): Deck {
  return {
    name,
    main: [{ card, quantity: 3 }],
    extra: [],
    side: [],
  };
}

describe("deckRepository", () => {
  it("creates and reconstructs a saved deck", async () => {
    const deck = makeDeck();

    const saved = await createSavedDeck(deck);

    expect(saved.id).toBeTruthy();
    expect(saved.main).toEqual([
      { cardId: card.id, quantity: 3 },
    ]);

    expect(await getSavedDeck(saved.id)).toEqual(deck);
  });

  it("supports multiple independent saved decks", async () => {
    const first = await createSavedDeck(makeDeck("First"));
    const second = await createSavedDeck(makeDeck("Second"));

    expect(first.id).not.toBe(second.id);
    expect(await listSavedDecks()).toHaveLength(2);

    expect((await getSavedDeck(first.id))?.name).toBe("First");
    expect((await getSavedDeck(second.id))?.name).toBe("Second");
  });

  it("updates an existing deck without changing its ID", async () => {
    const saved = await createSavedDeck(makeDeck());

    const updatedDeck = makeDeck("Updated Deck");
    updatedDeck.main[0].quantity = 2;

    const updated = await updateSavedDeck(
      saved.id,
      updatedDeck,
    );

    expect(updated.id).toBe(saved.id);
    expect(updated.createdAt).toBe(saved.createdAt);
    expect(await getSavedDeck(saved.id)).toEqual(updatedDeck);
  });

  it("duplicates a deck with a new ID", async () => {
    const original = await createSavedDeck(makeDeck());

    const copy = await duplicateSavedDeck(
      original.id,
      "Copied Deck",
    );

    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("Copied Deck");
    expect(copy.main).toEqual(original.main);
  });

  it("deletes one deck without deleting another", async () => {
    const first = await createSavedDeck(makeDeck("First"));
    const second = await createSavedDeck(makeDeck("Second"));

    await deleteSavedDeck(first.id);

    expect(await getStoredDeck(first.id)).toBeNull();
    expect(await getSavedDeck(second.id)).not.toBeNull();
  });

  it("allows incomplete decks", async () => {
    const emptyDeck: Deck = {
      name: "Work in Progress",
      main: [],
      extra: [],
      side: [],
    };

    const saved = await createSavedDeck(emptyDeck);

    expect(await getSavedDeck(saved.id)).toEqual(emptyDeck);
  });

  it("rejects duplicate entries within a section", async () => {
    const invalid = makeDeck();

    invalid.main.push({
      card,
      quantity: 1,
    });

    await expect(
      createSavedDeck(invalid),
    ).rejects.toThrow(/Duplicate card/);
  });

  it("fails explicitly when cached card metadata is missing", async () => {
    const saved = await createSavedDeck(makeDeck());

    const database = await getDatabase();
    await database.delete("cards", card.id);

    await expect(
      getSavedDeck(saved.id),
    ).rejects.toThrow(/Missing cached card/);
  });

  it("rejects updates to nonexistent decks", async () => {
    await expect(
      updateSavedDeck("missing-id", makeDeck()),
    ).rejects.toThrow(/does not exist/);
  });

  it("preserves existing decks after a failed update", async () => {
    const original = makeDeck("Original Deck");

    const saved = await createSavedDeck(original);

    await expect(
        updateSavedDeck("nonexistent-id", makeDeck("Invalid Update")),
    ).rejects.toThrow(/does not exist/);

    const restored = await getSavedDeck(saved.id);

    expect(restored).toEqual(original);

    const decks = await listSavedDecks();

    expect(decks).toHaveLength(1);
  });
});