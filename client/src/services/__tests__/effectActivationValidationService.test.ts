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
  EffectActivationDefinition,
} from "../../models/EffectActivation";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  validateEffectActivation,
} from "../effect/effectActivationValidationService";

function createState(): GameState {
  return normalizeGameState({
    zones: {
      hand: [100, 200, 200],
      deck: [300, 400],
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

const effect: CardEffectDefinition = {
  id: "test-effect",
  sourceCardId: 100,
  label: "Test Effect",
  activationZone: "hand",
  conditions: [],
  costs: [],
  steps: [],
  verification: "experimental",
};

function makeActivation(
  overrides: Partial<EffectActivationDefinition> = {}
): EffectActivationDefinition {
  return {
    effectId: "test-effect",
    speed: 1,
    requirements: [],
    ...overrides,
  };
}

describe("effectActivationValidationService", () => {
  it("accepts satisfied activation requirements", () => {
    const result = validateEffectActivation(
      createState(),
      effect,
      makeActivation({
        requirements: [
          {
            type: "phase",
            allowedPhases: ["main1"],
          },
          {
            type: "active-player",
            player: "player",
          },
        ],
      })
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects activation during the wrong phase", () => {
    const result = validateEffectActivation(
      createState(),
      effect,
      makeActivation({
        requirements: [
          {
            type: "phase",
            allowedPhases: ["battle"],
          },
        ],
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "phase"
    );
  });

  it("rejects activation during the wrong player's turn", () => {
    const result = validateEffectActivation(
      createState(),
      effect,
      makeActivation({
        requirements: [
          {
            type: "active-player",
            player: "opponent",
          },
        ],
      })
    );

    expect(result.valid).toBe(false);
  });

  it("validates the source zone", () => {
    const result = validateEffectActivation(
      createState(),
      effect,
      makeActivation({
        requirements: [
          {
            type: "source-zone",
            zone: "graveyard",
          },
        ],
      })
    );

    expect(result.valid).toBe(false);
  });

  it("validates minimum card quantities", () => {
    const result = validateEffectActivation(
      createState(),
      effect,
      makeActivation({
        requirements: [
          {
            type: "minimum-cards",
            zone: "hand",
            cardId: 200,
            minimum: 2,
          },
        ],
      })
    );

    expect(result.valid).toBe(true);
  });

  it("rejects insufficient card quantities", () => {
    const result = validateEffectActivation(
      createState(),
      effect,
      makeActivation({
        requirements: [
          {
            type: "minimum-cards",
            zone: "hand",
            cardId: 200,
            minimum: 3,
          },
        ],
      })
    );

    expect(result.valid).toBe(false);
  });

  it("checks Normal Summon availability", () => {
    const state = createState();

    state.normalSummonUsed = true;

    const result = validateEffectActivation(
      state,
      effect,
      makeActivation({
        requirements: [
          {
            type: "normal-summon-available",
          },
        ],
      })
    );

    expect(result.valid).toBe(false);
  });

  it("rejects an active game restriction", () => {
    const state = createState();

    state.restrictions = [
      {
        id: "no-search",
        description: "Cannot search cards.",
        expiresAtTurnEnd: true,
      },
    ];

    const result = validateEffectActivation(
      state,
      effect,
      makeActivation({
        requirements: [
          {
            type: "restriction-absent",
            restrictionId: "no-search",
          },
        ],
      })
    );

    expect(result.valid).toBe(false);
  });

  it("checks once-per-turn usage", () => {
    const state = createState();

    state.usedEffects.push("test-usage-key");

    const result = validateEffectActivation(
      state,
      effect,
      makeActivation({
        requirements: [
          {
            type: "effect-unused",
            usageKey: "test-usage-key",
          },
        ],
      })
    );

    expect(result.valid).toBe(false);
  });

  it("rejects mismatched activation definitions", () => {
    const result = validateEffectActivation(
      createState(),
      effect,
      makeActivation({
        effectId: "another-effect",
      })
    );

    expect(result.valid).toBe(false);
  });

  it("rejects invalid activation speeds", () => {
    const result = validateEffectActivation(
      createState(),
      effect,
      makeActivation({
        speed: 4 as 1,
      })
    );

    expect(result.valid).toBe(false);
  });

  it("returns warnings about incomplete legality", () => {
    const result = validateEffectActivation(
      createState(),
      effect,
      makeActivation()
    );

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});