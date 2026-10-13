import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  GameState,
} from "../../models/simulation/GameState";

import type {
  SummonMaterialRequirement,
} from "../../models/simulation/SummonMaterial";

import {
  initializeCardInstances,
} from "../simulation/cardInstanceService";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  validateSummonMaterials,
} from "../simulation/summon/summonMaterialService";

function createState(): GameState {
  const state: GameState = {
    zones: {
      hand: [100, 100, 200, 300],
      deck: [400],
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

function getInstanceIds(
  state: GameState,
  cardIds: number[]
): string[] {
  const available = [
    ...(state.cardInstances?.instances ?? []),
  ];

  return cardIds.map(cardId => {
    const index = available.findIndex(
      instance => instance.cardId === cardId
    );

    if (index === -1) {
      throw new Error(`Missing Card ${cardId}`);
    }

    const [instance] = available.splice(index, 1);

    return instance.instanceId;
  });
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

describe("summonMaterialService", () => {
  it("accepts two valid physical materials", () => {
    const state = createState();

    const result = validateSummonMaterials(
      state,
      requirement(),
      {
        instanceIds: getInstanceIds(
          state,
          [100, 200]
        ),
      }
    );

    expect(result.valid).toBe(true);
    expect(result.selectedCardIds).toEqual([
      100,
      200,
    ]);
  });

  it("rejects duplicate instance IDs", () => {
    const state = createState();

    const id = getInstanceIds(state, [100])[0];

    const result = validateSummonMaterials(
      state,
      requirement(),
      {
        instanceIds: [id, id],
      }
    );

    expect(result.valid).toBe(false);
    expect(
      result.errors.join(" ")
    ).toMatch(/same physical card instance/);
  });

  it("allows different physical copies of one card", () => {
    const state = createState();

    const result = validateSummonMaterials(
      state,
      requirement(),
      {
        instanceIds: getInstanceIds(
          state,
          [100, 100]
        ),
      }
    );

    expect(result.valid).toBe(true);
  });

  it("enforces distinct card requirements", () => {
    const state = createState();

    const result = validateSummonMaterials(
      state,
      requirement({
        minimumDistinctCardIds: 2,
      }),
      {
        instanceIds: getInstanceIds(
          state,
          [100, 100]
        ),
      }
    );

    expect(result.valid).toBe(false);
  });

  it("rejects materials from disallowed zones", () => {
    const state = createState();

    const result = validateSummonMaterials(
      state,
      requirement({
        allowedZones: ["field"],
      }),
      {
        instanceIds: getInstanceIds(
          state,
          [100, 200]
        ),
      }
    );

    expect(result.valid).toBe(false);
    expect(
      result.errors.join(" ")
    ).toMatch(/cannot be used from hand/);
  });

  it("requires declared material identities", () => {
    const state = createState();

    const result = validateSummonMaterials(
      state,
      requirement({
        requiredCardIds: [300],
      }),
      {
        instanceIds: getInstanceIds(
          state,
          [100, 200]
        ),
      }
    );

    expect(result.valid).toBe(false);
    expect(
      result.errors.join(" ")
    ).toMatch(/Required material Card 300/);
  });

  it("enforces material count", () => {
    const state = createState();

    const result = validateSummonMaterials(
      state,
      requirement(),
      {
        instanceIds: getInstanceIds(
          state,
          [100]
        ),
      }
    );

    expect(result.valid).toBe(false);
  });

  it("rejects nonexistent material instances", () => {
    const state = createState();

    const result = validateSummonMaterials(
      state,
      requirement(),
      {
        instanceIds: [
          "nonexistent-1",
          "nonexistent-2",
        ],
      }
    );

    expect(result.valid).toBe(false);
  });
});