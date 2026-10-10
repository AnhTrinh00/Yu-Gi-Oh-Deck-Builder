
import type {
  CardEffectDefinition,
  EffectCost,
  EffectStep,
} from "../models/CardEffect";

import type {
  GameState,
} from "../models/GameState";

import type {
  EffectExecutionSelections,
} from "../models/EffectExecutionSelection";

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
  validateSelectionContext,
  getSelectionForStep,
} from "./cardSelectionService";

import {
  executeSelectedEffectStep,
} from "./selectedEffectStepService";

import type {
  CardEffectExecutionResult,
  EffectExecutionStage,
} from "./cardEffectExecutionService";

function fail(
  original: GameState,
  effect: CardEffectDefinition,
  stage: EffectExecutionStage,
  completedCosts: number,
  completedSteps: number,
  errors: string[],
  warnings: string[] = []
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
 * Converts a supported movement cost into
 * a step executable by the selection engine.
 */
function convertCost(
  cost: EffectCost
): EffectStep | null {
  if (cost.type !== "move-card") {
    return null;
  }

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
 * Executes one complete effect transaction.
 *
 * The transaction supports explicit selections
 * for costs and resolution steps.
 *
 * A failure returns the original input state.
 */
export function executeCardEffectWithSelections(
  state: GameState,
  effect: CardEffectDefinition,
  selections: EffectExecutionSelections
): CardEffectExecutionResult {
  const warnings: string[] = [];

  if (!state.cardInstances || !state.fieldState) {
    return fail(
      state,
      effect,
      "precondition",
      0,
      0,
      ["Extended card-instance tracking is required."]
    );
  }

  if (!isFieldSynchronized(state)) {
    return fail(
      state,
      effect,
      "precondition",
      0,
      0,
      ["Field state is not synchronized."]
    );
  }

  const syncErrors = validateCardInstanceSync(state);

  if (syncErrors.length > 0) {
    return fail(
      state,
      effect,
      "precondition",
      0,
      0,
      syncErrors
    );
  }

  const validation = validateCardEffect(
    state,
    effect
  );

  warnings.push(...validation.warnings);

  if (!validation.valid) {
    return fail(
      state,
      effect,
      "precondition",
      0,
      0,
      validation.errors,
      warnings
    );
  }

  const costErrors = validateSelectionContext(
    { selections: selections.costSelections },
    effect.costs.length
  );

  const resolutionErrors = validateSelectionContext(
    { selections: selections.resolutionSelections },
    effect.steps.length
  );

  for (const selection of selections.costSelections) {
    if (selection.kind !== "cost") {
      costErrors.push(
        `Cost selection ${selection.stepIndex} must have kind "cost".`
      );
    }
  }

  for (const selection of selections.resolutionSelections) {
    if (selection.kind === "cost") {
      resolutionErrors.push(
        `Resolution selection ${selection.stepIndex} cannot have kind "cost".`
      );
    }
  }

  const selectionErrors = [
    ...costErrors,
    ...resolutionErrors,
  ];

  if (selectionErrors.length > 0) {
    return fail(
      state,
      effect,
      "precondition",
      0,
      0,
      selectionErrors,
      warnings
    );
  }

  // Reject unsupported costs before changing
  // the working state.
  const costSteps: EffectStep[] = [];

  for (const cost of effect.costs) {
    const step = convertCost(cost);

    if (!step) {
      return fail(
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

  let current = state;
  let completedCosts = 0;
  let completedSteps = 0;

  // Cost selections are represented as ordinary
  // selections for the movement executor.
  //
  // Their "cost" classification is validated
  // above; the executor receives "choose"
  // because it is performing the movement,
  // not determining activation semantics.
  for (let index = 0; index < costSteps.length; index++) {
    const selection = getSelectionForStep(
      { selections: selections.costSelections },
      index
    );

    const movementSelection = selection
      ? { ...selection, kind: "choose" as const }
      : undefined;

    const result = executeSelectedEffectStep(
      current,
      costSteps[index],
      movementSelection
    );

    if (!result.success) {
      return fail(
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

  // Resolve the effect using the state
  // produced by cost payment.
  for (let index = 0; index < effect.steps.length; index++) {
    const selection = getSelectionForStep(
      { selections: selections.resolutionSelections },
      index
    );

    const result = executeSelectedEffectStep(
      current,
      effect.steps[index],
      selection
    );

    if (!result.success) {
      return fail(
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

  const finalErrors = validateCardInstanceSync(
    current
  );

  if (!isFieldSynchronized(current)) {
    finalErrors.push(
      "Final field state is not synchronized."
    );
  }

  if (finalErrors.length > 0) {
    return fail(
      state,
      effect,
      "resolution",
      completedCosts,
      completedSteps,
      finalErrors,
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
