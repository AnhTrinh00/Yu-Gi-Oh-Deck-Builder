import { describe, expect, it } from "vitest";

import type { GameState } from "../../models/GameState";

import {
  initializeCardInstances,
  validateCardInstanceSync,
} from "../cardInstanceService";

import {
  normalizeGameState,
} from "../extendedGameStateService";

import {
  placeCardInstanceOnField,
} from "../fieldInstanceService";

import {
  attachXyzMaterials,
  getAttachedXyzMaterials,
} from "../xyzMaterialService";

import {
  payXyzDetachCost,
} from "../xyzDetachCostService";

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
    throw new Error(
      result.error ?? "Initialization failed."
    );
  }

  return result.state;
}

function getInstanceId(
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
    throw new Error(
      result.error ?? "Placement failed."
    );
  }

  return result.state;
}

function setup() {
  let state = createState();

  const hostId = getInstanceId(state, 900);

  const materialIds = [
    getInstanceId(state, 100),
    getInstanceId(state, 200),
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
    throw new Error(
      attached.error ?? "Attachment failed."
    );
  }

  return {
    state: attached.state,
    hostId,
    materialIds,
  };
}

describe("xyzDetachCostService", () => {
  it("detaches one material as a cost", () => {
    const { state, hostId, materialIds } = setup();

    const result = payXyzDetachCost(state, {
      xyzInstanceId: hostId,
      materialInstanceId: materialIds[0],
    });

    expect(result.success, result.error).toBe(true);

    expect(result.detachedInstanceId).toBe(
      materialIds[0]
    );

    expect(
      getAttachedXyzMaterials(
        result.state,
        hostId
      )
    ).toEqual([materialIds[1]]);

    expect(result.state.zones.graveyard).toEqual([
      100,
    ]);

    expect(
      result.state.cardInstances?.instances.find(
        instance =>
          instance.instanceId === materialIds[0]
      )?.zone
    ).toBe("graveyard");

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("rejects a material attached to a different host", () => {
    const { state, materialIds } = setup();

    const result = payXyzDetachCost(state, {
      xyzInstanceId: "nonexistent-host",
      materialInstanceId: materialIds[0],
    });

    expect(result.success).toBe(false);
    expect(result.state).toBe(state);
  });

  it("rejects a material that is not attached", () => {
    const { state, hostId } = setup();

    const result = payXyzDetachCost(state, {
      xyzInstanceId: hostId,
      materialInstanceId: "missing-material",
    });

    expect(result.success).toBe(false);
    expect(result.state).toBe(state);
  });

  it("does not mutate the original game state", () => {
    const { state, hostId, materialIds } = setup();

    const original = structuredClone(state);

    const result = payXyzDetachCost(state, {
      xyzInstanceId: hostId,
      materialInstanceId: materialIds[0],
    });

    expect(result.success, result.error).toBe(true);
    expect(state).toEqual(original);
  });

  it("cannot pay the same detachment cost twice", () => {
    const { state, hostId, materialIds } = setup();

    const first = payXyzDetachCost(state, {
      xyzInstanceId: hostId,
      materialInstanceId: materialIds[0],
    });

    expect(first.success, first.error).toBe(true);

    const second = payXyzDetachCost(first.state, {
      xyzInstanceId: hostId,
      materialInstanceId: materialIds[0],
    });

    expect(second.success).toBe(false);
    expect(second.state).toBe(first.state);
  });
});