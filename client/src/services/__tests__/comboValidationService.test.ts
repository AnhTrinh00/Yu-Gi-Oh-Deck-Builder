
import { describe, expect, it } from "vitest";
import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";
import type { Combo } from "../../models/Combo";
import { validateCombo } from "../combo/comboValidationService";

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
  name: "Test Deck",
  main: [
    { card: card(1), quantity: 3 },
    { card: card(2), quantity: 2 },
  ],
  extra: [{ card: card(3), quantity: 1 }],
  side: [],
};

const combo: Combo = {
  id: "combo-1",
  name: "Test Combo",
  description: "Example",
  starters: [{ cardId: 1, quantity: 1, zone: "hand" }],
  requirements: [],
  steps: [
    {
      id: "step-1",
      order: 1,
      action: "normal-summon",
      cardId: 1,
      description: "Normal Summon Card 1",
    },
  ],
  endBoardCardIds: [3],
  createdAt: "2026-10-08",
  updatedAt: "2026-10-08",
};

describe("comboValidationService", () => {
  it("accepts a structurally valid combo", () => {
    expect(validateCombo(combo, deck).valid).toBe(true);
  });

  it("requires a combo name", () => {
    const result = validateCombo(
      { ...combo, name: "" },
      deck
    );

    expect(result.valid).toBe(false);
  });

  it("requires at least one starter", () => {
    const result = validateCombo(
      { ...combo, starters: [] },
      deck
    );

    expect(result.valid).toBe(false);
  });

  it("rejects insufficient card copies", () => {
    const result = validateCombo(
      {
        ...combo,
        starters: [
          { cardId: 1, quantity: 4, zone: "hand" },
        ],
      },
      deck
    );

    expect(result.valid).toBe(false);
  });

  it("rejects duplicate step order values", () => {
    const result = validateCombo(
      {
        ...combo,
        steps: [
          combo.steps[0],
          {
            ...combo.steps[0],
            id: "step-2",
          },
        ],
      },
      deck
    );

    expect(result.valid).toBe(false);
  });

  it("warns when the end board is empty", () => {
    const result = validateCombo(
      { ...combo, endBoardCardIds: [] },
      deck
    );

    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
