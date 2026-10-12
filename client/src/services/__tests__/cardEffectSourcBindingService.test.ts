import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  CardEffectDefinition,
} from "../../models/CardEffect";

import type {
  GameState,
} from "../../models/GameState";

import {
  bindCardEffectSource,
} from "../cardEffectSourceBindingService";

const effect: CardEffectDefinition = {
  id: "xyz-effect",
  sourceCardId: 900,
  label: "Detach one material",
  activationZone: "field",
  conditions: [],
  costs: [
    {
      type: "detach-xyz-material",
      xyzInstanceId: "",
      count: 1,
    },
  ],
  steps: [{ type: "draw", count: 1 }],
  verification: "experimental",
};

function createState(): GameState {
  return {
    zones: {
      hand: [],
      deck: [],
      extra: [],
      field: [900, 900],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
    cardInstances: {
      instances: [
        {
          instanceId: "xyz-a",
          cardId: 900,
          zone: "field",
        },
        {
          instanceId: "xyz-b",
          cardId: 900,
          zone: "field",
        },
      ],
      nextInstanceNumber: 3,
    },
  };
}

describe("cardEffectSourceBindingService", () => {
  it("binds a detachment cost to the chosen source", () => {
    const result = bindCardEffectSource(
      createState(),
      effect,
      "xyz-b"
    );

    expect(result.success).toBe(true);

    expect(result.effect?.costs[0]).toEqual({
      type: "detach-xyz-material",
      xyzInstanceId: "xyz-b",
      count: 1,
    });
  });

  it("does not mutate the reusable effect", () => {
    const original = structuredClone(effect);

    bindCardEffectSource(
      createState(),
      effect,
      "xyz-a"
    );

    expect(effect).toEqual(original);
  });

  it("rejects a nonexistent source instance", () => {
    const result = bindCardEffectSource(
      createState(),
      effect,
      "missing"
    );

    expect(result.success).toBe(false);
  });

  it("binds separate activations independently", () => {
    const state = createState();

    const first = bindCardEffectSource(
      state,
      effect,
      "xyz-a"
    );

    const second = bindCardEffectSource(
      state,
      effect,
      "xyz-b"
    );

    expect(first.effect?.costs[0]).toMatchObject({
      xyzInstanceId: "xyz-a",
    });

    expect(second.effect?.costs[0]).toMatchObject({
      xyzInstanceId: "xyz-b",
    });
  });
});