
import type {
  EvaluatedCombo,
} from "../models/ComboEvaluation";

export interface AIComboEvidence {
  id: string;
  actions: Array<{
    effectId: string;
    description: string;
  }>;
  metrics: {
    score: number;
    finalHand: number;
    finalField: number;
    actionsUsed: number;
    potentialInteractions: number;
  };
  strengths: string[];
  weaknesses: string[];
}

export interface AIAnalysisRequest {
  question: string;
  combos: AIComboEvidence[];
}

export function buildComboAIContext(
  combos: EvaluatedCombo[],
  question = ""
): AIAnalysisRequest {
  if (combos.length === 0) {
    throw new Error("At least one combo is required.");
  }

  if (combos.length > 10) {
    throw new Error("A maximum of 10 combos is supported.");
  }

  const ids = new Set<string>();

  const evidence = combos.map(item => {
    if (ids.has(item.combo.id)) {
      throw new Error("Duplicate combo IDs are not allowed.");
    }

    ids.add(item.combo.id);

    return {
      id: item.combo.id,
      actions: item.combo.actions.map(action => ({
        effectId: action.effectId,
        description: action.description.slice(0, 300),
      })),
      metrics: {
        score: item.score,
        finalHand: item.resources.finalHand,
        finalField: item.resources.finalField,
        actionsUsed: item.resources.actionsUsed,
        potentialInteractions: item.interactions.total,
      },
      strengths: item.strengths.slice(0, 10).map(
        value => value.slice(0, 300)
      ),
      weaknesses: item.weaknesses.slice(0, 10).map(
        value => value.slice(0, 300)
      ),
    };
  });

  return {
    question: question.slice(0, 1000),
    combos: evidence,
  };
}
