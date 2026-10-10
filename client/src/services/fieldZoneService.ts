
import type {
  FieldState,
  GameState,
  GameZone,
  MonsterPosition,
  SpellTrapPosition,
  MonsterZoneSlot,
  SpellTrapZoneSlot
} from "../models/GameState";

import {
  normalizeGameState,
} from "./extendedGameStateService";

export type FieldZoneType =
  | "monster"
  | "spell-trap"
  | "field-spell";

export interface FieldZoneResult {
  success: boolean;
  state: GameState;
  error?: string;
  instanceId?: string;
}

interface PlaceCardOptions {
  cardId: number;
  from: Exclude<GameZone, "field">;
  zoneType: FieldZoneType;
  zoneIndex?: number;
  instanceId: string;
  position?: MonsterPosition | SpellTrapPosition;
}

interface RemoveCardOptions {
  zoneType: FieldZoneType;
  zoneIndex?: number;
  to: Exclude<GameZone, "field">;
}

function failure(
  state: GameState,
  error: string
): FieldZoneResult {
  return {
    success: false,
    state,
    error,
  };
}

function validCardId(cardId: number): boolean {
  return Number.isSafeInteger(cardId) && cardId > 0;
}

function validIndex(
  index: number | undefined,
  length: number
): index is number {
  return (
    index !== undefined &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < length
  );
}

function getSlots(
  field: FieldState,
  zoneType: FieldZoneType
) {
  if (zoneType === "monster") {
    return field.monsterZones;
  }

  if (zoneType === "spell-trap") {
    return field.spellTrapZones;
  }

  return null;
}

function instanceExists(
  field: FieldState,
  instanceId: string
): boolean {
  return [
    ...field.monsterZones,
    ...field.spellTrapZones,
    field.fieldSpellZone,
  ].some((slot) => slot?.instanceId === instanceId);
}

/**
 * Checks that the extended field contains
 * exactly the same card IDs as legacy zones.field.
 *
 * Order is irrelevant; duplicate quantities matter.
 */
export function isFieldSynchronized(
  state: GameState
): boolean {
  if (!state.fieldState) {
    return state.zones.field.length === 0;
  }

  const field = state.fieldState;

  const extendedIds = [
    ...field.monsterZones,
    ...field.spellTrapZones,
    field.fieldSpellZone,
  ]
    .filter((slot) => slot !== null)
    .map((slot) => slot.cardId)
    .sort((a, b) => a - b);

  const legacyIds = [...state.zones.field].sort(
    (a, b) => a - b
  );

  return (
    JSON.stringify(extendedIds) ===
    JSON.stringify(legacyIds)
  );
}

/**
 * Places an existing card into a field zone.
 *
 * This is a low-level movement operation.
 * It does not validate card type, summoning
 * conditions, activation rules, or effects.
 */
export function placeCardOnField(
  state: GameState,
  options: PlaceCardOptions
): FieldZoneResult {
  const {
    cardId,
    from,
    zoneType,
    zoneIndex,
    instanceId,
  } = options;

  if (!validCardId(cardId)) {
    return failure(state, "Invalid card ID.");
  }

  if (!instanceId.trim()) {
    return failure(state, "Instance ID is required.");
  }

  if (!isFieldSynchronized(state)) {
    return failure(
      state,
      "Field state is not synchronized."
    );
  }

  if (!state.zones[from].includes(cardId)) {
    return failure(
      state,
      `Card ${cardId} is not in ${from}.`
    );
  }

  const next = normalizeGameState(state);
  const field = next.fieldState!;

  if (instanceExists(field, instanceId)) {
    return failure(
      state,
      `Instance ${instanceId} already exists on the field.`
    );
  }

  const slots = getSlots(field, zoneType);

  if (zoneType === "field-spell") {
    if (field.fieldSpellZone !== null) {
      return failure(
        state,
        "Field Spell Zone is occupied."
      );
    }

    if (
      options.position !== undefined &&
      options.position !== "face-up" &&
      options.position !== "face-down"
    ) {
      return failure(state, "Invalid Spell/Trap position.");
    }

    field.fieldSpellZone = {
      cardId,
      instanceId,
      position:
        (options.position as SpellTrapPosition | undefined) ??
        "face-up",
    };
  } else {
    if (
      !slots ||
      !validIndex(zoneIndex, slots.length)
    ) {
      return failure(state, "Invalid field zone index.");
    }

    if (slots[zoneIndex] !== null) {
      return failure(state, "Field zone is occupied.");
    }

    if (zoneType === "monster") {
      const position =
        options.position ?? "face-up-attack";

      if (
        position !== "face-up-attack" &&
        position !== "face-up-defense" &&
        position !== "face-down-defense"
      ) {
        return failure(state, "Invalid monster position.");
      }

      field.monsterZones[zoneIndex] = {
        cardId,
        instanceId,
        position,
      };
    } else {
      const position =
        options.position ?? "face-down";

      if (
        position !== "face-up" &&
        position !== "face-down"
      ) {
        return failure(
          state,
          "Invalid Spell/Trap position."
        );
      }

      field.spellTrapZones[zoneIndex] = {
        cardId,
        instanceId,
        position,
      };
    }
  }

  const sourceIndex =
    next.zones[from].indexOf(cardId);

  next.zones[from].splice(sourceIndex, 1);
  next.zones.field.push(cardId);

  return {
    success: true,
    state: next,
    instanceId,
  };
}

/**
 * Removes a card from a specific field zone
 * and transfers it to another legacy zone.
 */
export function removeCardFromField(
  state: GameState,
  options: RemoveCardOptions
): FieldZoneResult {
  if (!isFieldSynchronized(state)) {
    return failure(
      state,
      "Field state is not synchronized."
    );
  }

  const next = normalizeGameState(state);
  const field = next.fieldState!;

  const {
    zoneType,
    zoneIndex,
    to,
  } = options;

  let slot:
    | MonsterZoneSlot
    | SpellTrapZoneSlot
    | null
    | undefined;

  if (zoneType === "field-spell") {
    slot = field.fieldSpellZone;

    if (!slot) {
      return failure(
        state,
        "Field Spell Zone is empty."
      );
    }

    field.fieldSpellZone = null;
  } else {
    const slots = getSlots(field, zoneType);

    if (
      !slots ||
      !validIndex(zoneIndex, slots.length)
    ) {
      return failure(
        state,
        "Invalid field zone index."
      );
    }

    slot = slots[zoneIndex];

    if (!slot) {
      return failure(
        state,
        "Field zone is empty."
      );
    }

    if (zoneType === "monster") {
      field.monsterZones[zoneIndex] = null;
    } else {
      field.spellTrapZones[zoneIndex] = null;
    }
  }

  const legacyIndex =
    next.zones.field.indexOf(slot.cardId);

  if (legacyIndex === -1) {
    return failure(
      state,
      "Card is missing from legacy field."
    );
  }

  next.zones.field.splice(legacyIndex, 1);
  next.zones[to].push(slot.cardId);

  return {
    success: true,
    state: next,
    instanceId: slot.instanceId,
  };
}

/**
 * Returns the first unoccupied index.
 *
 * Returns null when the selected zone type
 * has no available slots.
 */
export function findAvailableFieldZone(
  state: GameState,
  zoneType: "monster" | "spell-trap"
): number | null {
  if (!state.fieldState) {
    return null;
  }

  const slots = getSlots(
    state.fieldState,
    zoneType
  );

  if (!slots) {
    return null;
  }

  const index = slots.findIndex(
    (slot) => slot === null
  );

  return index === -1 ? null : index;
}
