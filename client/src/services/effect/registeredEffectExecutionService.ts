
import type {
  CardEffectDefinition,
} from "../../models/CardEffect";

import type {
  GameState,
} from "../../models/GameState";

import {
  executeCardEffect,
  type CardEffectExecutionResult,
} from "./cardEffectExecutionService";

import {
  hasUsedEffectThisTurn,
  recordEffectUsage,
} from "../simulation/turnRestrictionService";

/**
 * Minimal registry contract.
 *
 * CardEffectRegistry can implement this directly
 * without requiring this service to know how
 * definitions are stored internally.
 */
export interface EffectRegistryReader {
  get(
    effectId: string
  ): CardEffectDefinition | undefined | null;
}

export interface RegisteredEffectExecutionResult
  extends CardEffectExecutionResult {
  registeredEffectId: string;
  usageRecorded: boolean;
}

function failedLookup(
  state: GameState,
  effectId: string,
  error: string
): RegisteredEffectExecutionResult {
  return {
    success: false,
    state,
    effectId,
    registeredEffectId: effectId,
    stage: "precondition",
    completedCosts: 0,
    completedSteps: 0,
    totalCosts: 0,
    totalSteps: 0,
    errors: [error],
    warnings: [],
    usageRecorded: false,
  };
}

function failedExecution(
  state: GameState,
  effect: CardEffectDefinition,
  error: string
): RegisteredEffectExecutionResult {
  return {
    success: false,
    state,
    effectId: effect.id,
    registeredEffectId: effect.id,
    stage: "precondition",
    completedCosts: 0,
    completedSteps: 0,
    totalCosts: effect.costs.length,
    totalSteps: effect.steps.length,
    errors: [error],
    warnings: [],
    usageRecorded: false,
  };
}

/**
 * Looks up, executes, and records one registered
 * structured card effect.
 *
 * All state changes are committed together.
 *
 * The usage key is shared across any definitions
 * that declare the same oncePerTurnKey.
 */
export function executeRegisteredEffect(
  state: GameState,
  registry: EffectRegistryReader,
  effectId: string
): RegisteredEffectExecutionResult {
  const effect = registry.get(effectId);

  if (!effect) {
    return failedLookup(
      state,
      effectId,
      `Effect "${effectId}" is not registered.`
    );
  }

  if (effect.id !== effectId) {
    return failedLookup(
      state,
      effectId,
      "Registry returned a mismatched effect definition."
    );
  }

  if (
    !state.turnState ||
    !state.effectUsage ||
    !state.restrictions
  ) {
    return failedExecution(
      state,
      effect,
      "Extended turn tracking is required."
    );
  }

  const usageKey = effect.oncePerTurnKey?.trim();

  if (
    usageKey &&
    hasUsedEffectThisTurn(state, usageKey)
  ) {
    return failedExecution(
      state,
      effect,
      `Effect usage "${usageKey}" has already been recorded this turn.`
    );
  }

  // Execute all declared costs and effect steps.
  // The underlying executor returns the original
  // state if the transaction fails.
  const execution = executeCardEffect(
    state,
    effect
  );

  if (!execution.success) {
    return {
      ...execution,
      registeredEffectId: effectId,
      usageRecorded: false,
    };
  }

  // Effects without a once-per-turn key do not
  // require an effect-usage record.
  if (!usageKey) {
    return {
      ...execution,
      registeredEffectId: effectId,
      usageRecorded: false,
    };
  }

  // Record usage on the successfully executed
  // working state, not on the original state.
  const usage = recordEffectUsage(
    execution.state,
    usageKey
  );

  if (!usage.success) {
    return {
      ...execution,
      success: false,
      state,
      stage: "precondition",
      errors: [
        usage.error ??
          "Could not record effect usage.",
      ],
      usageRecorded: false,
      registeredEffectId: effectId,
    };
  }

  return {
    ...execution,
    state: usage.state,
    registeredEffectId: effectId,
    usageRecorded: true,
  };
}
