
import type {
  AnalysisRequest,
  AnalysisResponse,
} from "../schemas/analysis.js";

export function validateGroundedAnalysis(
  request: AnalysisRequest,
  response: AnalysisResponse
): string[] {
  const errors: string[] = [];

  const validIds = new Set(
    request.combos.map(combo => combo.id)
  );

  if (!validIds.has(response.recommendedComboId)) {
    errors.push(
      "AI recommended a combo not present in the request."
    );
  }

  const explainedIds = new Set<string>();

  for (const explanation of response.explanations) {
    if (!validIds.has(explanation.comboId)) {
      errors.push(
        `Unknown combo reference: ${explanation.comboId}`
      );
    }

    if (explainedIds.has(explanation.comboId)) {
      errors.push(
        `Duplicate combo explanation: ${explanation.comboId}`
      );
    }

    explainedIds.add(explanation.comboId);
  }

  for (const id of validIds) {
    if (!explainedIds.has(id)) {
      errors.push(
        `Missing explanation for combo: ${id}`
      );
    }
  }

  return errors;
}
