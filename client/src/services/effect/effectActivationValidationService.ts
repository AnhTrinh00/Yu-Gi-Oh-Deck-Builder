import type {
  CardEffectDefinition,
} from "../../models/effect/CardEffect";

import type {
  GameState,
} from "../../models/simulation/GameState";

import type {
  ActivationRequirement,
  ActivationValidationResult,
  EffectActivationDefinition,
} from "../../models/effect/EffectActivation";

import {
  countCardInZone,
} from "../simulation/gameStateService";

import {
  hasUsedEffectThisTurn,
} from "../simulation/turnRestrictionService";

function validateRequirement(
  state: GameState,
  effect: CardEffectDefinition,
  requirement: ActivationRequirement
): string | null {
  switch (requirement.type) {
    case "phase": {
      if (!state.turnState) {
        return "Turn state is required.";
      }

      return requirement.allowedPhases.includes(
        state.turnState.phase
      )
        ? null
        : "Effect cannot activate during this phase.";
    }

    case "active-player": {
      if (!state.turnState) {
        return "Turn state is required.";
      }

      return state.turnState.activePlayer ===
        requirement.player
        ? null
        : "Effect cannot activate during this player's turn.";
    }

    case "source-zone":
      return countCardInZone(
        state,
        requirement.zone,
        effect.sourceCardId
      ) > 0
        ? null
        : "Effect source is not in the required zone.";

    case "minimum-cards":
      return countCardInZone(
        state,
        requirement.zone,
        requirement.cardId
      ) >= requirement.minimum
        ? null
        : "Required cards are not available.";

    case "normal-summon-available":
      return state.normalSummonUsed
        ? "Normal Summon has already been used."
        : null;

    case "restriction-absent":
      return state.restrictions?.some(
        (restriction) =>
          restriction.id === requirement.restrictionId
      )
        ? `Restriction "${requirement.restrictionId}" prevents activation.`
        : null;

    case "effect-unused":
      return hasUsedEffectThisTurn(
        state,
        requirement.usageKey
      )
        ? `Effect "${requirement.usageKey}" has already been used.`
        : null;
  }
}

export function validateEffectActivation(
  state: GameState,
  effect: CardEffectDefinition,
  activation: EffectActivationDefinition
): ActivationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (activation.effectId !== effect.id) {
    errors.push(
      "Activation definition does not match the effect."
    );
  }

  if (
    activation.speed !== 1 &&
    activation.speed !== 2 &&
    activation.speed !== 3
  ) {
    errors.push("Invalid activation speed.");
  }

  for (const requirement of activation.requirements) {
    const error = validateRequirement(
      state,
      effect,
      requirement
    );

    if (error) {
      errors.push(error);
    }
  }

  warnings.push(
    "Spell Speed is recorded but chain legality is not yet enforced."
  );

  warnings.push(
    "This validator checks declared requirements, not complete Yu-Gi-Oh! activation legality."
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}