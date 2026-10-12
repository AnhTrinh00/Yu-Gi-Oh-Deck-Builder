
import type {
  CardInstance,
  GameState,
  GameZone,
  MonsterPosition,
  SpellTrapPosition,
} from "../models/GameState";

import {
  normalizeGameState,
} from "./extendedGameStateService";

import {
  isFieldSynchronized,
  placeCardOnField,
  removeCardFromField,
  type FieldZoneType,
} from "./fieldZoneService";

import {
  validateCardInstanceSync,
} from "./cardInstanceService";

import { releaseXyzMaterialsOnHostExit } from "./xyzHostCleanupService";

export interface FieldInstanceResult {
  success: boolean;
  state: GameState;
  error?: string;
  instance?: CardInstance;
}

export interface PlaceInstanceOptions {
  instanceId: string;
  zoneType: FieldZoneType;
  zoneIndex?: number;
  position?: MonsterPosition | SpellTrapPosition;
}

export interface RemoveInstanceOptions {
  instanceId: string;
  to: Exclude<GameZone, "field">;
}

function failure(
  state: GameState,
  error: string
): FieldInstanceResult {
  return { success: false, state, error };
}

function checkState(state: GameState): string | null {
  if (!state.cardInstances) {
    return "Card instances are not initialized.";
  }

  if (!state.fieldState) {
    return "Field state is not initialized.";
  }

  if (!isFieldSynchronized(state)) {
    return "Field state is not synchronized.";
  }

  const errors = validateCardInstanceSync(state);

  return errors.length > 0
    ? errors.join(" ")
    : null;
}

function findFieldLocation(
  state: GameState,
  instanceId: string
): {
  zoneType: FieldZoneType;
  zoneIndex?: number;
} | null {
  const field = state.fieldState;

  if (!field) return null;

  const monsterIndex = field.monsterZones.findIndex(
    (slot) => slot?.instanceId === instanceId
  );

  if (monsterIndex !== -1) {
    return {
      zoneType: "monster",
      zoneIndex: monsterIndex,
    };
  }

  const spellIndex = field.spellTrapZones.findIndex(
    (slot) => slot?.instanceId === instanceId
  );

  if (spellIndex !== -1) {
    return {
      zoneType: "spell-trap",
      zoneIndex: spellIndex,
    };
  }

  if (field.fieldSpellZone?.instanceId === instanceId) {
    return { zoneType: "field-spell" };
  }

  return null;
}

/**
 * Moves an existing tracked instance from a
 * non-field zone onto the field.
 *
 * Does not establish summoning or activation
 * legality. Higher-level rules must validate
 * those requirements.
 */
export function placeCardInstanceOnField(
  state: GameState,
  options: PlaceInstanceOptions
): FieldInstanceResult {
  const error = checkState(state);

  if (error) return failure(state, error);

  const instance = state.cardInstances!.instances.find(
    (item) => item.instanceId === options.instanceId
  );

  if (!instance) {
    return failure(state, "Card instance not found.");
  }

  if (instance.zone === "field") {
    return failure(
      state,
      "Instance is already on the field."
    );
  }

  if (instance.zone === "overlay") {
    return failure(
      state,
      "Attached Xyz Materials cannot be placed directly on the field."
    );
  }

  const result = placeCardOnField(state, {
    cardId: instance.cardId,
    from: instance.zone,
    zoneType: options.zoneType,
    zoneIndex: options.zoneIndex,
    instanceId: instance.instanceId,
    position: options.position,
  });

  if (!result.success) {
    return failure(
      state,
      result.error ?? "Field placement failed."
    );
  }

  const next = normalizeGameState(result.state);

  const tracked = next.cardInstances!.instances.find(
    (item) => item.instanceId === options.instanceId
  )!;

  tracked.zone = "field";

  const syncErrors = validateCardInstanceSync(next);

  if (syncErrors.length > 0) {
    return failure(state, syncErrors.join(" "));
  }

  return {
    success: true,
    state: next,
    instance: { ...tracked },
  };
}

/**
 * Removes one tracked field instance and
 * transfers it to another game zone.
 *
 * When an Xyz host leaves the field, its
 * remaining materials are sent to the
 * Graveyard as part of the same transaction.
 */
export function removeCardInstanceFromField(
  state: GameState,
  options: RemoveInstanceOptions
): FieldInstanceResult {
  const error = checkState(state);

  if (error) return failure(state, error);

  const instance = state.cardInstances!.instances.find(
    item => item.instanceId === options.instanceId
  );

  if (!instance) {
    return failure(state, "Card instance not found.");
  }

  if (instance.zone !== "field") {
    return failure(state, "Instance is not on the field.");
  }

  const location = findFieldLocation(
    state,
    options.instanceId
  );

  if (!location) {
    return failure(
      state,
      "Instance does not occupy a field zone."
    );
  }

  // Release attached materials first, without
  // changing the caller's original state.
  const cleanup = releaseXyzMaterialsOnHostExit(
    state,
    options.instanceId
  );

  if (!cleanup.success) {
    return failure(
      state,
      cleanup.error ?? "Xyz Material cleanup failed."
    );
  }

  // Remove the host from the field using the
  // working state containing the released materials.
  const result = removeCardFromField(
    cleanup.state,
    {
      ...location,
      to: options.to,
    }
  );

  if (!result.success) {
    return failure(
      state,
      result.error ?? "Field removal failed."
    );
  }

  const next = normalizeGameState(result.state);

  const tracked = next.cardInstances!.instances.find(
    item => item.instanceId === options.instanceId
  );

  if (!tracked) {
    return failure(
      state,
      "Removed card instance is missing."
    );
  }

  tracked.zone = options.to;

  const syncErrors = validateCardInstanceSync(next);

  if (!isFieldSynchronized(next)) {
    syncErrors.push(
      "Field state is not synchronized."
    );
  }

  if (syncErrors.length > 0) {
    return failure(state, syncErrors.join(" "));
  }

  return {
    success: true,
    state: next,
    instance: { ...tracked },
  };
}