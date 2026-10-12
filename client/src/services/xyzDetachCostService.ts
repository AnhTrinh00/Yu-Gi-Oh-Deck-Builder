import type { GameState } from "../models/GameState";

import {
  detachXyzMaterial,
  getAttachedXyzMaterials,
} from "./xyzMaterialService";

import {
  validateCardInstanceSync,
} from "./cardInstanceService";

import {
  isFieldSynchronized,
} from "./fieldZoneService";

export interface XyzDetachCostRequest {
  xyzInstanceId: string;
  materialInstanceId: string;
}

export interface XyzDetachCostResult {
  success: boolean;
  state: GameState;
  error?: string;
  detachedInstanceId?: string;
}

function failure(
  state: GameState,
  error: string
): XyzDetachCostResult {
  return {
    success: false,
    state,
    error,
  };
}

/**
 * Pays a single Xyz detachment cost.
 *
 * This function changes only the simulation state.
 * It does not resolve the activated card effect.
 */
export function payXyzDetachCost(
  state: GameState,
  request: XyzDetachCostRequest
): XyzDetachCostResult {
  if (!state.cardInstances || !state.fieldState) {
    return failure(
      state,
      "Extended card-instance tracking is required."
    );
  }

  const errors = validateCardInstanceSync(state);

  if (!isFieldSynchronized(state)) {
    errors.push("Field state is not synchronized.");
  }

  if (errors.length > 0) {
    return failure(state, errors.join(" "));
  }

  const host = state.cardInstances.instances.find(
    instance =>
      instance.instanceId === request.xyzInstanceId
  );

  if (!host || host.zone !== "field") {
    return failure(
      state,
      "Xyz host must be on the field."
    );
  }

  const attached = getAttachedXyzMaterials(
    state,
    request.xyzInstanceId
  );

  if (!attached.includes(request.materialInstanceId)) {
    return failure(
      state,
      "Selected material is not attached to this Xyz Monster."
    );
  }

  const result = detachXyzMaterial(
    state,
    request.xyzInstanceId,
    request.materialInstanceId,
    "graveyard"
  );

  if (!result.success) {
    return failure(
      state,
      result.error ?? "Xyz detachment failed."
    );
  }

  const finalErrors = validateCardInstanceSync(
    result.state
  );

  if (!isFieldSynchronized(result.state)) {
    finalErrors.push(
      "Field state is not synchronized after detachment."
    );
  }

  if (finalErrors.length > 0) {
    return failure(state, finalErrors.join(" "));
  }

  return {
    success: true,
    state: result.state,
    detachedInstanceId: request.materialInstanceId,
  };
}