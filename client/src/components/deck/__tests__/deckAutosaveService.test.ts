
import { describe, expect, it, vi } from "vitest";

import type { Deck } from "../../../models/deck/Deck";
import type { StoredDeck } from "../../../models/persistence/StoredRecords";

import { DeckAutosaveService } from "../../../services/deck/deckAutosaveService";

function makeDeck(name: string): Deck {
  return {
    name,
    main: [],
    extra: [],
    side: [],
  };
}

function makeStoredDeck(
  id: string,
  deck: Deck,
): StoredDeck {
  return {
    id,
    name: deck.name,
    main: [],
    extra: [],
    side: [],
    createdAt: "2026-10-15T00:00:00Z",
    updatedAt: "2026-10-15T00:00:00Z",
  };
}

describe("DeckAutosaveService", () => {
  it("saves edits in the order requested", async () => {
    const savedNames: string[] = [];

    const save = vi.fn(async (id: string, deck: Deck) => {
      savedNames.push(deck.name);

      return makeStoredDeck(id, deck);
    });

    const service = new DeckAutosaveService(save);

    await Promise.all([
      service.save("deck-1", makeDeck("First")),
      service.save("deck-1", makeDeck("Second")),
      service.save("deck-1", makeDeck("Third")),
    ]);

    expect(savedNames).toEqual([
      "First",
      "Second",
      "Third",
    ]);

    expect(service.hasPendingSaves()).toBe(false);
  });

  it("captures a snapshot when a save is queued", async () => {
    const savedNames: string[] = [];

    const save = vi.fn(async (id: string, deck: Deck) => {
      savedNames.push(deck.name);

      return makeStoredDeck(id, deck);
    });

    const service = new DeckAutosaveService(save);

    const deck = makeDeck("Original");

    const pending = service.save("deck-1", deck);

    deck.name = "Changed After Queueing";

    await pending;

    expect(savedNames).toEqual(["Original"]);
  });

  it("continues processing after a failed save", async () => {
    let attempts = 0;

    const save = vi.fn(async (id: string, deck: Deck) => {
      attempts += 1;

      if (attempts === 1) {
        throw new Error("Database write failed");
      }

      return makeStoredDeck(id, deck);
    });

    const service = new DeckAutosaveService(save);

    const first = service.save(
      "deck-1",
      makeDeck("First"),
    );

    const second = service.save(
      "deck-1",
      makeDeck("Second"),
    );

    await expect(first).rejects.toThrow(
      "Database write failed",
    );

    await expect(second).resolves.toMatchObject({
      name: "Second",
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(service.getLastError()).toBeNull();
  });

  it("flush waits for pending saves", async () => {
    let releaseSave: (() => void) | undefined;

    const save = vi.fn(
      async (id: string, deck: Deck) => {
        await new Promise<void>((resolve) => {
          releaseSave = resolve;
        });

        return makeStoredDeck(id, deck);
      },
    );

    const service = new DeckAutosaveService(save);

    const pending = service.save(
      "deck-1",
      makeDeck("Pending"),
    );

    expect(service.hasPendingSaves()).toBe(true);

    // Allow the queued save to start.
    await Promise.resolve();
    await Promise.resolve();

    expect(releaseSave).toBeDefined();

    releaseSave?.();

    await pending;
    await service.flush();

    expect(service.hasPendingSaves()).toBe(false);
  });

  it("rejects an invalid deck ID", async () => {
    const service = new DeckAutosaveService();

    await expect(
      service.save("", makeDeck("Invalid")),
    ).rejects.toThrow(/without an ID/);
  });
});
