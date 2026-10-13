
import {
  describe,
  expect,
  it,
} from "vitest";

import { advanceTurn } from "../simulation/turnRestrictionService";

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
  executeRegisteredEffect,
  type EffectRegistryReader,
} from "../effect/registeredEffectExecutionService";

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
    id: "effect-draw",
    sourceCardId: 100,
    label: "Draw one card",
    activationZone: "hand",
    conditions: [],
    costs: [],
    steps: [
      { type: "draw", count: 1 },
    ],
    oncePerTurnKey: "shared-draw-key",
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
    get(effectId: string) {
      return definitions.get(effectId);
    },
  };
}

describe("registeredEffectExecutionService", () => {
  it("executes a registered effect by ID", () => {
    const registry = createRegistry(
      makeEffect()
    );

    const result = executeRegisteredEffect(
      createState(),
      registry,
      "effect-draw"
    );

    expect(result.success).toBe(true);
    expect(result.stage).toBe("complete");
    expect(result.usageRecorded).toBe(true);

    expect(result.state.zones.deck).toEqual([
      400,
      500,
    ]);
  });

  it("records usage in both state representations", () => {
    const registry = createRegistry(
      makeEffect()
    );

    const result = executeRegisteredEffect(
      createState(),
      registry,
      "effect-draw"
    );

    expect(result.success).toBe(true);

    expect(result.state.usedEffects).toContain(
      "shared-draw-key"
    );

    expect(result.state.effectUsage).toContainEqual({
      usageKey: "shared-draw-key",
      turnNumber: 1,
      cardInstanceId: undefined,
    });
  });

  it("rejects repeated usage during the same turn", () => {
    const registry = createRegistry(
      makeEffect()
    );

    const first = executeRegisteredEffect(
      createState(),
      registry,
      "effect-draw"
    );

    const second = executeRegisteredEffect(
      first.state,
      registry,
      "effect-draw"
    );

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.usageRecorded).toBe(false);
    expect(second.state).toBe(first.state);

    expect(second.errors.join(" ")).toContain(
      "already been recorded"
    );
  });

  it("shares usage keys across different effects", () => {
    const firstEffect = makeEffect();

    const secondEffect = makeEffect({
      id: "effect-draw-2",
      label: "Another draw effect",
      sourceCardId: 200,
    });

    const registry = createRegistry(
      firstEffect,
      secondEffect
    );

    const first = executeRegisteredEffect(
      createState(),
      registry,
      "effect-draw"
    );

    const second = executeRegisteredEffect(
      first.state,
      registry,
      "effect-draw-2"
    );

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
  });

  it("allows reuse after advancing the turn", () => {

    const registry = createRegistry(
      makeEffect()
    );

    const first = executeRegisteredEffect(
      createState(),
      registry,
      "effect-draw"
    );

    const advanced = advanceTurn(first.state);

    expect(advanced.success).toBe(true);

    const second = executeRegisteredEffect(
      advanced.state,
      registry,
      "effect-draw"
    );

    expect(second.success).toBe(true);
    expect(second.usageRecorded).toBe(true);
  });

  it("rejects an unknown effect ID", () => {
    const result = executeRegisteredEffect(
      createState(),
      createRegistry(),
      "missing-effect"
    );

    expect(result.success).toBe(false);
    expect(result.stage).toBe("precondition");
    expect(result.errors.join(" ")).toContain(
      "not registered"
    );
  });

  it("does not record usage after failed resolution", () => {
    const registry = createRegistry(
      makeEffect({
        steps: [
          { type: "search", cardId: 999 },
        ],
      })
    );

    const state = createState();

    const result = executeRegisteredEffect(
      state,
      registry,
      "effect-draw"
    );

    expect(result.success).toBe(false);
    expect(result.usageRecorded).toBe(false);
    expect(result.state).toBe(state);

    expect(state.usedEffects).toEqual([]);
    expect(state.effectUsage).toEqual([]);
  });

  it("rejects usage already recorded by legacy code", () => {
    const state = createState();

    state.usedEffects.push("shared-draw-key");

    const result = executeRegisteredEffect(
      state,
      createRegistry(makeEffect()),
      "effect-draw"
    );

    expect(result.success).toBe(false);
    expect(result.usageRecorded).toBe(false);
  });

  it("executes effects without once-per-turn keys", () => {
    const effect = makeEffect({
      oncePerTurnKey: undefined,
    });

    const registry = createRegistry(effect);

    const first = executeRegisteredEffect(
      createState(),
      registry,
      effect.id
    );

    const second = executeRegisteredEffect(
      first.state,
      registry,
      effect.id
    );

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    expect(first.usageRecorded).toBe(false);
    expect(second.usageRecorded).toBe(false);
    expect(second.state.usedEffects).toEqual([]);
  });

  it("preserves instance synchronization", () => {
    const result = executeRegisteredEffect(
      createState(),
      createRegistry(makeEffect()),
      "effect-draw"
    );

    expect(result.success).toBe(true);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("does not mutate the original state", () => {
    const state = createState();

    const result = executeRegisteredEffect(
      state,
      createRegistry(makeEffect()),
      "effect-draw"
    );

    expect(result.success).toBe(true);
    expect(result.state).not.toBe(state);

    expect(state.usedEffects).toEqual([]);
    expect(state.effectUsage).toEqual([]);
    expect(state.zones.deck).toEqual([
      300,
      400,
      500,
    ]);
  });

  it("rejects missing extended turn tracking", () => {
    const state = createState();

    delete state.turnState;

    const result = executeRegisteredEffect(
      state,
      createRegistry(makeEffect()),
      "effect-draw"
    );

    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "turn tracking"
    );
  });
});
