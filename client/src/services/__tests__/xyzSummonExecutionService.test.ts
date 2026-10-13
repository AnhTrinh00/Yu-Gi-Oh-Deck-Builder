import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  GameState,
} from "../../models/simulation/GameState";

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
  executeXyzSummonTransaction,
} from "../simulation/summon/xyzSummonExecutionService";

import {
  getAttachedXyzMaterials,
  detachXyzMaterial,
} from "../simulation/summon/xyzMaterialService";

function createState(
  materialCardIds: number[] = [100, 200]
): GameState {
  const initial: GameState = {
    zones: {
      hand: [...materialCardIds],
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

  const initialized = initializeCardInstances(
    normalizeGameState(initial)
  );

  if (!initialized.success) {
    throw new Error(
      initialized.error ?? "Initialization failed."
    );
  }

  return initialized.state;
}

function instanceId(
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

function placeMaterial(
  state: GameState,
  cardId: number,
  zoneIndex: number
): GameState {
  const id = instanceId(state, cardId);

  const placed = placeCardOnField(state, {
    cardId,
    instanceId: id,
    from: "hand",
    zoneType: "monster",
    zoneIndex,
    position: "face-up-attack",
  });

  if (!placed.success) {
    throw new Error(
      placed.error ?? "Material placement failed."
    );
  }

  const next = normalizeGameState(placed.state);

  const tracked = next.cardInstances!.instances.find(
    item => item.instanceId === id
  )!;

  tracked.zone = "field";

  return next;
}

function setup(
  materialCardIds: number[] = [100, 200]
) {
  let state = createState(materialCardIds);

  materialCardIds.forEach((cardId, index) => {
    state = placeMaterial(state, cardId, index);
  });

  return {
    state,
    monsterId: instanceId(state, 900),
    materialIds: materialCardIds.map(
      cardId => instanceId(state, cardId)
    ),
  };
}

describe("xyzSummonExecutionService", () => {
  it("summons an Xyz Monster with attached materials", () => {
    const { state, monsterId, materialIds } =
      setup();

    const result = executeXyzSummonTransaction(
      state,
      {
        monsterInstanceId: monsterId,
        monsterCardId: 900,
        materialInstanceIds: materialIds,
      }
    );

    expect(result.success, result.error).toBe(true);

    expect(result.state.zones.field).toEqual([
      900,
    ]);

    expect(result.state.zones.extra).toEqual([]);

    expect(result.state.zones.graveyard).toEqual([]);

    expect(
      getAttachedXyzMaterials(
        result.state,
        monsterId
      )
    ).toEqual(materialIds);

    for (const id of materialIds) {
      expect(
        result.state.cardInstances?.instances.find(
          item => item.instanceId === id
        )?.zone
      ).toBe("overlay");
    }

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);

    expect(
      isFieldSynchronized(result.state)
    ).toBe(true);
  });

  it("can summon when all five Monster Zones were occupied", () => {
    const {
      state,
      monsterId,
      materialIds,
    } = setup([100, 200, 300, 400, 500]);

    const result = executeXyzSummonTransaction(
      state,
      {
        monsterInstanceId: monsterId,
        monsterCardId: 900,
        materialInstanceIds: materialIds.slice(0, 2),
      }
    );

    expect(result.success, result.error).toBe(true);

    expect(result.state.zones.field).toHaveLength(4);

    expect(
      result.state.fieldState?.monsterZones.filter(
        slot => slot !== null
      )
    ).toHaveLength(4);

    expect(
      getAttachedXyzMaterials(
        result.state,
        monsterId
      )
    ).toEqual(materialIds.slice(0, 2));

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("rejects face-down materials", () => {
    const { state, monsterId, materialIds } =
      setup();

    const modified = normalizeGameState(state);

    modified.fieldState!.monsterZones[0]!.position =
      "face-down-defense";

    const result = executeXyzSummonTransaction(
      modified,
      {
        monsterInstanceId: monsterId,
        monsterCardId: 900,
        materialInstanceIds: materialIds,
      }
    );

    expect(result.success).toBe(false);
    expect(result.state).toBe(modified);
  });

  it("rejects duplicate physical materials", () => {
    const { state, monsterId, materialIds } =
      setup();

    const result = executeXyzSummonTransaction(
      state,
      {
        monsterInstanceId: monsterId,
        monsterCardId: 900,
        materialInstanceIds: [
          materialIds[0],
          materialIds[0],
        ],
      }
    );

    expect(result.success).toBe(false);
    expect(result.state).toBe(state);
  });

  it("rolls back when the requested Monster Zone is occupied", () => {
    const { state, monsterId, materialIds } =
      setup([100, 200, 300]);

    const original = structuredClone(state);

    const result = executeXyzSummonTransaction(
      state,
      {
        monsterInstanceId: monsterId,
        monsterCardId: 900,
        materialInstanceIds: materialIds.slice(0, 2),
        monsterZoneIndex: 2,
      }
    );

    expect(result.success).toBe(false);
    expect(result.state).toBe(state);
    expect(state).toEqual(original);
  });

  it("preserves instance identities after detachment", () => {
    const { state, monsterId, materialIds } =
      setup();

    const summoned = executeXyzSummonTransaction(
      state,
      {
        monsterInstanceId: monsterId,
        monsterCardId: 900,
        materialInstanceIds: materialIds,
      }
    );

    expect(
      summoned.success,
      summoned.error
    ).toBe(true);

    const detached = detachXyzMaterial(
      summoned.state,
      monsterId,
      materialIds[0]
    );

    expect(
      detached.success,
      detached.error
    ).toBe(true);

    expect(
      detached.state.cardInstances?.instances.find(
        item => item.instanceId === materialIds[0]
      )?.zone
    ).toBe("graveyard");

    expect(
      getAttachedXyzMaterials(
        detached.state,
        monsterId
      )
    ).toEqual([materialIds[1]]);

    expect(
      validateCardInstanceSync(detached.state)
    ).toEqual([]);
  });

  it("does not mutate the original state", () => {
    const { state, monsterId, materialIds } =
      setup();

    const original = structuredClone(state);

    const result = executeXyzSummonTransaction(
      state,
      {
        monsterInstanceId: monsterId,
        monsterCardId: 900,
        materialInstanceIds: materialIds,
      }
    );

    expect(result.success, result.error).toBe(true);
    expect(state).toEqual(original);
  });
});