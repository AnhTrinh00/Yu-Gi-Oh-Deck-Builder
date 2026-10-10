
import { describe, expect, it } from "vitest";

import type { GameState } from "../../models/GameState";

import {
  normalizeGameState,
} from "../extendedGameStateService";

import {
  getInstancesInZone,
  initializeCardInstances,
  validateCardInstanceSync,
} from "../cardInstanceService";

import {
  placeCardInstanceOnField,
} from "../fieldInstanceService";

import {
  executeEffectStep,
  executeEffectSteps,
} from "../cardEffectStepService";

function createState(): GameState {
  const legacy: GameState = {
    zones: {
      hand: [100, 100, 200],
      deck: [300, 400, 500],
      extra: [],
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  };

  const initialized = initializeCardInstances(
    normalizeGameState(legacy)
  );

  if (!initialized.success) {
    throw new Error(initialized.error);
  }

  return initialized.state;
}

describe("cardEffectStepService", () => {
  it("draws the top card of the Deck", () => {
    const result = executeEffectStep(
      createState(),
      { type: "draw", count: 1 }
    );

    expect(result.success).toBe(true);
    expect(result.state.zones.deck).toEqual([
      400,
      500,
    ]);
    expect(result.state.zones.hand).toContain(300);
    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("draws multiple cards", () => {
    const result = executeEffectStep(
      createState(),
      { type: "draw", count: 2 }
    );

    expect(result.success).toBe(true);
    expect(result.state.zones.deck).toEqual([500]);
    expect(result.state.zones.hand).toEqual([
      100,
      100,
      200,
      300,
      400,
    ]);
  });

  it("rejects drawing more cards than available", () => {
    const state = createState();

    const result = executeEffectStep(state, {
      type: "draw",
      count: 4,
    });

    expect(result.success).toBe(false);
    expect(result.state).toBe(state);
    expect(state.zones.deck).toHaveLength(3);
  });

  it("searches a specified card from the Deck", () => {
    const result = executeEffectStep(
      createState(),
      { type: "search", cardId: 500 }
    );

    expect(result.success).toBe(true);
    expect(result.state.zones.deck).toEqual([
      300,
      400,
    ]);
    expect(result.state.zones.hand).toContain(500);
  });

  it("moves a card between non-field zones", () => {
    const result = executeEffectStep(
      createState(),
      {
        type: "move",
        cardId: 200,
        from: "hand",
        to: "graveyard",
      }
    );

    expect(result.success).toBe(true);
    expect(result.state.zones.graveyard).toEqual([
      200,
    ]);
  });

  it("Special Summons into an available Monster Zone", () => {
    const result = executeEffectStep(
      createState(),
      {
        type: "special-summon",
        cardId: 200,
        from: "hand",
      }
    );

    expect(result.success).toBe(true);
    expect(result.state.zones.field).toEqual([200]);

    expect(
      result.state.fieldState!.monsterZones[0]
        ?.cardId
    ).toBe(200);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("destroys a monster on the field", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "hand"
    ).find((item) => item.cardId === 200)!;

    const placed = placeCardInstanceOnField(
      state,
      {
        instanceId: instance.instanceId,
        zoneType: "monster",
        zoneIndex: 0,
      }
    );

    expect(placed.success).toBe(true);

    const destroyed = executeEffectStep(
      placed.state,
      {
        type: "destroy",
        cardId: 200,
        from: "field",
      }
    );

    expect(destroyed.success).toBe(true);
    expect(
      destroyed.state.zones.graveyard
    ).toEqual([200]);
    expect(destroyed.state.zones.field).toEqual([]);
  });

  it("rejects ambiguous duplicate-card selections", () => {
    const result = executeEffectStep(
      createState(),
      {
        type: "move",
        cardId: 100,
        from: "hand",
        to: "graveyard",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "instance selection"
    );
  });

  it("executes multiple steps in order", () => {
    const result = executeEffectSteps(
      createState(),
      [
        { type: "draw", count: 1 },
        { type: "search", cardId: 500 },
        {
          type: "move",
          cardId: 200,
          from: "hand",
          to: "graveyard",
        },
      ]
    );

    expect(result.success).toBe(true);
    expect(result.completedSteps).toBe(3);
    expect(result.totalSteps).toBe(3);
    expect(result.state.zones.deck).toEqual([400]);
    expect(result.state.zones.graveyard).toEqual([
      200,
    ]);
  });

  it("rolls back the entire sequence on failure", () => {
    const state = createState();

    const result = executeEffectSteps(state, [
      { type: "draw", count: 1 },
      { type: "search", cardId: 999 },
    ]);

    expect(result.success).toBe(false);
    expect(result.completedSteps).toBe(1);
    expect(result.state).toBe(state);

    expect(state.zones.deck).toEqual([
      300,
      400,
      500,
    ]);
    expect(state.zones.hand).toEqual([
      100,
      100,
      200,
    ]);
  });

  it("rejects execution without instance tracking", () => {
    const state = createState();
    delete state.cardInstances;

    const result = executeEffectStep(state, {
      type: "draw",
      count: 1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "instance tracking"
    );
  });

  it("rejects desynchronized states", () => {
    const state = createState();
    state.zones.hand.push(999);

    const result = executeEffectStep(state, {
      type: "draw",
      count: 1,
    });

    expect(result.success).toBe(false);
    expect(result.state).toBe(state);
  });
});
