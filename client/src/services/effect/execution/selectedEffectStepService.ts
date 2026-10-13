
import type {
  EffectStep,
} from "../../../models/CardEffect";

import type {
  GameState,
  GameZone,
} from "../../../models/GameState";

import type {
  CardInstanceSelection,
  CardSelectionContext,
} from "../../../models/CardSelection";

import {
  moveCardInstance,
  validateCardInstanceSync,
} from "../../simulation/cardInstanceService";

import {
  findAvailableFieldZone,
  isFieldSynchronized,
} from "../../simulation/field/fieldZoneService";

import {
  placeCardInstanceOnField,
  removeCardInstanceFromField,
} from "../../simulation/field/fieldInstanceService";

import {
  executeEffectStep,
  type EffectStepResult,
  type EffectStepsResult,
} from "./cardEffectStepService";

import {
  getSelectionForStep,
  validateCardSelection,
  validateSelectionContext,
} from "../../card/cardSelectionService";

function failure(
  state: GameState,
  error: string
): EffectStepResult {
  return {
    success: false,
    state,
    error,
  };
}

function moveSelectedInstance(
  state: GameState,
  instanceId: string,
  from: GameZone,
  to: GameZone
): EffectStepResult {
  if (from === to) {
    return failure(
      state,
      "Source and destination must differ."
    );
  }

  if (from === "field") {
    if (to === "field") {
      return failure(
        state,
        "Field-to-field movement is unsupported."
      );
    }

    const result = removeCardInstanceFromField(
      state,
      {
        instanceId,
        to: to as Exclude<GameZone, "field">,
      }
    );

    return result.success
      ? { success: true, state: result.state }
      : failure(
          state,
          result.error ?? "Field removal failed."
        );
  }

  if (to === "field") {
    return failure(
      state,
      "Use special-summon for field placement."
    );
  }

  const result = moveCardInstance(
    state,
    instanceId,
    to as Exclude<GameZone, "field">
  );

  return result.success
    ? { success: true, state: result.state }
    : failure(
        state,
        result.error ?? "Instance movement failed."
      );
}

/**
 * Execute one step using an optional explicit
 * physical-card selection.
 */
export function executeSelectedEffectStep(
  state: GameState,
  step: EffectStep,
  selection?: CardInstanceSelection
): EffectStepResult {
  if (!selection) {
    return executeEffectStep(state, step);
  }

  if (!state.cardInstances || !state.fieldState) {
    return failure(
      state,
      "Extended card-instance tracking is required."
    );
  }

  if (!isFieldSynchronized(state)) {
    return failure(
      state,
      "Field state is not synchronized."
    );
  }

  const syncErrors = validateCardInstanceSync(state);

  if (syncErrors.length > 0) {
    return failure(state, syncErrors.join(" "));
  }

  if (selection.kind === "cost") {
    return failure(
      state,
      "Cost selections cannot be used for resolution steps."
    );
  }

  // Drawing follows Deck order and does not
  // accept an arbitrary selected card.
  if (step.type === "draw") {
    return failure(
      state,
      "Draw steps do not accept explicit selections."
    );
  }

  if (
    step.type !== "search" &&
    step.type !== "move" &&
    step.type !== "special-summon" &&
    step.type !== "destroy"
  ) {
    return failure(
      state,
      "Unsupported selected effect step."
    );
  }

  const from: GameZone =
    step.type === "search"
      ? "deck"
      : step.type === "destroy"
        ? "field"
        : step.from;

  const validation = validateCardSelection(
    state,
    selection,
    step.cardId,
    from
  );

  if (!validation.valid || !validation.instance) {
    return failure(
      state,
      validation.error ?? "Invalid card selection."
    );
  }

  const instanceId = validation.instance.instanceId;

  switch (step.type) {
    case "search":
      return moveSelectedInstance(
        state,
        instanceId,
        "deck",
        "hand"
      );

    case "move":
      return moveSelectedInstance(
        state,
        instanceId,
        step.from,
        step.to
      );

    case "special-summon": {
      if (step.from === "field") {
        return failure(
          state,
          "Cannot Special Summon from the field."
        );
      }

      const zoneIndex = findAvailableFieldZone(
        state,
        "monster"
      );

      if (zoneIndex === null) {
        return failure(
          state,
          "No available Main Monster Zone."
        );
      }

      const result = placeCardInstanceOnField(
        state,
        {
          instanceId,
          zoneType: "monster",
          zoneIndex,
          position: "face-up-attack",
        }
      );

      return result.success
        ? { success: true, state: result.state }
        : failure(
            state,
            result.error ?? "Special Summon failed."
          );
    }

    case "destroy": {
      const inMonsterZone =
        state.fieldState.monsterZones.some(
          (slot) => slot?.instanceId === instanceId
        );

      if (!inMonsterZone) {
        return failure(
          state,
          "Selected instance is not in a Monster Zone."
        );
      }

      return moveSelectedInstance(
        state,
        instanceId,
        "field",
        "graveyard"
      );
    }
  }
}

/**
 * Execute a complete selected step sequence.
 *
 * The original state is returned if any
 * step or selection fails.
 */
export function executeSelectedEffectSteps(
  state: GameState,
  steps: EffectStep[],
  context: CardSelectionContext
): EffectStepsResult {
  const contextErrors = validateSelectionContext(
    context,
    steps.length
  );

  if (contextErrors.length > 0) {
    return {
      success: false,
      state,
      error: contextErrors.join(" "),
      completedSteps: 0,
      totalSteps: steps.length,
    };
  }

  let current = state;
  let completedSteps = 0;

  for (let index = 0; index < steps.length; index++) {
    const selection = getSelectionForStep(
      context,
      index
    );

    const result = executeSelectedEffectStep(
      current,
      steps[index],
      selection
    );

    if (!result.success) {
      return {
        success: false,
        state,
        error: result.error,
        completedSteps,
        totalSteps: steps.length,
      };
    }

    current = result.state;
    completedSteps++;
  }

  return {
    success: true,
    state: current,
    completedSteps,
    totalSteps: steps.length,
  };
}
