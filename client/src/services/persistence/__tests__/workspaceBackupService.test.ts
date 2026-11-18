// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getDatabase } from "../indexedDbService";
import { createSavedDeck, getSavedDeck } from "../deckRepository";
import { createEmptyDeck } from "../../../services/deck/deckService";
import { getPersistedCollection, setCollectionQuantity } from "../collectionRepository";
import { exportWorkspaceBackup, parseWorkspaceBackup, restoreWorkspaceBackup } from "../workspaceBackupService";
import "./testSetup";

const card = {
  id: 89631139, name: "Blue-Eyes White Dragon", type: "Normal Monster",
  frameType: "normal", description: "Dragon", race: "Dragon", imageUrl: "", imageUrlSmall: "",
};

beforeEach(() => localStorage.clear());

describe("workspace backup / restore", () => {
  async function seed() {
    const deck = createEmptyDeck("Backup Deck");
    deck.main.push({ card, quantity: 2 });
    const stored = await createSavedDeck(deck);
    const db = await getDatabase();
    await db.put("metadata", { key: "activeDeckId", value: stored.id });
    await setCollectionQuantity(card, 3);
    return stored;
  }

  it("round-trips the entire workspace and marks legacy migration complete", async () => {
    const deck = await seed();
    const json = await exportWorkspaceBackup();
    const backup = parseWorkspaceBackup(json);
    expect(backup.records.decks).toHaveLength(1);
    expect(backup.records.collection).toHaveLength(1);
    const db = await getDatabase();
    await db.clear("collection");
    await db.clear("decks");
    await restoreWorkspaceBackup(json);
    expect((await getSavedDeck(deck.id))?.main[0].quantity).toBe(2);
    expect((await getPersistedCollection())[0].quantity).toBe(3);
    expect((await db.get("metadata", "legacyDeckMigrationVersion"))?.value).toBe(1);
    expect((await db.get("metadata", "localStorageMigrationVersion"))?.value).toBe(1);
  });

  it("refuses invalid card references without modifying existing data", async () => {
    const deck = await seed();
    const backup = JSON.parse(await exportWorkspaceBackup()) as {
      records: { cards: unknown[] };
    };
    backup.records.cards = [];
    await expect(restoreWorkspaceBackup(JSON.stringify(backup)))
      .rejects.toThrow("without cached cards");
    expect(await getSavedDeck(deck.id)).not.toBeNull();
    expect((await getPersistedCollection())[0].quantity).toBe(3);
  });

  it("rejects unsupported versions and corrupt payloads", async () => {
    const deck = await seed();
    const backup = JSON.parse(await exportWorkspaceBackup()) as { version: number };
    backup.version = 2;
    await expect(restoreWorkspaceBackup(JSON.stringify(backup)))
      .rejects.toThrow("Unsupported");
    await expect(restoreWorkspaceBackup("not JSON")).rejects.toThrow();
    expect(await getSavedDeck(deck.id)).not.toBeNull();
  });

  it("rejects duplicate keys before beginning a restore transaction", async () => {
    await seed();
    const backup = JSON.parse(await exportWorkspaceBackup()) as {
      records: { decks: Array<{ id: string }> };
    };
    backup.records.decks.push(structuredClone(backup.records.decks[0]));
    await expect(restoreWorkspaceBackup(JSON.stringify(backup)))
      .rejects.toThrow("duplicate decks");
  });
});
