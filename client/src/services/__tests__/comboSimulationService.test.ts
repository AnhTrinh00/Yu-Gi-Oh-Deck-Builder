
import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";
import type { Combo } from "../../models/Combo";

import { simulateCombo } from "../simulation/comboSimulationService";

function card(id: number): Card {
  return {
    id,
    name: `Card ${id}`,
    type: "Effect Monster",
    frameType: "effect",
    description: "",
    race: "Warrior",
    imageUrl: "",
    imageUrlSmall: "",
  };
}

const deck: Deck = {
  name: "Test Deck",
  main: [
    { card: card(1), quantity: 3 },
    { card: card(2), quantity: 2 },
  ],
  extra: [],
  side: [],
};

const combo: Combo = {
  id: "combo-1",
  name: "A to B",
  description: "Test combo",
  starters: [
    { cardId: 1, quantity: 1, zone: "hand" },
  ],
  requirements: [],
  steps: [
    {
      id: "step-1",
      order: 1,
      action: "normal-summon",
      cardId: 1,
      description: "Normal Summon A",
    },
    {
      id: "step-2",
      order: 2,
      action: "search",
      cardId: 2,
      description: "Search B",
    },
    {
      id: "step-3",
      order: 3,
      action: "special-summon",
      cardId: 2,
      description: "Special Summon B",
    },
  ],
  endBoardCardIds: [1, 2],
  createdAt: "2026-10-08",
  updatedAt: "2026-10-08",
};

describe("comboSimulationService", () => {
  it("simulates a valid modeled sequence", () => {
    const result = simulateCombo(combo, deck);

    expect(result.success).toBe(true);
    expect(result.completedSteps).toBe(3);
    expect(result.finalState.zones.field).toEqual([
      1,
      2,
    ]);
  });

  it("detects unavailable cards", () => {
    const result = simulateCombo(
      {
        ...combo,
        starters: [
          { cardId: 999, quantity: 1, zone: "hand" },
        ],
      },
      deck
    );

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("stops after a failed action", () => {
    const result = simulateCombo(
      {
        ...combo,
        steps: [
          combo.steps[0],
          {
            id: "step-2",
            order: 2,
            action: "normal-summon",
            cardId: 2,
            description: "Second Normal Summon",
          },
        ],
        endBoardCardIds: [],
      },
      deck
    );

    expect(result.success).toBe(false);
    expect(result.completedSteps).toBe(1);
  });

  it("rejects unsupported actions", () => {
    const result = simulateCombo(
      {
        ...combo,
        steps: [
          {
            id: "unsupported",
            order: 1,
            action: "set-card",
            cardId: 1,
            description: "Set a card",
          },
        ],
        endBoardCardIds: [],
      },
      deck
    );

    expect(result.success).toBe(false);
    expect(result.completedSteps).toBe(0);
  });

  it("checks the resulting end board", () => {
    const result = simulateCombo(
      {
        ...combo,
        endBoardCardIds: [1, 2, 2],
      },
      deck
    );

    expect(result.success).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes("End board")
      )
    ).toBe(true);
  });

  it("preserves the initial game state", () => {
    const result = simulateCombo(combo, deck);

    expect(result.initialState.zones.hand).toEqual([1]);
    expect(result.initialState.zones.field).toEqual([]);
    expect(result.finalState.zones.field).toEqual([
      1,
      2,
    ]);
  });
});
