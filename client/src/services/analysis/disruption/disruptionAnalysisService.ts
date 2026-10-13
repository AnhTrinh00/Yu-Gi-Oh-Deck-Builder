import type {
  CardInstance,
  GameState,
  GameZone,
} from "../../../models/simulation/GameState";

import type {
  DetectedDisruption,
  DisruptionAnalysis,
  DisruptionDefinition,
} from "../../../models/analysis/DisruptionAnalysis";

import {
  validateCardInstanceSync,
} from "../../simulation/cardInstanceService";

import {
  isFieldSynchronized,
} from "../../simulation/field/fieldZoneService";

const VALID_ZONES: GameZone[] = [
  "hand",
  "deck",
  "extra",
  "field",
  "graveyard",
  "banished",
];

function getXyzMaterialCount(
  state: GameState,
  instanceId: string
): number {
  return (
    state.xyzMaterials?.find(
      (attachment) =>
        attachment.xyzInstanceId === instanceId
    )?.materialInstanceIds.length ?? 0
  );
}

function isFaceDown(
  state: GameState,
  instance: CardInstance
): boolean {
  if (instance.zone !== "field") {
    return false;
  }

  const field = state.fieldState;

  const monster = field?.monsterZones.find(
    (slot) =>
      slot?.instanceId === instance.instanceId
  );

  if (monster) {
    return monster.position === "face-down-defense";
  }

  const spellTrap = field?.spellTrapZones.find(
    (slot) =>
      slot?.instanceId === instance.instanceId
  );

  if (spellTrap) {
    return spellTrap.position === "face-down";
  }

  return (
    field?.fieldSpellZone?.instanceId ===
      instance.instanceId &&
    field.fieldSpellZone.position === "face-down"
  );
}

function evaluateDisruption(
  state: GameState,
  instance: CardInstance,
  definition: DisruptionDefinition
): DetectedDisruption {
  const reasons: string[] = [];

  if (!definition.allowedZones.includes(instance.zone as GameZone)) {
    reasons.push(
      "The card is not in an allowed activation zone."
    );
  }

  if (
    instance.zone === "field" &&
    definition.speed === "quick-effect" &&
    isFaceDown(state, instance)
  ) {
    reasons.push(
      "The monster or card is face-down."
    );
  }

  const requiredMaterials =
    definition.minimumXyzMaterials ?? 0;

  if (
    getXyzMaterialCount(state, instance.instanceId) <
    requiredMaterials
  ) {
    reasons.push(
      "Insufficient attached Xyz Materials."
    );
  }

  const usageKey =
    definition.usageKey ?? definition.effectKey;

  const turnNumber = state.turnState?.turnNumber;

  if (
    state.usedEffects.includes(usageKey) ||
    state.effectUsage?.some(
      (usage) =>
        usage.usageKey === usageKey &&
        (
          turnNumber === undefined ||
          usage.turnNumber === turnNumber
        ) &&
        (
          usage.cardInstanceId === undefined ||
          usage.cardInstanceId === instance.instanceId
        )
    )
  ) {
    reasons.push(
      "The effect has already been used."
    );
  }

  return {
    definitionId: definition.id,
    cardId: instance.cardId,
    instanceId: instance.instanceId,
    effectKey: definition.effectKey,
    type: definition.type,
    speed: definition.speed,
    zone: instance.zone as GameZone,

    availability:
      reasons.length === 0
        ? "potential"
        : "unavailable",

    reasons,
    description: definition.description,
  };
}

export function analyzeDisruptions(
  state: GameState,
  definitions: DisruptionDefinition[]
): DisruptionAnalysis {
  const warnings: string[] = [];

  if (!state.cardInstances) {
    warnings.push(
      "Physical card instances are not initialized."
    );
  } else {
    warnings.push(
      ...validateCardInstanceSync(state)
    );
  }

  if (!state.fieldState) {
    warnings.push(
      "Field state is not initialized."
    );
  } else if (!isFieldSynchronized(state)) {
    warnings.push(
      "Field state is not synchronized."
    );
  }

  if (!state.turnState) {
    warnings.push(
      "Turn state is not initialized."
    );
  }

  // Do not report candidates from an inconsistent state.
  if (warnings.length > 0) {
    return {
      disruptions: [],
      potentialCount: 0,
      conditionallyAvailableCount: 0,
      unavailableCount: 0,
      unknownCount: 0,
      complete: false,
      warnings,
    };
  }

  const disruptions: DetectedDisruption[] = [];

  const definitionsByCard = new Map<
    number,
    DisruptionDefinition[]
  >();

  for (const definition of definitions) {
    const existing =
      definitionsByCard.get(definition.cardId) ?? [];

    existing.push(definition);

    definitionsByCard.set(
      definition.cardId,
      existing
    );
  }

  for (const instance of state.cardInstances!.instances) {
    if (
      !VALID_ZONES.includes(instance.zone as GameZone)
    ) {
      continue;
    }

    const matchingDefinitions =
      definitionsByCard.get(instance.cardId) ?? [];

    for (const definition of matchingDefinitions) {
      disruptions.push(
        evaluateDisruption(
          state,
          instance,
          definition
        )
      );
    }
  }

  return {
    disruptions,

    potentialCount: disruptions.filter(
      (item) => item.availability === "potential"
    ).length,

    conditionallyAvailableCount: 0,

    unavailableCount: disruptions.filter(
      (item) => item.availability === "unavailable"
    ).length,

    unknownCount: 0,

    complete: true,
    warnings: [],
  };
}