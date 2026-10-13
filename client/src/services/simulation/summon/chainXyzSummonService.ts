import type { Card } from "../../../models/Card";
import type { GameState } from "../../../models/GameState";

import {
  executeExtraDeckSummon,
} from "./extraDeckSummonService";

import {
  validateCardInstanceSync,
} from "../cardInstanceService";

export interface ChainXyzSummonRequest {
  monsterInstanceId: string;
  materialInstanceIds: string[];
}

export interface ChainXyzSummonResult {
  success: boolean;
  state: GameState;
  error?: string;
}

function fail(
  state: GameState,
  error: string
): ChainXyzSummonResult {
  return { success: false, state, error };
}

/**
 * Build a validated Rank-based Xyz Summon
 * using physical instances and card metadata.
 */
export function executeChainXyzSummon(
  state: GameState,
  cards: Card[],
  request: ChainXyzSummonRequest
): ChainXyzSummonResult {
  const monster = state.cardInstances?.instances.find(
    instance =>
      instance.instanceId === request.monsterInstanceId
  );

  if (!monster || monster.zone !== "extra") {
    return fail(
      state,
      "Select an Xyz Monster in the Extra Deck."
    );
  }

  const summonedCard = cards.find(
    card => card.id === monster.cardId
  );

  if (
    !summonedCard ||
    summonedCard.frameType.toLowerCase() !== "xyz"
  ) {
    return fail(
      state,
      "Selected Extra Deck card is not an Xyz Monster."
    );
  }

  const rank = summonedCard.level;

  if (
    !Number.isSafeInteger(rank) ||
    rank === undefined ||
    rank <= 0
  ) {
    return fail(
      state,
      "Xyz Monster Rank metadata is missing."
    );
  }

  if (
    request.materialInstanceIds.length < 2 ||
    new Set(request.materialInstanceIds).size !==
      request.materialInstanceIds.length
  ) {
    return fail(
      state,
      "Select at least two distinct Xyz Materials."
    );
  }

  const materials = [];

  for (const instanceId of request.materialInstanceIds) {
    const instance = state.cardInstances?.instances.find(
      item => item.instanceId === instanceId
    );

    if (!instance || instance.zone !== "field") {
      return fail(
        state,
        `Material ${instanceId} is not on the field.`
      );
    }

    const card = cards.find(
      item => item.id === instance.cardId
    );

    if (!card) {
      return fail(
        state,
        `Missing card metadata for ${instanceId}.`
      );
    }

    if (
      !card.type.includes("Monster") ||
      card.level !== rank
    ) {
      return fail(
        state,
        `Material ${instanceId} must be a Level ${rank} monster.`
      );
    }

    materials.push({
      instanceId,
      card,
    });
  }

  const result = executeExtraDeckSummon(state, {
    monsterInstanceId: request.monsterInstanceId,
    monsterCardId: monster.cardId,

    requirement: {
      summonType: "xyz",
      minimumMaterials: 2,
      maximumMaterials: request.materialInstanceIds.length,
      allowedZones: ["field"],
    },

    materials: {
      instanceIds: [...request.materialInstanceIds],
    },

    summonRules: {
      summonedMonster: summonedCard,
      materials,
    },
  });

  if (!result.success) {
    return fail(
      state,
      result.error ?? "Xyz Summon failed."
    );
  }

  const syncErrors = validateCardInstanceSync(
    result.state
  );

  if (syncErrors.length > 0) {
    return fail(state, syncErrors.join(" "));
  }

  return {
    success: true,
    state: result.state,
  };
}