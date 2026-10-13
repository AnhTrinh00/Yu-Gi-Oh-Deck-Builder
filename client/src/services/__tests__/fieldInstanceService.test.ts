
import { describe, expect, it } from "vitest";

import type { GameState } from "../../models/simulation/GameState";

import { normalizeGameState } from "../simulation/extendedGameStateService";

import {
  getCardInstance,
  getInstancesInZone,
  initializeCardInstances,
  validateCardInstanceSync,
} from "../simulation/cardInstanceService";

import {
  placeCardInstanceOnField,
  removeCardInstanceFromField,
} from "../simulation/field/fieldInstanceService";

function createState(): GameState {
  return normalizeGameState({
    zones: {
      hand: [100, 100, 200],
      deck: [],
      extra: [],
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  });
}

function initializedState(): GameState {
  const result = initializeCardInstances(createState());

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.state;
}

describe("fieldInstanceService", () => {
  it("places a tracked monster onto the field", () => {
    const state = initializedState();
    const instance = getInstancesInZone(state, "hand")[0];

    const result = placeCardInstanceOnField(state, {
      instanceId: instance.instanceId,
      zoneType: "monster",
      zoneIndex: 0,
    });

    expect(result.success).toBe(true);
    expect(result.state.zones.field).toEqual([100]);

    expect(
      result.state.fieldState!.monsterZones[0]?.instanceId
    ).toBe(instance.instanceId);

    expect(
      getCardInstance(result.state, instance.instanceId)?.zone
    ).toBe("field");

    expect(validateCardInstanceSync(result.state)).toEqual([]);
  });

  it("preserves identity when moving to the graveyard", () => {
    const state = initializedState();
    const instance = getInstancesInZone(state, "hand")[0];

    const placed = placeCardInstanceOnField(state, {
      instanceId: instance.instanceId,
      zoneType: "monster",
      zoneIndex: 0,
    });

    const removed = removeCardInstanceFromField(
      placed.state,
      {
        instanceId: instance.instanceId,
        to: "graveyard",
      }
    );

    expect(removed.success).toBe(true);
    expect(removed.state.zones.graveyard).toEqual([100]);

    expect(
      getCardInstance(
        removed.state,
        instance.instanceId
      )?.zone
    ).toBe("graveyard");

    expect(validateCardInstanceSync(removed.state)).toEqual([]);
  });

  it("distinguishes duplicate copies", () => {
    const state = initializedState();
    const copies = getInstancesInZone(state, "hand");

    const placed = placeCardInstanceOnField(state, {
      instanceId: copies[1].instanceId,
      zoneType: "monster",
      zoneIndex: 0,
    });

    expect(placed.success).toBe(true);

    expect(
      getCardInstance(placed.state, copies[0].instanceId)?.zone
    ).toBe("hand");

    expect(
      getCardInstance(placed.state, copies[1].instanceId)?.zone
    ).toBe("field");
  });

  it("rejects occupied zones", () => {
    const state = initializedState();
    const copies = getInstancesInZone(state, "hand");

    const first = placeCardInstanceOnField(state, {
      instanceId: copies[0].instanceId,
      zoneType: "monster",
      zoneIndex: 0,
    });

    const second = placeCardInstanceOnField(first.state, {
      instanceId: copies[1].instanceId,
      zoneType: "monster",
      zoneIndex: 0,
    });

    expect(second.success).toBe(false);
    expect(second.state).toBe(first.state);
  });

  it("rejects unknown instances", () => {
    const result = placeCardInstanceOnField(
      initializedState(),
      {
        instanceId: "unknown",
        zoneType: "monster",
        zoneIndex: 0,
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("rejects placing an instance already on the field", () => {
    const state = initializedState();
    const instance = getInstancesInZone(state, "hand")[0];

    const first = placeCardInstanceOnField(state, {
      instanceId: instance.instanceId,
      zoneType: "monster",
      zoneIndex: 0,
    });

    const second = placeCardInstanceOnField(first.state, {
      instanceId: instance.instanceId,
      zoneType: "monster",
      zoneIndex: 1,
    });

    expect(second.success).toBe(false);
  });

  it("rejects removing an instance not on the field", () => {
    const state = initializedState();
    const instance = getInstancesInZone(state, "hand")[0];

    const result = removeCardInstanceFromField(state, {
      instanceId: instance.instanceId,
      to: "graveyard",
    });

    expect(result.success).toBe(false);
  });

  it("does not mutate the original state", () => {
    const state = initializedState();
    const instance = getInstancesInZone(state, "hand")[0];

    const result = placeCardInstanceOnField(state, {
      instanceId: instance.instanceId,
      zoneType: "monster",
      zoneIndex: 0,
    });

    expect(result.success).toBe(true);
    expect(state.zones.field).toEqual([]);

    expect(
      getCardInstance(state, instance.instanceId)?.zone
    ).toBe("hand");
  });

  it("supports moving a tracked Spell/Trap", () => {
    const state = initializedState();
    const instance = getInstancesInZone(state, "hand")
      .find((item) => item.cardId === 200)!;

    const placed = placeCardInstanceOnField(state, {
      instanceId: instance.instanceId,
      zoneType: "spell-trap",
      zoneIndex: 1,
      position: "face-down",
    });

    expect(placed.success).toBe(true);

    expect(
      placed.state.fieldState!.spellTrapZones[1]?.position
    ).toBe("face-down");

    const removed = removeCardInstanceFromField(
      placed.state,
      {
        instanceId: instance.instanceId,
        to: "graveyard",
      }
    );

    expect(removed.success).toBe(true);
    expect(validateCardInstanceSync(removed.state)).toEqual([]);
  });
});
