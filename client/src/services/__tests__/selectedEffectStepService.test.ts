
import { describe, expect, it } from "vitest";

import type { GameState } from "../../models/GameState";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  getCardInstance,
  getInstancesInZone,
  initializeCardInstances,
  validateCardInstanceSync,
} from "../simulation/cardInstanceService";

import {
  executeSelectedEffectStep,
  executeSelectedEffectSteps,
} from "../effect/execution/selectedEffectStepService";

function createState(): GameState {
  const legacy: GameState = {
    zones: {
      hand: [100, 100, 200],
      deck: [300, 300, 400],
      extra: [],
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  };

  const initialized = initializeCardInstances(
    normalizeGameState(legacy)
  );

  if (!initialized.success) {
    throw new Error(initialized.error);
  }

  return initialized.state;
}

describe("selectedEffectStepService", () => {
  it("moves one explicitly selected duplicate", () => {
    const state = createState();

    const copies = getInstancesInZone(
      state,
      "hand"
    ).filter((instance) => instance.cardId === 100);

    const result = executeSelectedEffectStep(
      state,
      {
        type: "move",
        cardId: 100,
        from: "hand",
        to: "graveyard",
      },
      {
        stepIndex: 0,
        instanceId: copies[1].instanceId,
        kind: "choose",
      }
    );

    expect(result.success).toBe(true);

    expect(
      getCardInstance(
        result.state,
        copies[0].instanceId
      )?.zone
    ).toBe("hand");

    expect(
      getCardInstance(
        result.state,
        copies[1].instanceId
      )?.zone
    ).toBe("graveyard");

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("searches a selected duplicate from the Deck", () => {
    const state = createState();

    const copies = getInstancesInZone(
      state,
      "deck"
    ).filter((instance) => instance.cardId === 300);

    const result = executeSelectedEffectStep(
      state,
      {
        type: "search",
        cardId: 300,
      },
      {
        stepIndex: 0,
        instanceId: copies[1].instanceId,
        kind: "choose",
      }
    );

    expect(result.success).toBe(true);

    expect(
      getCardInstance(
        result.state,
        copies[1].instanceId
      )?.zone
    ).toBe("hand");

    expect(result.state.zones.deck).toEqual([
      300,
      400,
    ]);
  });

  it("rejects an instance with the wrong card ID", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "hand"
    ).find((item) => item.cardId === 200)!;

    const result = executeSelectedEffectStep(
      state,
      {
        type: "move",
        cardId: 100,
        from: "hand",
        to: "graveyard",
      },
      {
        stepIndex: 0,
        instanceId: instance.instanceId,
        kind: "choose",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "wrong card ID"
    );
  });

  it("rejects a selection in the wrong zone", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "deck"
    )[0];

    const result = executeSelectedEffectStep(
      state,
      {
        type: "move",
        cardId: instance.cardId,
        from: "hand",
        to: "graveyard",
      },
      {
        stepIndex: 0,
        instanceId: instance.instanceId,
        kind: "choose",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "wrong zone"
    );
  });

  it("Special Summons a selected physical copy", () => {
    const state = createState();

    const copies = getInstancesInZone(
      state,
      "hand"
    ).filter((item) => item.cardId === 100);

    const result = executeSelectedEffectStep(
      state,
      {
        type: "special-summon",
        cardId: 100,
        from: "hand",
      },
      {
        stepIndex: 0,
        instanceId: copies[1].instanceId,
        kind: "choose",
      }
    );

    expect(result.success).toBe(true);

    expect(
      result.state.fieldState!.monsterZones[0]
        ?.instanceId
    ).toBe(copies[1].instanceId);

    expect(
      getCardInstance(
        result.state,
        copies[0].instanceId
      )?.zone
    ).toBe("hand");
  });

  it("rejects explicit selections on draw steps", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "deck"
    )[0];

    const result = executeSelectedEffectStep(
      state,
      {
        type: "draw",
        count: 1,
      },
      {
        stepIndex: 0,
        instanceId: instance.instanceId,
        kind: "choose",
      }
    );

    expect(result.success).toBe(false);
  });

  it("rejects duplicate selections for one step", () => {
    const state = createState();

    const copies = getInstancesInZone(
      state,
      "hand"
    );

    const result = executeSelectedEffectSteps(
      state,
      [
        {
          type: "move",
          cardId: 100,
          from: "hand",
          to: "graveyard",
        },
      ],
      {
        selections: [
          {
            stepIndex: 0,
            instanceId: copies[0].instanceId,
            kind: "choose",
          },
          {
            stepIndex: 0,
            instanceId: copies[1].instanceId,
            kind: "choose",
          },
        ],
      }
    );

    expect(result.success).toBe(false);
    expect(result.completedSteps).toBe(0);
  });

  it("rejects out-of-range selection indexes", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "hand"
    )[0];

    const result = executeSelectedEffectSteps(
      state,
      [
        { type: "draw", count: 1 },
      ],
      {
        selections: [
          {
            stepIndex: 99,
            instanceId: instance.instanceId,
            kind: "choose",
          },
        ],
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "out of range"
    );
  });

  it("rolls back the sequence after a failed selection", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "hand"
    ).find((item) => item.cardId === 200)!;

    const result = executeSelectedEffectSteps(
      state,
      [
        { type: "draw", count: 1 },
        {
          type: "move",
          cardId: 100,
          from: "hand",
          to: "graveyard",
        },
      ],
      {
        selections: [
          {
            stepIndex: 1,
            instanceId: instance.instanceId,
            kind: "choose",
          },
        ],
      }
    );

    expect(result.success).toBe(false);
    expect(result.completedSteps).toBe(1);
    expect(result.state).toBe(state);

    expect(state.zones.deck).toEqual([
      300,
      300,
      400,
    ]);
  });

  it("executes selected and unselected steps together", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "hand"
    ).find((item) => item.cardId === 100)!;

    const result = executeSelectedEffectSteps(
      state,
      [
        { type: "draw", count: 1 },
        {
          type: "move",
          cardId: 100,
          from: "hand",
          to: "graveyard",
        },
      ],
      {
        selections: [
          {
            stepIndex: 1,
            instanceId: instance.instanceId,
            kind: "choose",
          },
        ],
      }
    );

    expect(result.success).toBe(true);
    expect(result.completedSteps).toBe(2);

    expect(
      validateCardInstanceSync(result.state)
    ).toEqual([]);
  });

  it("rejects using cost selection as a resolution selection", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "hand"
    )[0];

    const result = executeSelectedEffectStep(
      state,
      {
        type: "move",
        cardId: 100,
        from: "hand",
        to: "graveyard",
      },
      {
        stepIndex: 0,
        instanceId: instance.instanceId,
        kind: "cost",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "Cost selections"
    );
  });

  it("does not mutate the original state", () => {
    const state = createState();

    const instance = getInstancesInZone(
      state,
      "hand"
    )[0];

    const result = executeSelectedEffectStep(
      state,
      {
        type: "move",
        cardId: 100,
        from: "hand",
        to: "graveyard",
      },
      {
        stepIndex: 0,
        instanceId: instance.instanceId,
        kind: "choose",
      }
    );

    expect(result.success).toBe(true);
    expect(state.zones.graveyard).toEqual([]);
    expect(result.state).not.toBe(state);
  });
});
