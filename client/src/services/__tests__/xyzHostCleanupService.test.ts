import { describe, expect, it } from "vitest";

import type { GameState } from "../../models/simulation/GameState";

import {
  initializeCardInstances,
  validateCardInstanceSync,
} from "../simulation/cardInstanceService";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  isFieldSynchronized,
} from "../simulation/field/fieldZoneService";

import {
  placeCardInstanceOnField,
  removeCardInstanceFromField,
} from "../simulation/field/fieldInstanceService";

import {
  attachXyzMaterials,
  getAttachedXyzMaterials,
} from "../simulation/summon/xyzMaterialService";

import {
  releaseXyzMaterialsOnHostExit,
} from "../simulation/summon/xyzHostCleanupService";

function createState(): GameState {
  const initial: GameState = {
    zones: {
      hand: [100, 200],
      deck: [],
      extra: [900],
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  };

  const result = initializeCardInstances(
    normalizeGameState(initial)
  );

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.state;
}

function findInstanceId(
  state: GameState,
  cardId: number
): string {
  const instance = state.cardInstances?.instances.find(
    item => item.cardId === cardId
  );

  if (!instance) {
    throw new Error(`Missing card ${cardId}.`);
  }

  return instance.instanceId;
}

function place(
  state: GameState,
  instanceId: string,
  zoneIndex: number
): GameState {
  const result = placeCardInstanceOnField(state, {
    instanceId,
    zoneType: "monster",
    zoneIndex,
    position: "face-up-attack",
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.state;
}

function setup() {
  let state = createState();

  const hostId = findInstanceId(state, 900);

  const materialIds = [
    findInstanceId(state, 100),
    findInstanceId(state, 200),
  ];

  state = place(state, hostId, 0);
  state = place(state, materialIds[0], 1);
  state = place(state, materialIds[1], 2);

  const attached = attachXyzMaterials(
    state,
    hostId,
    materialIds
  );

  if (!attached.success) {
    throw new Error(attached.error);
  }

  return {
    state: attached.state,
    hostId,
    materialIds,
  };
}

describe("Xyz host removal cleanup", () => {
  it("sends all remaining materials to the Graveyard", () => {
    const { state, hostId, materialIds } = setup();

    const result = removeCardInstanceFromField(
      state,
      {
        instanceId: hostId,
        to: "graveyard",
      }
    );

    expect(result.success, result.error).toBe(true);

    expect(result.state.zones.graveyard).toEqual([
      100,
      200,
      900,
    ]);

    expect(result.state.zones.field).toEqual([]);

    expect(
      getAttachedXyzMaterials(result.state, hostId)
    ).toEqual([]);

    for (const id of materialIds) {
      expect(
        result.state.cardInstances?.instances.find(
          item => item.instanceId === id
        )?.zone
      ).toBe("graveyard");
    }

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);

    expect(
      isFieldSynchronized(result.state)
    ).toBe(true);
  });

  it("sends materials to the Graveyard when the host is banished", () => {
    const { state, hostId } = setup();

    const result = removeCardInstanceFromField(
      state,
      {
        instanceId: hostId,
        to: "banished",
      }
    );

    expect(result.success, result.error).toBe(true);

    expect(result.state.zones.banished).toEqual([900]);
    expect(result.state.zones.graveyard).toEqual([
      100,
      200,
    ]);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("sends materials to the Graveyard when the host returns to hand", () => {
    const { state, hostId } = setup();

    const result = removeCardInstanceFromField(
      state,
      {
        instanceId: hostId,
        to: "hand",
      }
    );

    expect(result.success, result.error).toBe(true);

    expect(result.state.zones.hand).toContain(900);
    expect(result.state.zones.graveyard).toEqual([
      100,
      200,
    ]);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("does not mutate the original state", () => {
    const { state, hostId } = setup();

    const original = structuredClone(state);

    const result = removeCardInstanceFromField(
      state,
      {
        instanceId: hostId,
        to: "graveyard",
      }
    );

    expect(result.success, result.error).toBe(true);
    expect(state).toEqual(original);
  });

  it("rejects a missing overlay material without changing the state", () => {
    const { state, hostId, materialIds } = setup();

    const corrupted = structuredClone(state);

    const material =
      corrupted.cardInstances!.instances.find(
        item => item.instanceId === materialIds[0]
      )!;

    material.zone = "hand";

    const original = structuredClone(corrupted);

    const result = releaseXyzMaterialsOnHostExit(
      corrupted,
      hostId
    );

    expect(result.success).toBe(false);
    expect(result.state).toBe(corrupted);
    expect(corrupted).toEqual(original);
  });

  it("does not affect a monster without Xyz Materials", () => {
    let state = createState();

    const monsterId = findInstanceId(state, 100);

    state = place(state, monsterId, 0);

    const result = removeCardInstanceFromField(
      state,
      {
        instanceId: monsterId,
        to: "graveyard",
      }
    );

    expect(result.success, result.error).toBe(true);
    expect(result.state.zones.graveyard).toEqual([100]);
    expect(result.state.xyzMaterials ?? []).toEqual([]);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });
});