
import type {
  ComboEvaluationConfig,
  ComboEvaluationWeights,
  ComboScoreCategory,
} from "../../../models/ComboEvaluation";

export const COMBO_SCORE_CATEGORIES:
  ComboScoreCategory[] = [
    "board",
    "interactions",
    "hand",
    "resources",
    "efficiency",
  ];

export const DEFAULT_COMBO_EVALUATION_CONFIG:
  ComboEvaluationConfig = {
    weights: {
      board: 25,
      interactions: 35,
      hand: 20,
      resources: 10,
      efficiency: 10,
    },
    targets: {
      fieldCards: 4,
      interactions: 3,
      handCards: 4,
      remainingResources: 4,
      efficientActions: 5,
    },
    includeExperimentalInteractions: false,
  };

export function validateEvaluationConfig(
  config: ComboEvaluationConfig
): string[] {
  const errors: string[] = [];

  let totalWeight = 0;

  for (const category of COMBO_SCORE_CATEGORIES) {
    const weight = config.weights[category];

    if (!Number.isFinite(weight) || weight < 0) {
      errors.push(
        `Invalid weight for ${category}.`
      );
    } else {
      totalWeight += weight;
    }
  }

  if (totalWeight <= 0) {
    errors.push("At least one weight must be positive.");
  }

  for (const [key, value] of Object.entries(
    config.targets
  )) {
    if (!Number.isFinite(value) || value <= 0) {
      errors.push(`Invalid target: ${key}.`);
    }
  }

  return errors;
}

export function normalizeEvaluationWeights(
  weights: ComboEvaluationWeights
): ComboEvaluationWeights {
  const total = COMBO_SCORE_CATEGORIES.reduce(
    (sum, category) => sum + weights[category],
    0
  );

  if (
    total <= 0 ||
    COMBO_SCORE_CATEGORIES.some(
      category =>
        !Number.isFinite(weights[category]) ||
        weights[category] < 0
    )
  ) {
    throw new Error("Invalid evaluation weights.");
  }

  return {
    board: weights.board / total,
    interactions: weights.interactions / total,
    hand: weights.hand / total,
    resources: weights.resources / total,
    efficiency: weights.efficiency / total,
  };
}
