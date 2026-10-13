import type {
  GameState,
  GameZone,
} from "../../../models/GameState";

import type {
  SummonMaterialRequirement,
  SummonMaterialSelection,
  SummonMaterialValidation,
} from "../../../models/SummonMaterial";

import {
  validateCardInstanceSync,
} from "../../simulation/cardInstanceService";

import {
  isFieldSynchronized,
} from "../../simulation/field/fieldZoneService";

const ALL_ZONES: GameZone[] = [
  "hand",
  "deck",
  "extra",
  "field",
  "graveyard",
  "banished",
];

export function validateSummonMaterials(
  state: GameState,
  requirement: SummonMaterialRequirement,
  selection: SummonMaterialSelection
): SummonMaterialValidation {
  const errors: string[] = [];
  const selectedCardIds: number[] = [];

  if (!state.cardInstances || !state.fieldState) {
    return {
      valid: false,
      errors: [
        "Extended card-instance tracking is required.",
      ],
      selectedCardIds,
    };
  }

  errors.push(...validateCardInstanceSync(state));

  if (!isFieldSynchronized(state)) {
    errors.push("Field state is not synchronized.");
  }

  const { minimumMaterials, maximumMaterials } =
    requirement;

  if (
    !Number.isSafeInteger(minimumMaterials) ||
    !Number.isSafeInteger(maximumMaterials) ||
    minimumMaterials < 1 ||
    maximumMaterials < minimumMaterials
  ) {
    errors.push("Invalid material-count requirements.");
  }

  const allowedZones =
    requirement.allowedZones ?? ["field"];

  if (
    allowedZones.length === 0 ||
    allowedZones.some(zone => !ALL_ZONES.includes(zone))
  ) {
    errors.push("Invalid allowed material zones.");
  }

  const selectedIds = selection.instanceIds;

  if (
    selectedIds.length < minimumMaterials ||
    selectedIds.length > maximumMaterials
  ) {
    errors.push(
      `Summon requires ${minimumMaterials}–` +
      `${maximumMaterials} materials.`
    );
  }

  if (new Set(selectedIds).size !== selectedIds.length) {
    errors.push(
      "The same physical card instance cannot be used twice."
    );
  }

  const instances = state.cardInstances.instances;

  for (const instanceId of selectedIds) {
    const instance = instances.find(
      item => item.instanceId === instanceId
    );

    if (!instance) {
      errors.push(
        `Material instance ${instanceId} does not exist.`
      );
      continue;
    }

    selectedCardIds.push(instance.cardId);

    if (
      instance.zone === "overlay" ||
      !allowedZones.includes(instance.zone)
    ) {
      errors.push(
        `Material ${instanceId} cannot be used ` +
        `from ${instance.zone}.`
      );
    }

    if (
      requirement.allowedCardIds &&
      !requirement.allowedCardIds.includes(
        instance.cardId
      )
    ) {
      errors.push(
        `Card ${instance.cardId} is not an allowed material.`
      );
    }
  }

  for (const cardId of requirement.requiredCardIds ?? []) {
    if (!selectedCardIds.includes(cardId)) {
      errors.push(
        `Required material Card ${cardId} is missing.`
      );
    }
  }

  if (
    requirement.minimumDistinctCardIds !== undefined
  ) {
    const minimum = requirement.minimumDistinctCardIds;

    if (
      !Number.isSafeInteger(minimum) ||
      minimum < 1 ||
      new Set(selectedCardIds).size < minimum
    ) {
      errors.push(
        `At least ${minimum} distinct card IDs are required.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    selectedCardIds,
  };
}