
import type {
  ComboComparison,
  EvaluatedCombo,
} from "../models/ComboEvaluation";

import {
  COMBO_SCORE_CATEGORIES,
} from "./comboEvaluationConfigService";

export function compareEvaluatedCombos(
  first: EvaluatedCombo,
  second: EvaluatedCombo
): ComboComparison {
  const difference = Number(
    (first.score - second.score).toFixed(2)
  );

  const winner =
    difference > 0
      ? "first"
      : difference < 0
        ? "second"
        : "tie";

  return {
    first,
    second,
    scoreDifference: difference,
    winner,

    differences: COMBO_SCORE_CATEGORIES.map(
      category => ({
        category,
        firstScore: first.categoryScores[category],
        secondScore: second.categoryScores[category],
        difference: Number(
          (
            first.categoryScores[category] -
            second.categoryScores[category]
          ).toFixed(2)
        ),
      })
    ),
  };
}
