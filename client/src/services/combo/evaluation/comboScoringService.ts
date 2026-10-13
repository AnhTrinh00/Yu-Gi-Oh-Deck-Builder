
import type { GameState } from "../../../models/simulation/GameState";
import type { DiscoveredCombo } from "../../../models/combo/ComboSearch";
import type {
  ComboCategoryScores,
  ComboEvaluationConfig,
  EvaluatedCombo,
  VerifiedInteraction,
} from "../../../models/combo/ComboEvaluation";

import {
  DEFAULT_COMBO_EVALUATION_CONFIG,
  COMBO_SCORE_CATEGORIES,
  normalizeEvaluationWeights,
  validateEvaluationConfig,
} from "../discovery/comboEvaluationConfigService";

import {
  analyzeComboResources,
} from "./comboResourceAnalysisService";

import {
  analyzeComboInteractions,
} from "./comboInteractionAnalysisService";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function ratioScore(
  value: number,
  target: number
): number {
  return clamp((value / target) * 100);
}

function preservedHandCount(
  initial: GameState,
  final: GameState
): number {
  const initialInstances = initial.cardInstances?.instances;
  const finalInstances = final.cardInstances?.instances;

  if (initialInstances && finalInstances) {
    const initialIds = new Set(
      initialInstances
        .filter(instance => instance.zone === "hand")
        .map(instance => instance.instanceId)
    );

    return finalInstances.filter(
      instance =>
        instance.zone === "hand" &&
        initialIds.has(instance.instanceId)
    ).length;
  }

  // Fallback for legacy states without instance
  // tracking: compare quantities by card ID.
  const remaining = new Map<number, number>();

  for (const cardId of initial.zones.hand) {
    remaining.set(
      cardId,
      (remaining.get(cardId) ?? 0) + 1
    );
  }

  let preserved = 0;

  for (const cardId of final.zones.hand) {
    const count = remaining.get(cardId) ?? 0;

    if (count > 0) {
      preserved++;
      remaining.set(cardId, count - 1);
    }
  }

  return preserved;
}

export function evaluateCombo(
  initialState: GameState,
  combo: DiscoveredCombo,
  interactionDefinitions: VerifiedInteraction[] = [],
  config: ComboEvaluationConfig =
    DEFAULT_COMBO_EVALUATION_CONFIG
): EvaluatedCombo {
  const errors = validateEvaluationConfig(config);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const finalState = combo.finalState;

  const resources = analyzeComboResources(
    initialState,
    finalState,
    combo.actions.length
  );

  const interactions = analyzeComboInteractions(
    finalState,
    interactionDefinitions,
    config.includeExperimentalInteractions
  );

  const preserved = preservedHandCount(
    initialState,
    finalState
  );

  const preservationRatio =
    resources.initialHand === 0
      ? 1
      : preserved / resources.initialHand;

  const meaningfulOutcome =
    resources.finalField > 0 ||
    interactions.total > 0 ||
    resources.handDelta > 0;

  const efficiencyScore = meaningfulOutcome
    ? ratioScore(
        config.targets.efficientActions,
        Math.max(1, resources.actionsUsed)
      )
    : 0;

  const categoryScores: ComboCategoryScores = {
    board: ratioScore(
      resources.finalField,
      config.targets.fieldCards
    ),

    interactions: ratioScore(
      interactions.total,
      config.targets.interactions
    ),

    hand: ratioScore(
      resources.finalHand,
      config.targets.handCards
    ),

    resources: clamp(preservationRatio * 100),

    efficiency: efficiencyScore,
  };

  const weights = normalizeEvaluationWeights(
    config.weights
  );

  const score = COMBO_SCORE_CATEGORIES.reduce(
    (sum, category) =>
      sum +
      categoryScores[category] * weights[category],
    0
  );

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (interactions.total > 0) {
    strengths.push(
      `${interactions.total} potential interaction(s) on the final field.`
    );
  } else {
    weaknesses.push(
      "No registered interactions identified on the final field."
    );
  }

  if (resources.finalField >= config.targets.fieldCards) {
    strengths.push("Strong board presence by card count.");
  } else if (resources.finalField === 0) {
    weaknesses.push("No cards remain on the field.");
  }

  if (resources.handDelta > 0) {
    strengths.push(
      `Gained ${resources.handDelta} card(s) in hand.`
    );
  } else if (resources.handDelta < 0) {
    weaknesses.push(
      `Net hand reduction of ${-resources.handDelta} card(s).`
    );
  }

  if (resources.actionsUsed <=
      config.targets.efficientActions &&
      meaningfulOutcome) {
    strengths.push("Relatively short action sequence.");
  }

  if (resources.actionsUsed >
      config.targets.efficientActions) {
    weaknesses.push("Longer action sequence.");
  }

  return {
    combo,
    score: Number(score.toFixed(2)),
    categoryScores,
    resources,
    interactions,
    strengths,
    weaknesses,
  };
}
