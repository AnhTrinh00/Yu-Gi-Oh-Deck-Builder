
import { describe, expect, it } from "vitest";

import type {
  CardEffectDefinition,
} from "../../models/effect/CardEffect";

import type { GameState } from "../../models/simulation/GameState";

import {
  CardEffectRegistry,
} from "../effect/cardEffectRegistryService";

function createEffect(
  id: string,
  cardId = 100
): CardEffectDefinition {
  return {
    id,
    sourceCardId: cardId,
    label: `Test effect ${id}`,
    activationZone: "hand",
    conditions: [],
    costs: [],
    steps: [
      {
        type: "draw",
        count: 1,
      },
    ],
    oncePerTurnKey: id,
    verification: "experimental",
  };
}

function createState(): GameState {
  return {
    zones: {
      hand: [100],
      deck: [200, 300],
      extra: [],
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  };
}

describe("CardEffectRegistry", () => {
  it("registers and retrieves an effect", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1"));

    expect(registry.hasEffect("effect-1")).toBe(true);

    expect(
      registry.getEffect("effect-1")?.sourceCardId
    ).toBe(100);
  });

  it("supports multiple effects for one card", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1"));
    registry.registerEffect(createEffect("effect-2"));

    expect(
      registry.getEffectsForCard(100)
    ).toHaveLength(2);

    expect(registry.getRegisteredCardCount()).toBe(1);
  });

  it("rejects duplicate effect IDs", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1"));

    expect(() =>
      registry.registerEffect(createEffect("effect-1"))
    ).toThrow("already registered");
  });

  it("registers multiple effects in a batch", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffects([
      createEffect("effect-1", 100),
      createEffect("effect-2", 200),
    ]);

    expect(registry.getEffectCount()).toBe(2);
    expect(registry.getRegisteredCardCount()).toBe(2);
  });

  it("does not partially register a duplicate batch", () => {
    const registry = new CardEffectRegistry();

    expect(() =>
      registry.registerEffects([
        createEffect("effect-1"),
        createEffect("effect-1"),
      ])
    ).toThrow("already registered");

    expect(registry.getEffectCount()).toBe(0);
  });

  it("removes an effect and updates its card index", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1"));

    expect(registry.removeEffect("effect-1")).toBe(true);
    expect(registry.removeEffect("effect-1")).toBe(false);

    expect(registry.getEffectsForCard(100)).toEqual([]);
    expect(registry.getRegisteredCardCount()).toBe(0);
  });

  it("replaces an existing effect", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1", 100));

    const replacement = createEffect("effect-1", 200);

    registry.replaceEffect(replacement);

    expect(registry.getEffectsForCard(100)).toHaveLength(0);
    expect(registry.getEffectsForCard(200)).toHaveLength(1);
  });

  it("prevents external mutation of stored definitions", () => {
    const registry = new CardEffectRegistry();

    const original = createEffect("effect-1");

    registry.registerEffect(original);

    original.steps.push({
      type: "draw",
      count: 5,
    });

    const retrieved = registry.getEffect("effect-1");

    expect(retrieved?.steps).toHaveLength(1);

    retrieved?.steps.push({
      type: "draw",
      count: 3,
    });

    expect(
      registry.getEffect("effect-1")?.steps
    ).toHaveLength(1);
  });

  it("validates registered effects against game state", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1"));

    const validation = registry.validateRegisteredEffect(
      createState(),
      "effect-1"
    );

    expect(validation.found).toBe(true);
    expect(validation.result?.valid).toBe(true);
  });

  it("rejects validation when the source card is missing", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1"));

    const state = createState();
    state.zones.hand = [];

    const validation = registry.validateRegisteredEffect(
      state,
      "effect-1"
    );

    expect(validation.result?.valid).toBe(false);
  });

  it("returns not found for unknown effects", () => {
    const registry = new CardEffectRegistry();

    const validation = registry.validateRegisteredEffect(
      createState(),
      "unknown"
    );

    expect(validation).toEqual({
      found: false,
      result: null,
    });
  });

  it("clears all registered effects", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffects([
      createEffect("effect-1", 100),
      createEffect("effect-2", 200),
    ]);

    registry.clear();

    expect(registry.getEffectCount()).toBe(0);
    expect(registry.getRegisteredCardCount()).toBe(0);
  });
  
  it("preserves the original effect when replacement is invalid", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1", 100));

    expect(() =>
      registry.replaceEffect({
        ...createEffect("effect-1", 200),
        sourceCardId: -1,
      })
    ).toThrow();

    expect(registry.getEffect("effect-1")?.sourceCardId)
      .toBe(100);

    expect(registry.getEffectsForCard(100))
      .toHaveLength(1);
  });

  it("updates card indexes after replacing an effect", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1", 100));

    registry.replaceEffect(createEffect("effect-1", 200));

    expect(registry.getEffectsForCard(100)).toEqual([]);
    expect(registry.getEffectsForCard(200)).toHaveLength(1);
    expect(registry.getRegisteredCardCount()).toBe(1);
  });

  it("does not expose mutable internal effect objects", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect("effect-1"));

    const retrieved = registry.getEffect("effect-1");

    if (!retrieved) {
      throw new Error("Expected registered effect.");
    }

    retrieved.label = "Changed outside registry";
    retrieved.steps.push({ type: "draw", count: 3 });

    const original = registry.getEffect("effect-1");

    expect(original?.label).toBe("Test effect effect-1");
    expect(original?.steps).toHaveLength(1);
  });
});
