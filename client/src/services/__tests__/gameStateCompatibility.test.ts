
import { describe, expect, it } from "vitest";

import type { GameState } from "../../models/GameState";

import {
  cloneGameState,
  executeGameAction,
  moveCard,
} from "../gameStateService";

import {
  normalizeGameState,
} from "../extendedGameStateService";

import {
  initializeCardInstances,
} from "../cardInstanceService";

function legacyState(): GameState {
  return {
    zones: {
      hand: [100],
      deck: [200],
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

describe("Phase 3 and Phase 4 compatibility", () => {
  it("preserves legacy Normal Summon behavior", () => {
    const state = legacyState();

    const result = executeGameAction(state, {
      id: "summon-1",
      type: "normal-summon",
      cardId: 100,
    });

    expect(result.success).toBe(true);
    expect(result.state.zones.field).toEqual([100]);
    expect(result.state.normalSummonUsed).toBe(true);
  });

  it("preserves legacy search behavior", () => {
    const result = executeGameAction(
      legacyState(),
      {
        id: "search-1",
        type: "search",
        cardId: 200,
      }
    );

    expect(result.success).toBe(true);
    expect(result.state.zones.hand).toEqual([
      100,
      200,
    ]);
  });

  it("preserves legacy movement", () => {
    const result = moveCard(
      legacyState(),
      100,
      "hand",
      "graveyard"
    );

    expect(result).not.toBeNull();
    expect(result!.zones.graveyard).toEqual([100]);
  });

  it("allows non-field movement in untracked extended states", () => {
    const state = normalizeGameState(
      legacyState()
    );

    const result = moveCard(
      state,
      200,
      "deck",
      "hand"
    );

    expect(result).not.toBeNull();
    expect(result!.zones.hand).toEqual([
      100,
      200,
    ]);

    expect(result!.fieldState).toBeDefined();
  });

  it("rejects legacy field movement in extended states", () => {
    const state = normalizeGameState(
      legacyState()
    );

    const result = executeGameAction(state, {
      id: "summon-1",
      type: "normal-summon",
      cardId: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "field-aware"
    );

    expect(state.zones.field).toEqual([]);
  });

  it("rejects legacy actions in instance-tracked states", () => {
    const initialized = initializeCardInstances(
      normalizeGameState(legacyState())
    );

    expect(initialized.success).toBe(true);

    const result = executeGameAction(
      initialized.state,
      {
        id: "search-1",
        type: "search",
        cardId: 200,
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "instance-aware"
    );

    expect(
      result.state.zones.deck
    ).toEqual([200]);
  });

  it("rejects direct movement in tracked states", () => {
    const initialized = initializeCardInstances(
      normalizeGameState(legacyState())
    );

    const result = moveCard(
      initialized.state,
      100,
      "hand",
      "graveyard"
    );

    expect(result).toBeNull();
  });

  it("preserves extended metadata when cloning", () => {
    const state = normalizeGameState(
      legacyState()
    );

    state.effectUsage!.push({
      usageKey: "effect-1",
      turnNumber: 1,
    });

    state.restrictions!.push({
      id: "restriction-1",
      description: "Test restriction",
      expiresAtTurnEnd: true,
    });

    const cloned = cloneGameState(state);

    expect(cloned.effectUsage).toEqual(
      state.effectUsage
    );

    expect(cloned.restrictions).toEqual(
      state.restrictions
    );

    cloned.effectUsage![0].usageKey = "changed";
    cloned.restrictions![0].description = "changed";

    expect(state.effectUsage![0].usageKey).toBe(
      "effect-1"
    );

    expect(state.restrictions![0].description).toBe(
      "Test restriction"
    );
  });
});
