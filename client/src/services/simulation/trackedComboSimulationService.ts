
import type { Combo } from "../../models/Combo";
import type { Deck } from "../../models/Deck";
import type {
  ComboSimulationResult,
  GameState,
  GameZone,
  GameAction,
} from "../../models/GameState";

import {
  createExtendedGameState,
  normalizeGameState,
} from "./extendedGameStateService";

import {
  initializeCardInstances,
  moveCardInstance,
  validateCardInstanceSync,
} from "./cardInstanceService";

import {
  placeCardInstanceOnField,
  removeCardInstanceFromField,
} from "./field/fieldInstanceService";

import { findAvailableFieldZone, isFieldSynchronized } from "./field/fieldZoneService";
import { validateCombo } from "../combo/comboValidationService";

function findInstance(
  state: GameState,
  cardId: number,
  zone: GameZone
) {
  return state.cardInstances?.instances.find(
    (item) => item.cardId === cardId && item.zone === zone
  );
}

function transfer(
  state: GameState,
  cardId: number,
  from: GameZone,
  to: GameZone
): GameState | null {
  const instance = findInstance(state, cardId, from);

  if (!instance || from === to) return null;

  if (to === "field") {
    const zoneIndex = findAvailableFieldZone(
      state,
      "monster"
    );

    if (zoneIndex === null) {
      return null;
    }

    const result = placeCardInstanceOnField(state, {
      instanceId: instance.instanceId,
      zoneType: "monster",
      zoneIndex,
      position: "face-up-attack",
    });

    return result.success ? result.state : null;
  }

  if (from === "field") {
    const result = removeCardInstanceFromField(state, {
      instanceId: instance.instanceId,
      to: to as Exclude<GameZone, "field">,
    });

    return result.success ? result.state : null;
  }

  const result = moveCardInstance(
    state,
    instance.instanceId,
    to as Exclude<GameZone, "field">
  );

  return result.success ? result.state : null;
}

/**
 * Replay saved combo steps using synchronized card instances.
 *
 * This is still a simplified simulation:
 * it does not validate complete card-specific effects,
 * summon conditions, or full Yu-Gi-Oh! legality.
 */
export function simulateTrackedCombo(
  combo: Combo,
  deck: Deck
): ComboSimulationResult {
  const validation = validateCombo(combo, deck);

  const initialized = initializeCardInstances(
    createExtendedGameState(deck)
  );

  const errors = [...validation.errors];

  const warnings = [
    ...validation.warnings,
    "Simplified actions do not verify card-specific effect legality or full summoning requirements.",
  ];

  if (!initialized.success) {
    errors.push(
      initialized.error ?? "Could not initialize card instances."
    );
  }

  let state = initialized.state;

  // Prepare the required opening cards.
  for (const requirement of [
    ...combo.starters,
    ...combo.requirements,
  ]) {
    const target = requirement.zone as GameZone;

    if (target === "deck" || target === "extra") {
      const count = state.zones[target].filter(
        (id) => id === requirement.cardId
      ).length;

      if (count < requirement.quantity) {
        errors.push(
          `Card ${requirement.cardId}: insufficient copies in ${target}.`
        );
      }

      continue;
    }

    for (let i = 0; i < requirement.quantity; i++) {
      const source = findInstance(
        state,
        requirement.cardId,
        "deck"
      )
        ? "deck"
        : "extra";

      const moved = transfer(
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

  const initialState = normalizeGameState(state);
  let completedSteps = 0;

  const orderedSteps = [...combo.steps].sort(
    (a, b) => a.order - b.order
  );

  if (errors.length === 0) {
    for (const step of orderedSteps) {
      let from: GameZone | null = null;
      let to: GameZone | null = null;
      let action: GameAction | null = null;

      switch (step.action) {
        case "normal-summon":
          if (state.normalSummonUsed) {
            errors.push(
              `Step ${step.order}: Normal Summon already used.`
            );
            break;
          }

          from = "hand";
          to = "field";

          action = {
            id: step.id,
            type: "normal-summon",
            cardId: step.cardId,
            description: step.description,
          };
          break;

        case "special-summon":
          from = "hand";
          to = "field";

          action = {
            id: step.id,
            type: "special-summon",
            cardId: step.cardId,
            from,
            description: step.description,
          };
          break;

        case "search":
        case "add-to-hand":
          from = "deck";
          to = "hand";

          action = {
            id: step.id,
            type: "search",
            cardId: step.cardId,
            description: step.description,
          };
          break;

        case "send-to-graveyard":
          from = "field";
          to = "graveyard";

          action = {
            id: step.id,
            type: "move",
            cardId: step.cardId,
            from,
            to,
            description: step.description,
          };
          break;

        case "banish":
          from = "graveyard";
          to = "banished";

          action = {
            id: step.id,
            type: "move",
            cardId: step.cardId,
            from,
            to,
            description: step.description,
          };
          break;

        case "activate-effect": {
          const key = `${step.cardId}:${step.id}`;

          if (!findInstance(state, step.cardId, "field")) {
            errors.push(
              `Step ${step.order}: Card ${step.cardId} is not on the field.`
            );
            break;
          }

          const next = normalizeGameState(state);

          next.actionHistory.push({
            id: step.id,
            type: "activate-effect",
            cardId: step.cardId,
            effectKey: key,
            oncePerTurn: false,
            description: step.description,
          });

          state = next;
          completedSteps++;
          continue;
        }

        default:
          errors.push(
            `Step ${step.order}: unsupported action "${step.action}".`
          );
      }

      if (errors.length > 0) break;
      if (!from || !to || !action) break;

      const next = transfer(
        state,
        step.cardId,
        from,
        to
      );

      if (!next) {
        errors.push(
          `Step ${step.order}: cannot move Card ${step.cardId} from ${from} to ${to}.`
        );
        break;
      }

      if (step.action === "normal-summon") {
        next.normalSummonUsed = true;
      }

      next.actionHistory.push(action);
      state = next;
      completedSteps++;
    }
  }

  // Verify the required end board.
  if (errors.length === 0) {
    const required = new Map<number, number>();

    for (const id of combo.endBoardCardIds) {
      required.set(id, (required.get(id) ?? 0) + 1);
    }

    for (const [id, count] of required) {
      const actual = state.zones.field.filter(
        (value) => value === id
      ).length;

      if (actual < count) {
        errors.push(
          `End board requires ${count} copy/copies of Card ${id} on the field.`
        );
      }
    }
  }

  if (!isFieldSynchronized(state)) {
    errors.push("Final field state is not synchronized.");
  }

  errors.push(...validateCardInstanceSync(state));

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
