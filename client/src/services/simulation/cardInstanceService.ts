import type {
  CardInstance,
  CardInstanceState,
  GameState,
  GameZone,
} from "../../models/simulation/GameState";

import {
  normalizeGameState,
} from "./extendedGameStateService";

const ZONES: GameZone[] = [
  "hand",
  "deck",
  "extra",
  "field",
  "graveyard",
  "banished",
];

export interface CardInstanceResult {
  success: boolean;
  state: GameState;
  error?: string;
  instance?: CardInstance;
}

function failure(
  state: GameState,
  error: string
): CardInstanceResult {
  return {
    success: false,
    state,
    error,
  };
}

function getFieldSlots(state: GameState) {
  const field = state.fieldState;

  if (!field) return [];

  return [
    ...field.monsterZones,
    ...field.spellTrapZones,
    field.fieldSpellZone,
  ].filter(
    (slot) => slot !== null
  );
}

/**
 * Initializes instance tracking for an existing
 * state without changing its legacy zone arrays.
 *
 * Existing field slots retain their instance IDs.
 *
 * The initializer refuses inconsistent field
 * representations rather than guessing which
 * physical copy occupies a particular slot.
 */
export function initializeCardInstances(
  state: GameState
): CardInstanceResult {
  if (state.cardInstances) {
    const errors = validateCardInstanceSync(state);

    if (errors.length > 0) {
      return failure(state, errors.join(" "));
    }

    return {
      success: true,
      state: normalizeGameState(state),
    };
  }

  const fieldSlots = getFieldSlots(state);

  const legacyField = [...state.zones.field]
    .sort((a, b) => a - b);

  const extendedField = fieldSlots
    .map((slot) => slot.cardId)
    .sort((a, b) => a - b);

  if (
    JSON.stringify(legacyField) !==
    JSON.stringify(extendedField)
  ) {
    return failure(
      state,
      "Field slots do not match legacy field cards."
    );
  }

  const instances: CardInstance[] = [];
  const usedIds = new Set<string>();

  for (const slot of fieldSlots) {
    if (!slot.instanceId.trim()) {
      return failure(
        state,
        "Field instance ID cannot be empty."
      );
    }

    if (usedIds.has(slot.instanceId)) {
      return failure(
        state,
        "Duplicate field instance ID."
      );
    }

    usedIds.add(slot.instanceId);

    instances.push({
      instanceId: slot.instanceId,
      cardId: slot.cardId,
      zone: "field",
    });
  }

  let nextNumber = 1;

  function generateId(): string {
    let id: string;

    do {
      id = `instance-${nextNumber++}`;
    } while (usedIds.has(id));

    usedIds.add(id);
    return id;
  }

  for (const zone of ZONES) {
    if (zone === "field") continue;

    for (const cardId of state.zones[zone]) {
      instances.push({
        instanceId: generateId(),
        cardId,
        zone,
      });
    }
  }

  const next = normalizeGameState(state);

  next.cardInstances = {
    instances,
    nextInstanceNumber: nextNumber,
  };

  return {
    success: true,
    state: next,
  };
}

/**
 * Validates instance counts and identities
 * against the legacy zone arrays.
 *
 * Returns an empty array when synchronized.
 */
