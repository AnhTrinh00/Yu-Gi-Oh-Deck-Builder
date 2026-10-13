
import { describe, expect, it } from "vitest";

import type { Combo } from "../../models/combo/Combo";

import {
  buildAIDeckEvidence,
} from "../ai/aiDeckEvidenceService";

function makeCombo(id: string): Combo {
  return {
    id,
    name: `Combo ${id}`,
    description: "Example combo",
    starters: [
      {
        cardId: 100,
        quantity: 1,
        zone: "hand",
      },
    ],
    requirements: [],
    steps: [
      {
        id: "step-1",
        order: 1,
        action: "normal-summon",
        cardId: 100,
        description: "Normal Summon the starter.",
      },
    ],
    endBoardCardIds: [200],
    createdAt: "2026-10-13",
    updatedAt: "2026-10-13",
  };
}

describe("buildAIDeckEvidence", () => {
  it("returns empty evidence when none is supplied", () => {
    const result = buildAIDeckEvidence({});

    expect(result.relationships).toEqual([]);
    expect(result.savedCombos).toEqual([]);
    expect(result.simulations).toEqual([]);
  });

  it("preserves registered relationship information", () => {
    const result = buildAIDeckEvidence({
      relationships: [
        {
          sourceCardId: 100,
          targetCardId: 200,
          type: "searches",
          description: "Card 100 searches Card 200.",
        },
      ],
    });

    expect(result.relationships[0]).toMatchObject({
      sourceCardId: 100,
      targetCardId: 200,
      type: "searches",
      verification: "registered",
    });
  });

  it("marks saved combos as unverified", () => {
    const result = buildAIDeckEvidence({
      savedCombos: [makeCombo("combo-1")],
    });

    expect(result.savedCombos[0].verification)
      .toBe("saved-unverified");

    expect(result.savedCombos[0].steps)
      .toHaveLength(1);
  });

  it("preserves simulator-reported evidence", () => {
    const result = buildAIDeckEvidence({
      simulations: [
        {
          comboId: "combo-1",
          outcome: "completed",
          summary: "Simulation completed.",
          endBoardScore: 75,
          warnings: [],
          verification: "simulator-reported",
        },
      ],
    });

    expect(result.simulations[0].outcome)
      .toBe("completed");

    expect(result.simulations[0].endBoardScore)
      .toBe(75);
  });

  it("limits relationship evidence", () => {
    const relationships = Array.from(
      { length: 60 },
      (_, index) => ({
        sourceCardId: index + 1,
        targetCardId: index + 100,
        type: "supports" as const,
      })
    );

    const result = buildAIDeckEvidence({
      relationships,
    });

    expect(result.relationships).toHaveLength(50);

    expect(
      result.limitations.some((message) =>
        message.includes("relationships were omitted")
      )
    ).toBe(true);
  });

  it("limits saved combos and action steps", () => {
    const combos = Array.from(
      { length: 12 },
      (_, index) => {
        const combo = makeCombo(`combo-${index}`);

        combo.steps = Array.from(
          { length: 25 },
          (_, stepIndex) => ({
            id: `step-${stepIndex}`,
            order: stepIndex + 1,
            action: "activate-effect" as const,
            cardId: 100,
            description: "Activate effect.",
          })
        );

        return combo;
      }
    );

    const result = buildAIDeckEvidence({
      savedCombos: combos,
    });

    expect(result.savedCombos).toHaveLength(10);
    expect(result.savedCombos[0].steps).toHaveLength(20);
  });

  it("does not mutate input data", () => {
    const combo = makeCombo("combo-1");
    const before = JSON.stringify(combo);

    buildAIDeckEvidence({
      savedCombos: [combo],
    });

    expect(JSON.stringify(combo)).toBe(before);
  });
});
