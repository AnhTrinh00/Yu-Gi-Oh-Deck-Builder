import "./testSetup";

import { describe, expect, it } from "vitest";

import type { Card } from "../../../models/card/Card";

import {
  cacheCard,
  cacheCards,
  clearCardCache,
  getCachedCard,
  getCachedCards,
  hasCachedCard,
} from "../cardRepository";

const blueEyes: Card = {
  id: 89631139,
  name: "Blue-Eyes White Dragon",
  type: "Normal Monster",
  frameType: "normal",
  description: "This legendary dragon is a powerful engine of destruction.",
  race: "Dragon",
  attribute: "LIGHT",
  level: 8,
  atk: 3000,
  def: 2500,
  imageUrl: "https://example.com/blue-eyes.jpg",
  imageUrlSmall: "https://example.com/blue-eyes-small.jpg",
};

const darkMagician: Card = {
  ...blueEyes,
  id: 46986414,
  name: "Dark Magician",
  atk: 2500,
  def: 2100,
};

describe("cardRepository", () => {
  it("returns null for an uncached card", async () => {
    expect(await getCachedCard(999)).toBeNull();
    expect(await hasCachedCard(999)).toBe(false);
  });

  it("caches and retrieves a card", async () => {
    await cacheCard(blueEyes);

    expect(await getCachedCard(blueEyes.id)).toEqual(blueEyes);
    expect(await hasCachedCard(blueEyes.id)).toBe(true);
  });

  it("updates existing cached metadata", async () => {
    await cacheCard(blueEyes);

    await cacheCard({
      ...blueEyes,
      description: "Updated description",
    });

    expect((await getCachedCard(blueEyes.id))?.description)
      .toBe("Updated description");
  });

  it("caches multiple cards and deduplicates requested IDs", async () => {
    await cacheCards([blueEyes, darkMagician]);

    const result = await getCachedCards([
      blueEyes.id,
      darkMagician.id,
      blueEyes.id,
    ]);

    expect(result).toEqual([blueEyes, darkMagician]);
  });

  it("clears cached cards", async () => {
    await cacheCards([blueEyes, darkMagician]);

    await clearCardCache();

    expect(await getCachedCards([
      blueEyes.id,
      darkMagician.id,
    ])).toEqual([]);
  });
});