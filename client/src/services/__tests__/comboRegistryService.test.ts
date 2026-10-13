
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { Combo } from "../../models/combo/Combo";

import {
  loadCombos,
  upsertCombo,
  deleteCombo,
} from "../combo/comboRegistryService";

const combo: Combo = {
  id: "combo-1",
  name: "Test Combo",
  description: "",
  starters: [],
  requirements: [],
  steps: [],
  endBoardCardIds: [],
  createdAt: "2026-10-08",
  updatedAt: "2026-10-08",
};

describe("comboRegistryService", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};

    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    });
  });

  it("returns an empty list when nothing is stored", () => {
    expect(loadCombos()).toEqual([]);
  });

  it("saves a new combo", () => {
    upsertCombo(combo);

    expect(loadCombos()).toEqual([combo]);
  });

  it("updates an existing combo", () => {
    upsertCombo(combo);
    upsertCombo({ ...combo, name: "Updated Combo" });

    expect(loadCombos()).toHaveLength(1);
    expect(loadCombos()[0].name).toBe("Updated Combo");
  });

  it("deletes a combo", () => {
    upsertCombo(combo);
    deleteCombo(combo.id);

    expect(loadCombos()).toEqual([]);
  });

  it("handles corrupted storage", () => {
    storage["yugioh-combos-v1"] = "{invalid";

    expect(loadCombos()).toEqual([]);
  });
});
