import {
  describe,
  expect,
  it,
} from "vitest";

import type { Card } from "../../models/card/Card";
import type { GameState } from "../../models/simulation/GameState";

import type {
  SummonMaterialRequirement,
} from "../../models/simulation/SummonMaterial";

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
  executeExtraDeckSummon,
} from "../simulation/summon/extraDeckSummonService";

// --------------------------------------------------
// Test Helpers
// --------------------------------------------------

function createState(): GameState {
  const state: GameState = {
    zones: {
      hand: [100, 200, 300],
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
    normalizeGameState(state)
  );

  if (!initialized.success) {
    throw new Error(initialized.error);
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
    throw new Error(`Missing Card ${cardId}`);
  }

  return instance.instanceId;
}

function requirement(
  overrides: Partial<SummonMaterialRequirement> = {}
): SummonMaterialRequirement {
  return {
    summonType: "fusion",
    minimumMaterials: 2,
    maximumMaterials: 2,
    allowedZones: ["hand"],
    ...overrides,
  };
}

function makeCard(
  id: number,
  type: string,
  overrides: Partial<Card> = {}
): Card {
  return {
    id,
    name: `Test Card ${id}`,
    type,
    frameType: "effect",
    description: "",
    race: "Dragon",
    imageUrl: "",
    imageUrlSmall: "",
    ...overrides,
  };
}

function fusionSummonRules(
  materialIds: string[]
) {
  return {
    summonedMonster: makeCard(
      900,
      "Fusion Monster",
      {
        frameType: "fusion",
      }
    ),

    materials: materialIds.map(
      (instanceId, index) => ({
        instanceId,
        card: makeCard(
          index === 0 ? 100 : 200,
          "Effect Monster"
        ),
      })
    ),
  };
}

function synchroSummonRules(
  materialIds: string[]
) {
  return {
    summonedMonster: makeCard(
      900,
      "Synchro Monster",
      {
        frameType: "synchro",
        level: 8,
      }
    ),

    materials: [
      {
        instanceId: materialIds[0],
        card: makeCard(
          100,
          "Tuner Monster",
          {
            level: 3,
          }
        ),
      },
      {
        instanceId: materialIds[1],
        card: makeCard(
          200,
          "Effect Monster",
          {
            level: 5,
          }
        ),
      },
    ],
  };
}

/**
 * Places a monster from the hand onto the field
 * and synchronizes its tracked physical instance.
 */
function placeMonster(
  state: GameState,
  cardId: number,
  zoneIndex: number
): GameState {
  const id = instanceId(state, cardId);

  const placed = placeCardOnField(
    state,
    {
      cardId,
      instanceId: id,
      from: "hand",
      zoneType: "monster",
      zoneIndex,
    }
  );

  if (!placed.success) {
    throw new Error(
      placed.error ?? "Monster placement failed."
    );
  }

  const next = normalizeGameState(placed.state);

  const instance = next.cardInstances?.instances.find(
    item => item.instanceId === id
  );

  if (!instance) {
    throw new Error("Missing instance");
  }

  instance.zone = "field";

  return next;
}

// --------------------------------------------------
// Tests
// --------------------------------------------------

describe("extraDeckSummonService", () => {
  it("summons a Fusion monster using hand materials", () => {
    const state = createState();

    const materialIds = [
      instanceId(state, 100),
      instanceId(state, 200),
    ];

    const monsterId = instanceId(state, 900);

    const result = executeExtraDeckSummon(
      state,
      {
        monsterInstanceId: monsterId,
        monsterCardId: 900,

        requirement: requirement(),

        materials: {
          instanceIds: materialIds,
        },

        summonRules: fusionSummonRules(
          materialIds
        ),
      }
    );

    expect(
      result.error,
      result.error ?? "Fusion summon failed."
    ).toBeUndefined();

    expect(result.success).toBe(true);

    expect(result.state.zones.graveyard).toEqual([
      100,
      200,
    ]);

    expect(result.state.zones.field).toEqual([
      900,
    ]);

    expect(result.state.zones.extra).toEqual([]);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);

    expect(
      isFieldSynchronized(result.state)
    ).toBe(true);
  });

  it("uses field materials for a Synchro summon", () => {
    let state = createState();

    state = placeMonster(state, 100, 0);
    state = placeMonster(state, 200, 1);

    const materialIds = [
      instanceId(state, 100),
      instanceId(state, 200),
    ];

    const result = executeExtraDeckSummon(
      state,
      {
        monsterInstanceId: instanceId(
          state,
          900
        ),

        monsterCardId: 900,

        requirement: requirement({
          summonType: "synchro",
          allowedZones: ["field"],
        }),

        materials: {
          instanceIds: materialIds,
        },

        summonRules: synchroSummonRules(
          materialIds
        ),
      }
    );

    expect(
      result.error,
      result.error ?? "Synchro summon failed."
    ).toBeUndefined();

    expect(result.success).toBe(true);

    expect(result.state.zones.graveyard).toEqual([
      100,
      200,
    ]);

    expect(
      result.state.fieldState?.monsterZones[0]
        ?.cardId
    ).toBe(900);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);

    expect(
      isFieldSynchronized(result.state)
    ).toBe(true);
  });

  it("rolls back when the material count is invalid", () => {
    const state = createState();

    const materialIds = [
      instanceId(state, 100),
    ];

    const result = executeExtraDeckSummon(
      state,
      {
        monsterInstanceId: instanceId(
          state,
          900
        ),

        monsterCardId: 900,

        requirement: requirement(),

        materials: {
          instanceIds: materialIds,
        },

        summonRules: fusionSummonRules(
          materialIds
        ),
      }
    );

    expect(result.success).toBe(false);

    expect(result.state).toBe(state);

    expect(state.zones.graveyard).toEqual([]);

    expect(state.zones.extra).toEqual([900]);
  });

  it("rejects Xyz summons with materials in the hand", () => {
    const state = createState();

    const materialIds = [
      instanceId(state, 100),
      instanceId(state, 200),
    ];

    const result = executeExtraDeckSummon(state, {
      monsterInstanceId: instanceId(state, 900),
      monsterCardId: 900,

      requirement: requirement({
        summonType: "xyz",
        allowedZones: ["field"],
      }),

      materials: {
        instanceIds: materialIds,
      },

      summonRules: {
        summonedMonster: makeCard(
          900,
          "XYZ Monster",
          {
            frameType: "xyz",
            level: 4,
          }
        ),
        materials: [
          {
            instanceId: materialIds[0],
            card: makeCard(
              100,
              "Effect Monster",
              { level: 4 }
            ),
          },
          {
            instanceId: materialIds[1],
            card: makeCard(
              200,
              "Effect Monster",
              { level: 4 }
            ),
          },
        ],
      },
    });

    expect(result.success).toBe(false);
    expect(result.state).toBe(state);
  });

  it("preserves physical instance identities", () => {
    const state = createState();

    const monsterId = instanceId(state, 900);
    const firstId = instanceId(state, 100);
    const secondId = instanceId(state, 200);

    const materialIds = [
      firstId,
      secondId,
    ];

    const result = executeExtraDeckSummon(
      state,
      {
        monsterInstanceId: monsterId,
        monsterCardId: 900,

        requirement: requirement(),

        materials: {
          instanceIds: materialIds,
        },

        summonRules: fusionSummonRules(
          materialIds
        ),
      }
    );

    expect(
      result.error,
      result.error ?? "Summon failed."
    ).toBeUndefined();

    expect(result.success).toBe(true);

    const instances =
      result.state.cardInstances?.instances ?? [];

    expect(
      instances.find(
        item => item.instanceId === monsterId
      )?.zone
    ).toBe("field");

    expect(
      instances.find(
        item => item.instanceId === firstId
      )?.zone
    ).toBe("graveyard");

    expect(
      instances.find(
        item => item.instanceId === secondId
      )?.zone
    ).toBe("graveyard");

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("does not mutate the original state", () => {
    const state = createState();

    const original = structuredClone(state);

    const materialIds = [
      instanceId(state, 100),
      instanceId(state, 200),
    ];

    const result = executeExtraDeckSummon(
      state,
      {
        monsterInstanceId: instanceId(
          state,
          900
        ),

        monsterCardId: 900,

        requirement: requirement(),

        materials: {
          instanceIds: materialIds,
        },

        summonRules: fusionSummonRules(
          materialIds
        ),
      }
    );

    expect(result.success).toBe(true);

    expect(state).toEqual(original);
  });

  it("rejects a Synchro summon with incorrect Levels", () => {
    let state = createState();

    state = placeMonster(state, 100, 0);
    state = placeMonster(state, 200, 1);

    const materialIds = [
      instanceId(state, 100),
      instanceId(state, 200),
    ];

    const invalidRules = synchroSummonRules(
      materialIds
    );

    invalidRules.materials[1].card.level = 4;

    const result = executeExtraDeckSummon(
      state,
      {
        monsterInstanceId: instanceId(
          state,
          900
        ),

        monsterCardId: 900,

        requirement: requirement({
          summonType: "synchro",
          allowedZones: ["field"],
        }),

        materials: {
          instanceIds: materialIds,
        },

        summonRules: invalidRules,
      }
    );

    expect(result.success).toBe(false);

    expect(result.error).toMatch(
      /Synchro Levels total/
    );

    expect(result.state).toBe(state);
  });

  it("rejects summon-rule metadata for the wrong monster", () => {
    const state = createState();

    const materialIds = [
      instanceId(state, 100),
      instanceId(state, 200),
    ];

    const invalidRules = fusionSummonRules(
      materialIds
    );

    invalidRules.summonedMonster.id = 999;

    const result = executeExtraDeckSummon(
      state,
      {
        monsterInstanceId: instanceId(
          state,
          900
        ),

        monsterCardId: 900,

        requirement: requirement(),

        materials: {
          instanceIds: materialIds,
        },

        summonRules: invalidRules,
      }
    );

    expect(result.success).toBe(false);

    expect(result.error).toMatch(
      /metadata does not match/
    );

    expect(result.state).toBe(state);
  });

  it("rejects material metadata that does not match physical instances", () => {
    const state = createState();

    const materialIds = [
      instanceId(state, 100),
      instanceId(state, 200),
    ];

    const invalidRules = fusionSummonRules(
      materialIds
    );

    invalidRules.materials[0].card.id = 300;

    const result = executeExtraDeckSummon(
      state,
      {
        monsterInstanceId: instanceId(
          state,
          900
        ),

        monsterCardId: 900,

        requirement: requirement(),

        materials: {
          instanceIds: materialIds,
        },

        summonRules: invalidRules,
      }
    );

    expect(result.success).toBe(false);

    expect(result.error).toMatch(
      /Material metadata mismatch/
    );

    expect(result.state).toBe(state);
  });

  it("executes a validated Rank 4 Xyz Summon", () => {
    let state = createState();

    state = placeMonster(state, 100, 0);
    state = placeMonster(state, 200, 1);

    const materialIds = [
      instanceId(state, 100),
      instanceId(state, 200),
    ];

    const monsterId = instanceId(state, 900);

    const result = executeExtraDeckSummon(state, {
      monsterInstanceId: monsterId,
      monsterCardId: 900,

      requirement: requirement({
        summonType: "xyz",
        allowedZones: ["field"],
      }),

      materials: {
        instanceIds: materialIds,
      },

      summonRules: {
        summonedMonster: makeCard(
          900,
          "XYZ Monster",
          {
            frameType: "xyz",
            level: 4,
          }
        ),

        materials: [
          {
            instanceId: materialIds[0],
            card: makeCard(
              100,
              "Effect Monster",
              { level: 4 }
            ),
          },
          {
            instanceId: materialIds[1],
            card: makeCard(
              200,
              "Effect Monster",
              { level: 4 }
            ),
          },
        ],
      },
    });

    expect(result.success, result.error).toBe(true);

    expect(result.state.zones.field).toEqual([900]);
    expect(result.state.zones.graveyard).toEqual([]);
    expect(result.state.zones.extra).toEqual([]);

    expect(
      result.state.xyzMaterials?.find(
        entry => entry.xyzInstanceId === monsterId
      )?.materialInstanceIds
    ).toEqual(materialIds);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);

    expect(
      isFieldSynchronized(result.state)
    ).toBe(true);
  });
});