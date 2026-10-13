import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  CardEffectDefinition,
} from "../../models/effect/CardEffect";

import type {
  GameState,
} from "../../models/simulation/GameState";

import {
  createChainSelections,
  getChainSelectionRequirements,
} from "../combo/chainSelectionService";

const effect: CardEffectDefinition = {
  id: "test-selection",
  sourceCardId: 100,
  label: "Discard and search",
  activationZone: "hand",
  conditions: [],
  costs: [
    {
      type: "move-card",
      cardId: 200,
      from: "hand",
      to: "graveyard",
    },
  ],
  steps: [
    {
      type: "search",
      cardId: 300,
    },
  ],
  verification: "experimental",
};

const state = {
  cardInstances: {
    nextInstanceNumber: 4,
    instances: [
      {
        instanceId: "instance-1",
        cardId: 100,
        zone: "hand",
      },
      {
        instanceId: "instance-2",
        cardId: 200,
        zone: "hand",
      },
      {
        instanceId: "instance-3",
        cardId: 300,
        zone: "deck",
      },
    ],
  },
} as GameState;

describe("chainSelectionService", () => {
  it("finds matching instances for costs", () => {
    const requirements =
      getChainSelectionRequirements(state, effect);

    expect(requirements[0].options).toEqual([
      {
        instanceId: "instance-2",
        cardId: 200,
        zone: "hand",
      },
    ]);
  });

  it("finds matching instances for resolution", () => {
    const requirements =
      getChainSelectionRequirements(state, effect);

    expect(requirements[1].options).toEqual([
      {
        instanceId: "instance-3",
        cardId: 300,
        zone: "deck",
      },
    ]);
  });

  it("creates separate cost and resolution selections", () => {
    const requirements =
      getChainSelectionRequirements(state, effect);

    const selections = createChainSelections(
      requirements,
      {
        "cost-0": "instance-2",
        "resolution-0": "instance-3",
      }
    );

    expect(selections.costSelections).toEqual([
      {
        stepIndex: 0,
        instanceId: "instance-2",
        kind: "cost",
        expectedZone: "hand",
      },
    ]);

    expect(selections.resolutionSelections).toEqual([
      {
        stepIndex: 0,
        instanceId: "instance-3",
        kind: "choose",
        expectedZone: "deck",
      },
    ]);
  });

  it("supports automatic selection", () => {
    const requirements =
      getChainSelectionRequirements(state, effect);

    const selections = createChainSelections(
      requirements,
      {}
    );

    expect(selections.costSelections).toEqual([]);
    expect(selections.resolutionSelections).toEqual([]);
  });

  it("rejects an invalid instance selection", () => {
    const requirements =
      getChainSelectionRequirements(state, effect);

    expect(() =>
      createChainSelections(
        requirements,
        {
          "cost-0": "instance-999",
        }
      )
    ).toThrow(/Invalid selection/);
  });
});