import type {
  GameState,
  GameZone,
  MonsterPosition,
} from "../models/GameState";

import type {
  SummonMaterialRequirement,
  SummonMaterialSelection,
} from "../models/SummonMaterial";

import {
  getCardInstance,
  moveCardInstance,
  validateCardInstanceSync,
} from "./cardInstanceService";

import {
  findAvailableFieldZone,
  isFieldSynchronized,
  placeCardOnField,
  removeCardFromField,
} from "./fieldZoneService";

import {
  normalizeGameState,
} from "./extendedGameStateService";

import {
  validateSummonMaterials,
} from "./summonMaterialService";

import type {
  SummonRulesRequest,
} from "../models/SummonRules";

import {
  validateSummonRules,
} from "./summonRulesService";

import { executeXyzSummonTransaction } from "./xyzSummonExecutionService";

export interface ExtraDeckSummonRequest {
  monsterInstanceId: string;
  monsterCardId: number;

  requirement: SummonMaterialRequirement;
  materials: SummonMaterialSelection;

  monsterZoneIndex?: number;
  position?: MonsterPosition;

  /**
   * Destination for used materials.
   * Defaults to graveyard.
   */
  materialDestination?: "graveyard" | "banished";

  /**
   * Card metadata and effective values needed to
   * validate summon-type-specific rules.
   */
  summonRules?: Omit<SummonRulesRequest, "summonType">;
}

export interface ExtraDeckSummonResult {
  success: boolean;
  state: GameState;
  error?: string;

  summonedInstanceId?: string;
  materialInstanceIds?: string[];
}

function failure(
  state: GameState,
  error: string
): ExtraDeckSummonResult {
  return {
    success: false,
    state,
    error,
  };
}

function validateSync(
  state: GameState
): string[] {
  const errors = validateCardInstanceSync(state);

  if (!isFieldSynchronized(state)) {
    errors.push("Field state is not synchronized.");
  }

  return errors;
}

/**
 * Synchronizes a tracked physical instance after
 * a field-zone service has already moved its card.
 *
 * Field-zone services update legacy zones and slots,
 * but not the card-instance registry.
 */
function synchronizeMovedInstance(
  state: GameState,
  instanceId: string,
  destination: GameZone
): GameState {
  const next = normalizeGameState(state);

  const instance =
    next.cardInstances?.instances.find(
      item => item.instanceId === instanceId
    );

  if (!instance) {
    throw new Error(
      `Missing tracked instance ${instanceId}.`
    );
  }

  instance.zone = destination;

  return next;
}

function removeMaterial(
  state: GameState,
  instanceId: string,
  destination: "graveyard" | "banished"
): GameState {
  const instance = getCardInstance(
    state,
    instanceId
  );

  if (!instance) {
    throw new Error(
      `Material instance ${instanceId} was not found.`
    );
  }

  if (instance.zone !== "field") {
    const result = moveCardInstance(
      state,
      instanceId,
      destination
    );

    if (!result.success) {
      throw new Error(
        result.error ?? "Material movement failed."
      );
    }

    return result.state;
  }

  const index =
    state.fieldState?.monsterZones.findIndex(
      slot => slot?.instanceId === instanceId
    ) ?? -1;

  if (index < 0) {
    throw new Error(
      `Material ${instanceId} is not in a Monster Zone.`
    );
  }

  const result = removeCardFromField(
    state,
    {
      zoneType: "monster",
      zoneIndex: index,
      to: destination,
    }
  );

  if (!result.success) {
    throw new Error(
      result.error ?? "Could not remove material."
    );
  }

  return synchronizeMovedInstance(
    result.state,
    instanceId,
    destination
  );
}

function summonMonster(
  state: GameState,
  request: ExtraDeckSummonRequest
): GameState {
  const monster = getCardInstance(
    state,
    request.monsterInstanceId
  );

  if (!monster) {
    throw new Error(
      "Summoned monster instance was not found."
    );
  }

  if (
    monster.cardId !== request.monsterCardId ||
    monster.zone !== "extra"
  ) {
    throw new Error(
      "The selected monster must be in the Extra Deck."
    );
  }

  const zoneIndex =
    request.monsterZoneIndex ??
    findAvailableFieldZone(state, "monster");

  if (zoneIndex === null) {
    throw new Error(
      "No available Monster Zone."
    );
  }

  const placed = placeCardOnField(
    state,
    {
      cardId: monster.cardId,
      instanceId: monster.instanceId,
      from: "extra",
      zoneType: "monster",
      zoneIndex,
      position:
        request.position ?? "face-up-attack",
    }
  );

  if (!placed.success) {
    throw new Error(
      placed.error ?? "Monster placement failed."
    );
  }

  return synchronizeMovedInstance(
    placed.state,
    monster.instanceId,
    "field"
  );
}

