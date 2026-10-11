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
  initializeCardInstances,
} from "../cardInstanceService";

import {
  normalizeGameState,
} from "../extendedGameStateService";

import {
  createEffectChain,
  activateChainEffect,
  resolveEffectChain,
} from "../effectChainService";

import {
  cardEffectSchema,
} from "../cardEffectSchemaService";

function createState(): GameState {
  const state: GameState = {
    zones: {
      hand: [100, 200],
      deck: [300, 400],
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
    normalizeGameState(state)
  );

  if (!initialized.success) {
    throw new Error(initialized.error);
  }

  return initialized.state;
}

function effect(
  overrides: Partial<CardEffectDefinition> = {}
): CardEffectDefinition {
  return {
    id: "target-test",
    sourceCardId: 100,
    label: "Target test",
    activationZone: "hand",
    conditions: [],
    costs: [],
    steps: [
      {
        type: "search",
        cardId: 300,
      },
    ],
    verification: "experimental",
    ...overrides,
  };
}

function instanceId(
  state: GameState,
  cardId: number
): string {
  const instance = state.cardInstances?.instances.find(
    item => item.cardId === cardId
  );

  if (!instance) {
    throw new Error(`Missing card ${cardId}.`);
  }

  return instance.instanceId;
}

describe("Phase 4.12 targeting", () => {
  it("accepts existing effects without targeting metadata", () => {
    expect(
      cardEffectSchema.safeParse(effect()).success
    ).toBe(true);
  });

  it("rejects targeting a draw step", () => {
    const invalid = effect({
      steps: [{ type: "draw", count: 1 }],
      targetStepIndexes: [0],
    });

    expect(
      cardEffectSchema.safeParse(invalid).success
    ).toBe(false);
  });

  it("rejects duplicate target indexes", () => {
    const invalid = effect({
      targetStepIndexes: [0, 0],
    });

    expect(
      cardEffectSchema.safeParse(invalid).success
    ).toBe(false);
  });

  it("requires a declared target at activation", () => {
    const chain = createEffectChain(createState());

    const result = activateChainEffect(
      chain,
      effect({
        targetStepIndexes: [0],
      })
    );

    expect(result.success).toBe(false);
    expect(result.chain).toBe(chain);
  });

  it("locks a valid target and resolves it", () => {
    const state = createState();
    const selectedId = instanceId(state, 300);

    const activated = activateChainEffect(
      createEffectChain(state),
      effect({
        targetStepIndexes: [0],
      }),
      {
        costSelections: [],
        resolutionSelections: [{
          stepIndex: 0,
          instanceId: selectedId,
          kind: "target",
          expectedZone: "deck",
        }],
      }
    );

    expect(activated.success).toBe(true);

    const resolved = resolveEffectChain(
      activated.chain
    );

    expect(resolved.success).toBe(true);

    expect(
      resolved.chain.gameState.zones.hand
    ).toContain(300);

    expect(
      resolved.entries[0].skippedSteps
    ).toEqual([]);
  });

  it("skips an invalidated target without replacing it", () => {
    const state = createState();
    const selectedId = instanceId(state, 300);

    const first = activateChainEffect(
      createEffectChain(state),
      effect({
        id: "first",
        targetStepIndexes: [0],
        steps: [
          { type: "search", cardId: 300 },
          { type: "draw", count: 1 },
        ],
      }),
      {
        costSelections: [],
        resolutionSelections: [{
          stepIndex: 0,
          instanceId: selectedId,
          kind: "target",
          expectedZone: "deck",
        }],
      }
    );

    expect(first.success).toBe(true);

    const second = activateChainEffect(
      first.chain,
      effect({
        id: "second",
        steps: [
          { type: "search", cardId: 300 },
        ],
      })
    );

    expect(second.success).toBe(true);

    const resolved = resolveEffectChain(
      second.chain
    );

    expect(resolved.success).toBe(true);

    expect(
      resolved.entries.map(entry => entry.effectId)
    ).toEqual(["second", "first"]);

    expect(
      resolved.entries[1].skippedSteps
    ).toEqual([0]);

    expect(
      resolved.entries[1].completedSteps
    ).toBe(1);

    expect(
      resolved.chain.gameState.zones.hand
    ).toContain(300);

    // The second operation of the first effect
    // still resolves after its target becomes invalid.
    expect(
      resolved.chain.gameState.zones.hand
    ).toContain(400);
  });

  it("rejects a target with the wrong card instance", () => {
    const state = createState();

    const activated = activateChainEffect(
      createEffectChain(state),
      effect({
        targetStepIndexes: [0],
      }),
      {
        costSelections: [],
        resolutionSelections: [{
          stepIndex: 0,
          instanceId: instanceId(state, 400),
          kind: "target",
          expectedZone: "deck",
        }],
      }
    );

    expect(activated.success).toBe(false);
  });
});