import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  GameState,
} from "../../models/GameState";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  getCardInstance,
  getCardInstanceState,
  getInstancesInZone,
  initializeCardInstances,
  moveCardInstance,
  validateCardInstanceSync,
} from "../simulation/cardInstanceService";

function createState(): GameState {
  return normalizeGameState({
    zones: {
      hand: [100, 100],
      deck: [200, 300],
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

describe("cardInstanceService", () => {
  it("assigns unique IDs to duplicate cards", () => {
    const result = initializeCardInstances(
      createState()
    );

    expect(result.success).toBe(true);

    const copies = getInstancesInZone(
      result.state,
      "hand"
    );

    expect(copies).toHaveLength(2);
    expect(copies[0].cardId).toBe(100);
    expect(copies[1].cardId).toBe(100);

    expect(copies[0].instanceId).not.toBe(
      copies[1].instanceId
    );
  });

  it("preserves legacy card quantities", () => {
    const result = initializeCardInstances(
      createState()
    );

    expect(result.state.zones.hand).toEqual([
      100,
      100,
    ]);

    expect(result.state.zones.deck).toEqual([
      200,
      300,
    ]);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("moves a specific instance to graveyard", () => {
    const initialized = initializeCardInstances(
      createState()
    );

    const copies = getInstancesInZone(
      initialized.state,
      "hand"
    );

    const moved = moveCardInstance(
      initialized.state,
      copies[1].instanceId,
      "graveyard"
    );

    expect(moved.success).toBe(true);

    expect(moved.state.zones.hand).toEqual([
      100,
    ]);

    expect(
      moved.state.zones.graveyard
    ).toEqual([100]);

    expect(
      getCardInstance(
        moved.state,
        copies[1].instanceId
      )?.zone
    ).toBe("graveyard");

    expect(
      getCardInstance(
        moved.state,
        copies[0].instanceId
      )?.zone
    ).toBe("hand");
  });

  it("preserves instance identity across movements", () => {
    const initialized = initializeCardInstances(
      createState()
    );

    const instance = getInstancesInZone(
      initialized.state,
      "hand"
    )[0];

    const first = moveCardInstance(
      initialized.state,
      instance.instanceId,
      "graveyard"
    );

    const second = moveCardInstance(
      first.state,
      instance.instanceId,
      "banished"
    );

    expect(second.success).toBe(true);

    expect(
      getCardInstance(
        second.state,
        instance.instanceId
      )
    ).toEqual({
      instanceId: instance.instanceId,
      cardId: 100,
      zone: "banished",
    });
  });

  it("does not mutate the original state", () => {
    const initialized = initializeCardInstances(
      createState()
    );

    const instance = getInstancesInZone(
      initialized.state,
      "hand"
    )[0];

    const moved = moveCardInstance(
      initialized.state,
      instance.instanceId,
      "graveyard"
    );

    expect(initialized.state.zones.graveyard).toEqual(
      []
    );

    expect(
      getCardInstance(
        initialized.state,
        instance.instanceId
      )?.zone
    ).toBe("hand");

    expect(moved.state.zones.graveyard).toEqual([
      100,
    ]);
  });

  it("rejects unknown instances", () => {
    const initialized = initializeCardInstances(
      createState()
    );

    const result = moveCardInstance(
      initialized.state,
      "unknown",
      "graveyard"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "does not exist"
    );
  });

  it("rejects movement into the same zone", () => {
    const initialized = initializeCardInstances(
      createState()
    );

    const instance = getInstancesInZone(
      initialized.state,
      "hand"
    )[0];

    const result = moveCardInstance(
      initialized.state,
      instance.instanceId,
      "hand"
    );

    expect(result.success).toBe(false);
  });

  it("detects instance count mismatches", () => {
    const initialized = initializeCardInstances(
      createState()
    );

    initialized.state.zones.hand.push(999);

    expect(
      validateCardInstanceSync(initialized.state)
    ).toContain("Instance mismatch in hand.");
  });

  it("rejects movements from inconsistent states", () => {
    const initialized = initializeCardInstances(
      createState()
    );

    const instance = getInstancesInZone(
      initialized.state,
      "hand"
    )[0];

    initialized.state.zones.hand.push(999);

    const result = moveCardInstance(
      initialized.state,
      instance.instanceId,
      "graveyard"
    );

    expect(result.success).toBe(false);
  });

  it("returns defensive copies of instance data", () => {
    const initialized = initializeCardInstances(
      createState()
    );

    const registry = getCardInstanceState(
      initialized.state
    )!;

    registry.instances[0].zone = "banished";

    expect(
      getInstancesInZone(
        initialized.state,
        "hand"
      )
    ).toHaveLength(2);
  });

  it("does not reassign IDs on repeated initialization", () => {
    const first = initializeCardInstances(
      createState()
    );

    const second = initializeCardInstances(
      first.state
    );

    expect(second.success).toBe(true);

    expect(
      getCardInstanceState(second.state)
    ).toEqual(
      getCardInstanceState(first.state)
    );
  });

  it("rejects untracked legacy field cards", () => {
    const state = createState();

    state.zones.field.push(999);

    const result = initializeCardInstances(
      state
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "Field slots do not match"
    );
  });
});
