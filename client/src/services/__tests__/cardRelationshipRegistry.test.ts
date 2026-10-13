
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  CardRelationship,
} from "../../models/CardRelationship";

import {
  loadRelationships,
  saveRelationships,
  addRelationship,
  removeRelationship,
  clearRelationships,
} from "../relationship/cardRelationshipRegistry";

// Mock localStorage so tests work in Node.
const storage = new Map<string, string>();

const mockStorage = {
  getItem: vi.fn((key: string) =>
    storage.get(key) ?? null
  ),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    storage.delete(key);
  }),
  clear: vi.fn(() => {
    storage.clear();
  }),
};

vi.stubGlobal("localStorage", mockStorage);

const relationship: CardRelationship = {
  sourceCardId: 1,
  targetCardId: 2,
  type: "searches",
  description: "Card A searches Card B.",
};

describe("cardRelationshipRegistry", () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it("returns an empty array when nothing is stored", () => {
    expect(loadRelationships()).toEqual([]);
  });

  it("saves and loads relationships", () => {
    saveRelationships([relationship]);

    expect(loadRelationships()).toEqual([
      relationship,
    ]);
  });

  it("adds a new relationship", () => {
    const result = addRelationship(relationship);

    expect(result).toEqual([relationship]);
    expect(loadRelationships()).toEqual([
      relationship,
    ]);
  });

  it("prevents duplicate relationships", () => {
    addRelationship(relationship);
    addRelationship(relationship);

    expect(loadRelationships()).toHaveLength(1);
  });

  it("allows different relationship types between the same cards", () => {
    addRelationship(relationship);

    addRelationship({
      ...relationship,
      type: "summons",
    });

    expect(loadRelationships()).toHaveLength(2);
  });

  it("removes a specific relationship", () => {
    addRelationship(relationship);

    removeRelationship(1, 2, "searches");

    expect(loadRelationships()).toEqual([]);
  });

  it("does not remove relationships of other types", () => {
    addRelationship(relationship);

    const summonRelationship: CardRelationship = {
      ...relationship,
      type: "summons",
    };

    addRelationship(summonRelationship);

    removeRelationship(1, 2, "searches");

    expect(loadRelationships()).toEqual([
      summonRelationship,
    ]);
  });

  it("clears saved relationships", () => {
    addRelationship(relationship);

    clearRelationships();

    expect(loadRelationships()).toEqual([]);
  });

  it("handles invalid JSON safely", () => {
    storage.set(
      "yugioh-card-relationships",
      "{invalid-json"
    );

    expect(loadRelationships()).toEqual([]);
  });

  it("ignores invalid relationship entries", () => {
    storage.set(
      "yugioh-card-relationships",
      JSON.stringify([
        relationship,
        { sourceCardId: "invalid" },
        null,
      ])
    );

    expect(loadRelationships()).toEqual([
      relationship,
    ]);
  });
});
