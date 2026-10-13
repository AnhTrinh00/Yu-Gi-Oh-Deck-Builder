import type {
  DuelPhase,
  GameRestriction,
  GameState,
} from "../../models/GameState";

import {
  normalizeGameState,
} from "./extendedGameStateService";

export interface TurnActionResult {
  success: boolean;
  state: GameState;
  error?: string;
}

function failure(
  state: GameState,
  error: string
): TurnActionResult {
  return { success: false, state, error };
}

function requireTurnState(
  state: GameState
): string | null {
  if (!state.turnState) {
    return "Turn state is not initialized.";
  }

  if (
    !state.effectUsage ||
    !state.restrictions
  ) {
    return "Turn restrictions are not initialized.";
  }

  return null;
}

/**
 * Checks whether an effect usage key has
 * already been recorded during this turn.
 */
export function hasUsedEffectThisTurn(
  state: GameState,
  usageKey: string
): boolean {
  if (!usageKey.trim()) return false;

  // Legacy usage records must remain authoritative
  // during the Phase 3 -> Phase 4 transition.
  if (state.usedEffects.includes(usageKey)) {
    return true;
  }

  if (!state.turnState) return false;

  return (
    state.effectUsage?.some(
      (record) =>
        record.usageKey === usageKey &&
        record.turnNumber ===
          state.turnState!.turnNumber
    ) ?? false
  );
}

/**
 * Records one effect usage for the current turn.
 *
 * This service does not execute card effects.
 */
export function recordEffectUsage(
  state: GameState,
  usageKey: string,
  cardInstanceId?: string
): TurnActionResult {
  const error = requireTurnState(state);

  if (error) return failure(state, error);

  if (!usageKey.trim()) {
    return failure(state, "Usage key cannot be empty.");
  }

  if (hasUsedEffectThisTurn(state, usageKey)) {
    return failure(
      state,
      "Effect has already been used this turn."
    );
  }

  if (
    cardInstanceId !== undefined &&
    !state.cardInstances?.instances.some(
      (instance) =>
        instance.instanceId === cardInstanceId
    )
  ) {
    return failure(
      state,
      "Card instance does not exist."
    );
  }

  const next = normalizeGameState(state);

  next.effectUsage!.push({
    usageKey,
    turnNumber: next.turnState!.turnNumber,
    cardInstanceId,
  });

  // Compatibility with the existing
  // Phase 3 once-per-turn usage representation.
  if (!next.usedEffects.includes(usageKey)) {
    next.usedEffects.push(usageKey);
  }

  return { success: true, state: next };
}

/**
 * Adds a descriptive game restriction.
 *
 * Enforcement of card-specific restrictions
 * will be implemented in the effect executor.
 */
export function addGameRestriction(
  state: GameState,
  restriction: GameRestriction
): TurnActionResult {
  const error = requireTurnState(state);

  if (error) return failure(state, error);

  if (!restriction.id.trim()) {
    return failure(state, "Restriction ID is required.");
  }

  if (
    state.restrictions!.some(
      (item) => item.id === restriction.id
    )
  ) {
    return failure(
      state,
      "Restriction ID already exists."
    );
  }

  const next = normalizeGameState(state);

  next.restrictions!.push({ ...restriction });

  return { success: true, state: next };
}

/**
 * Changes the current phase.
 *
 * This is a state-management primitive,
 * not a complete phase-transition validator.
 */
export function setDuelPhase(
  state: GameState,
  phase: DuelPhase
): TurnActionResult {
  const error = requireTurnState(state);

  if (error) return failure(state, error);

  const validPhases: DuelPhase[] = [
    "draw",
    "standby",
    "main1",
    "battle",
    "main2",
    "end",
  ];

  if (!validPhases.includes(phase)) {
    return failure(state, "Invalid duel phase.");
  }

  const next = normalizeGameState(state);
  next.turnState!.phase = phase;

  return { success: true, state: next };
}

/**
 * Advances the simplified turn model.
 *
 * This clears turn-scoped usage and
 * restrictions but does not implement
 * mandatory phase effects or priority.
 */
export function advanceTurn(
  state: GameState
): TurnActionResult {
  const error = requireTurnState(state);

  if (error) return failure(state, error);

  const next = normalizeGameState(state);

  next.turnState = {
    turnNumber: next.turnState!.turnNumber + 1,
    activePlayer:
      next.turnState!.activePlayer === "player"
        ? "opponent"
        : "player",
    phase: "draw",
  };

  next.normalSummonUsed = false;

  next.effectUsage = [];
  next.usedEffects = [];

  next.restrictions = next.restrictions!.filter(
    (restriction) =>
      !restriction.expiresAtTurnEnd
  );

  return { success: true, state: next };
}
