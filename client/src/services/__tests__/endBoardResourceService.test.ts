import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  GameState,
} from "../../models/GameState";

import {
  evaluateEndBoardResources,
  compareEndBoardResources,
} from "../endBoardResourceService";

function createState(): GameState {
  return {
    zones: {
      hand: [100, 100, 101],
      deck: [200, 201],
      extra: [300],
      field: [400],
      graveyard: [500, 501],
      banished: [600],
    },

    normalSummonUsed: false,
    usedEffects: [],
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
      nextInstanceNumber: 11,
      instances: [
        { instanceId: "h1", cardId: 100, zone: "hand" },
        { instanceId: "h2", cardId: 100, zone: "hand" },
        { instanceId: "h3", cardId: 101, zone: "hand" },

        { instanceId: "d1", cardId: 200, zone: "deck" },
        { instanceId: "d2", cardId: 201, zone: "deck" },

        { instanceId: "e1", cardId: 300, zone: "extra" },

        { instanceId: "monster-1", cardId: 400, zone: "field" },

        { instanceId: "g1", cardId: 500, zone: "graveyard" },
        { instanceId: "g2", cardId: 501, zone: "graveyard" },

        { instanceId: "b1", cardId: 600, zone: "banished" },
      ],
    },

    xyzMaterials: [],
  };
}

describe("endBoardResourceService", () => {
  it("counts total and unique cards", () => {
    const result = evaluateEndBoardResources(
      createState()
    );

    expect(result.hand).toEqual({
      total: 3,
      unique: 2,
    });

    expect(result.deck).toEqual({
      total: 2,
      unique: 2,
    });
  });

  it("counts field resources", () => {
    const result = evaluateEndBoardResources(
      createState()
    );

    expect(result.fieldMonsters).toBe(1);
    expect(result.fieldSpellTraps).toBe(0);
    expect(result.xyzMaterials).toBe(0);
  });

  it("tracks normal summon availability", () => {
    const state = createState();

    expect(
      evaluateEndBoardResources(state)
        .normalSummonAvailable
    ).toBe(true);

    state.normalSummonUsed = true;

    expect(
      evaluateEndBoardResources(state)
        .normalSummonAvailable
    ).toBe(false);
  });

  it("counts used effects and restrictions", () => {
    const state = createState();

    state.usedEffects = ["effect-a", "effect-b"];

    state.restrictions = [{
      id: "restriction-a",
      description: "Cannot Special Summon.",
      expiresAtTurnEnd: true,
    }];

    const result = evaluateEndBoardResources(state);

    expect(result.usedEffectCount).toBe(2);
    expect(result.activeRestrictionCount).toBe(1);
  });

  it("compares resource changes", () => {
    const before = createState();
    const after = createState();

    after.zones.hand.pop();

    after.cardInstances!.instances =
      after.cardInstances!.instances.filter(
        (instance) => instance.instanceId !== "h3"
      );

    const result = compareEndBoardResources(
      before,
      after
    );

    expect(result.handChange).toBe(-1);
    expect(result.netHandAdvantage).toBe(-1);
  });

  it("does not mutate the original state", () => {
    const state = createState();

    const before = JSON.stringify(state);

    evaluateEndBoardResources(state);

    expect(JSON.stringify(state)).toBe(before);
  });

  it("counts attached Xyz Materials separately", () => {
    const state = createState();

    state.cardInstances!.instances.push({
      instanceId: "material-1",
      cardId: 700,
      zone: "overlay",
    });

    state.xyzMaterials = [{
      xyzInstanceId: "monster-1",
      materialInstanceIds: ["material-1"],
    }];

    const result = evaluateEndBoardResources(state);

    expect(result.fieldMonsters).toBe(1);
    expect(result.xyzMaterials).toBe(1);
  });
});