
import type { GameState } from "../../../models/GameState";
import type {
  ComboInteractionMetrics,
  VerifiedInteraction,
} from "../../../models/ComboEvaluation";

export function analyzeComboInteractions(
  finalState: GameState,
  definitions: VerifiedInteraction[],
  includeExperimental = false
): ComboInteractionMetrics {
  const details: ComboInteractionMetrics["details"] = [];

  const metrics: ComboInteractionMetrics = {
    total: 0,
    negations: 0,
    removals: 0,
    disruptions: 0,
    protections: 0,
    details,
  };

  const seenDefinitions = new Set<string>();

  for (const definition of definitions) {
    if (
      definition.verification === "experimental" &&
      !includeExperimental
    ) {
      continue;
    }

    if (
      !Number.isSafeInteger(definition.usesPerCopy) ||
      definition.usesPerCopy < 0
    ) {
      throw new Error(
        `Invalid interaction uses for card ${definition.cardId}.`
      );
    }

    const key = [
      definition.cardId,
      definition.kind,
      definition.label,
    ].join(":");

    if (seenDefinitions.has(key)) {
      throw new Error(
        `Duplicate interaction definition: ${key}`
      );
    }

    seenDefinitions.add(key);

    const copies = finalState.zones.field.filter(
      cardId => cardId === definition.cardId
    ).length;

    const count = copies * definition.usesPerCopy;

    if (count === 0) continue;

    details.push({
      cardId: definition.cardId,
      label: definition.label,
      kind: definition.kind,
      count,
    });

    metrics.total += count;

    switch (definition.kind) {
      case "negation":
        metrics.negations += count;
        break;

      case "removal":
        metrics.removals += count;
        break;

      case "disruption":
        metrics.disruptions += count;
        break;

      case "protection":
        metrics.protections += count;
        break;
    }
  }

  details.sort(
    (a, b) =>
      a.cardId - b.cardId ||
      a.kind.localeCompare(b.kind) ||
      a.label.localeCompare(b.label)
  );

  return metrics;
}
