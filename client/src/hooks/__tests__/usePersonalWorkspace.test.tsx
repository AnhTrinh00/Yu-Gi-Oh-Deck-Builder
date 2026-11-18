// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePersonalWorkspace } from "../usePersonalWorkspace";
import { getPersistedCollection } from "../../services/persistence/collectionRepository";
import { getSavedCombos } from "../../services/persistence/comboRepository";
import { getSavedRelationships } from "../../services/persistence/personalDefinitionRepository";
import "../../services/persistence/__tests__/testSetup";

beforeEach(() => localStorage.clear());

const card = {
  id: 89631139, name: "Blue-Eyes White Dragon", type: "Normal Monster",
  frameType: "normal", description: "Dragon", race: "Dragon", imageUrl: "", imageUrlSmall: "",
};

const combo = {
  id: "demo", name: "Demo", description: "", starters: [], requirements: [],
  steps: [], endBoardCardIds: [], createdAt: "2026-11-17T00:00:00Z", updatedAt: "2026-11-17T00:00:00Z",
};

describe("personal workspace integration", () => {
  it("migrates existing collection and persists subsequent updates", async () => {
    localStorage.setItem("yugioh-collection", JSON.stringify([{ card, quantity: 2 }]));
    const hook = renderHook(() => usePersonalWorkspace());
    await waitFor(() => expect(hook.result.current.data?.collection[0]?.quantity).toBe(2));
    await act(async () => { await hook.result.current.addCard(card); });
    expect(hook.result.current.data?.collection[0]?.quantity).toBe(3);
    expect((await getPersistedCollection())[0].quantity).toBe(3);
    expect(JSON.parse(localStorage.getItem("yugioh-collection")!)[0].quantity).toBe(2);
    hook.unmount();
  });

  it("saves, deletes, and retrieves combos and relationships", async () => {
    const hook = renderHook(() => usePersonalWorkspace());
    await waitFor(() => expect(hook.result.current.data).not.toBeNull());
    await act(async () => {
      await hook.result.current.upsertCombo(combo);
      await hook.result.current.addRelationship({ sourceCardId: 1, targetCardId: 2, type: "supports" });
    });
    expect((await getSavedCombos()).map(item => item.id)).toEqual(["demo"]);
    expect(await getSavedRelationships()).toHaveLength(1);
    await act(async () => {
      await hook.result.current.removeCombo("demo");
      await hook.result.current.removeRelationship(1, 2, "supports");
    });
    expect(await getSavedCombos()).toEqual([]);
    expect(await getSavedRelationships()).toEqual([]);
    hook.unmount();
  });
});
