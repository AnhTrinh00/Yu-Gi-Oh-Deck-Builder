import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  GameState,
} from "../../models/GameState";

import type {
  DisruptionAnalysis,
} from "../../models/DisruptionAnalysis";

import {
  scoreEndBoard,
  compareEndBoardScores,
} from "../analysis/endBoard/endBoardScoringService";

function createState(): GameState {
  return {
    zones: {
      hand: [100, 101],
      deck: [200],
      extra: [300],
      field: [400],
      graveyard: [500],
      banished: [],
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
      nextInstanceNumber: 7,
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
          instanceId: "grave-1",
          cardId: 500,
          zone: "graveyard",
        },
      ],
    },

    xyzMaterials: [],
  };
}

function createDisruptions(
  available = 0,
  unknown = 0
): DisruptionAnalysis {
  return {
    disruptions: [],

    potentialCount: 0,
    conditionallyAvailableCount: available,
    unavailableCount: 0,
    unknownCount: unknown,

    complete: true,
    warnings: [],
  };
}

describe("endBoardScoringService", () => {
  it("produces a score between 0 and 100", () => {
    const result = scoreEndBoard(
      createState(),
      createDisruptions(2)
    );

    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("rewards additional available disruptions", () => {
    const state = createState();

    const low = scoreEndBoard(
      state,
      createDisruptions(1)
    );

    const high = scoreEndBoard(
      state,
      createDisruptions(3)
    );

    expect(high.total).toBeGreaterThan(low.total);
  });

  it("does not reward unknown disruptions", () => {
    const state = createState();

    const baseline = scoreEndBoard(
      state,
      createDisruptions()
    );

    const unknown = scoreEndBoard(
      state,
      createDisruptions(0, 3)
    );

    expect(
      unknown.breakdown.disruptions
    ).toBe(
      baseline.breakdown.disruptions
    );

    expect(unknown.confidence).toBe("partial");
  });

  it("supports custom scoring weights", () => {
    const result = scoreEndBoard(
      createState(),
      createDisruptions(2),
      {
        disruptions: 50,
        boardPresence: 20,
        resources: 20,
        flexibility: 10,
      }
    );

    expect(result.weights.disruptions).toBe(50);
  });

  it("rejects weights that do not total 100", () => {
    expect(() =>
      scoreEndBoard(
        createState(),
        createDisruptions(),
        {
          disruptions: 50,
          boardPresence: 25,
          resources: 25,
          flexibility: 25,
        }
      )
    ).toThrow(
      "Scoring weights must total 100."
    );
  });

  it("compares two board scores", () => {
    const state = createState();

    const result = compareEndBoardScores(
      state,
      createDisruptions(3),
      state,
      createDisruptions(1)
    );

    expect(result.winner).toBe("first");
    expect(result.scoreDifference).toBeGreaterThan(0);
  });

  it("does not mutate the game state", () => {
    const state = createState();

    const before = JSON.stringify(state);

    scoreEndBoard(
      state,
      createDisruptions(2)
    );

    expect(JSON.stringify(state)).toBe(before);
  });
});