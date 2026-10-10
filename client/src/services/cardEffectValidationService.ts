
import type {
  CardEffectDefinition,
  EffectCondition,
} from "../models/CardEffect";

import type {
  GameState,
  GameZone,
} from "../models/GameState";

import { countCardInZone } from "./gameStateService";

export interface EffectValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const zones: GameZone[] = [
  "hand",
  "deck",
  "extra",
  "field",
  "graveyard",
  "banished",
];

function isZone(zone: string): zone is GameZone {
  return zones.some((value) => value === zone);
}

function checkCondition(
  state: GameState,
  sourceCardId: number,
  condition: EffectCondition
): string | null {
  switch (condition.type) {
    case "source-in-zone":
      return countCardInZone(
        state,
        condition.zone,
        sourceCardId
      ) > 0
        ? null
        : "Source card is not in the required zone.";

    case "card-in-zone":
      return countCardInZone(
        state,
        condition.zone,
        condition.cardId
      ) >= (condition.minimum ?? 1)
        ? null
        : `Card ${condition.cardId} is not available in ${condition.zone}.`;

    case "normal-summon-available":
      return state.normalSummonUsed
        ? "Normal Summon has already been used."
        : null;

    case "effect-unused":
      return state.usedEffects.includes(condition.usageKey)
        ? `Effect ${condition.usageKey} has already been used.`
        : null;
  }
}

/**
 * Checks declared prerequisites only.
 * Does not execute effects or establish complete game-rule legality.
 */
export function validateCardEffect(
  state: GameState,
  effect: CardEffectDefinition
): EffectValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!effect.id.trim()) {
    errors.push("Effect id is required.");
  }

  if (
    !Number.isSafeInteger(effect.sourceCardId) ||
    effect.sourceCardId <= 0
  ) {
    errors.push("Invalid source card id.");
  }

  if (!isZone(effect.activationZone)) {
    errors.push("Invalid activation zone.");
  }

  if (
    countCardInZone(
      state,
      effect.activationZone,
      effect.sourceCardId
    ) < 1
  ) {
    errors.push("Source card is not in its activation zone.");
  }

  if (effect.oncePerTurnKey !== undefined) {
    if (!effect.oncePerTurnKey.trim()) {
      errors.push("Once-per-turn key cannot be empty.");
    } else if (
      state.usedEffects.includes(effect.oncePerTurnKey)
    ) {
      errors.push("Once-per-turn effect already used.");
    }
  }

  for (const condition of effect.conditions) {
    const error = checkCondition(
      state,
      effect.sourceCardId,
      condition
    );

    if (error) {
      errors.push(error);
    }
  }

  // Verify costs against a temporary inventory to prevent
  // double-spending the same card.
  const available = Object.fromEntries(
    zones.map((zone) => [zone, [...state.zones[zone]]])
  ) as Record<GameZone, number[]>;

  for (const cost of effect.costs) {
    if (cost.from === cost.to) {
      errors.push("Cost source and destination must differ.");
      continue;
    }

    const index = available[cost.from].indexOf(cost.cardId);

    if (index < 0) {
      errors.push(
        `Cannot pay cost: Card ${cost.cardId} missing from ${cost.from}.`
      );
    } else {
      available[cost.from].splice(index, 1);
      available[cost.to].push(cost.cardId);
    }
  }

  if (effect.verification !== "manually-verified") {
    warnings.push(
      "Effect definition has not been manually verified."
    );
  }

  warnings.push(
    "Only declared prerequisites and costs were checked; full Yu-Gi-Oh! legality is unverified."
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
