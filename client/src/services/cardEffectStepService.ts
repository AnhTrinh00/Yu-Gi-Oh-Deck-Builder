
import type {
  CardInstance,
  GameState,
  GameZone,
} from "../models/GameState";

import type {
  EffectStep,
} from "../models/CardEffect";

import {
  getInstancesInZone,
  moveCardInstance,
  validateCardInstanceSync,
} from "./cardInstanceService";

import {
  findAvailableFieldZone,
  isFieldSynchronized,
} from "./fieldZoneService";

import {
  placeCardInstanceOnField,
  removeCardInstanceFromField,
} from "./fieldInstanceService";

export interface EffectStepResult {
  success: boolean;
  state: GameState;
  error?: string;
}

export interface EffectStepsResult
  extends EffectStepResult {
  completedSteps: number;
  totalSteps: number;
}

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

function findUniqueInstance(
  state: GameState,
  zone: GameZone,
  cardId: number
): {
  instance?: CardInstance;
  error?: string;
} {
  const matches = getInstancesInZone(
    state,
    zone
  ).filter(
    (instance) => instance.cardId === cardId
  );

  if (matches.length === 0) {
    return {
      error: `Card ${cardId} is not in ${zone}.`,
    };
  }

  if (matches.length > 1) {
    return {
      error:
        `Multiple copies of Card ${cardId} ` +
        `exist in ${zone}; an instance selection is required.`,
    };
  }

  return { instance: matches[0] };
}

function moveNonFieldInstance(
  state: GameState,
  instanceId: string,
  to: Exclude<GameZone, "field">
): EffectStepResult {
  const result = moveCardInstance(
    state,
    instanceId,
    to
  );

  return result.success
    ? { success: true, state: result.state }
    : failure(
        state,
        result.error ?? "Card movement failed."
      );
}

function executeDraw(
  state: GameState,
  count: number
): EffectStepResult {
  if (!Number.isSafeInteger(count) || count <= 0) {
    return failure(
      state,
      "Draw count must be a positive integer."
    );
  }

  if (state.zones.deck.length < count) {
    return failure(
      state,
      "Not enough cards remain in the Deck."
    );
  }

  let current = state;

  for (let index = 0; index < count; index++) {
    const topCardId = current.zones.deck[0];

    const instance = getInstancesInZone(
      current,
      "deck"
    ).find(
      (item) => item.cardId === topCardId
    );

    if (!instance) {
      return failure(
        state,
        "The top Deck card has no tracked instance."
      );
    }

    const result = moveNonFieldInstance(
      current,
      instance.instanceId,
      "hand"
    );

    if (!result.success) {
      return failure(
        state,
        result.error ?? "Draw failed."
      );
    }

    current = result.state;
  }

  return {
    success: true,
    state: current,
  };
}

function executeSearch(
  state: GameState,
  cardId: number
): EffectStepResult {
  const selected = findUniqueInstance(
    state,
    "deck",
    cardId
  );

  if (!selected.instance) {
    return failure(
      state,
      selected.error ?? "Search failed."
    );
  }

  return moveNonFieldInstance(
    state,
    selected.instance.instanceId,
    "hand"
  );
}

function executeMove(
  state: GameState,
  cardId: number,
  from: GameZone,
  to: GameZone
): EffectStepResult {
  if (from === to) {
    return failure(
      state,
      "Source and destination must differ."
    );
  }

  const selected = findUniqueInstance(
    state,
    from,
    cardId
  );

  if (!selected.instance) {
    return failure(
      state,
      selected.error ?? "Move failed."
    );
  }

  if (from === "field") {
    if (to === "field") {
      return failure(
        state,
        "Field-to-field movement is not supported."
      );
    }

    const result = removeCardInstanceFromField(
      state,
      {
        instanceId: selected.instance.instanceId,
        to,
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
      "Use the special-summon step for field placement."
    );
  }

  return moveNonFieldInstance(
    state,
    selected.instance.instanceId,
    to
  );
}

function executeSpecialSummon(
  state: GameState,
  cardId: number,
  from: GameZone
): EffectStepResult {
  if (from === "field") {
    return failure(
      state,
      "Cannot Special Summon from the field."
    );
  }

  const selected = findUniqueInstance(
    state,
    from,
    cardId
  );

  if (!selected.instance) {
    return failure(
      state,
      selected.error ?? "Special Summon failed."
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
      instanceId: selected.instance.instanceId,
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

function executeDestroy(
  state: GameState,
  cardId: number
): EffectStepResult {
  const selected = findUniqueInstance(
    state,
    "field",
    cardId
  );

  if (!selected.instance) {
    return failure(
      state,
      selected.error ?? "Destroy failed."
    );
  }

  const occupiesMonsterZone =
    state.fieldState?.monsterZones.some(
      (slot) =>
        slot?.instanceId ===
        selected.instance!.instanceId
    ) ?? false;

  if (!occupiesMonsterZone) {
    return failure(
      state,
      "This destroy step supports Monster Zones only."
    );
  }

  const result = removeCardInstanceFromField(
    state,
    {
      instanceId: selected.instance.instanceId,
      to: "graveyard",
    }
  );

  return result.success
    ? { success: true, state: result.state }
    : failure(
        state,
        result.error ?? "Destroy failed."
      );
}

/**
 * Executes one structured effect step.
 *
 * These are state transitions, not complete
 * Yu-Gi-Oh! effect-legality checks.
 */
export function executeEffectStep(
  state: GameState,
  step: EffectStep
): EffectStepResult {
  if (!state.cardInstances || !state.fieldState) {
    return failure(
      state,
      "Extended instance tracking is required."
    );
  }

  if (!isFieldSynchronized(state)) {
    return failure(
      state,
      "Field state is not synchronized."
    );
  }

  const errors = validateCardInstanceSync(state);

  if (errors.length > 0) {
    return failure(state, errors.join(" "));
  }

  switch (step.type) {
    case "draw":
      return executeDraw(state, step.count);

    case "search":
      return executeSearch(state, step.cardId);

    case "move":
      return executeMove(
        state,
        step.cardId,
        step.from,
        step.to
      );

    case "special-summon":
      return executeSpecialSummon(
        state,
        step.cardId,
        step.from
      );

    case "destroy":
      return executeDestroy(state, step.cardId);

    default:
      return failure(
        state,
        "Unsupported effect step."
      );
  }
}

/**
 * Executes a sequence atomically.
 *
 * On failure, returns the original state
 * rather than a partially modified state.
 */
export function executeEffectSteps(
  state: GameState,
  steps: EffectStep[]
): EffectStepsResult {
  let current = state;
  let completedSteps = 0;

  for (const step of steps) {
    const result = executeEffectStep(
      current,
      step
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
