import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  GameState,
} from "../../models/GameState";

import type {
  DisruptionDefinition,
} from "../../models/DisruptionAnalysis";

import {
  analyzeDisruptions,
} from "../disruptionAnalysisService";

function createTestState(): GameState {
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

const definition: DisruptionDefinition = {
  id: "test-monster-negate",
  cardId: 100,
  effectKey: "monster-negate",
  type: "monster-negate",
  speed: "quick-effect",
  allowedZones: ["field"],
  minimumXyzMaterials: 1,
  description: "Test interruption requiring one material.",
};

describe("disruptionAnalysisService", () => {
  it("detects a potential disruption with sufficient materials", () => {
    const state = createTestState();

    state.cardInstances!.instances.push({
      instanceId: "material-1",
      cardId: 200,
      zone: "overlay",
    });

    state.xyzMaterials = [{
      xyzInstanceId: "monster-1",
      materialInstanceIds: ["material-1"],
    }];

    const result = analyzeDisruptions(
      state,
      [definition]
    );

    expect(result.complete).toBe(true);
    expect(result.potentialCount).toBe(1);
    expect(result.unavailableCount).toBe(0);
  });

  it("reports insufficient Xyz Materials", () => {
    const result = analyzeDisruptions(
      createTestState(),
      [definition]
    );

    expect(result.potentialCount).toBe(0);
    expect(result.unavailableCount).toBe(1);

    expect(result.disruptions[0].reasons).toContain(
      "Insufficient attached Xyz Materials."
    );
  });

  it("reports an effect already used", () => {
    const state = createTestState();

    state.usedEffects.push("monster-negate");

    const result = analyzeDisruptions(
      state,
      [definition]
    );

    expect(result.disruptions[0].reasons).toContain(
      "The effect has already been used."
    );
  });

  it("does not treat face-down monsters as available quick effects", () => {
    const state = createTestState();

    state.fieldState!.monsterZones[0]!.position =
      "face-down-defense";

    const result = analyzeDisruptions(
      state,
      [definition]
    );

    expect(result.disruptions[0].reasons).toContain(
      "The monster or card is face-down."
    );
  });

  it("does not invent disruptions without definitions", () => {
    const result = analyzeDisruptions(
      createTestState(),
      []
    );

    expect(result.disruptions).toEqual([]);
    expect(result.potentialCount).toBe(0);
  });

  it("rejects incomplete physical state", () => {
    const state = createTestState();

    delete state.cardInstances;

    const result = analyzeDisruptions(
      state,
      [definition]
    );

    expect(result.complete).toBe(false);
    expect(result.disruptions).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});