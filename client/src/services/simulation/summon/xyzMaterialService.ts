import type {
  GameState,
  GameZone,
} from "../../../models/GameState";

import {
  normalizeGameState,
} from "../extendedGameStateService";

import {
  validateCardInstanceSync,
} from "../cardInstanceService";

import {
  isFieldSynchronized,
} from "../field/fieldZoneService";

export interface XyzMaterialResult {
  success: boolean;
  state: GameState;
  error?: string;
}

function fail(
  state: GameState,
  error: string
): XyzMaterialResult {
  return {
    success: false,
    state,
    error,
  };
}

function validateState(state: GameState): string[] {
  const errors = validateCardInstanceSync(state);

  if (!isFieldSynchronized(state)) {
    errors.push("Field state is not synchronized.");
  }

  return errors;
}

function removeFromLegacyZone(
  state: GameState,
  cardId: number,
  zone: GameZone
): void {
  const cards = state.zones[zone] ?? [];
  const index = cards.indexOf(cardId);

  if (index < 0) {
    throw new Error(
      `Card ${cardId} is missing from ${zone}.`
    );
  }

  cards.splice(index, 1);
}

function removeFromFieldSlot(
  state: GameState,
  instanceId: string
): void {
  const field = state.fieldState;

  if (!field) {
    throw new Error("Field state is missing.");
  }

  const index = field.monsterZones.findIndex(
    slot => slot?.instanceId === instanceId
  );

  if (index < 0) {
    throw new Error(
      `Material ${instanceId} is not in a Monster Zone.`
    );
  }

  field.monsterZones[index] = null;
}

/**
 * Attach selected physical card instances to
 * an Xyz Monster already on the field.
 *
 * All materials must currently be face-up
 * monsters in Monster Zones.
 */
export function attachXyzMaterials(
  state: GameState,
  xyzInstanceId: string,
  materialInstanceIds: string[]
): XyzMaterialResult {
  const initialErrors = validateState(state);

  if (initialErrors.length > 0) {
    return fail(state, initialErrors.join(" "));
  }

  if (materialInstanceIds.length === 0) {
    return fail(state, "No Xyz Materials selected.");
  }

  if (
    new Set(materialInstanceIds).size !==
    materialInstanceIds.length
  ) {
    return fail(state, "Duplicate material instance.");
  }

  const host = state.cardInstances?.instances.find(
    instance => instance.instanceId === xyzInstanceId
  );

  if (!host || host.zone !== "field") {
    return fail(state, "Xyz host must be on the field.");
  }

  const hostSlot = state.fieldState?.monsterZones.find(
    slot => slot?.instanceId === xyzInstanceId
  );

  if (!hostSlot) {
    return fail(
      state,
      "Xyz host must occupy a Monster Zone."
    );
  }

  const existing = state.xyzMaterials?.find(
    entry => entry.xyzInstanceId === xyzInstanceId
  );

  const existingIds = new Set(
    (state.xyzMaterials ?? []).flatMap(
      entry => entry.materialInstanceIds
    )
  );

  for (const id of materialInstanceIds) {
    if (id === xyzInstanceId) {
      return fail(
        state,
        "An Xyz Monster cannot attach itself."
      );
    }

    if (existingIds.has(id)) {
      return fail(
        state,
        `Material ${id} is already attached.`
      );
    }

    const material = state.cardInstances?.instances.find(
      instance => instance.instanceId === id
    );

    const slot = state.fieldState?.monsterZones.find(
      entry => entry?.instanceId === id
    );

    if (
      !material ||
      material.zone !== "field" ||
      !slot ||
      slot.position === "face-down-defense"
    ) {
      return fail(
        state,
        `Material ${id} must be a face-up monster on the field.`
      );
    }
  }

  try {
    const next = normalizeGameState(state);

    for (const id of materialInstanceIds) {
      const material = next.cardInstances!.instances.find(
        instance => instance.instanceId === id
      )!;

      removeFromFieldSlot(next, id);

      removeFromLegacyZone(
        next,
        material.cardId,
        "field"
      );

      material.zone = "overlay";
    }

    if (existing) {
      const attachment = next.xyzMaterials!.find(
        entry => entry.xyzInstanceId === xyzInstanceId
      )!;

      attachment.materialInstanceIds.push(
        ...materialInstanceIds
      );
    } else {
      next.xyzMaterials!.push({
        xyzInstanceId,
        materialInstanceIds: [
          ...materialInstanceIds,
        ],
      });
    }

    const errors = validateState(next);

    if (errors.length > 0) {
      return fail(state, errors.join(" "));
    }

    return {
      success: true,
      state: next,
    };
  } catch (error) {
    return fail(
      state,
      error instanceof Error
        ? error.message
        : "Xyz attachment failed."
    );
  }
}

/**
 * Detaches one specific physical material
 * from an Xyz Monster.
 *
 * By default, the material goes to the Graveyard.
 */
export function detachXyzMaterial(
  state: GameState,
  xyzInstanceId: string,
  materialInstanceId: string,
  destination: "graveyard" | "banished" = "graveyard"
): XyzMaterialResult {
  const initialErrors = validateState(state);

  if (initialErrors.length > 0) {
    return fail(state, initialErrors.join(" "));
  }

  const attachment = state.xyzMaterials?.find(
    entry => entry.xyzInstanceId === xyzInstanceId
  );

  if (
    !attachment ||
    !attachment.materialInstanceIds.includes(
      materialInstanceId
    )
  ) {
    return fail(
      state,
      "The selected material is not attached to this Xyz Monster."
    );
  }

  const material = state.cardInstances?.instances.find(
    instance =>
      instance.instanceId === materialInstanceId
  );

  if (!material || material.zone !== "overlay") {
    return fail(
      state,
      "Attached material is missing from overlay."
    );
  }

  const next = normalizeGameState(state);

  const tracked = next.cardInstances!.instances.find(
    instance =>
      instance.instanceId === materialInstanceId
  )!;

  next.zones[destination].push(tracked.cardId);
  tracked.zone = destination;

  const nextAttachment = next.xyzMaterials!.find(
    entry => entry.xyzInstanceId === xyzInstanceId
  )!;

  nextAttachment.materialInstanceIds =
    nextAttachment.materialInstanceIds.filter(
      id => id !== materialInstanceId
    );

  const errors = validateState(next);

  if (errors.length > 0) {
    return fail(state, errors.join(" "));
  }

  return {
    success: true,
    state: next,
  };
}

export function getAttachedXyzMaterials(
  state: GameState,
  xyzInstanceId: string
): string[] {
  return [
    ...(state.xyzMaterials?.find(
      entry => entry.xyzInstanceId === xyzInstanceId
    )?.materialInstanceIds ?? []),
  ];
}