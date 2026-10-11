import type {
  GameState,
  MonsterPosition,
} from "../models/GameState";

import {
  normalizeGameState,
} from "./extendedGameStateService";

import {
  validateCardInstanceSync,
} from "./cardInstanceService";

import {
  findAvailableFieldZone,
  isFieldSynchronized,
  placeCardOnField,
} from "./fieldZoneService";

export interface XyzSummonExecutionRequest {
  monsterInstanceId: string;
  monsterCardId: number;
  materialInstanceIds: string[];
  monsterZoneIndex?: number;
  position?: MonsterPosition;
}

export interface XyzSummonExecutionResult {
  success: boolean;
  state: GameState;
  error?: string;
}

function failure(
  state: GameState,
  error: string
): XyzSummonExecutionResult {
  return {
    success: false,
    state,
    error,
  };
}

/**
 * Performs the physical state transition for
 * an Xyz Summon.
 *
 * Summoning legality, Rank requirements, and
 * material-count requirements must be validated
 * by the caller before invoking this function.
 */
export function executeXyzSummonTransaction(
  state: GameState,
  request: XyzSummonExecutionRequest
): XyzSummonExecutionResult {
  const initialErrors = validateCardInstanceSync(state);

  if (!isFieldSynchronized(state)) {
    initialErrors.push(
      "Field state is not synchronized."
    );
  }

  if (initialErrors.length > 0) {
    return failure(state, initialErrors.join(" "));
  }

  if (
    request.materialInstanceIds.length === 0 ||
    new Set(request.materialInstanceIds).size !==
      request.materialInstanceIds.length
  ) {
    return failure(
      state,
      "Xyz Materials must be nonempty and distinct."
    );
  }

  if (
    request.materialInstanceIds.includes(
      request.monsterInstanceId
    )
  ) {
    return failure(
      state,
      "An Xyz Monster cannot be its own material."
    );
  }

  if (
    request.position !== undefined &&
    request.position !== "face-up-attack" &&
    request.position !== "face-up-defense"
  ) {
    return failure(
      state,
      "An Xyz Monster must be summoned face-up."
    );
  }

  const monster = state.cardInstances?.instances.find(
    instance =>
      instance.instanceId === request.monsterInstanceId
  );

  if (
    !monster ||
    monster.zone !== "extra" ||
    monster.cardId !== request.monsterCardId
  ) {
    return failure(
      state,
      "Selected Xyz Monster is not in the Extra Deck."
    );
  }

  for (const materialId of request.materialInstanceIds) {
    const material = state.cardInstances?.instances.find(
      instance => instance.instanceId === materialId
    );

    const slot = state.fieldState?.monsterZones.find(
      entry => entry?.instanceId === materialId
    );

    if (
      !material ||
      material.zone !== "field" ||
      !slot ||
      slot.cardId !== material.cardId ||
      slot.position === "face-down-defense"
    ) {
      return failure(
        state,
        `Xyz Material ${materialId} must be a face-up monster on the field.`
      );
    }
  }

  try {
    const next = normalizeGameState(state);

    // First, convert the selected field monsters
    // into overlay instances.
    for (const materialId of request.materialInstanceIds) {
      const material = next.cardInstances!.instances.find(
        instance => instance.instanceId === materialId
      )!;

      const slotIndex = next.fieldState!.monsterZones.findIndex(
        slot => slot?.instanceId === materialId
      );

      if (slotIndex < 0) {
        throw new Error(
          `Monster Zone missing for ${materialId}.`
        );
      }

      const legacyIndex = next.zones.field.indexOf(
        material.cardId
      );

      if (legacyIndex < 0) {
        throw new Error(
          `Field card ${material.cardId} is missing.`
        );
      }

      next.fieldState!.monsterZones[slotIndex] = null;
      next.zones.field.splice(legacyIndex, 1);
      material.zone = "overlay";
    }

    // Materials have now freed their Monster Zones.
    const zoneIndex =
      request.monsterZoneIndex ??
      findAvailableFieldZone(next, "monster");

    if (zoneIndex === null) {
      throw new Error(
        "No available Monster Zone for the Xyz Monster."
      );
    }

    const placed = placeCardOnField(next, {
      cardId: request.monsterCardId,
      instanceId: request.monsterInstanceId,
      from: "extra",
      zoneType: "monster",
      zoneIndex,
      position: request.position ?? "face-up-attack",
    });

    if (!placed.success) {
      throw new Error(
        placed.error ?? "Xyz Monster placement failed."
      );
    }

    const completed = normalizeGameState(placed.state);

    const summoned =
      completed.cardInstances!.instances.find(
        instance =>
          instance.instanceId === request.monsterInstanceId
      )!;

    summoned.zone = "field";

    // Only now register the completed attachment.
    completed.xyzMaterials ??= [];

    completed.xyzMaterials.push({
      xyzInstanceId: request.monsterInstanceId,
      materialInstanceIds: [
        ...request.materialInstanceIds,
      ],
    });

    const finalErrors =
      validateCardInstanceSync(completed);

    if (!isFieldSynchronized(completed)) {
      finalErrors.push(
        "Field state is not synchronized."
      );
    }

    if (finalErrors.length > 0) {
      throw new Error(finalErrors.join(" "));
    }

    return {
      success: true,
      state: completed,
    };
  } catch (error) {
    return failure(
      state,
      error instanceof Error
        ? error.message
        : "Xyz Summon execution failed."
    );
  }
}