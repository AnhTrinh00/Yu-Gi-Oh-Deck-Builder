import type {
  GameState,
  GameZone,
} from "../../../models/simulation/GameState";

import type {
  EndBoardAnalysis,
  EndBoardMonster,
  EndBoardSpellTrap,
  EndBoardResources,
} from "../../../models/analysis/EndBoardAnalysis";

import {
  validateCardInstanceSync,
} from "../../simulation/cardInstanceService";

import {
  isFieldSynchronized,
} from "../../simulation/field/fieldZoneService";

const RESOURCE_ZONES: Array<
  Exclude<GameZone, "field">
> = [
  "hand",
  "deck",
  "extra",
  "graveyard",
  "banished",
];

export function analyzeEndBoard(
  state: GameState
): EndBoardAnalysis {
  const warnings: string[] = [];

  if (!state.fieldState) {
    warnings.push(
      "Field state is not initialized."
    );
  }

  if (!state.cardInstances) {
    warnings.push(
      "Physical card instances are not initialized."
    );
  } else {
    warnings.push(
      ...validateCardInstanceSync(state)
    );
  }

  if (
    state.fieldState &&
    !isFieldSynchronized(state)
  ) {
    warnings.push(
      "Field state is not synchronized."
    );
  }

  const instances = new Map(
    (state.cardInstances?.instances ?? []).map(
      (instance) => [
        instance.instanceId,
        instance,
      ]
    )
  );

  const attachments = new Map<
    string,
    string[]
  >();

  for (const attachment of state.xyzMaterials ?? []) {
    const existing =
      attachments.get(attachment.xyzInstanceId) ?? [];

    attachments.set(
      attachment.xyzInstanceId,
      [
        ...existing,
        ...attachment.materialInstanceIds,
      ]
    );
  }

  const monsters: EndBoardMonster[] = [];

  state.fieldState?.monsterZones.forEach(
    (slot, zoneIndex) => {
      if (!slot) return;

      const xyzMaterials = (
        attachments.get(slot.instanceId) ?? []
      ).flatMap((instanceId) => {
        const material = instances.get(instanceId);

        if (!material) return [];

        return [{
          cardId: material.cardId,
          instanceId: material.instanceId,
        }];
      });

      monsters.push({
        cardId: slot.cardId,
        instanceId: slot.instanceId,
        zoneIndex,
        position: slot.position,
        xyzMaterials,
      });
    }
  );

  const spellTraps: EndBoardSpellTrap[] = [];

  state.fieldState?.spellTrapZones.forEach(
    (slot, zoneIndex) => {
      if (!slot) return;

      spellTraps.push({
        cardId: slot.cardId,
        instanceId: slot.instanceId,
        zoneIndex,
        position: slot.position,
      });
    }
  );

  const fieldSpellSlot =
    state.fieldState?.fieldSpellZone;

  const fieldSpell: EndBoardSpellTrap | null =
    fieldSpellSlot
      ? {
          cardId: fieldSpellSlot.cardId,
          instanceId: fieldSpellSlot.instanceId,
          zoneIndex: 0,
          position: fieldSpellSlot.position,
        }
      : null;

  const resources = {} as EndBoardResources;

  for (const zone of RESOURCE_ZONES) {
    const cardIds = [...state.zones[zone]];

    resources[zone] = {
      cardIds,
      count: cardIds.length,
    };
  }

  return {
    complete: warnings.length === 0,
    warnings,

    monsters,
    spellTraps,
    fieldSpell,

    monsterCount: monsters.length,
    spellTrapCount:
      spellTraps.length + (fieldSpell ? 1 : 0),

    xyzMaterialCount: monsters.reduce(
      (total, monster) =>
        total + monster.xyzMaterials.length,
      0
    ),

    resources,

    normalSummonUsed: state.normalSummonUsed,
    usedEffects: [...state.usedEffects],

    effectUsage: (state.effectUsage ?? []).map(
      (usage) => ({ ...usage })
    ),

    restrictions: (state.restrictions ?? []).map(
      (restriction) => ({ ...restriction })
    ),

    turnState: state.turnState
      ? { ...state.turnState }
      : null,
  };
}