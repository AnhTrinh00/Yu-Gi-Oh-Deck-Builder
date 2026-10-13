import {
  describe,
  expect,
  it,
} from "vitest";

import type { GameState } from "../../models/GameState";
import type {
  DiscoveredCombo,
  ComboSearchResult,
} from "../../models/ComboSearch";
import type {
  VerifiedInteraction,
} from "../../models/ComboEvaluation";

import {
  analyzeComboResources,
} from "../combo/evaluation/comboResourceAnalysisService";

import {
  analyzeComboInteractions,
} from "../combo/evaluation/comboInteractionAnalysisService";

import {
  evaluateCombo,
} from "../combo/evaluation/comboScoringService";

import {
  rankDiscoveredCombos,
} from "../combo/evaluation/comboRankingService";

import {
  compareEvaluatedCombos,
} from "../combo/evaluation/comboComparisonService";

import {
  DEFAULT_COMBO_EVALUATION_CONFIG,
  validateEvaluationConfig,
  normalizeEvaluationWeights,
} from "../combo/discovery/comboEvaluationConfigService";

function state(
  hand: number[],
  field: number[] = [],
  graveyard: number[] = []
): GameState {
  return {
    zones: {
      hand: [...hand],
      deck: [300, 400, 500],
      extra: [],
      field: [...field],
      graveyard: [...graveyard],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  };
}

function combo(
  id: string,
  finalState: GameState,
  actions = 2
): DiscoveredCombo {
  return {
    id,
    actions: Array.from(
      { length: actions },
      (_, index) => ({
        id: `${id}-action-${index}`,
        effectId: `effect-${index}`,
        sourceCardId: 100,
        description: "Test action",
        selections: {
          costSelections: [],
          resolutionSelections: [],
        },
      })
    ),
    finalState,
    depth: actions,
    stateKey: id,
  };
}

const initial = state([100, 200, 300, 400, 500]);

const interactions: VerifiedInteraction[] = [
  {
    cardId: 900,
    kind: "negation",
    label: "Test negate",
    usesPerCopy: 1,
    verification: "manually-verified",
  },
  {
    cardId: 901,
    kind: "removal",
    label: "Test removal",
    usesPerCopy: 1,
    verification: "manually-verified",
  },
];

function searchResult(
  combos: DiscoveredCombo[]
): ComboSearchResult {
  return {
    initialState: structuredClone(initial),
    combos,
    stats: {
      exploredNodes: combos.length + 1,
      generatedTransitions: combos.length,
      successfulTransitions: combos.length,
      rejectedTransitions: 0,
      duplicateStates: 0,
      truncated: false,
    },
    warnings: [],
  };
}

describe("Phase 4.6 combo evaluation", () => {
  it("analyzes resource changes", () => {
    const final = state(
      [100, 200, 300],
      [900, 901],
      [400, 500]
    );

    const metrics = analyzeComboResources(
      initial,
      final,
      3
    );

    expect(metrics.initialHand).toBe(5);
    expect(metrics.finalHand).toBe(3);
    expect(metrics.handDelta).toBe(-2);
    expect(metrics.finalField).toBe(2);
    expect(metrics.actionsUsed).toBe(3);
  });

  it("counts verified interactions", () => {
    const final = state(
      [100],
      [900, 901]
    );

    const result = analyzeComboInteractions(
      final,
      interactions
    );

    expect(result.total).toBe(2);
    expect(result.negations).toBe(1);
    expect(result.removals).toBe(1);
  });

  it("counts multiple field copies", () => {
    const final = state(
      [],
      [900, 900]
    );

    const result = analyzeComboInteractions(
      final,
      interactions
    );

    expect(result.negations).toBe(2);
  });

  it("excludes experimental interactions by default", () => {
    const final = state([], [902]);

    const experimental: VerifiedInteraction[] = [{
      cardId: 902,
      kind: "disruption",
      label: "Experimental interaction",
      usesPerCopy: 1,
      verification: "experimental",
    }];

    expect(
      analyzeComboInteractions(
        final,
        experimental
      ).total
    ).toBe(0);

    expect(
      analyzeComboInteractions(
        final,
        experimental,
        true
      ).total
    ).toBe(1);
  });

  it("rejects invalid interaction counts", () => {
    expect(() =>
      analyzeComboInteractions(
        state([], [900]),
        [{
          cardId: 900,
          kind: "negation",
          label: "Invalid",
          usesPerCopy: -1,
          verification: "manually-verified",
        }]
      )
    ).toThrow();
  });

  it("produces a bounded score", () => {
    const result = evaluateCombo(
      initial,
      combo(
        "combo-a",
        state(
          [100, 200, 300],
          [900, 901]
        )
      ),
      interactions
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("rewards additional verified interactions", () => {
    const without = evaluateCombo(
      initial,
      combo(
        "without",
        state([100, 200], [700, 701])
      ),
      interactions
    );

    const withInteractions = evaluateCombo(
      initial,
      combo(
        "with",
        state([100, 200], [900, 901])
      ),
      interactions
    );

    expect(withInteractions.score).toBeGreaterThan(
      without.score
    );
  });

  it("rewards remaining hand resources", () => {
    const low = evaluateCombo(
      initial,
      combo(
        "low",
        state([100], [900])
      ),
      interactions
    );

    const high = evaluateCombo(
      initial,
      combo(
        "high",
        state([100, 200, 300], [900])
      ),
      interactions
    );

    expect(high.score).toBeGreaterThan(low.score);
  });

  it("ranks stronger outcomes first", () => {
    const weak = combo(
      "weak",
      state([100], [])
    );

    const strong = combo(
      "strong",
      state(
        [100, 200, 300],
        [900, 901]
      )
    );

    const result = rankDiscoveredCombos(
      initial,
      searchResult([weak, strong]),
      interactions
    );

    expect(result.ranked).toHaveLength(2);
    expect(result.best?.combo.id).toBe("strong");
    expect(result.ranked[0].score).toBeGreaterThan(
      result.ranked[1].score
    );
  });

  it("compares category scores", () => {
    const first = evaluateCombo(
      initial,
      combo(
        "first",
        state([100, 200], [900])
      ),
      interactions
    );

    const second = evaluateCombo(
      initial,
      combo(
        "second",
        state([100], [])
      ),
      interactions
    );

    const comparison = compareEvaluatedCombos(
      first,
      second
    );

    expect(comparison.winner).toBe("first");
    expect(comparison.differences).toHaveLength(5);
    expect(comparison.scoreDifference).toBeGreaterThan(0);
  });

  it("normalizes custom weights", () => {
    const weights = normalizeEvaluationWeights({
      board: 2,
      interactions: 3,
      hand: 1,
      resources: 1,
      efficiency: 1,
    });

    const sum = Object.values(weights).reduce(
      (total, value) => total + value,
      0
    );

    expect(sum).toBeCloseTo(1);
  });

  it("rejects invalid scoring configurations", () => {
    const config = structuredClone(
      DEFAULT_COMBO_EVALUATION_CONFIG
    );

    config.weights.board = -1;

    expect(
      validateEvaluationConfig(config).length
    ).toBeGreaterThan(0);
  });

  it("does not mutate the original game state", () => {
    const final = state(
      [100, 200],
      [900, 901]
    );

    const original = structuredClone(final);

    evaluateCombo(
      initial,
      combo("immutable", final),
      interactions
    );

    expect(final).toEqual(original);
  });

  it("preserves deterministic ranking", () => {
    const first = combo(
      "alpha",
      state([100, 200], [900])
    );

    const second = combo(
      "beta",
      state([100, 200], [900])
    );

    const result = rankDiscoveredCombos(
      initial,
      searchResult([second, first]),
      interactions
    );

    expect(
      result.ranked.map(item => item.combo.id)
    ).toEqual(["alpha", "beta"]);
  });
});
