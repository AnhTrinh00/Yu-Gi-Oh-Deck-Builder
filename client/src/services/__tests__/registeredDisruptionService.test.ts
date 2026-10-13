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
  CardEffectRegistry,
} from "../effect/cardEffectRegistryService";

import {
  analyzeRegisteredDisruptions,
} from "../analysis/disruption/registeredDisruptionService";

function createState(): GameState {
  return {
    zones: {
      hand: [],
      deck: [],
      extra: [],
      field: [100],
      graveyard: [],
      banished: [],
    },

    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],

    fieldState: {
      monsterZones: [
        {
          cardId: 100,
          instanceId: "monster-1",
          position: "face-up-attack",
        },
        null,
        null,
        null,
        null,
      ],
      spellTrapZones: Array(5).fill(null),
      fieldSpellZone: null,
    },

    turnState: {
      turnNumber: 1,
      activePlayer: "player",
      phase: "main1",
    },

    effectUsage: [],
    restrictions: [],

    cardInstances: {
      nextInstanceNumber: 2,
      instances: [
        {
          instanceId: "monster-1",
          cardId: 100,
          zone: "field",
        },
      ],
    },

    xyzMaterials: [],
  };
}

function createEffect(
  overrides: Partial<CardEffectDefinition> = {}
): CardEffectDefinition {
  return {
    id: "test-negate",
    sourceCardId: 100,
    label: "Test Disruption Effect",
    activationZone: "field",

    conditions: [
      {
        type: "source-in-zone",
        zone: "field",
      },
    ],

    costs: [],

    steps: [
      {
        type: "destroy",
        cardId: 200,
        from: "field",
      },
    ],

    verification: "manually-verified",

    ...overrides,
  };
}

describe("registeredDisruptionService", () => {
  it("detects a manually verified registered effect", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect());

    const result = analyzeRegisteredDisruptions(
      createState(),
      registry,
      [{
        effectId: "test-negate",
        type: "monster-negate",
        speed: "quick-effect",
      }]
    );

    expect(result.complete).toBe(true);
    expect(result.unknownCount).toBe(1);
    expect(result.potentialCount).toBe(0);

    expect(result.disruptions[0]).toMatchObject({
      cardId: 100,
      instanceId: "monster-1",
      effectKey: "test-negate",
      type: "monster-negate",
    });
  });

  it("skips unregistered effects", () => {
    const result = analyzeRegisteredDisruptions(
      createState(),
      new CardEffectRegistry(),
      [{
        effectId: "missing-effect",
        type: "effect-negate",
        speed: "quick-effect",
      }]
    );

    expect(result.potentialCount).toBe(0);
    expect(result.skippedEffects).toHaveLength(1);
  });

  it("skips experimental effects", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(
      createEffect({
        verification: "experimental",
      })
    );

    const result = analyzeRegisteredDisruptions(
      createState(),
      registry,
      [{
        effectId: "test-negate",
        type: "monster-negate",
        speed: "quick-effect",
      }]
    );

    expect(result.potentialCount).toBe(0);
    expect(result.skippedEffects).toHaveLength(1);
  });

  it("does not count duplicate metadata twice", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect());

    const metadata = {
      effectId: "test-negate",
      type: "monster-negate" as const,
      speed: "quick-effect" as const,
    };

    const result = analyzeRegisteredDisruptions(
      createState(),
      registry,
      [metadata, metadata]
    );

    expect(result.unknownCount).toBe(1);
    expect(result.potentialCount).toBe(0);
    expect(result.skippedEffects).toHaveLength(1);
  });

  it("does not mutate registered definitions", () => {
    const registry = new CardEffectRegistry();

    registry.registerEffect(createEffect());

    const before = registry.getEffect("test-negate");

    analyzeRegisteredDisruptions(
      createState(),
      registry,
      [{
        effectId: "test-negate",
        type: "monster-negate",
        speed: "quick-effect",
      }]
    );

    expect(registry.getEffect("test-negate")).toEqual(
      before
    );
  });
});