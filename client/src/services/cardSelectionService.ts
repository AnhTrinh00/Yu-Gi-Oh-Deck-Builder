
import type {
  CardInstance,
  GameState,
  GameZone,
} from "../models/GameState";

import type {
  CardInstanceSelection,
  CardSelectionContext,
} from "../models/CardSelection";

import {
  getCardInstance,
} from "./cardInstanceService";

export interface CardSelectionResult {
  valid: boolean;
  instance?: CardInstance;
  error?: string;
}

export function validateCardSelection(
  state: GameState,
  selection: CardInstanceSelection,
  expectedCardId: number,
  expectedZone: GameZone
): CardSelectionResult {
  if (
    !Number.isSafeInteger(selection.stepIndex) ||
    selection.stepIndex < 0
  ) {
    return {
      valid: false,
      error: "Selection step index is invalid.",
    };
  }

  if (
    !["target", "choose", "cost"].includes(
      selection.kind
    )
  ) {
    return {
      valid: false,
      error: "Selection kind is invalid.",
    };
  }

  if (!state.cardInstances) {
    return {
      valid: false,
      error: "Card instance tracking is required.",
    };
  }

  const instance = getCardInstance(
    state,
    selection.instanceId
  );

  if (!instance) {
    return {
      valid: false,
      error: "Selected card instance does not exist.",
    };
  }

  if (instance.cardId !== expectedCardId) {
    return {
      valid: false,
      error: "Selected instance has the wrong card ID.",
    };
  }

  if (instance.zone !== expectedZone) {
    return {
      valid: false,
      error: "Selected instance is in the wrong zone.",
    };
  }

  if (
    selection.expectedZone !== undefined &&
    selection.expectedZone !== expectedZone
  ) {
    return {
      valid: false,
      error: "Selection expected zone does not match the step.",
    };
  }

  return {
    valid: true,
    instance,
  };
}

export function getSelectionForStep(
  context: CardSelectionContext,
  stepIndex: number
): CardInstanceSelection | undefined {
  return context.selections.find(
    (selection) =>
      selection.stepIndex === stepIndex
  );
}

export function validateSelectionContext(
  context: CardSelectionContext,
  totalSteps: number
): string[] {
  const errors: string[] = [];
  const usedIndexes = new Set<number>();

  for (const selection of context.selections) {
    if (
      !Number.isSafeInteger(selection.stepIndex) ||
      selection.stepIndex < 0 ||
      selection.stepIndex >= totalSteps
    ) {
      errors.push(
        `Selection step index ${selection.stepIndex} is out of range.`
      );
    }

    if (usedIndexes.has(selection.stepIndex)) {
      errors.push(
        `Duplicate selection for step ${selection.stepIndex}.`
      );
    }

    usedIndexes.add(selection.stepIndex);
  }

  return errors;
}
