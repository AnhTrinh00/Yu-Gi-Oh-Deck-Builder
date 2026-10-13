
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

import type {
  StructuredComboAction,
} from "../../models/StructuredCombo";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  getInstancesInZone,
  initializeCardInstances,
  validateCardInstanceSync,
} from "../simulation/cardInstanceService";

import type {
  EffectRegistryReader,
} from "../effect/registeredEffectExecutionService";

import {
  simulateStructuredCombo,
} from "../simulation/structuredComboSimulationService";

function createState(): GameState {
  const legacy: GameState = {
    zones: {
      hand: [100, 200, 200],
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

function makeEffect(
  id: string,
  overrides: Partial<CardEffectDefinition> = {}
): CardEffectDefinition {
  return {
    id,
    sourceCardId: 100,
    label: id,
    activationZone: "hand",
    conditions: [],
    costs: [],
    steps: [],
    verification: "experimental",
    ...overrides,
  };
}

function createRegistry(
  ...effects: CardEffectDefinition[]
): EffectRegistryReader {
  const definitions = new Map(
    effects.map((effect) => [
      effect.id,
      effect,
    ])
  );

  return {
    get(effectId) {
      return definitions.get(effectId);
    },
  };
}

function action(
  id: string,
  effectId: string
): StructuredComboAction {
  return {
    type: "registered-effect",
    id,
    effectId,
  };
}

describe("structuredComboSimulationService", () => {
  it("executes multiple effects in sequence", () => {
    const registry = createRegistry(
      makeEffect("search", {
        steps: [
          { type: "search", cardId: 400 },
        ],
      }),
      makeEffect("summon", {
        steps: [
          {
            type: "special-summon",
            cardId: 400,
            from: "hand",
          },
        ],
      })
    );

    const result = simulateStructuredCombo(
      createState(),
      [
        action("step-1", "search"),
        action("step-2", "summon"),
      ],
      registry
    );

    expect(result.success).toBe(true);
    expect(result.completedActions).toBe(2);
    expect(result.steps).toHaveLength(2);

    expect(result.finalState.zones.field).toEqual([
      400,
    ]);

    expect(
      result.finalState.fieldState!.monsterZones[0]
        ?.cardId
    ).toBe(400);

    expect(
      validateCardInstanceSync(result.finalState)
    ).toEqual([]);
  });

  it("supports a selected duplicate-card cost", () => {
    const state = createState();

    const copies = getInstancesInZone(
      state,
      "hand"
    ).filter((item) => item.cardId === 200);

    const registry = createRegistry(
      makeEffect("discard-and-draw", {
        costs: [
          {
            type: "move-card",
            cardId: 200,
            from: "hand",
            to: "graveyard",
          },
        ],
        steps: [
          { type: "draw", count: 1 },
        ],
      })
    );

    const result = simulateStructuredCombo(
      state,
      [
        {
          type: "registered-effect",
          id: "selected-action",
          effectId: "discard-and-draw",
          selections: {
            costSelections: [
              {
                stepIndex: 0,
                instanceId: copies[1].instanceId,
                kind: "cost",
              },
            ],
            resolutionSelections: [],
          },
        },
      ],
      registry
    );

    expect(result.success).toBe(true);
    expect(result.finalState.zones.graveyard).toEqual([
      200,
    ]);

    expect(result.finalState.zones.hand).toContain(
      300
    );
  });

  it("stops when a later action fails", () => {
    const registry = createRegistry(
      makeEffect("draw", {
        steps: [
          { type: "draw", count: 1 },
        ],
      }),
      makeEffect("invalid-search", {
        steps: [
          { type: "search", cardId: 999 },
        ],
      })
    );

    const result = simulateStructuredCombo(
      createState(),
      [
        action("first", "draw"),
        action("second", "invalid-search"),
      ],
      registry
    );

    expect(result.success).toBe(false);
    expect(result.completedActions).toBe(1);
    expect(result.failedActionIndex).toBe(1);

    expect(result.finalState.zones.deck).toEqual([
      400,
      500,
    ]);
  });

  it("rolls back all actions in atomic mode", () => {
    const state = createState();

    const registry = createRegistry(
      makeEffect("draw", {
        steps: [
          { type: "draw", count: 1 },
        ],
      }),
      makeEffect("invalid-search", {
        steps: [
          { type: "search", cardId: 999 },
        ],
      })
    );

    const result = simulateStructuredCombo(
      state,
      [
        action("first", "draw"),
        action("second", "invalid-search"),
      ],
      registry,
      {
        failureMode: "atomic",
      }
    );

    expect(result.success).toBe(false);
    expect(result.completedActions).toBe(1);
    expect(result.finalState).toBe(state);

    expect(state.zones.deck).toEqual([
      300,
      400,
      500,
    ]);
  });

  it("enforces once-per-turn restrictions", () => {
    const registry = createRegistry(
      makeEffect("limited-draw", {
        oncePerTurnKey: "limited-draw-key",
        steps: [
          { type: "draw", count: 1 },
        ],
      })
    );

    const result = simulateStructuredCombo(
      createState(),
      [
        action("first", "limited-draw"),
        action("second", "limited-draw"),
      ],
      registry
    );

    expect(result.success).toBe(false);
    expect(result.completedActions).toBe(1);

    expect(result.finalState.usedEffects).toContain(
      "limited-draw-key"
    );

    expect(result.finalState.zones.deck).toEqual([
      400,
      500,
    ]);
  });

  it("rejects unknown registered effects", () => {
    const result = simulateStructuredCombo(
      createState(),
      [
        action("missing", "unknown-effect"),
      ],
      createRegistry()
    );

    expect(result.success).toBe(false);
    expect(result.completedActions).toBe(0);
    expect(result.failedActionIndex).toBe(0);
  });

  it("handles an empty combo", () => {
    const state = createState();

    const result = simulateStructuredCombo(
      state,
      [],
      createRegistry()
    );

    expect(result.success).toBe(true);
    expect(result.completedActions).toBe(0);
    expect(result.finalState).toBe(state);
  });

  it("rejects an unsynchronized initial state", () => {
    const state = createState();

    state.zones.hand.push(999);

    const result = simulateStructuredCombo(
      state,
      [
        action("first", "draw"),
      ],
      createRegistry()
    );

    expect(result.success).toBe(false);
    expect(result.completedActions).toBe(0);
    expect(result.finalState).toBe(state);
  });

  it("preserves the original state on success", () => {
    const state = createState();

    const registry = createRegistry(
      makeEffect("draw", {
        steps: [
          { type: "draw", count: 1 },
        ],
      })
    );

    const result = simulateStructuredCombo(
      state,
      [
        action("first", "draw"),
      ],
      registry
    );

    expect(result.success).toBe(true);
    expect(result.finalState).not.toBe(state);

    expect(state.zones.deck).toEqual([
      300,
      400,
      500,
    ]);
  });

  it("reports each completed action", () => {
    const registry = createRegistry(
      makeEffect("draw", {
        steps: [
          { type: "draw", count: 1 },
        ],
      }),
      makeEffect("search", {
        steps: [
          { type: "search", cardId: 500 },
        ],
      })
    );

    const result = simulateStructuredCombo(
      createState(),
      [
        action("action-1", "draw"),
        action("action-2", "search"),
      ],
      registry
    );

    expect(result.success).toBe(true);
    expect(result.steps).toEqual([
      {
        actionId: "action-1",
        effectId: "draw",
        success: true,
      },
      {
        actionId: "action-2",
        effectId: "search",
        success: true,
      },
    ]);
  });
});
