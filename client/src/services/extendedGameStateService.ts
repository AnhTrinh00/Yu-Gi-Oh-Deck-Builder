import type { Deck } from "../models/Deck";

import type {
  FieldState,
  GameState,
  TurnState,
  EffectUsageRecord,
  GameRestriction,
  CardInstanceState
} from "../models/GameState";

import {
  createGameState,
  cloneGameState,
} from "./gameStateService";

export function createEmptyFieldState(): FieldState {
  return {
    monsterZones: Array(5).fill(null),
    spellTrapZones: Array(5).fill(null),
    fieldSpellZone: null,
  };
}

export function createInitialTurnState(): TurnState {
  return {
    turnNumber: 1,
    activePlayer: "player",
    phase: "main1",
  };
}

/**
 * Creates a Phase 4 state using the existing
 * Phase 3 deck initialization.
 *
 * The legacy zone arrays remain authoritative
 * until zone synchronization is introduced.
 */
export function createExtendedGameState(
  deck: Deck
): GameState {
  const state = createGameState(deck);

  return {
    ...state,
    fieldState: createEmptyFieldState(),
    turnState: createInitialTurnState(),
    effectUsage: [],
    restrictions: [],
    xyzMaterials: [],
  };
}

function cloneCardInstanceState(
  instances: CardInstanceState
): CardInstanceState {
  return {
    nextInstanceNumber: instances.nextInstanceNumber,
    instances: instances.instances.map(
      (instance) => ({ ...instance })
    ),
  };
}

/**
 * Upgrades an existing state to include
 * Phase 4 metadata.
 *
 * This function does not mutate its input.
 */
export function normalizeGameState(
  state: GameState
): GameState {
  const cloned = cloneGameState(state);
  const next = cloneGameState(state);

  return {
    ...cloned,
    ...next,

    fieldState: state.fieldState
      ? {
          monsterZones: state.fieldState.monsterZones.map(
            (slot) => (slot ? { ...slot } : null)
          ),
          spellTrapZones: state.fieldState.spellTrapZones.map(
            (slot) => (slot ? { ...slot } : null)
          ),
          fieldSpellZone: state.fieldState.fieldSpellZone
            ? { ...state.fieldState.fieldSpellZone }
            : null,
        }
      : createEmptyFieldState(),

    turnState: state.turnState
      ? { ...state.turnState }
      : createInitialTurnState(),

    effectUsage: state.effectUsage
      ? state.effectUsage.map(
          (usage): EffectUsageRecord => ({ ...usage })
        )
      : [],

    restrictions: state.restrictions
      ? state.restrictions.map(
          (restriction): GameRestriction => ({
            ...restriction,
          })
        )
      : [],

    cardInstances: state.cardInstances
      ? cloneCardInstanceState(state.cardInstances)
      : undefined,

    xyzMaterials: state.xyzMaterials?.map(attachment => ({
      xyzInstanceId: attachment.xyzInstanceId,
      materialInstanceIds: [
        ...attachment.materialInstanceIds,
      ],
    })) ?? [],
  };
}

/**
 * Checks whether all Phase 4 extension
 * fields are initialized.
 *
 * This does not establish gameplay legality
 * or synchronization with legacy zones.
 */
export function hasExtendedGameState(
  state: GameState
): boolean {
  return (
    state.fieldState !== undefined &&
    state.turnState !== undefined &&
    state.effectUsage !== undefined &&
    state.restrictions !== undefined
  );
}
