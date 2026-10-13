import type { Combo, ComboStep } from "../../models/combo/Combo";
import type { Deck } from "../../models/deck/Deck";
import type {
  ComboSimulationResult,
  GameAction,
  GameState,
  GameZone,
} from "../../models/simulation/GameState";

import {
  createGameState,
  cloneGameState,
  countCardInZone,
  executeGameAction,
  moveCard,
} from "./gameStateService";

import { validateCombo } from "../combo/comboValidationService";

function convertStep(
  step: ComboStep
): GameAction | null {
  const base = {
    id: step.id,
    cardId: step.cardId,
    description: step.description,
  };

  switch (step.action) {
    case "normal-summon":
      return {
        ...base,
        type: "normal-summon",
      };

    case "special-summon":
      return {
        ...base,
        type: "special-summon",
        from: "hand",
      };

    case "search":
    case "add-to-hand":
      return {
        ...base,
        type: "search",
      };

    case "send-to-graveyard":
      return {
        ...base,
        type: "move",
        from: "field",
        to: "graveyard",
      };

    case "banish":
      return {
        ...base,
        type: "move",
        from: "graveyard",
        to: "banished",
      };

    case "activate-effect":
      return {
        ...base,
        type: "activate-effect",
        effectKey: `${step.cardId}:${step.id}`,
        oncePerTurn: false,
      };

    default:
      return null;
  }
}

function prepareInitialState(
  combo: Combo,
  deck: Deck
): {
  state: GameState;
  errors: string[];
} {
  let state = createGameState(deck);
  const errors: string[] = [];

  const initialCards = [
    ...combo.starters,
    ...combo.requirements,
  ];

  for (const requirement of initialCards) {
    const target = requirement.zone as GameZone;

    if (target === "deck" || target === "extra") {
      const available = countCardInZone(
        state,
        target,
        requirement.cardId
      );

      if (available < requirement.quantity) {
        errors.push(
          `Card ${requirement.cardId}: insufficient copies in ${target}.`
        );
      }

      continue;
    }

    for (let i = 0; i < requirement.quantity; i++) {
      const source: GameZone =
        countCardInZone(
          state,
          "deck",
          requirement.cardId
        ) > 0
          ? "deck"
          : "extra";

      const moved = moveCard(
        state,
        requirement.cardId,
        source,
        target
      );

      if (!moved) {
        errors.push(
          `Cannot place Card ${requirement.cardId} in ${target}.`
        );
        break;
      }

      state = moved;
    }
  }

  return { state, errors };
}

export function simulateCombo(
  combo: Combo,
  deck: Deck
): ComboSimulationResult {
  const validation = validateCombo(combo, deck);
  const prepared = prepareInitialState(combo, deck);

  const initialState = cloneGameState(prepared.state);
  let state = prepared.state;

  const errors = [
    ...validation.errors,
    ...prepared.errors,
  ];

  const warnings = [
    ...validation.warnings,
    "This simulation does not verify card-specific effect legality.",
  ];

  const orderedSteps = [...combo.steps].sort(
    (a, b) => a.order - b.order
  );

  let completedSteps = 0;

  if (errors.length === 0) {
    for (const step of orderedSteps) {
      const action = convertStep(step);

      if (!action) {
        errors.push(
          `Step ${step.order}: unsupported action "${step.action}".`
        );
        break;
      }

      const result = executeGameAction(
        state,
        action
      );

      if (!result.success) {
        errors.push(
          `Step ${step.order}: ${result.error}`
        );
        break;
      }

      state = result.state;
      completedSteps++;
    }
  }

  // End-board entries represent required card copies.
  const endBoardCounts = new Map<number, number>();

  for (const id of combo.endBoardCardIds) {
    endBoardCounts.set(
      id,
      (endBoardCounts.get(id) ?? 0) + 1
    );
  }

  if (errors.length === 0) {
    for (const [id, quantity] of endBoardCounts) {
      if (
        countCardInZone(state, "field", id) < quantity
      ) {
        errors.push(
          `End board requires ${quantity} copy/copies of Card ${id} on the field.`
        );
      }
    }
  }

  return {
    success:
      errors.length === 0 &&
      completedSteps === orderedSteps.length,
    initialState,
    finalState: state,
    completedSteps,
    totalSteps: orderedSteps.length,
    errors,
    warnings,
  };
}