export function validateCardInstanceSync(
  state: GameState
): string[] {
  const errors: string[] = [];
  const registry = state.cardInstances;

  if (!registry) {
    return ["Card instances are not initialized."];
  }

  const ids = new Set<string>();

  for (const instance of registry.instances) {
    if (!instance.instanceId.trim()) {
      errors.push("Empty instance ID.");
    }

    if (ids.has(instance.instanceId)) {
      errors.push(
        `Duplicate instance ID: ${instance.instanceId}`
      );
    }

    ids.add(instance.instanceId);

    if (
      !Number.isSafeInteger(instance.cardId) ||
      instance.cardId <= 0
    ) {
      errors.push("Invalid instance card ID.");
    }

    if (
      instance.zone !== "overlay" &&
      !ZONES.includes(instance.zone)
    ) {
      errors.push("Invalid instance zone.");
    }
  }

  for (const zone of ZONES) {
    const legacy = [...state.zones[zone]]
      .sort((a, b) => a - b);

    const tracked = registry.instances
      .filter((instance) => instance.zone === zone)
      .map((instance) => instance.cardId)
      .sort((a, b) => a - b);

    if (
      JSON.stringify(legacy) !==
      JSON.stringify(tracked)
    ) {
      errors.push(
        `Instance mismatch in ${zone}.`
      );
    }
  }

  const slots = getFieldSlots(state);

  const trackedField = registry.instances.filter(
    (instance) => instance.zone === "field"
  );

  if (slots.length !== trackedField.length) {
    errors.push("Field instance count mismatch.");
  }

  for (const slot of slots) {
    const match = trackedField.find(
      (instance) =>
        instance.instanceId === slot.instanceId
    );

    if (!match || match.cardId !== slot.cardId) {
      errors.push(
        `Field slot mismatch: ${slot.instanceId}`
      );
    }
  }

  const attachments = state.xyzMaterials ?? [];
  const attachedIds = new Set<string>();

  for (const attachment of attachments) {
    const xyz = registry.instances.find(
      instance =>
        instance.instanceId === attachment.xyzInstanceId
    );

    if (!xyz || xyz.zone !== "field") {
      errors.push(
        `Xyz host ${attachment.xyzInstanceId} is not on the field.`
      );
    }

    for (const materialId of attachment.materialInstanceIds) {
      if (attachedIds.has(materialId)) {
        errors.push(
          `Material ${materialId} is attached more than once.`
        );
      }

      attachedIds.add(materialId);

      const material = registry.instances.find(
        instance => instance.instanceId === materialId
      );

      if (!material || material.zone !== "overlay") {
        errors.push(
          `Attached material ${materialId} is not in overlay.`
        );
      }

      if (materialId === attachment.xyzInstanceId) {
        errors.push(
          "An Xyz Monster cannot attach itself."
        );
      }
    }
  }

  for (const instance of registry.instances) {
    if (
      instance.zone === "overlay" &&
      !attachedIds.has(instance.instanceId)
    ) {
      errors.push(
        `Overlay instance ${instance.instanceId} has no Xyz host.`
      );
    }
  }

  return errors;
}

/**
 * Retrieves one physical card instance.
 *
 * Returns a copy to prevent external mutation.
 */
export function getCardInstance(
  state: GameState,
  instanceId: string
): CardInstance | null {
  const instance = state.cardInstances?.instances.find(
    (item) => item.instanceId === instanceId
  );

  return instance ? { ...instance } : null;
}

/**
 * Returns all tracked instances in a zone.
 */
export function getInstancesInZone(
  state: GameState,
  zone: GameZone
): CardInstance[] {
  return (
    state.cardInstances?.instances
      .filter((instance) => instance.zone === zone)
      .map((instance) => ({ ...instance })) ?? []
  );
}

/**
 * Moves a specific instance between non-field zones.
 *
 * Field movement must use synchronized field-zone
 * operations and will be integrated separately.
 *
 * This is a low-level operation, not a game-rule
 * validator. It does not check card effects.
 */
export function moveCardInstance(
  state: GameState,
  instanceId: string,
  to: Exclude<GameZone, "field">
): CardInstanceResult {
  if (!state.cardInstances) {
    return failure(
      state,
      "Card instances are not initialized."
    );
  }

  const errors = validateCardInstanceSync(state);

  if (errors.length > 0) {
    return failure(state, errors.join(" "));
  }

  const instance = state.cardInstances.instances.find(
    (item) => item.instanceId === instanceId
  );

  if (instance?.zone === "overlay") {
    return failure(
      state,
      "Attached Xyz Materials must be moved through xyzMaterialService."
    );
  }

  if (!instance) {
    return failure(
      state,
      `Instance ${instanceId} does not exist.`
    );
  }

  if (instance.zone === "field") {
    return failure(
      state,
      "Use field-zone operations for field movement."
    );
  }

  if (instance.zone === to) {
    return failure(
      state,
      "Source and destination zones must differ."
    );
  }

  const next = normalizeGameState(state);

  const tracked = next.cardInstances!.instances.find(
    (item) => item.instanceId === instanceId
  )!;

  const from = tracked.zone;
  if (from === "overlay") {
    return failure(
      state,
      "Cannot move an attached Xyz Material directly."
    );
  }
  const source = next.zones[from];

  const index = source.indexOf(tracked.cardId);

  if (index === -1) {
    return failure(
      state,
      "Instance card is missing from its source zone."
    );
  }

  if (tracked.zone === "overlay") {
    return failure(
      state,
      "Attached Xyz Materials must be moved through xyzMaterialService."
    );
  }

  source.splice(index, 1);
  next.zones[to].push(tracked.cardId);

  tracked.zone = to;

  return {
    success: true,
    state: next,
    instance: { ...tracked },
  };
}

/**
 * Returns a defensive copy of the registry.
 */
export function getCardInstanceState(
  state: GameState
): CardInstanceState | null {
  if (!state.cardInstances) return null;

  return {
    nextInstanceNumber:
      state.cardInstances.nextInstanceNumber,

    instances: state.cardInstances.instances.map(
      (instance) => ({ ...instance })
    ),
  };
}
