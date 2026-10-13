
import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";
import type { Combo } from "../../models/Combo";

import {
  simulateTrackedCombo,
} from "../trackedComboSimulationService";

import {
  analyzeEndBoard,
} from "../endBoardAnalysisService";

import {
  validateCardInstanceSync,
} from "../cardInstanceService";

import {
  isFieldSynchronized,
} from "../fieldZoneService";

const card = (id: number): Card => ({
  id,
  name: `Card ${id}`,
  type: "Effect Monster",
  frameType: "effect",
  description: "",
  race: "Warrior",
  imageUrl: "",
  imageUrlSmall: "",
});

const deck: Deck = {
  name: "Test",
  main: [
    { card: card(1), quantity: 2 },
    { card: card(2), quantity: 1 },
  ],
  extra: [],
  side: [],
};

const combo: Combo = {
  id: "combo",
  name: "Test",
  description: "",

  starters: [
    {
      cardId: 1,
      quantity: 1,
      zone: "hand",
    },
  ],

  requirements: [],

  steps: [
    {
      id: "one",
      order: 1,
      action: "normal-summon",
      cardId: 1,
      description: "Summon",
    },
    {
      id: "two",
      order: 2,
      action: "search",
      cardId: 2,
      description: "Search",
    },
    {
      id: "three",
      order: 3,
      action: "special-summon",
      cardId: 2,
      description: "Summon",
    },
  ],

  endBoardCardIds: [1, 2],
  createdAt: "2026-10-12",
  updatedAt: "2026-10-12",
};

describe("tracked combo simulation", () => {
  it("produces a synchronized end board", () => {
    const result = simulateTrackedCombo(combo, deck);

    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);

    expect(
      isFieldSynchronized(result.finalState)
    ).toBe(true);

    expect(
      validateCardInstanceSync(result.finalState)
    ).toEqual([]);

    expect(
      analyzeEndBoard(result.finalState).monsterCount
    ).toBe(2);

    expect(result.initialState.zones.field).toEqual([]);
  });

  it("rejects unsupported actions without corrupting instances", () => {
    const result = simulateTrackedCombo(
      {
        ...combo,
        steps: [
          {
            id: "bad",
            order: 1,
            action: "other",
            cardId: 1,
            description: "",
          },
        ],
      },
      deck
    );

    expect(result.success).toBe(false);

    expect(
      validateCardInstanceSync(result.finalState)
    ).toEqual([]);
  });
});
