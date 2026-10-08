
import { describe, expect, it } from "vitest";
import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";
import type { Combo } from "../../models/Combo";
import { calculateComboOpeningProbability } from "../comboProbabilityService";

const makeCard = (id: number): Card => ({
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
  name: "Probability Test",
  main: Array.from({ length: 38 }, (_, index) => ({
    card: makeCard(index + 1),
    quantity: index === 0 ? 3 : 1,
  })),
  extra: [],
  side: [],
};

const combo: Combo = {
  id: "combo-test",
  name: "Test",
  description: "",
  starters: [{ cardId: 1, quantity: 1, zone: "hand" }],
  requirements: [],
  steps: [],
  endBoardCardIds: [],
  createdAt: "",
  updatedAt: "",
};

describe("comboProbabilityService", () => {
  it("calculates the probability of opening a 3-of", () => {
    const probability =
      calculateComboOpeningProbability(combo, deck);

    // 1 - C(37,5) / C(40,5)
    expect(probability).toBeCloseTo(0.33755, 4);
  });

  it("returns zero for unavailable starters", () => {
    const result = calculateComboOpeningProbability(
      {
        ...combo,
        starters: [
          { cardId: 999, quantity: 1, zone: "hand" },
        ],
      },
      deck
    );

    expect(result).toBe(0);
  });

  it("handles multiple required starters", () => {
    const result = calculateComboOpeningProbability(
      {
        ...combo,
        starters: [
          { cardId: 1, quantity: 1, zone: "hand" },
          { cardId: 2, quantity: 1, zone: "hand" },
        ],
      },
      deck
    );

    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(
      calculateComboOpeningProbability(combo, deck)
    );
  });

  it("returns zero for an impossible hand size", () => {
    expect(
      calculateComboOpeningProbability(combo, deck, 50)
    ).toBe(0);
  });
});
