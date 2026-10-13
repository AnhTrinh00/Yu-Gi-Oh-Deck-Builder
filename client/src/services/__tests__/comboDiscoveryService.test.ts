import { describe, expect, it } from "vitest";

import type { CardRelationship, CardRelationshipType } from "../../models/CardRelationship";

import { discoverComboCandidates, discoverComboCandidatesDetailed } from "../combo/comboDiscoveryService";

const relationships: CardRelationship[] = [
  { sourceCardId: 1, targetCardId: 2, type: "searches" },
  { sourceCardId: 2, targetCardId: 3, type: "summons" },
  { sourceCardId: 1, targetCardId: 4, type: "supports" },
  { sourceCardId: 4, targetCardId: 3, type: "enables" },
];

const relationshipType =
  "VALID_RELATIONSHIP_TYPE" as CardRelationshipType;

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

  it("deduplicates repeated relationship edges", () => {
  const candidates = discoverComboCandidates(
    [1, 2],
    [
      {
        sourceCardId: 1,
        targetCardId: 2,
        type: "searches",
      },
      {
        sourceCardId: 1,
        targetCardId: 2,
        type: "searches",
      },
      {
        sourceCardId: 1,
        targetCardId: 2,
        type: "supports",
      },
    ]
  );

  const candidate = candidates.find(
    item => item.id === "1->2"
  );

  expect(candidate).toBeDefined();

  expect(
    candidate?.steps[0].relationshipTypes
  ).toEqual(["searches", "supports"]);

  expect(candidate?.score).toBe(16);
  });

  it("does not duplicate starters from repeated card IDs", () => {
    const candidates = discoverComboCandidates(
      [1, 1, 2, 2],
      [
        {
          sourceCardId: 1,
          targetCardId: 2,
          type: "searches",
        },
      ]
    );

    expect(
      candidates.filter(item => item.id === "1->2")
    ).toHaveLength(1);
  });

  it("preserves distinct paths to the same target", () => {
    const candidates = discoverComboCandidates(
      [1, 2, 3, 4],
      [
        {
          sourceCardId: 1,
          targetCardId: 2,
          type: "searches",
        },
        {
          sourceCardId: 2,
          targetCardId: 4,
          type: "summons",
        },
        {
          sourceCardId: 1,
          targetCardId: 3,
          type: "supports",
        },
        {
          sourceCardId: 3,
          targetCardId: 4,
          type: "enables",
        },
      ],
      {
        minDepth: 2,
        maxDepth: 2,
      }
    );

    const ids = candidates.map(item => item.id);

    expect(ids).toContain("1->2->4");
    expect(ids).toContain("1->3->4");
  });

  it("preserves the original ranking heuristic", () => {
    const candidates = discoverComboCandidates(
      [1, 2, 3],
      [
        {
          sourceCardId: 1,
          targetCardId: 2,
          type: "searches",
        },
        {
          sourceCardId: 2,
          targetCardId: 3,
          type: "summons",
        },
      ],
      {
        maxDepth: 2,
      }
    );

    const longer = candidates.find(
      item => item.id === "1->2->3"
    );

    expect(longer?.score).toBe(26);
    expect(candidates[0]?.id).toBe("1->2->3");
  });

  it("limits the number of explored search states", () => {
  const candidates = discoverComboCandidates(
    [1, 2, 3, 4],
    [
      {
        sourceCardId: 1,
        targetCardId: 2,
        type: relationshipType,
      },
      {
        sourceCardId: 2,
        targetCardId: 3,
        type: relationshipType,
      },
      {
        sourceCardId: 3,
        targetCardId: 4,
        type: relationshipType,
      },
    ],
    {
      minDepth: 1,
      maxDepth: 3,
      maxExploredStates: 2,
    }
  );

  expect(candidates.map(candidate => candidate.id))
    .toEqual(["1->2"]);
  });

  it("does not explore past a one-state budget", () => {
    const candidates = discoverComboCandidates(
      [1, 2],
      [
        {
          sourceCardId: 1,
          targetCardId: 2,
          type: relationshipType,
        },
      ],
      {
        maxExploredStates: 1,
      }
    );

    expect(candidates).toEqual([]);
  });

  it("preserves all reachable candidates with sufficient budget", () => {
    const relationships = [
      {
        sourceCardId: 1,
        targetCardId: 2,
        type: relationshipType,
      },
      {
        sourceCardId: 2,
        targetCardId: 3,
        type: relationshipType,
      },
    ];

    const baseline = discoverComboCandidates(
      [1, 2, 3],
      relationships,
      {
        maxDepth: 2,
        maxExploredStates: 100,
      }
    );

    const largerBudget = discoverComboCandidates(
      [1, 2, 3],
      relationships,
      {
        maxDepth: 2,
        maxExploredStates: 1000,
      }
    );

    expect(largerBudget).toEqual(baseline);
  });

  it("prunes paths that cannot reach minimum depth", () => {
    const candidates = discoverComboCandidates(
      [1, 2],
      [
        {
          sourceCardId: 1,
          targetCardId: 2,
          type: relationshipType,
        },
      ],
      {
        minDepth: 2,
        maxDepth: 3,
        maxExploredStates: 100,
      }
    );

    expect(candidates).toEqual([]);
  });

  it("rejects invalid exploration budgets", () => {
    const invalidBudgets = [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ];

    for (const maxExploredStates of invalidBudgets) {
      expect(
        discoverComboCandidates(
          [1, 2],
          [],
          { maxExploredStates }
        )
      ).toEqual([]);
    }
  });

  it("produces deterministic results for identical inputs", () => {
    const relationships = [
      {
        sourceCardId: 1,
        targetCardId: 2,
        type: relationshipType,
      },
      {
        sourceCardId: 1,
        targetCardId: 3,
        type: relationshipType,
      },
      {
        sourceCardId: 2,
        targetCardId: 3,
        type: relationshipType,
      },
    ];

    const options = {
      maxDepth: 2,
      maxExploredStates: 4,
    };

    const first = discoverComboCandidates(
      [1, 2, 3],
      relationships,
      options
    );

    const second = discoverComboCandidates(
      [1, 2, 3],
      relationships,
      options
    );

    expect(second).toEqual(first);
  });

  it("returns diagnostics for a complete search", () => {
    const result = discoverComboCandidatesDetailed(
      [1, 2, 3],
      [
        { sourceCardId: 1, targetCardId: 2, type: "searches" },
        { sourceCardId: 2, targetCardId: 3, type: "summons" },
      ],
      {
        maxDepth: 2,
        maxExploredStates: 100,
      }
    );

    expect(result.diagnostics.complete).toBe(true);
    expect(result.diagnostics.budgetExhausted).toBe(false);
    expect(result.diagnostics.exploredStates).toBe(6);
    expect(result.diagnostics.generatedCandidates).toBe(3);
    expect(result.diagnostics.returnedCandidates).toBe(3);
  });

  it("reports when the exploration budget is exhausted", () => {
    const result = discoverComboCandidatesDetailed(
      [1, 2, 3],
      [
        { sourceCardId: 1, targetCardId: 2, type: "searches" },
        { sourceCardId: 2, targetCardId: 3, type: "summons" },
      ],
      {
        maxDepth: 2,
        maxExploredStates: 2,
      }
    );

    expect(result.diagnostics.exploredStates).toBe(2);
    expect(result.diagnostics.budgetExhausted).toBe(true);
    expect(result.diagnostics.complete).toBe(false);
    expect(result.candidates.map(candidate => candidate.id))
      .toEqual(["1->2"]);
  });

  it("retains the highest-ranked candidates with a small result limit", () => {
    const result = discoverComboCandidatesDetailed(
      [1, 2, 3, 4],
      relationships,
      {
        maxDepth: 2,
        maxCandidates: 2,
        maxExploredStates: 100,
      }
    );

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map(candidate => candidate.id))
      .toEqual(["1->2->3", "1->4->3"]);

    expect(result.diagnostics.generatedCandidates)
      .toBeGreaterThan(2);
    expect(result.diagnostics.returnedCandidates).toBe(2);
  });

  it("preserves the original API results", () => {
    const options = {
      maxDepth: 2,
      maxCandidates: 3,
      maxExploredStates: 100,
    };

    const detailed = discoverComboCandidatesDetailed(
      [1, 2, 3, 4],
      relationships,
      options
    );

    const simple = discoverComboCandidates(
      [1, 2, 3, 4],
      relationships,
      options
    );

    expect(simple).toEqual(detailed.candidates);
  });

  it("does not mark an empty graph as budget exhausted", () => {
    const result = discoverComboCandidatesDetailed(
      [],
      [],
      { maxExploredStates: 1 }
    );

    expect(result.candidates).toEqual([]);
    expect(result.diagnostics.exploredStates).toBe(0);
    expect(result.diagnostics.complete).toBe(true);
  });

  it("returns deterministic diagnostics", () => {
    const options = {
      maxDepth: 2,
      maxCandidates: 2,
      maxExploredStates: 4,
    };

    const first = discoverComboCandidatesDetailed(
      [1, 2, 3, 4],
      relationships,
      options
    );

    const second = discoverComboCandidatesDetailed(
      [1, 2, 3, 4],
      relationships,
      options
    );

    expect(second).toEqual(first);
  });

  it("reports complete when the budget exactly covers all starters", () => {
    const result = discoverComboCandidatesDetailed(
      [1, 2, 3],
      [],
      {
        maxExploredStates: 3,
      }
    );

    expect(result.diagnostics.exploredStates).toBe(3);
    expect(result.diagnostics.budgetExhausted).toBe(false);
    expect(result.diagnostics.complete).toBe(true);
    expect(result.diagnostics.invalidOptions).toBe(false);
  });

  it("reports incomplete when unvisited starters remain", () => {
    const result = discoverComboCandidatesDetailed(
      [1, 2, 3],
      [],
      {
        maxExploredStates: 2,
      }
    );

    expect(result.diagnostics.exploredStates).toBe(2);
    expect(result.diagnostics.budgetExhausted).toBe(true);
    expect(result.diagnostics.complete).toBe(false);
  });

  it("distinguishes invalid options from no candidates", () => {
    const invalid = discoverComboCandidatesDetailed(
      [1, 2],
      [],
      {
        maxExploredStates: 0,
      }
    );

    const empty = discoverComboCandidatesDetailed(
      [1, 2],
      [],
      {
        maxExploredStates: 10,
      }
    );

    expect(invalid.candidates).toEqual([]);
    expect(invalid.diagnostics.invalidOptions).toBe(true);
    expect(invalid.diagnostics.complete).toBe(false);

    expect(empty.candidates).toEqual([]);
    expect(empty.diagnostics.invalidOptions).toBe(false);
    expect(empty.diagnostics.complete).toBe(true);
  });

  it("preserves backward compatibility", () => {
    const cardIds = [1, 2, 3];
    const relationships: CardRelationship[] = [];

    const options = {
      maxExploredStates: 10,
      maxCandidates: 2,
    };

    const detailed = discoverComboCandidatesDetailed(
      cardIds,
      relationships,
      options
    );

    const original = discoverComboCandidates(
      cardIds,
      relationships,
      options
    );

    expect(original).toEqual(detailed.candidates);
  });
});
