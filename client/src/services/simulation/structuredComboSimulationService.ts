
import type {
  GameState,
} from "../../models/GameState";

import type {
  StructuredComboAction,
  StructuredComboOptions,
  StructuredComboResult,
  StructuredComboStepResult,
} from "../../models/StructuredCombo";

import {
  validateCardInstanceSync,
} from "./cardInstanceService";

import {
  isFieldSynchronized,
} from "./field/fieldZoneService";

import {
  executeRegisteredEffect,
  type EffectRegistryReader,
} from "../effect/registeredEffectExecutionService";

import {
  executeRegisteredEffectWithSelections,
} from "../effect/selection/registeredEffectSelectionService";

export interface StructuredComboSimulationResult
  extends StructuredComboResult {
  initialState: GameState;
  finalState: GameState;
}

function getStateErrors(
  state: GameState
): string[] {
  const errors: string[] = [];

  if (!state.cardInstances || !state.fieldState) {
    errors.push(
      "Extended card-instance tracking is required."
    );

    return errors;
  }

  if (!state.turnState || !state.effectUsage) {
    errors.push(
      "Extended turn tracking is required."
    );
  }

  if (!isFieldSynchronized(state)) {
    errors.push(
      "Field state is not synchronized."
    );
  }

  errors.push(...validateCardInstanceSync(state));

  return errors;
}

/**
 * Simulates a sequence of registered card effects.
 *
 * stop-on-failure:
 *   Keeps all previously completed actions.
 *
 * atomic:
 *   Returns the original state if any action fails.
 *
 * Both modes stop at the first failed action.
 */
export function simulateStructuredCombo(
  initialState: GameState,
  actions: StructuredComboAction[],
  registry: EffectRegistryReader,
  options: StructuredComboOptions = {}
): StructuredComboSimulationResult {
  const failureMode =
    options.failureMode ?? "stop-on-failure";

  const initialErrors = getStateErrors(
    initialState
  );

  if (initialErrors.length > 0) {
    return {
      success: false,
      initialState,
      finalState: initialState,
      completedActions: 0,
      totalActions: actions.length,
      errors: initialErrors,
      steps: [],
    };
  }

  let current = initialState;

  const steps: StructuredComboStepResult[] = [];
  const errors: string[] = [];

  for (
    let index = 0;
    index < actions.length;
    index++
  ) {
    const action = actions[index];

    const result = action.selections
      ? executeRegisteredEffectWithSelections(
          current,
          registry,
          action.effectId,
          action.selections
        )
      : executeRegisteredEffect(
          current,
          registry,
          action.effectId
        );

    if (!result.success) {
      const error =
        result.errors.join(" ") ||
        "Registered effect execution failed.";

      steps.push({
        actionId: action.id,
        effectId: action.effectId,
        success: false,
        error,
      });

      errors.push(
        `Action ${index + 1} (${action.id}): ${error}`
      );

      return {
        success: false,
        initialState,
        finalState:
          failureMode === "atomic"
            ? initialState
            : current,
        completedActions: index,
        totalActions: actions.length,
        failedActionIndex: index,
        errors,
        steps,
      };
    }

    const syncErrors = getStateErrors(
      result.state
    );

    if (syncErrors.length > 0) {
      const error = syncErrors.join(" ");

      steps.push({
        actionId: action.id,
        effectId: action.effectId,
        success: false,
        error,
      });

      errors.push(
        `Action ${index + 1} (${action.id}): ${error}`
      );

      return {
        success: false,
        initialState,
        finalState:
          failureMode === "atomic"
            ? initialState
            : current,
        completedActions: index,
        totalActions: actions.length,
        failedActionIndex: index,
        errors,
        steps,
      };
    }

    current = result.state;

    steps.push({
      actionId: action.id,
      effectId: action.effectId,
      success: true,
    });
  }

  return {
    success: true,
    initialState,
    finalState: current,
    completedActions: actions.length,
    totalActions: actions.length,
    errors: [],
    steps,
  };
}
