
import type {
  CardEffectDefinition,
} from "../../models/CardEffect";

import type {
  GameState,
} from "../../models/GameState";

import type {
  ComboCandidate,
  CandidateGenerationOptions,
  CandidateGenerationResult,
} from "../../models/ComboDiscovery";

import {
  validateCardEffect,
} from "../effect/cardEffectValidationService";

import {
  hasUsedEffectThisTurn,
} from "../simulation/turnRestrictionService";

export interface ComboEffectRegistryReader {
  getAll(): CardEffectDefinition[];
}

function hasAmbiguousCardSelection(
  state: GameState,
  effect: CardEffectDefinition
): boolean {
  for (const cost of effect.costs) {
    if (cost.type !== "move-card") {
      continue;
    }

    const copies = state.zones[cost.from].filter(
      id => id === cost.cardId
    ).length;

    if (copies > 1) {
      return true;
    }
  }

  for (const step of effect.steps) {
    if (step.type === "draw") {
      continue;
    }

    if (step.type === "search") {
      if (
        state.zones.deck.filter(
          id => id === step.cardId
        ).length > 1
      ) {
        return true;
      }

      continue;
    }

    const zone =
      step.type === "destroy"
        ? "field"
        : step.from;

    const copies = state.zones[zone].filter(
      id => id === step.cardId
    ).length;

    if (copies > 1) {
      return true;
    }
  }

  return false;
}

export function generateComboCandidates(
  state: GameState,
  registry: ComboEffectRegistryReader,
  options: CandidateGenerationOptions = {}
): CandidateGenerationResult {
  const candidates: ComboCandidate[] = [];
  const rejected: CandidateGenerationResult["rejected"] = [];

  const maxCandidates = Math.max(
    0,
    Math.floor(options.maxCandidates ?? 100)
  );

  const includeExperimental =
    options.includeExperimental ?? false;

  let truncated = false;

  const effects = [...registry.getAll()].sort(
    (a, b) => a.id.localeCompare(b.id)
  );

  for (const effect of effects) {
    if (candidates.length >= maxCandidates) {
      truncated = true;
      break;
    }

    if (
      !includeExperimental &&
      effect.verification === "experimental"
    ) {
      rejected.push({
        effectId: effect.id,
        reason: "Experimental effects are disabled.",
      });

      continue;
    }

    if (
      effect.oncePerTurnKey &&
      hasUsedEffectThisTurn(
        state,
        effect.oncePerTurnKey
      )
    ) {
      rejected.push({
        effectId: effect.id,
        reason: "Effect has already been used this turn.",
      });

      continue;
    }

    const validation = validateCardEffect(
      state,
      effect
    );

    if (!validation.valid) {
      rejected.push({
        effectId: effect.id,
        reason: validation.errors.join(" "),
      });

      continue;
    }

    if (hasAmbiguousCardSelection(state, effect)) {
      rejected.push({
        effectId: effect.id,
        reason: "Effect requires an explicit card-instance selection.",
      });

      continue;
    }

    candidates.push({
      id: `candidate:${effect.id}`,
      effectId: effect.id,
      sourceCardId: effect.sourceCardId,
      description: effect.label,
    });
  }

  return {
    candidates,
    rejected,
    truncated,
  };
}
