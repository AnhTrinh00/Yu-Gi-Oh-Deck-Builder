import type { GameState } from "../../../models/simulation/GameState";

import {
  normalizeGameState,
} from "../../simulation/extendedGameStateService";

export interface XyzHostCleanupResult {
  success: boolean;
  state: GameState;
  error?: string;
  releasedMaterialInstanceIds: string[];
}

/**
 * Releases all attached materials belonging to an
 * Xyz Monster that is leaving the field.
 *
 * The host itself is not moved by this function.
 * The caller must complete the host movement
 * before validating the final game state.
 */
export function releaseXyzMaterialsOnHostExit(
  state: GameState,
  xyzInstanceId: string
): XyzHostCleanupResult {
  const attachment = state.xyzMaterials?.find(
    entry => entry.xyzInstanceId === xyzInstanceId
  );

  if (!attachment) {
    return {
      success: true,
      state,
      releasedMaterialInstanceIds: [],
    };
  }

  if (!state.cardInstances) {
    return {
      success: false,
      state,
      error: "Card instances are not initialized.",
      releasedMaterialInstanceIds: [],
    };
  }

  const host = state.cardInstances.instances.find(
    instance => instance.instanceId === xyzInstanceId
  );

  if (!host || host.zone !== "field") {
    return {
      success: false,
      state,
      error: "Xyz host must be on the field.",
      releasedMaterialInstanceIds: [],
    };
  }

  const materialIds = [
    ...attachment.materialInstanceIds,
  ];

  if (
    new Set(materialIds).size !== materialIds.length
  ) {
    return {
      success: false,
      state,
      error: "Duplicate attached Xyz Material.",
      releasedMaterialInstanceIds: [],
    };
  }

  const next = normalizeGameState(state);

  for (const materialId of materialIds) {
    const material = next.cardInstances!.instances.find(
      instance => instance.instanceId === materialId
    );

    if (!material || material.zone !== "overlay") {
      return {
        success: false,
        state,
        error:
          `Attached material ${materialId} is missing from overlay.`,
        releasedMaterialInstanceIds: [],
      };
    }

    // Overlay materials are not stored in any
    // ordinary zone before being released.
    material.zone = "graveyard";
    next.zones.graveyard.push(material.cardId);
  }

  next.xyzMaterials = (next.xyzMaterials ?? []).filter(
    entry => entry.xyzInstanceId !== xyzInstanceId
  );

  return {
    success: true,
    state: next,
    releasedMaterialInstanceIds: materialIds,
  };
}