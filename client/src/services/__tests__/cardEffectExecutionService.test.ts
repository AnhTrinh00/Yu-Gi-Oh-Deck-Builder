
import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  CardEffectDefinition,
} from "../../models/CardEffect";

import type {
  GameState,
} from "../../models/GameState";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  initializeCardInstances,
  validateCardInstanceSync,
} from "../simulation/cardInstanceService";

import {
  executeCardEffect,
} from "../effect/cardEffectExecutionService";

function createState(): GameState {
  const legacy: GameState = {
    zones: {
      hand: [100, 200],
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

  const result = initializeCardInstances(
    normalizeGameState(legacy)
  );

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.state;
}

function makeEffect(
  overrides: Partial<CardEffectDefinition> = {}
): CardEffectDefinition {
  return {
    id: "test-effect",
    sourceCardId: 100,
    label: "Test effect",
    activationZone: "hand",
    conditions: [],
    costs: [],
    steps: [
      { type: "draw", count: 1 },
    ],
    verification: "experimental",
    ...overrides,
  };
}

describe("cardEffectExecutionService", () => {
  it("executes a valid effect", () => {
    const result = executeCardEffect(
      createState(),
      makeEffect()
    );

    expect(result.success).toBe(true);
    expect(result.stage).toBe("complete");
    expect(result.completedSteps).toBe(1);

    expect(result.state.zones.deck).toEqual([
      400,
      500,
    ]);

    expect(result.state.zones.hand).toEqual([
      100,
      200,
      300,
    ]);
  });

  it("rejects an unavailable source card", () => {
    const result = executeCardEffect(
      createState(),
      makeEffect({
        sourceCardId: 999,
      })
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("precondition");
    expect(result.errors.join(" ")).toContain(
      "Source card"
    );
  });

  it("checks declared activation conditions", () => {
    const state = createState();
    state.normalSummonUsed = true;

    const result = executeCardEffect(
      state,
      makeEffect({
        conditions: [
          { type: "normal-summon-available" },
        ],
      })
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("precondition");
  });

  it("pays costs before resolving steps", () => {
    const result = executeCardEffect(
      createState(),
      makeEffect({
        costs: [
          {
            type: "move-card",
            cardId: 200,
            from: "hand",
            to: "graveyard",
          },
        ],
        steps: [
          { type: "draw", count: 2 },
        ],
      })
    );

    expect(result.success).toBe(true);
    expect(result.completedCosts).toBe(1);
    expect(result.completedSteps).toBe(1);

    expect(
      result.state.zones.graveyard
    ).toEqual([200]);

    expect(result.state.zones.hand).toEqual([
      100,
      300,
      400,
    ]);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("rejects costs that cannot be paid", () => {
    const result = executeCardEffect(
      createState(),
      makeEffect({
        costs: [
          {
            type: "move-card",
            cardId: 999,
            from: "hand",
            to: "graveyard",
          },
        ],
      })
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("precondition");
  });

  it("rolls back costs when resolution fails", () => {
    const state = createState();

    const result = executeCardEffect(
      state,
      makeEffect({
        costs: [
          {
            type: "move-card",
            cardId: 200,
            from: "hand",
            to: "graveyard",
          },
        ],
        steps: [
          { type: "search", cardId: 999 },
        ],
      })
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("resolution");
    expect(result.completedCosts).toBe(1);
    expect(result.completedSteps).toBe(0);

    expect(result.state).toBe(state);
    expect(state.zones.hand).toEqual([
      100,
      200,
    ]);
    expect(state.zones.graveyard).toEqual([]);
  });

  it("rolls back earlier steps when a later step fails", () => {
    const state = createState();

    const result = executeCardEffect(
      state,
      makeEffect({
        steps: [
          { type: "draw", count: 1 },
          { type: "search", cardId: 999 },
        ],
      })
    );

    expect(result.success).toBe(false);
    expect(result.completedSteps).toBe(1);

    expect(result.state).toBe(state);
    expect(state.zones.deck).toEqual([
      300,
      400,
      500,
    ]);
  });

  it("rejects ambiguous duplicate-card costs", () => {
    const state = createState();

    // Add a second copy and rebuild tracking.
    delete state.cardInstances;
    state.zones.hand.push(200);

    const initialized = initializeCardInstances(
      state
    );

    expect(initialized.success).toBe(true);

    const result = executeCardEffect(
      initialized.state,
      makeEffect({
        costs: [
          {
            type: "move-card",
            cardId: 200,
            from: "hand",
            to: "graveyard",
          },
        ],
      })
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("cost");
    expect(result.errors.join(" ")).toContain(
      "instance selection"
    );
  });

  it("rejects unsupported field-placement costs", () => {
    const result = executeCardEffect(
      createState(),
      makeEffect({
        costs: [
          {
            type: "move-card",
            cardId: 200,
            from: "hand",
            to: "field",
          },
        ],
      })
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("cost");
    expect(result.errors.join(" ")).toContain(
      "Unsupported"
    );
  });

  it("checks once-per-turn usage before execution", () => {
    const state = createState();
    state.usedEffects.push("once-key");

    const result = executeCardEffect(
      state,
      makeEffect({
        oncePerTurnKey: "once-key",
      })
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("precondition");
  });

  it("returns warnings for experimental effects", () => {
    const result = executeCardEffect(
      createState(),
      makeEffect()
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.join(" ")).toContain(
      "not been manually verified"
    );
  });

  it("rejects missing instance tracking", () => {
    const state = createState();
    delete state.cardInstances;

    const result = executeCardEffect(
      state,
      makeEffect()
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("precondition");
  });

  it("rejects desynchronized game states", () => {
    const state = createState();
    state.zones.hand.push(999);

    const result = executeCardEffect(
      state,
      makeEffect()
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("precondition");
  });

  it("does not mutate the original state on success", () => {
    const state = createState();

    const result = executeCardEffect(
      state,
      makeEffect()
    );

    expect(result.success).toBe(true);
    expect(state.zones.deck).toEqual([
      300,
      400,
      500,
    ]);

    expect(result.state).not.toBe(state);
  });
});
