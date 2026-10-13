
import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";
import type { ComboCandidate } from "../../models/ComboCandidate";

import { analyzeComboCandidates } from "../combo/discovery/comboCandidateAnalysisService";

function makeCard(id: number): Card {
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
  main: Array.from({ length: 38 }, (_, index) => ({
    card: makeCard(index + 1),
    quantity: index === 0 ? 3 : 1,
  })),
  extra: [],
  side: [],
};

const candidate: ComboCandidate = {
  id: "1->2",
  starterCardId: 1,
  targetCardId: 2,
  cardIds: [1, 2],
  steps: [
    {
      sourceCardId: 1,
      targetCardId: 2,
      relationshipTypes: ["searches"],
    },
  ],
  score: 13,
  reasons: ["1 recorded interaction"],
};

describe("comboCandidateAnalysisService", () => {
  it("calculates starter copies", () => {
    const result = analyzeComboCandidates(
      [candidate],
      deck
    );

    expect(result[0].starterCopies).toBe(3);
    expect(result[0].availableInMainDeck).toBe(true);
  });

  it("calculates opening starter probability", () => {
    const result = analyzeComboCandidates(
      [candidate],
      deck
    );

    expect(result[0].openingProbability).toBeCloseTo(
      0.33755,
      4
    );
  });

  it("identifies unavailable starters", () => {
    const result = analyzeComboCandidates(
      [
        {
          ...candidate,
          id: "999->2",
          starterCardId: 999,
        },
      ],
      deck
    );

    expect(result[0].starterCopies).toBe(0);
    expect(result[0].openingProbability).toBe(0);
    expect(result[0].availableInMainDeck).toBe(false);
  });

  it("ranks available starters ahead of unavailable ones", () => {
    const unavailable = {
      ...candidate,
      id: "999->2",
      starterCardId: 999,
      score: 100,
    };

    const result = analyzeComboCandidates(
      [unavailable, candidate],
      deck
    );

    expect(result[0].starterCardId).toBe(1);
  });

  it("handles invalid hand sizes", () => {
    const result = analyzeComboCandidates(
      [candidate],
      deck,
      100
    );

    expect(result[0].openingProbability).toBe(0);
  });
});
