import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  CardEffectDefinition,
} from "../../models/effect/CardEffect";

import type {
  EffectActivationDefinition,
} from "../../models/effect/EffectActivation";

import type {
  GameState,
} from "../../models/simulation/GameState";

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

function createEffect(): CardEffectDefinition {
  return {
    id: "effect-100",
    sourceCardId: 100,
    label: "Test disruption",
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
  };
}

function createActivation():
  EffectActivationDefinition {
  return {
    effectId: "effect-100",
    speed: 2,

    requirements: [
      {
        type: "source-zone",
        zone: "field",
      },
      {
        type: "active-player",
        player: "player",
      },
    ],
  };
}

function analyze(
  state: GameState,
  activation?: EffectActivationDefinition
) {
  const registry = new CardEffectRegistry();

  registry.registerEffect(createEffect());

  return analyzeRegisteredDisruptions(
    state,
    registry,
    [{
      effectId: "effect-100",
      type: "destruction",
      speed: "quick-effect",
    }],
    {
      activations: activation
        ? [activation]
        : [],
    }
  );
}

describe("registered disruption activation", () => {
  it("marks satisfied requirements as conditionally available", () => {
    const result = analyze(
      createState(),
      createActivation()
    );

    expect(result.complete).toBe(true);

    expect(
      result.conditionallyAvailableCount
    ).toBe(1);

    expect(result.unknownCount).toBe(0);
  });

  it("marks missing activation metadata as unknown", () => {
    const result = analyze(
      createState()
    );

    expect(result.unknownCount).toBe(1);
    expect(
      result.conditionallyAvailableCount
    ).toBe(0);
  });

  it("rejects effects on the wrong player's turn", () => {
    const state = createState();

    state.turnState!.activePlayer = "opponent";

    const result = analyze(
      state,
      createActivation()
    );

    expect(result.unavailableCount).toBe(1);

    expect(
      result.disruptions[0].reasons
    ).toContain(
      "Effect cannot activate during this player's turn."
    );
  });

  it("rejects used effects", () => {
    const state = createState();

    state.usedEffects.push("effect-100");

    const activation = createActivation();

    activation.requirements.push({
      type: "effect-unused",
      usageKey: "effect-100",
    });

    const result = analyze(
      state,
      activation
    );

    expect(result.unavailableCount).toBe(1);
  });

  it("rejects incorrect activation speed", () => {
    const activation = createActivation();

    activation.speed = 1;

    const result = analyze(
      createState(),
      activation
    );

    expect(result.unavailableCount).toBe(1);

    expect(
      result.disruptions[0].reasons
    ).toContain(
      "Activation speed does not match disruption metadata."
    );
  });

  it("does not mutate the original state", () => {
    const state = createState();

    const before = JSON.stringify(state);

    analyze(
      state,
      createActivation()
    );

    expect(JSON.stringify(state)).toBe(before);
  });
});