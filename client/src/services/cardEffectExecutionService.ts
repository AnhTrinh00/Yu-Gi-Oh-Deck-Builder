
import type {
  CardEffectDefinition,
  EffectCost,
  EffectStep,
} from "../models/CardEffect";

import type {
  GameState,
} from "../models/GameState";

import {
  validateCardEffect,
} from "./cardEffectValidationService";

import {
  validateCardInstanceSync,
} from "./cardInstanceService";

import {
  isFieldSynchronized,
} from "./fieldZoneService";

import {
  executeEffectStep,
} from "./cardEffectStepService";

export type EffectExecutionStage =
  | "precondition"
  | "cost"
  | "resolution"
  | "complete";

export interface CardEffectExecutionResult {
  success: boolean;
  state: GameState;
  effectId: string;
  stage: EffectExecutionStage;
  completedCosts: number;
  completedSteps: number;
  totalCosts: number;
  totalSteps: number;
  errors: string[];
  warnings: string[];
}

function failedResult(
  original: GameState,
  effect: CardEffectDefinition,
  stage: EffectExecutionStage,
  completedCosts: number,
  completedSteps: number,
  errors: string[],
  warnings: string[]
): CardEffectExecutionResult {
  return {
    success: false,
    state: original,
    effectId: effect.id,
    stage,
    completedCosts,
    completedSteps,
    totalCosts: effect.costs.length,
    totalSteps: effect.steps.length,
    errors,
    warnings,
  };
}

/**
 * Converts a supported cost into a movement step.
 *
 * This deliberately supports only movements
 * that the Phase 4.3.1 executor can represent.
 */
function costToStep(
  cost: EffectCost
): EffectStep | null {
  if (cost.type !== "move-card") {
    return null;
  }

  // Field placement requires additional
  // card-type and placement rules.
  if (cost.to === "field") {
    return null;
  }

  return {
    type: "move",
    cardId: cost.cardId,
    from: cost.from,
    to: cost.to,
  };
}

/**
 * Executes a declared card effect using
 * deterministic, instance-aware state changes.
 *
 * The input state is never mutated.
 *
 * If any operation fails, the original state
 * is returned, including previously paid costs.
 *
 * This is a simplified simulation transaction,
 * not a complete Yu-Gi-Oh! resolution engine.
 */
export function executeCardEffect(
  state: GameState,
  effect: CardEffectDefinition
): CardEffectExecutionResult {
  const warnings: string[] = [];

  // Phase 4.3.1 requires tracked instances
  // and an initialized field representation.
  if (!state.cardInstances || !state.fieldState) {
    return failedResult(
      state,
      effect,
      "precondition",
      0,
      0,
      ["Extended card-instance tracking is required."],
      warnings
    );
  }

  if (!isFieldSynchronized(state)) {
    return failedResult(
      state,
      effect,
      "precondition",
      0,
      0,
      ["Field state is not synchronized."],
      warnings
    );
  }

  const syncErrors = validateCardInstanceSync(state);

  if (syncErrors.length > 0) {
    return failedResult(
      state,
      effect,
      "precondition",
      0,
      0,
      syncErrors,
      warnings
    );
  }

  // 1. Validate declared activation conditions.
  const validation = validateCardEffect(
    state,
    effect
  );

  warnings.push(...validation.warnings);

  if (!validation.valid) {
    return failedResult(
      state,
      effect,
      "precondition",
      0,
      0,
      validation.errors,
      warnings
    );
  }

  // Refuse unsupported costs before making
  // any simulated changes.
  const costSteps: EffectStep[] = [];

  for (const cost of effect.costs) {
    const step = costToStep(cost);

    if (!step) {
      return failedResult(
        state,
        effect,
        "cost",
        0,
        0,
        ["Unsupported effect cost movement."],
        warnings
      );
    }

    costSteps.push(step);
  }

  // 2. Pay costs against a working state.
  let current = state;
  let completedCosts = 0;
  let completedSteps = 0;

  for (const step of costSteps) {
    const result = executeEffectStep(
      current,
      step
    );

    if (!result.success) {
      return failedResult(
        state,
        effect,
        "cost",
        completedCosts,
        0,
        [result.error ?? "Cost payment failed."],
        warnings
      );
    }

    current = result.state;
    completedCosts++;
  }

  // 3. Resolve the effect against the state
  // produced by cost payment.
  for (const step of effect.steps) {
    const result = executeEffectStep(
      current,
      step
    );

    if (!result.success) {
      return failedResult(
        state,
        effect,
        "resolution",
        completedCosts,
        completedSteps,
        [result.error ?? "Effect resolution failed."],
        warnings
      );
    }

    current = result.state;
    completedSteps++;
  }

  // 4. Verify the resulting state.
  const finalErrors = validateCardInstanceSync(
    current
  );

  if (
    !isFieldSynchronized(current) ||
    finalErrors.length > 0
  ) {
    return failedResult(
      state,
      effect,
      "resolution",
      completedCosts,
      completedSteps,
      [
        ...finalErrors,
        ...(!isFieldSynchronized(current)
          ? ["Final field state is not synchronized."]
          : []),
      ],
      warnings
    );
  }

  return {
    success: true,
    state: current,
    effectId: effect.id,
    stage: "complete",
    completedCosts,
    completedSteps,
    totalCosts: effect.costs.length,
    totalSteps: effect.steps.length,
    errors: [],
    warnings,
  };
}