/**
 * Executes a validated Extra Deck summon atomically.
 *
 * Supported:
 * - Fusion
 * - Synchro
 * - Link
 *
 * Xyz requires attached-material state and is
 * intentionally unsupported here.
 *
 * This does not yet validate official card-specific
 * summoning conditions, levels, or Link Ratings.
 */
export function executeExtraDeckSummon(
  state: GameState,
  request: ExtraDeckSummonRequest
): ExtraDeckSummonResult {
  const initialErrors = validateSync(state);

  if (initialErrors.length > 0) {
    return failure(
      state,
      initialErrors.join(" ")
    );
  }

  if (
    !["fusion", "synchro", "xyz", "link"].includes(
      request.requirement.summonType
    )
  ) {
    return failure(
      state,
      "Unsupported Extra Deck summon type."
    );
  }

  const validation = validateSummonMaterials(
    state,
    request.requirement,
    request.materials
  );

  if (!request.summonRules) {
    return failure(
      state,
      "Summon-rule metadata is required before " +
      "executing an Extra Deck summon."
    );
  }

  if (
    request.summonRules.summonedMonster.id !==
    request.monsterCardId
  ) {
    return failure(
      state,
      "Summoned monster metadata does not match the selected card."
    );
  }

  const selectedInstances = request.materials.instanceIds;

  if (
    request.summonRules.materials.length !==
    selectedInstances.length
  ) {
    return failure(
      state,
      "Summon-rule materials do not match the selected materials."
    );
  }

  const ruleIds = request.summonRules.materials.map(
    material => material.instanceId
  );

  if (
    new Set(ruleIds).size !== ruleIds.length ||
    selectedInstances.some(
      id => !ruleIds.includes(id)
    )
  ) {
    return failure(
      state,
      "Summon-rule material instances do not match the selection."
    );
  }

  for (const material of request.summonRules.materials) {
    const tracked = getCardInstance(
      state,
      material.instanceId
    );

    if (!tracked || tracked.cardId !== material.card.id) {
      return failure(
        state,
        `Material metadata mismatch for ${material.instanceId}.`
      );
    }
  }

  const rules = validateSummonRules({
    ...request.summonRules,
    summonType: request.requirement.summonType,
  });

  if (!rules.valid) {
    return failure(
      state,
      rules.errors.join(" ")
    );
  }

  if (!validation.valid) {
    return failure(
      state,
      validation.errors.join(" ")
    );
  }

  const monster = getCardInstance(
    state,
    request.monsterInstanceId
  );

  if (
    !monster ||
    monster.cardId !== request.monsterCardId ||
    monster.zone !== "extra"
  ) {
    return failure(
      state,
      "Selected monster is not in the Extra Deck."
    );
  }

  if (
    request.materials.instanceIds.includes(
      request.monsterInstanceId
    )
  ) {
    return failure(
      state,
      "The summoned monster cannot be its own material."
    );
  }

  if (request.requirement.summonType === "xyz") {
    if (
      request.materialDestination !== undefined &&
      request.materialDestination !== "graveyard"
    ) {
      return failure(
        state,
        "Xyz Materials cannot be sent to a destination during summoning."
      );
    }

    const xyzResult = executeXyzSummonTransaction(
      state,
      {
        monsterInstanceId: request.monsterInstanceId,
        monsterCardId: request.monsterCardId,
        materialInstanceIds: [
          ...request.materials.instanceIds,
        ],
        monsterZoneIndex: request.monsterZoneIndex,
        position: request.position,
      }
    );

    if (!xyzResult.success) {
      return failure(
        state,
        xyzResult.error ?? "Xyz Summon failed."
      );
    }

    return {
      success: true,
      state: xyzResult.state,
      summonedInstanceId: request.monsterInstanceId,
      materialInstanceIds: [
        ...request.materials.instanceIds,
      ],
    };
  }

  const destination =
    request.materialDestination ?? "graveyard";

  try {
    let current = normalizeGameState(state);

    for (
      const materialId of request.materials.instanceIds
    ) {
      current = removeMaterial(
        current,
        materialId,
        destination
      );

      const errors = validateSync(current);

      if (errors.length > 0) {
        throw new Error(errors.join(" "));
      }
    }

    current = summonMonster(current, request);

    const finalErrors = validateSync(current);

    if (finalErrors.length > 0) {
      throw new Error(
        finalErrors.join(" ")
      );
    }

    return {
      success: true,
      state: current,
      summonedInstanceId:
        request.monsterInstanceId,
      materialInstanceIds: [
        ...request.materials.instanceIds,
      ],
    };
  } catch (cause) {
    // No intermediate state escapes the transaction.
    return failure(
      state,
      cause instanceof Error
        ? cause.message
        : "Extra Deck summon failed."
    );
  }
}