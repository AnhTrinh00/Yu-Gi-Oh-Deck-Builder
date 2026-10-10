
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
} from "../extendedGameStateService";

import {
  getCardInstance,
  getInstancesInZone,
  initializeCardInstances,
  validateCardInstanceSync,
} from "../cardInstanceService";

import {
  executeRegisteredEffectWithSelections,
} from "../registeredEffectSelectionService";

import type {
  EffectRegistryReader,
} from "../registeredEffectExecutionService";

function createState(): GameState {
  const legacy: GameState = {
    zones: {
      hand: [100, 200, 200],
      deck: [300, 300, 400],
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
  overrides: Partial<CardEffectDefinition> = {}
): CardEffectDefinition {
  return {
    id: "selected-effect",
    sourceCardId: 100,
    label: "Selected test effect",
    activationZone: "hand",
    conditions: [],
    costs: [],
    steps: [
      { type: "draw", count: 1 },
    ],
    oncePerTurnKey: "selected-effect-key",
    verification: "experimental",
    ...overrides,
  };
}

function createRegistry(
  effect: CardEffectDefinition
): EffectRegistryReader {
  return {
    get(effectId) {
      return effect.id === effectId
        ? effect
        : undefined;
    },
  };
}

describe("registeredEffectSelectionService", () => {
  it("executes a registered effect with no selections", () => {
    const effect = makeEffect();

    const result = executeRegisteredEffectWithSelections(
      createState(),
      createRegistry(effect),
      effect.id,
      {
        costSelections: [],
        resolutionSelections: [],
      }
    );

    expect(result.success).toBe(true);
    expect(result.usageRecorded).toBe(true);
    expect(result.state.zones.deck).toEqual([
      300,
      400,
    ]);
  });

  it("pays a cost using a selected duplicate", () => {
    const state = createState();

    const copies = getInstancesInZone(
      state,
      "hand"
    ).filter((instance) => instance.cardId === 200);

    const effect = makeEffect({
      costs: [
        {
          type: "move-card",
          cardId: 200,
          from: "hand",
          to: "graveyard",
        },
      ],
    });

    const result = executeRegisteredEffectWithSelections(
      state,
      createRegistry(effect),
      effect.id,
      {
        costSelections: [
          {
            stepIndex: 0,
            instanceId: copies[1].instanceId,
            kind: "cost",
            expectedZone: "hand",
          },
        ],
        resolutionSelections: [],
      }
    );

    expect(result.success).toBe(true);

    expect(
      getCardInstance(
        result.state,
        copies[0].instanceId
      )?.zone
    ).toBe("hand");

    expect(
      getCardInstance(
        result.state,
        copies[1].instanceId
      )?.zone
    ).toBe("graveyard");

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("resolves an explicitly selected search", () => {
    const state = createState();

    const copies = getInstancesInZone(
      state,
      "deck"
    ).filter((instance) => instance.cardId === 300);

    const effect = makeEffect({
      steps: [
        { type: "search", cardId: 300 },
      ],
    });

    const result = executeRegisteredEffectWithSelections(
      state,
      createRegistry(effect),
      effect.id,
      {
        costSelections: [],
        resolutionSelections: [
          {
            stepIndex: 0,
            instanceId: copies[1].instanceId,
            kind: "choose",
            expectedZone: "deck",
          },
        ],
      }
    );

    expect(result.success).toBe(true);

    expect(
      getCardInstance(
        result.state,
        copies[1].instanceId
      )?.zone
    ).toBe("hand");
  });

  it("supports selected costs and resolution together", () => {
    const state = createState();

    const costInstance = getInstancesInZone(
      state,
      "hand"
    ).find((instance) => instance.cardId === 200)!;

    const searchInstance = getInstancesInZone(
      state,
      "deck"
    ).find((instance) => instance.cardId === 300)!;

    const effect = makeEffect({
      costs: [
        {
          type: "move-card",
          cardId: 200,
          from: "hand",
          to: "graveyard",
        },
      ],
      steps: [
        { type: "search", cardId: 300 },
      ],
    });

    const result = executeRegisteredEffectWithSelections(
      state,
      createRegistry(effect),
      effect.id,
      {
        costSelections: [
          {
            stepIndex: 0,
            instanceId: costInstance.instanceId,
            kind: "cost",
          },
        ],
        resolutionSelections: [
          {
            stepIndex: 0,
            instanceId: searchInstance.instanceId,
            kind: "choose",
          },
        ],
      }
    );

    expect(result.success).toBe(true);
    expect(result.completedCosts).toBe(1);
    expect(result.completedSteps).toBe(1);
    expect(result.usageRecorded).toBe(true);
  });

  it("rolls back costs when resolution fails", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "hand"
    ).find((item) => item.cardId === 200)!;

    const effect = makeEffect({
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
    });

    const result = executeRegisteredEffectWithSelections(
      state,
      createRegistry(effect),
      effect.id,
      {
        costSelections: [
          {
            stepIndex: 0,
            instanceId: instance.instanceId,
            kind: "cost",
          },
        ],
        resolutionSelections: [],
      }
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("resolution");
    expect(result.state).toBe(state);

    expect(state.zones.graveyard).toEqual([]);
    expect(state.usedEffects).toEqual([]);
  });

  it("rejects an invalid cost selection kind", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "hand"
    )[0];

    const effect = makeEffect({
      costs: [
        {
          type: "move-card",
          cardId: 200,
          from: "hand",
          to: "graveyard",
        },
      ],
    });

    const result = executeRegisteredEffectWithSelections(
      state,
      createRegistry(effect),
      effect.id,
      {
        costSelections: [
          {
            stepIndex: 0,
            instanceId: instance.instanceId,
            kind: "choose",
          },
        ],
        resolutionSelections: [],
      }
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("precondition");
  });

  it("records once-per-turn usage after success", () => {
    const effect = makeEffect();
    const registry = createRegistry(effect);

    const first = executeRegisteredEffectWithSelections(
      createState(),
      registry,
      effect.id,
      {
        costSelections: [],
        resolutionSelections: [],
      }
    );

    const second = executeRegisteredEffectWithSelections(
      first.state,
      registry,
      effect.id,
      {
        costSelections: [],
        resolutionSelections: [],
      }
    );

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.usageRecorded).toBe(false);

    expect(first.state.usedEffects).toContain(
      "selected-effect-key"
    );
  });

  it("rejects an unknown registered effect", () => {
    const effect = makeEffect();

    const result = executeRegisteredEffectWithSelections(
      createState(),
      createRegistry(effect),
      "missing-effect",
      {
        costSelections: [],
        resolutionSelections: [],
      }
    );

    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "not registered"
    );
  });

  it("rejects selections outside the effect's step range", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "deck"
    )[0];

    const effect = makeEffect();

    const result = executeRegisteredEffectWithSelections(
      state,
      createRegistry(effect),
      effect.id,
      {
        costSelections: [],
        resolutionSelections: [
          {
            stepIndex: 5,
            instanceId: instance.instanceId,
            kind: "choose",
          },
        ],
      }
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("precondition");
  });

  it("does not mutate the original state", () => {
    const state = createState();
    const effect = makeEffect();

    const result = executeRegisteredEffectWithSelections(
      state,
      createRegistry(effect),
      effect.id,
      {
        costSelections: [],
        resolutionSelections: [],
      }
    );

    expect(result.success).toBe(true);
    expect(result.state).not.toBe(state);

    expect(state.usedEffects).toEqual([]);
    expect(state.zones.deck).toEqual([
      300,
      300,
      400,
    ]);
  });
});
