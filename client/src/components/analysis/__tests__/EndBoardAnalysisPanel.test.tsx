import {
  describe,
  expect,
  it,
} from "vitest";

import {
  renderToStaticMarkup,
} from "react-dom/server";

import type {
  EndBoardEvaluation,
} from "../../../services/analysis/endBoard/endBoardEvaluationService";

import EndBoardAnalysisPanel from "../EndBoardAnalysisPanel";

function createEvaluation(): EndBoardEvaluation {
  return {
    board: {
      complete: true,
      warnings: [],
      monsters: [],
      spellTraps: [],
      fieldSpell: null,
      monsterCount: 0,
      spellTrapCount: 0,
      xyzMaterialCount: 0,

      resources: {
        hand: { cardIds: [], count: 0 },
        deck: { cardIds: [], count: 0 },
        extra: { cardIds: [], count: 0 },
        graveyard: { cardIds: [], count: 0 },
        banished: { cardIds: [], count: 0 },
      },

      normalSummonUsed: false,
      usedEffects: [],
      effectUsage: [],
      restrictions: [],
      turnState: null,
    },

    resources: {
      hand: { total: 2, unique: 2 },
      deck: { total: 30, unique: 20 },
      extraDeck: { total: 10, unique: 8 },
      graveyard: { total: 3, unique: 3 },
      banished: { total: 0, unique: 0 },

      fieldMonsters: 2,
      fieldSpellTraps: 1,
      xyzMaterials: 1,

      normalSummonAvailable: false,

      usedEffectCount: 1,
      activeRestrictionCount: 0,

      totalAccessibleResources: 9,
    },

    disruptions: {
      disruptions: [],
      potentialCount: 0,
      conditionallyAvailableCount: 0,
      unavailableCount: 0,
      unknownCount: 0,
      complete: false,
      warnings: [],
    },

    score: {
      total: 42.5,

      breakdown: {
        disruptions: 0,
        boardPresence: 15,
        resources: 20,
        flexibility: 7.5,
      },

      weights: {
        disruptions: 40,
        boardPresence: 25,
        resources: 25,
        flexibility: 10,
      },

      confidence: "partial",
      warnings: [
        "Heuristic scoring only.",
      ],
    },
  };
}

describe("EndBoardAnalysisPanel", () => {
  it("renders the score and resources", () => {
    const evaluation = createEvaluation();

    const html = renderToStaticMarkup(
      <EndBoardAnalysisPanel {...evaluation} />
    );

    expect(html).toContain("42.50 / 100");
    expect(html).toContain("Hand Cards");
    expect(html).toContain("Graveyard Cards");
    expect(html).toContain("Xyz Materials");
  });

  it("renders incomplete-analysis warnings", () => {
    const evaluation = createEvaluation();

    const html = renderToStaticMarkup(
      <EndBoardAnalysisPanel {...evaluation} />
    );

    expect(html).toContain("partial");
    expect(html).toContain("Heuristic scoring only.");
  });

  it("does not mutate the supplied evaluation", () => {
    const evaluation = createEvaluation();

    const before = JSON.stringify(evaluation);

    renderToStaticMarkup(
      <EndBoardAnalysisPanel {...evaluation} />
    );

    expect(JSON.stringify(evaluation)).toBe(before);
  });

  it("renders all four scoring categories", () => {
    const evaluation = createEvaluation();

    const html = renderToStaticMarkup(
      <EndBoardAnalysisPanel {...evaluation} />
    );

    expect(html).toContain("Score Breakdown");
    expect(html).toContain("Disruptions");
    expect(html).toContain("Board Presence");
    expect(html).toContain("Resources");
    expect(html).toContain("Flexibility");

    expect(html).toContain("15.00 / 25");
    expect(html).toContain("20.00 / 25");
    expect(html).toContain("7.50 / 10");
  });

  it("renders custom scoring weights", () => {
    const evaluation = createEvaluation();

    evaluation.score = {
      ...evaluation.score,
      weights: {
        disruptions: 55,
        boardPresence: 20,
        resources: 15,
        flexibility: 10,
      },
      breakdown: {
        disruptions: 0,
        boardPresence: 12,
        resources: 10,
        flexibility: 7.5,
      },
      total: 29.5,
    };

    const html = renderToStaticMarkup(
      <EndBoardAnalysisPanel {...evaluation} />
    );

    expect(html).toContain("29.50 / 100");
    expect(html).toContain("0.00 / 55");
    expect(html).toContain("12.00 / 20");
    expect(html).toContain("10.00 / 15");
  });
});