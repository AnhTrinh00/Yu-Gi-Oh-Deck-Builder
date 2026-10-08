
import type { Combo } from "../models/Combo";
import type { ComboCandidate } from "../models/ComboCandidate";

export function candidateToComboDraft(
  candidate: ComboCandidate,
  cardNames: Map<number, string>
): Combo {
  const now = new Date().toISOString();

  const nameOf = (id: number) =>
    cardNames.get(id) ?? `Card ${id}`;

  return {
    id: crypto.randomUUID(),
    name:
      `${nameOf(candidate.starterCardId)} ` +
      `→ ${nameOf(candidate.targetCardId)}`,
    description:
      "Draft generated from recorded card relationships. " +
      "Review every action, requirement, and end-board card.",
    starters: [
      {
        cardId: candidate.starterCardId,
        quantity: 1,
        zone: "hand",
      },
    ],
    requirements: [],
    steps: candidate.steps.map((step, index) => ({
      id: crypto.randomUUID(),
      order: index + 1,
      action: "other",
      cardId: step.sourceCardId,
      description:
        `${nameOf(step.sourceCardId)} interacts with ` +
        `${nameOf(step.targetCardId)} ` +
        `(${step.relationshipTypes.join(", ")}). ` +
        "Replace this placeholder with the actual game action.",
    })),
    endBoardCardIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
