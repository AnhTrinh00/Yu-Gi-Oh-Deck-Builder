import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  GameState,
} from "../../models/GameState";

import {
  analyzeEndBoard,
} from "../analysis/endBoard/endBoardAnalysisService";

function createTestState(): GameState {
  return {
    zones: {
      hand: [100, 101],
      deck: [200],
      extra: [300],
      field: [400, 500],
      graveyard: [600],
      banished: [],
    },

    normalSummonUsed: true,
    usedEffects: ["effect-400"],
    actionHistory: [],

    fieldState: {
      monsterZones: [
        {
          cardId: 400,
          instanceId: "monster-1",
          position: "face-up-attack",
        },
        null,
        null,
        null,
        null,
      ],

      spellTrapZones: [
        {
          cardId: 500,
          instanceId: "spell-1",
          position: "face-down",
        },
        null,
        null,
        null,
        null,
      ],

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
      nextInstanceNumber: 10,
      instances: [
        {
          instanceId: "hand-1",
          cardId: 100,
          zone: "hand",
        },
        {
          instanceId: "hand-2",
          cardId: 101,
          zone: "hand",
        },
        {
          instanceId: "deck-1",
          cardId: 200,
          zone: "deck",
        },
        {
          instanceId: "extra-1",
          cardId: 300,
          zone: "extra",
        },
        {
          instanceId: "monster-1",
          cardId: 400,
          zone: "field",
        },
        {
          instanceId: "spell-1",
          cardId: 500,
          zone: "field",
        },
        {
          instanceId: "grave-1",
          cardId: 600,
          zone: "graveyard",
        },
      ],
    },

    xyzMaterials: [],
  };
}

describe("endBoardAnalysisService", () => {
  it("extracts field monsters and spell/trap cards", () => {
    const state = createTestState();

    const result = analyzeEndBoard(state);

    expect(result.complete).toBe(true);
    expect(result.monsterCount).toBe(1);
    expect(result.spellTrapCount).toBe(1);

    expect(result.monsters[0]).toMatchObject({
      cardId: 400,
      instanceId: "monster-1",
      zoneIndex: 0,
      position: "face-up-attack",
    });

    expect(result.spellTraps[0]).toMatchObject({
      cardId: 500,
      instanceId: "spell-1",
      position: "face-down",
    });
  });

  it("extracts remaining resources", () => {
    const result = analyzeEndBoard(
      createTestState()
    );

    expect(result.resources.hand.count).toBe(2);
    expect(result.resources.deck.count).toBe(1);
    expect(result.resources.extra.count).toBe(1);
    expect(result.resources.graveyard.count).toBe(1);
    expect(result.resources.banished.count).toBe(0);
  });

  it("extracts attached Xyz Materials", () => {
    const state = createTestState();

    state.cardInstances!.instances.push({
      instanceId: "material-1",
      cardId: 700,
      zone: "overlay",
    });

    state.xyzMaterials = [
      {
        xyzInstanceId: "monster-1",
        materialInstanceIds: ["material-1"],
      },
    ];

    const result = analyzeEndBoard(state);

    expect(result.complete).toBe(true);
    expect(result.monsterCount).toBe(1);
    expect(result.xyzMaterialCount).toBe(1);

    expect(result.monsters[0].xyzMaterials).toEqual([
      {
        cardId: 700,
        instanceId: "material-1",
      },
    ]);
  });

  it("reports missing physical instance tracking", () => {
    const state = createTestState();

    delete state.cardInstances;

    const result = analyzeEndBoard(state);

    expect(result.complete).toBe(false);

    expect(result.warnings).toContain(
      "Physical card instances are not initialized."
    );
  });

  it("reports field synchronization errors", () => {
    const state = createTestState();

    state.zones.field.push(999);

    const result = analyzeEndBoard(state);

    expect(result.complete).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("does not mutate the original state", () => {
    const state = createTestState();

    const before = JSON.stringify(state);

    const result = analyzeEndBoard(state);

    result.monsters[0].cardId = 999;
    result.resources.hand.cardIds.push(999);
    result.usedEffects.push("new-effect");

    expect(JSON.stringify(state)).toBe(before);
  });

  it("handles legacy states without field metadata", () => {
    const state = createTestState();

    delete state.fieldState;
    delete state.cardInstances;

    const result = analyzeEndBoard(state);

    expect(result.complete).toBe(false);
    expect(result.monsters).toEqual([]);
    expect(result.resources.hand.count).toBe(2);
  });
});