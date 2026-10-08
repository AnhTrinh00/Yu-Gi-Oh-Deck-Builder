
import { describe, expect, it } from "vitest";

import type { ComboCandidate } from "../../models/ComboCandidate";

import { candidateToComboDraft } from "../comboCandidateConversionService";

const candidate: ComboCandidate = {
  id: "1->2->3",
  starterCardId: 1,
  targetCardId: 3,
  cardIds: [1, 2, 3],
  steps: [
    {
      sourceCardId: 1,
      targetCardId: 2,
      relationshipTypes: ["searches"],
    },
    {
      sourceCardId: 2,
      targetCardId: 3,
      relationshipTypes: ["summons"],
    },
  ],
  score: 26,
  reasons: [],
};

const names = new Map([
  [1, "Card A"],
  [2, "Card B"],
  [3, "Card C"],
]);

describe("comboCandidateConversionService", () => {
  it("creates a combo with the correct starter", () => {
    const combo = candidateToComboDraft(
      candidate,
      names
    );

    expect(combo.starters).toEqual([
      {
        cardId: 1,
        quantity: 1,
        zone: "hand",
      },
    ]);
  });

  it("preserves the candidate step order", () => {
    const combo = candidateToComboDraft(
      candidate,
      names
    );

    expect(combo.steps).toHaveLength(2);
    expect(combo.steps.map((step) => step.order))
      .toEqual([1, 2]);
  });

  it("uses placeholders instead of claiming legality", () => {
    const combo = candidateToComboDraft(
      candidate,
      names
    );

    expect(
      combo.steps.every(
        (step) => step.action === "other"
      )
    ).toBe(true);

    expect(combo.endBoardCardIds).toEqual([]);
  });

  it("generates a new ID for each draft", () => {
    const first = candidateToComboDraft(
      candidate,
      names
    );

    const second = candidateToComboDraft(
      candidate,
      names
    );

    expect(first.id).not.toBe(second.id);
  });

  it("uses readable card names", () => {
    const combo = candidateToComboDraft(
      candidate,
      names
    );

    expect(combo.name).toContain("Card A");
    expect(combo.name).toContain("Card C");
    expect(combo.steps[0].description).toContain(
      "Card B"
    );
  });
});
