// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { getDatabase } from "../indexedDbService";
import { migrateLegacyUserData } from "../legacyUserDataMigrationService";
import "./testSetup";

const card = {
  id: 89631139,
  name: "Blue-Eyes White Dragon",
  type: "Normal Monster",
  frameType: "normal",
  description: "Dragon",
  race: "Dragon",
  imageUrl: "",
  imageUrlSmall: "",
};

const combo = {
  id: "combo-1",
  name: "Starter",
  description: "Test",
  starters: [{ cardId: card.id, quantity: 1, zone: "hand" }],
  requirements: [],
  steps: [{ id: "step-1", order: 1, action: "normal-summon", cardId: card.id, description: "Summon" }],
  endBoardCardIds: [card.id],
  createdAt: "2026-10-15T00:00:00Z",
  updatedAt: "2026-10-15T00:00:00Z",
};

describe("legacy personal data migration", () => {
  beforeEach(() => localStorage.clear());

  it("imports all populated legacy categories atomically and once", async () => {
    localStorage.setItem("yugioh-collection", JSON.stringify([{ card, quantity: 3 }]));
    localStorage.setItem("yugioh-combos-v1", JSON.stringify([combo]));
    localStorage.setItem("yugioh-card-relationships", JSON.stringify([
      { sourceCardId: 1, targetCardId: 2, type: "searches" },
    ]));
    localStorage.setItem("yugioh-card-effects-v1", "[]");
    localStorage.setItem("yugioh-effect-templates-v1", "[]");

    expect(await migrateLegacyUserData()).toBe("migrated");
    const db = await getDatabase();
    expect((await db.get("collection", card.id))?.quantity).toBe(3);
    expect((await db.get("cards", card.id))?.card).toEqual(card);
    expect(await db.get("combos", "combo-1")).toEqual(combo);
    expect(await db.count("relationships")).toBe(1);

    localStorage.setItem("yugioh-collection", JSON.stringify([{ card, quantity: 9 }]));
    expect(await migrateLegacyUserData()).toBe("already-migrated");
    expect((await db.get("collection", card.id))?.quantity).toBe(3);
  });

  it("refuses malformed records without partial writes", async () => {
    localStorage.setItem("yugioh-collection", JSON.stringify([{ card, quantity: 2 }]));
    localStorage.setItem("yugioh-combos-v1", "not-json");

    await expect(migrateLegacyUserData()).rejects.toThrow("invalid JSON");
    const db = await getDatabase();
    expect(await db.count("collection")).toBe(0);
    expect(await db.get("metadata", "localStorageMigrationVersion")).toBeUndefined();
    expect(localStorage.getItem("yugioh-combos-v1")).toBe("not-json");
  });
});
