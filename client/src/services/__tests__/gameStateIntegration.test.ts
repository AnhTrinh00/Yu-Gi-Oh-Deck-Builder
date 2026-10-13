
import { describe, expect, it } from "vitest";

import type { GameState } from "../../models/simulation/GameState";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  getCardInstance,
  getInstancesInZone,
  initializeCardInstances,
  moveCardInstance,
  validateCardInstanceSync,
} from "../simulation/cardInstanceService";

import {
  placeCardInstanceOnField,
  removeCardInstanceFromField,
} from "../simulation/field/fieldInstanceService";

import {
  cloneGameState,
} from "../simulation/gameStateService";

function createState(): GameState {
  return normalizeGameState({
    zones: {
      hand: [100, 100],
      deck: [200],
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

function initialize(): GameState {
  const result = initializeCardInstances(createState());

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.state;
}

describe("Phase 4 game-state integration", () => {
  it("preserves identity across a complete movement sequence", () => {
    const initial = initialize();

    const instance = getInstancesInZone(
      initial,
      "hand"
    )[0];

    const placed = placeCardInstanceOnField(
      initial,
      {
        instanceId: instance.instanceId,
        zoneType: "monster",
        zoneIndex: 0,
      }
    );

    expect(placed.success).toBe(true);

    const sent = removeCardInstanceFromField(
      placed.state,
      {
        instanceId: instance.instanceId,
        to: "graveyard",
      }
    );

    expect(sent.success).toBe(true);

    const returned = moveCardInstance(
      sent.state,
      instance.instanceId,
      "hand"
    );

    expect(returned.success).toBe(true);

    expect(
      getCardInstance(
        returned.state,
        instance.instanceId
      )
    ).toEqual({
      instanceId: instance.instanceId,
      cardId: 100,
      zone: "hand",
    });

    expect(returned.state.zones.hand).toEqual([
      100,
      100,
    ]);

    expect(returned.state.zones.field).toEqual([]);
    expect(returned.state.zones.graveyard).toEqual([]);

    expect(
      validateCardInstanceSync(returned.state)
    ).toEqual([]);
  });

  it("preserves separate identities for duplicate cards", () => {
    const initial = initialize();

    const copies = getInstancesInZone(
      initial,
      "hand"
    );

    const first = placeCardInstanceOnField(
      initial,
      {
        instanceId: copies[0].instanceId,
        zoneType: "monster",
        zoneIndex: 0,
      }
    );

    const second = placeCardInstanceOnField(
      first.state,
      {
        instanceId: copies[1].instanceId,
        zoneType: "monster",
        zoneIndex: 1,
      }
    );

    expect(second.success).toBe(true);

    expect(
      second.state.fieldState!.monsterZones[0]
        ?.instanceId
    ).toBe(copies[0].instanceId);

    expect(
      second.state.fieldState!.monsterZones[1]
        ?.instanceId
    ).toBe(copies[1].instanceId);

    expect(
      validateCardInstanceSync(second.state)
    ).toEqual([]);
  });

  it("preserves synchronization across multiple movements", () => {
    const initial = initialize();

    const instance = getInstancesInZone(
      initial,
      "hand"
    )[0];

    const placed = placeCardInstanceOnField(
      initial,
      {
        instanceId: instance.instanceId,
        zoneType: "monster",
        zoneIndex: 2,
      }
    );

    expect(
      validateCardInstanceSync(placed.state)
    ).toEqual([]);

    const removed = removeCardInstanceFromField(
      placed.state,
      {
        instanceId: instance.instanceId,
        to: "banished",
      }
    );

    expect(
      validateCardInstanceSync(removed.state)
    ).toEqual([]);

    const returned = moveCardInstance(
      removed.state,
      instance.instanceId,
      "graveyard"
    );

    expect(
      validateCardInstanceSync(returned.state)
    ).toEqual([]);
  });

  it("deep-clones extended state and card instances", () => {
    const original = initialize();

    const cloned = cloneGameState(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);

    cloned.cardInstances!.instances[0].zone =
      "banished";

    cloned.fieldState!.monsterZones[0] = {
      cardId: 100,
      instanceId: "test-slot",
      position: "face-up-attack",
    };

    cloned.turnState!.turnNumber = 10;

    expect(
      original.cardInstances!.instances[0].zone
    ).toBe("hand");

    expect(
      original.fieldState!.monsterZones[0]
    ).toBeNull();

    expect(original.turnState!.turnNumber).toBe(1);
  });

  it("preserves the original state after a failed placement", () => {
    const original = initialize();

    const instance = getInstancesInZone(
      original,
      "hand"
    )[0];

    const before = cloneGameState(original);

    const result = placeCardInstanceOnField(
      original,
      {
        instanceId: instance.instanceId,
        zoneType: "monster",
        zoneIndex: 99,
      }
    );

    expect(result.success).toBe(false);
    expect(result.state).toBe(original);
    expect(original).toEqual(before);
  });

  it("rejects inconsistent instance data", () => {
    const state = initialize();

    state.zones.hand.push(999);

    const instance = getInstancesInZone(
      state,
      "hand"
    )[0];

    const result = placeCardInstanceOnField(
      state,
      {
        instanceId: instance.instanceId,
        zoneType: "monster",
        zoneIndex: 0,
      }
    );

    expect(result.success).toBe(false);

    expect(
      validateCardInstanceSync(state).length
    ).toBeGreaterThan(0);
  });
});
