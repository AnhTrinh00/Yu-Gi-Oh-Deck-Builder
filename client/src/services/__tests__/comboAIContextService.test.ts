
import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  EvaluatedCombo,
} from "../../models/ComboEvaluation";

import {
  buildComboAIContext,
} from "../comboAIContextService";

function exampleCombo(): EvaluatedCombo {
  return {
    combo: {
      id: "combo-1",
      actions: [{
        id: "action-1",
        effectId: "effect-1",
        sourceCardId: 100,
        description: "Search one card",
        selections: {
          costSelections: [],
          resolutionSelections: [],
        },
      }],
      finalState: {
        zones: {
          hand: [100],
          deck: [],
          extra: [],
          field: [200],
          graveyard: [],
          banished: [],
        },
        normalSummonUsed: false,
        usedEffects: [],
        actionHistory: [],
      },
      depth: 1,
      stateKey: "state-1",
    },
    score: 75,
    categoryScores: {
      board: 50,
      interactions: 50,
      hand: 25,
      resources: 100,
      efficiency: 100,
    },
    resources: {
      initialHand: 2,
      finalHand: 1,
      handDelta: -1,
      initialField: 0,
      finalField: 1,
      fieldDelta: 1,
      initialGraveyard: 0,
      finalGraveyard: 0,
      initialBanished: 0,
      finalBanished: 0,
      initialDeck: 1,
      finalDeck: 0,
      initialExtra: 0,
      finalExtra: 0,
      actionsUsed: 1,
    },
    interactions: {
      total: 1,
      negations: 1,
      removals: 0,
      disruptions: 0,
      protections: 0,
      details: [],
    },
    strengths: ["Short combo"],
    weaknesses: ["Limited board"],
  };
}

describe("comboAIContextService", () => {
  it("builds compact evidence", () => {
    const result = buildComboAIContext(
      [exampleCombo()],
      "Which combo is stronger?"
    );

    expect(result.combos).toHaveLength(1);
    expect(result.combos[0].metrics.score).toBe(75);
    expect(
      result.combos[0].metrics.potentialInteractions
    ).toBe(1);
  });

  it("rejects an empty list", () => {
    expect(() =>
      buildComboAIContext([])
    ).toThrow();
  });

  it("rejects duplicate combo IDs", () => {
    const combo = exampleCombo();

    expect(() =>
      buildComboAIContext([combo, combo])
    ).toThrow();
  });

  it("does not mutate evaluated combos", () => {
    const combo = exampleCombo();
    const original = structuredClone(combo);

    buildComboAIContext([combo]);

    expect(combo).toEqual(original);
  });
});
