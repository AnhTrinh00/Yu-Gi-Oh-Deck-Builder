
import { describe, expect, it } from "vitest";

import type { GameState } from "../../models/simulation/GameState";

import { normalizeGameState } from "../simulation/extendedGameStateService";

import {
  addGameRestriction,
  advanceTurn,
  hasUsedEffectThisTurn,
  recordEffectUsage,
  setDuelPhase,
} from "../simulation/turnRestrictionService";

function createState(): GameState {
  return normalizeGameState({
    zones: {
      hand: [],
      deck: [],
      extra: [],
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  });
}

describe("turnRestrictionService", () => {
  it("records an effect usage", () => {
    const state = createState();

    const result = recordEffectUsage(
      state,
      "monster-search"
    );

    expect(result.success).toBe(true);

    expect(
      hasUsedEffectThisTurn(
        result.state,
        "monster-search"
      )
    ).toBe(true);

    expect(result.state.usedEffects).toContain(
      "monster-search"
    );
  });

  it("rejects duplicate usage during the same turn", () => {
    const first = recordEffectUsage(
      createState(),
      "monster-search"
    );

    const second = recordEffectUsage(
      first.state,
      "monster-search"
    );

    expect(second.success).toBe(false);
  });

  it("rejects empty usage keys", () => {
    const result = recordEffectUsage(
      createState(),
      " "
    );

    expect(result.success).toBe(false);
  });

  it("changes the duel phase", () => {
    const result = setDuelPhase(
      createState(),
      "battle"
    );

    expect(result.success).toBe(true);
    expect(result.state.turnState?.phase).toBe(
      "battle"
    );
  });

  it("advances the turn and changes active player", () => {
    const result = advanceTurn(createState());

    expect(result.success).toBe(true);
    expect(result.state.turnState).toEqual({
      turnNumber: 2,
      activePlayer: "opponent",
      phase: "draw",
    });
  });

  it("resets turn-scoped effect usage", () => {
    const first = recordEffectUsage(
      createState(),
      "monster-search"
    );

    const nextTurn = advanceTurn(first.state);

    expect(nextTurn.state.effectUsage).toEqual([]);
    expect(nextTurn.state.usedEffects).toEqual([]);

    expect(
      hasUsedEffectThisTurn(
        nextTurn.state,
        "monster-search"
      )
    ).toBe(false);
  });

  it("resets the Normal Summon flag", () => {
    const state = createState();
    state.normalSummonUsed = true;

    const result = advanceTurn(state);

    expect(result.state.normalSummonUsed).toBe(false);
  });

  it("removes restrictions that expire at turn end", () => {
    const first = addGameRestriction(
      createState(),
      {
        id: "temporary",
        description: "Temporary restriction",
        expiresAtTurnEnd: true,
      }
    );

    const second = addGameRestriction(
      first.state,
      {
        id: "persistent",
        description: "Persistent restriction",
        expiresAtTurnEnd: false,
      }
    );

    const result = advanceTurn(second.state);

    expect(
      result.state.restrictions?.map(
        (restriction) => restriction.id
      )
    ).toEqual(["persistent"]);
  });

  it("rejects duplicate restriction IDs", () => {
    const first = addGameRestriction(
      createState(),
      {
        id: "restriction-1",
        description: "Test",
        expiresAtTurnEnd: true,
      }
    );

    const second = addGameRestriction(
      first.state,
      {
        id: "restriction-1",
        description: "Duplicate",
        expiresAtTurnEnd: true,
      }
    );

    expect(second.success).toBe(false);
  });

  it("does not mutate the original state", () => {
    const original = createState();

    const result = recordEffectUsage(
      original,
      "test-effect"
    );

    expect(result.success).toBe(true);
    expect(original.usedEffects).toEqual([]);
    expect(original.effectUsage).toEqual([]);
  });
});
