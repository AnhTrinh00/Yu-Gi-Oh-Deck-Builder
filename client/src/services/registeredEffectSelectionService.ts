
import type {
  GameState,
} from "../models/GameState";

import type {
  EffectExecutionSelections,
} from "../models/EffectExecutionSelection";

import {
  executeCardEffectWithSelections,
} from "./selectedCardEffectExecutionService";

import {
  hasUsedEffectThisTurn,
  recordEffectUsage,
} from "./turnRestrictionService";

import type {
  EffectRegistryReader,
  RegisteredEffectExecutionResult,
} from "./registeredEffectExecutionService";

/**
 * Executes a registered effect with explicit
 * selections for costs and resolution steps.
 *
 * The original state is returned if the
 * transaction or usage recording fails.
 */
export function executeRegisteredEffectWithSelections(
  state: GameState,
  registry: EffectRegistryReader,
  effectId: string,
  selections: EffectExecutionSelections
): RegisteredEffectExecutionResult {
  const effect = registry.get(effectId);

  if (!effect || effect.id !== effectId) {
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
      errors: [
        `Effect "${effectId}" is not registered.`,
      ],
      warnings: [],
      usageRecorded: false,
    };
  }

  if (
    !state.turnState ||
    !state.effectUsage ||
    !state.restrictions
  ) {
    return {
      success: false,
      state,
      effectId,
      registeredEffectId: effectId,
      stage: "precondition",
      completedCosts: 0,
      completedSteps: 0,
      totalCosts: effect.costs.length,
      totalSteps: effect.steps.length,
      errors: [
        "Extended turn tracking is required.",
      ],
      warnings: [],
      usageRecorded: false,
    };
  }

  const usageKey = effect.oncePerTurnKey?.trim();

  if (
    usageKey &&
    hasUsedEffectThisTurn(state, usageKey)
  ) {
    return {
      success: false,
      state,
      effectId,
      registeredEffectId: effectId,
      stage: "precondition",
      completedCosts: 0,
      completedSteps: 0,
      totalCosts: effect.costs.length,
      totalSteps: effect.steps.length,
      errors: [
        `Effect usage "${usageKey}" has already been recorded this turn.`,
      ],
      warnings: [],
      usageRecorded: false,
    };
  }

  const execution = executeCardEffectWithSelections(
    state,
    effect,
    selections
  );

  if (!execution.success) {
    return {
      ...execution,
      registeredEffectId: effectId,
      usageRecorded: false,
    };
  }

  if (!usageKey) {
    return {
      ...execution,
      registeredEffectId: effectId,
      usageRecorded: false,
    };
  }

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
      registeredEffectId: effectId,
      usageRecorded: false,
    };
  }

  return {
    ...execution,
    state: usage.state,
    registeredEffectId: effectId,
    usageRecorded: true,
  };
}
