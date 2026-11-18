import "./testSetup";

import { describe, expect, it } from "vitest";

import type { Combo } from "../../../models/combo/Combo";

import {
  clearSavedCombos,
  deleteSavedCombo,
  getSavedCombo,
  getSavedCombos,
  saveCombo,
  saveCombos,
} from "../comboRepository";

function makeCombo(id: string): Combo {
  return {
    id,
    name: `Combo ${id}`,
    description: "Test combo",
    starters: [],
    requirements: [],
    steps: [],
    endBoardCardIds: [],
    createdAt: "2026-10-15T00:00:00Z",
    updatedAt: "2026-10-15T00:00:00Z",
  };
}

describe("comboRepository", () => {
  it("saves and retrieves a combo", async () => {
    const combo = makeCombo("combo-1");

    await saveCombo(combo);

    expect(await getSavedCombo(combo.id)).toEqual(combo);
  });

  it("saves multiple combos", async () => {
    await saveCombos([
      makeCombo("combo-1"),
      makeCombo("combo-2"),
    ]);

    expect(await getSavedCombos()).toHaveLength(2);
  });

  it("updates an existing combo", async () => {
    const combo = makeCombo("combo-1");

    await saveCombo(combo);
    await saveCombo({
      ...combo,
      name: "Updated Combo",
    });

    expect((await getSavedCombo(combo.id))?.name)
      .toBe("Updated Combo");
  });

  it("deletes a combo", async () => {
    await saveCombo(makeCombo("combo-1"));
    await deleteSavedCombo("combo-1");

    expect(await getSavedCombo("combo-1")).toBeNull();
  });

  it("clears all saved combos", async () => {
    await saveCombos([
      makeCombo("combo-1"),
      makeCombo("combo-2"),
    ]);

    await clearSavedCombos();

    expect(await getSavedCombos()).toEqual([]);
  });

  it("rejects invalid combo data", async () => {
    const invalid = {
      ...makeCombo("combo-1"),
      name: "",
    };

    await expect(saveCombo(invalid)).rejects.toThrow();
  });
});