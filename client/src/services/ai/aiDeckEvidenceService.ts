
import type { CardRelationship } from "../../models/effect/CardRelationship";
import type { Combo } from "../../models/combo/Combo";

import type {
  AIDeckEvidence,
  AISimulationEvidence,
} from "../../models/ai/AIDeckEvidence";

export interface AIDeckEvidenceInput {
  relationships?: CardRelationship[];
  savedCombos?: Combo[];
  simulations?: AISimulationEvidence[];
}

const MAX_RELATIONSHIPS = 50;
const MAX_COMBOS = 10;
const MAX_STEPS_PER_COMBO = 20;
const MAX_SIMULATIONS = 10;
const MAX_TEXT_LENGTH = 300;

function trimText(value: string): string {
  return value.slice(0, MAX_TEXT_LENGTH);
}

export function buildAIDeckEvidence(
  input: AIDeckEvidenceInput
): AIDeckEvidence {
  const relationships = (
    input.relationships ?? []
  )
    .slice(0, MAX_RELATIONSHIPS)
    .map((relationship) => ({
      sourceCardId: relationship.sourceCardId,
      targetCardId: relationship.targetCardId,
      type: relationship.type,
      ...(relationship.description !== undefined && {
        description: trimText(relationship.description),
      }),
      verification: "registered" as const,
    }));

  const savedCombos = (input.savedCombos ?? [])
    .slice(0, MAX_COMBOS)
    .map((combo) => ({
      id: combo.id,
      name: trimText(combo.name),
      description: trimText(combo.description),
      starters: combo.starters.map((starter) => ({
        cardId: starter.cardId,
        quantity: starter.quantity,
        zone: starter.zone,
      })),
      steps: combo.steps
        .slice(0, MAX_STEPS_PER_COMBO)
        .map((step) => ({
          action: step.action,
          cardId: step.cardId,
          description: trimText(step.description),
        })),
      endBoardCardIds: combo.endBoardCardIds.slice(0, 15),
      verification: "saved-unverified" as const,
    }));

  const simulations = (input.simulations ?? [])
    .slice(0, MAX_SIMULATIONS)
    .map((simulation) => ({
      comboId: simulation.comboId,
      outcome: simulation.outcome,
      summary: trimText(simulation.summary),
      ...(simulation.endBoardScore !== undefined && {
        endBoardScore: simulation.endBoardScore,
      }),
      warnings: simulation.warnings
        .slice(0, 10)
        .map(trimText),
      verification: "simulator-reported" as const,
    }));

  const limitations: string[] = [
    "Registered card relationships do not prove legal combo interactions.",
    "Saved combos are not automatically simulator-verified.",
    "Simulator-reported results cover only implemented game mechanics.",
    "End-board scores are heuristic, not competitive rankings.",
  ];

  if ((input.relationships?.length ?? 0) > MAX_RELATIONSHIPS) {
    limitations.push(
      "Some registered relationships were omitted due to context limits."
    );
  }

  if ((input.savedCombos?.length ?? 0) > MAX_COMBOS) {
    limitations.push(
      "Some saved combos were omitted due to context limits."
    );
  }

  if (
    (input.savedCombos ?? []).some(
      (combo) => combo.steps.length > MAX_STEPS_PER_COMBO
    )
  ) {
    limitations.push(
      "Some saved combo sequences were truncated."
    );
  }

  if ((input.simulations?.length ?? 0) > MAX_SIMULATIONS) {
    limitations.push(
      "Some simulation summaries were omitted due to context limits."
    );
  }

  return {
    relationships,
    savedCombos,
    simulations,
    limitations,
  };
}
