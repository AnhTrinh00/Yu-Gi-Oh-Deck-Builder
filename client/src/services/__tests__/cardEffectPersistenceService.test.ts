
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { CardEffectDefinition } from "../../models/CardEffect";

import { CardEffectRegistry } from "../cardEffectRegistryService";

import {
  loadPersistedEffects,
  savePersistedEffects,
  createPersistentEffectRegistry,
  persistRegistry,
} from "../cardEffectPersistenceService";

function createEffect(
  id: string
): CardEffectDefinition {
  return {
    id,
    sourceCardId: 100,
    label: `Effect ${id}`,
    activationZone: "hand",
    conditions: [],
    costs: [],
    steps: [{ type: "draw", count: 1 }],
    verification: "manually-verified",
  };
}

describe("cardEffectPersistenceService", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map();

    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        storage.get(key) ?? null,

      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },

      removeItem: (key: string) => {
        storage.delete(key);
      },

      clear: () => {
        storage.clear();
      },
    });
  });

  it("returns an empty list when nothing is saved", () => {
    expect(loadPersistedEffects()).toEqual([]);
  });

  it("saves and restores effects", () => {
    const effects = [createEffect("effect-1")];

    savePersistedEffects(effects);

    expect(loadPersistedEffects()).toEqual(effects);
  });

  it("restores a registry from saved effects", () => {
    savePersistedEffects([
      createEffect("effect-1"),
      createEffect("effect-2"),
    ]);

    const registry = createPersistentEffectRegistry();

    expect(registry.getEffectCount()).toBe(2);
    expect(registry.hasEffect("effect-1")).toBe(true);
    expect(registry.hasEffect("effect-2")).toBe(true);
  });

  it("persists registry changes", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1"));

    persistRegistry(registry);

    expect(loadPersistedEffects()).toHaveLength(1);

    registry.removeEffect("effect-1");

    persistRegistry(registry);

    expect(loadPersistedEffects()).toEqual([]);
  });

  it("persists edited effects", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1"));

    registry.replaceEffect({
      ...createEffect("effect-1"),
      label: "Updated label",
    });

    persistRegistry(registry);

    expect(loadPersistedEffects()[0].label).toBe(
      "Updated label"
    );
  });

  it("rejects corrupted JSON", () => {
    storage.set("yugioh-card-effects-v1", "{invalid");

    expect(() => loadPersistedEffects()).toThrow();
  });

  it("rejects invalid stored effects", () => {
    storage.set(
      "yugioh-card-effects-v1",
      JSON.stringify([
        {
          ...createEffect("effect-1"),
          verification: "invalid",
        },
      ])
    );

    expect(() => loadPersistedEffects()).toThrow();
  });

  it("does not overwrite saved data when validation fails", () => {
    const valid = [createEffect("effect-1")];

    savePersistedEffects(valid);

    expect(() =>
      savePersistedEffects([
        {
          ...createEffect("effect-2"),
          sourceCardId: -1,
        },
      ])
    ).toThrow();

    expect(loadPersistedEffects()).toEqual(valid);
  });
});
