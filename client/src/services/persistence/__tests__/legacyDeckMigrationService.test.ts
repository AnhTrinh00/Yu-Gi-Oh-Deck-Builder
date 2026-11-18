// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { Card } from "../../../models/card/Card";
import type { Deck } from "../../../models/deck/Deck";
import { createSavedDeck, getSavedDeck, listSavedDecks } from "../deckRepository";
import { getActiveDeckId } from "../metadataRepository";
import { migrateLegacyDeck } from "../legacyDeckMigrationService";
import "./testSetup";

const KEY = "yugioh-deck-builder-deck";
const card: Card = {
  id: 89631139,
  name: "Blue-Eyes White Dragon",
  type: "Normal Monster",
  frameType: "normal",
  description: "Legendary dragon",
  race: "Dragon",
  imageUrl: "https://example.com/card.jpg",
  imageUrlSmall: "https://example.com/small.jpg",
};
const legacyDeck: Deck = {
  name: "Legacy Blue-Eyes",
  main: [{ card, quantity: 2 }],
  extra: [],
  side: [],
};

describe("legacy deck migration", () => {
  beforeEach(() => localStorage.clear());

  it("moves the deck and card snapshot exactly once", async () => {
    localStorage.setItem(KEY, JSON.stringify(legacyDeck));

    const first = await migrateLegacyDeck();
    expect(first.status).toBe("migrated");
    expect(await getActiveDeckId()).toBe(first.deckId);
    expect(await getSavedDeck(first.deckId!)).toEqual(legacyDeck);

    expect((await migrateLegacyDeck()).status).toBe("already-migrated");
    expect(await listSavedDecks()).toHaveLength(1);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(legacyDeck));
  });

  it("preserves invalid JSON without marking the migration complete", async () => {
    localStorage.setItem(KEY, "not-json");
    await expect(migrateLegacyDeck()).rejects.toThrow("not valid JSON");
    expect(localStorage.getItem(KEY)).toBe("not-json");
    expect(await listSavedDecks()).toHaveLength(0);

    localStorage.setItem(KEY, JSON.stringify(legacyDeck));
    expect((await migrateLegacyDeck()).status).toBe("migrated");
  });

  it("does not overwrite an existing IndexedDB workspace", async () => {
    await createSavedDeck({ ...legacyDeck, name: "Existing" });
    localStorage.setItem(KEY, JSON.stringify(legacyDeck));
    expect((await migrateLegacyDeck()).status).toBe("already-migrated");
    expect((await listSavedDecks()).map((deck) => deck.name)).toEqual(["Existing"]);
  });
});
