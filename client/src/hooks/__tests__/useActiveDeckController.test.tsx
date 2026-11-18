// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useActiveDeckController } from "../useActiveDeckController";
import { getSavedDeck, listSavedDecks } from "../../services/persistence/deckRepository";
import "../../services/persistence/__tests__/testSetup";

beforeEach(() => localStorage.clear());

async function initialize() {
  const hook = renderHook(() => useActiveDeckController());
  await act(async () => {
    await hook.result.current.initialize();
  });
  await waitFor(() => expect(hook.result.current.deck).not.toBeNull());
  return hook;
}

describe("active deck controller integration", () => {
  it("persists the latest edits before switching to a new deck", async () => {
    const { result, unmount } = await initialize();
    const firstId = result.current.activeDeckId;
    expect(firstId).toBeTruthy();

    act(() => {
      result.current.updateDeck((deck) => ({ ...deck, name: "Edited Draft" }));
      result.current.updateDeck((deck) => ({ ...deck, name: "Final Draft" }));
    });

    await act(async () => {
      await result.current.createDeck("Second Deck");
    });

    expect((await getSavedDeck(firstId!))?.name).toBe("Final Draft");
    expect(result.current.deck?.name).toBe("Second Deck");

    await act(async () => {
      await result.current.selectDeck(firstId!);
    });

    expect(result.current.deck?.name).toBe("Final Draft");
    unmount();
  });

  it("duplicates and deletes decks without losing the remaining deck", async () => {
    const { result, unmount } = await initialize();
    const originalId = result.current.activeDeckId!;
    await act(async () => {
      await result.current.duplicateDeck(originalId);
    });
    const duplicateId = result.current.activeDeckId!;
    expect(duplicateId).not.toBe(originalId);
    expect((await listSavedDecks())).toHaveLength(2);

    await act(async () => {
      await result.current.deleteDeck(duplicateId);
    });
    expect(result.current.activeDeckId).toBe(originalId);
    expect((await listSavedDecks())).toHaveLength(1);
    unmount();
  });

  it("does not queue an autosave for an unchanged deck", async () => {
    const { result, unmount } = await initialize();
    act(() => {
      result.current.updateDeck((deck) => deck);
    });
    expect(result.current.saveStatus).toBe("idle");
    unmount();
  });
});
