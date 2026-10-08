
import { describe, expect, it } from "vitest";

import type { CardRelationship } from "../../models/CardRelationship";

import { discoverComboCandidates } from "../comboDiscoveryService";

const relationships: CardRelationship[] = [
  { sourceCardId: 1, targetCardId: 2, type: "searches" },
  { sourceCardId: 2, targetCardId: 3, type: "summons" },
  { sourceCardId: 1, targetCardId: 4, type: "supports" },
  { sourceCardId: 4, targetCardId: 3, type: "enables" },
];

describe("comboDiscoveryService", () => {
  it("discovers directed interaction paths", () => {
    const candidates = discoverComboCandidates(
      [1, 2, 3, 4],
      relationships,
      { maxDepth: 2 }
    );

    expect(
      candidates.some(
        (candidate) =>
          candidate.cardIds.join(",") === "1,2,3"
      )
    ).toBe(true);

    expect(
      candidates.some(
        (candidate) =>
          candidate.cardIds.join(",") === "1,4,3"
      )
    ).toBe(true);
  });

  it("preserves relationship types", () => {
    const candidates = discoverComboCandidates(
      [1, 2],
      [
        { sourceCardId: 1, targetCardId: 2, type: "searches" },
        { sourceCardId: 1, targetCardId: 2, type: "supports" },
      ]
    );

    const candidate = candidates.find(
      (item) => item.id === "1->2"
    );

    expect(candidate?.steps[0].relationshipTypes).toEqual([
      "searches",
      "supports",
    ]);
  });

  it("does not revisit cards within a path", () => {
    const candidates = discoverComboCandidates(
      [1, 2],
      [
        { sourceCardId: 1, targetCardId: 2, type: "searches" },
        { sourceCardId: 2, targetCardId: 1, type: "supports" },
      ],
      { maxDepth: 4 }
    );

    for (const candidate of candidates) {
      expect(new Set(candidate.cardIds).size).toBe(
        candidate.cardIds.length
      );
    }
  });

  it("respects the maximum depth", () => {
    const candidates = discoverComboCandidates(
      [1, 2, 3, 4],
      relationships,
      { maxDepth: 1 }
    );

    expect(
      candidates.every(
        (candidate) => candidate.steps.length <= 1
      )
    ).toBe(true);
  });

  it("excludes cards outside the deck", () => {
    const candidates = discoverComboCandidates(
      [1, 2],
      relationships
    );

    expect(
      candidates.every((candidate) =>
        candidate.cardIds.every((id) => [1, 2].includes(id))
      )
    ).toBe(true);
  });

  it("returns no candidates for an empty graph", () => {
    expect(discoverComboCandidates([], [])).toEqual([]);
  });

  it("respects the candidate limit", () => {
    const candidates = discoverComboCandidates(
      [1, 2, 3, 4],
      relationships,
      { maxCandidates: 2 }
    );

    expect(candidates).toHaveLength(2);
  });

  it("rejects invalid discovery options", () => {
    expect(
      discoverComboCandidates(
        [1, 2],
        relationships,
        { maxDepth: 0 }
      )
    ).toEqual([]);
  });
});
