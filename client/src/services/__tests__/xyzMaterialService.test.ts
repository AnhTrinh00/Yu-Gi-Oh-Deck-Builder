import { describe, expect, it } from "vitest";

import type { GameState } from "../../models/GameState";

import {
  initializeCardInstances,
  validateCardInstanceSync,
} from "../simulation/cardInstanceService";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  isFieldSynchronized,
  placeCardOnField,
} from "../simulation/field/fieldZoneService";

import {
  attachXyzMaterials,
  detachXyzMaterial,
  getAttachedXyzMaterials,
} from "../simulation/summon/xyzMaterialService";

function createState(): GameState {
  const initial: GameState = {
    zones: {
      hand: [100, 200],
      deck: [],
      extra: [],
      field: [900],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
    fieldState: {
      monsterZones: [
        {
          cardId: 900,
          instanceId: "xyz-900",
          position: "face-up-attack",
        },
        null,
        null,
        null,
        null,
      ],
      spellTrapZones: Array(5).fill(null),
      fieldSpellZone: null,
    },
    xyzMaterials: [],
  };

  const result = initializeCardInstances(
    normalizeGameState(initial)
  );

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.state;
}

function placeMaterial(
  state: GameState,
  cardId: number,
  zoneIndex: number
): GameState {
  const instance = state.cardInstances?.instances.find(
    item =>
      item.cardId === cardId &&
      item.zone === "hand"
  );

  if (!instance) {
    throw new Error("Material not found.");
  }

  const placed = placeCardOnField(state, {
    cardId,
    instanceId: instance.instanceId,
    from: "hand",
    zoneType: "monster",
    zoneIndex,
  });

  if (!placed.success) {
    throw new Error(placed.error);
  }

  const next = normalizeGameState(placed.state);

  const tracked = next.cardInstances!.instances.find(
    item => item.instanceId === instance.instanceId
  )!;

  tracked.zone = "field";

  return next;
}

function setup() {
  let state = createState();

  state = placeMaterial(state, 100, 1);
  state = placeMaterial(state, 200, 2);

  const first = state.cardInstances!.instances.find(
    item => item.cardId === 100
  )!.instanceId;

  const second = state.cardInstances!.instances.find(
    item => item.cardId === 200
  )!.instanceId;

  return {
    state,
    first,
    second,
  };
}

describe("xyzMaterialService", () => {
  it("attaches two physical materials", () => {
    const { state, first, second } = setup();

    const result = attachXyzMaterials(
      state,
      "xyz-900",
      [first, second]
    );

    expect(result.success, result.error).toBe(true);

    expect(
      getAttachedXyzMaterials(
        result.state,
        "xyz-900"
      )
    ).toEqual([first, second]);

    const attachedInstances =
      result.state.cardInstances?.instances.filter(
        instance => instance.zone === "overlay"
      ) ?? [];

    expect(
      attachedInstances.map(instance => instance.cardId)
    ).toEqual([100, 200]);

    expect(result.state.zones.field).toEqual([900]);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);

    expect(
      isFieldSynchronized(result.state)
    ).toBe(true);
  });

  it("detaches a specific material", () => {
    const { state, first, second } = setup();

    const attached = attachXyzMaterials(
      state,
      "xyz-900",
      [first, second]
    );

    expect(attached.success, attached.error).toBe(true);

    const detached = detachXyzMaterial(
      attached.state,
      "xyz-900",
      first
    );

    expect(detached.success, detached.error).toBe(true);

    expect(detached.state.zones.graveyard).toEqual([
      100,
    ]);

    const remainingOverlayInstances =
      detached.state.cardInstances?.instances.filter(
        instance => instance.zone === "overlay"
      ) ?? [];

    expect(
      remainingOverlayInstances.map(instance => instance.cardId)
    ).toEqual([200]);

    expect(
      getAttachedXyzMaterials(
        detached.state,
        "xyz-900"
      )
    ).toEqual([second]);

    expect(
      validateCardInstanceSync(detached.state)
    ).toEqual([]);
  });

  it("rejects duplicate material selection", () => {
    const { state, first } = setup();

    const result = attachXyzMaterials(
      state,
      "xyz-900",
      [first, first]
    );

    expect(result.success).toBe(false);
    expect(result.state).toBe(state);
  });

  it("rejects detaching a material from the wrong host", () => {
    const { state, first, second } = setup();

    const attached = attachXyzMaterials(
      state,
      "xyz-900",
      [first, second]
    );

    expect(attached.success).toBe(true);

    const result = detachXyzMaterial(
      attached.state,
      "another-xyz",
      first
    );

    expect(result.success).toBe(false);
    expect(result.state).toBe(attached.state);
  });

  it("preserves the original state", () => {
    const { state, first, second } = setup();
    const original = structuredClone(state);

    attachXyzMaterials(
      state,
      "xyz-900",
      [first, second]
    );

    expect(state).toEqual(original);
  });

  it("rejects face-down materials", () => {
    const { state, first, second } = setup();

    const next = normalizeGameState(state);

    const slot = next.fieldState!.monsterZones[1]!;

    slot.position = "face-down-defense";

    const result = attachXyzMaterials(
      next,
      "xyz-900",
      [first, second]
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/face-up monster/);
  });
});