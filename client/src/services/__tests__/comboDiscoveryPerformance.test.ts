import { describe, expect, it } from "vitest";

import type {
  CardRelationship,
  CardRelationshipType,
} from "../../models/CardRelationship";

import {
  discoverComboCandidatesDetailed,
} from "../comboDiscoveryService";

type BenchmarkScenario = {
  name: string;
  cardIds: number[];
  relationships: CardRelationship[];
};

type BenchmarkResult = {
  scenario: string;
  cards: number;
  relationships: number;
  averageMs: number;
  exploredStates: number;
  generatedCandidates: number;
  returnedCandidates: number;
  prunedBranches: number;
  complete: boolean;
};

const TYPES: CardRelationshipType[] = [
  "searches",
  "summons",
  "supports",
  "enables",
];

function makeRelationship(
  sourceCardId: number,
  targetCardId: number,
  index: number
): CardRelationship {
  return {
    sourceCardId,
    targetCardId,
    type: TYPES[index % TYPES.length],
  };
}

function makeLinearGraph(
  cardCount: number
): BenchmarkScenario {
  const cardIds = Array.from(
    { length: cardCount },
    (_, index) => index + 1
  );

  const relationships: CardRelationship[] = [];

  for (let index = 1; index < cardCount; index++) {
    relationships.push(
      makeRelationship(index, index + 1, index)
    );
  }

  return {
    name: "Linear",
    cardIds,
    relationships,
  };
}

function makeBranchingGraph(
  cardCount: number,
  branchingFactor: number
): BenchmarkScenario {
  const cardIds = Array.from(
    { length: cardCount },
    (_, index) => index + 1
  );

  const relationships: CardRelationship[] = [];

  for (let source = 1; source <= cardCount; source++) {
    for (
      let branch = 1;
      branch <= branchingFactor;
      branch++
    ) {
      const target =
        (source - 1) * branchingFactor + branch + 1;

      if (target > cardCount) {
        break;
      }

      relationships.push(
        makeRelationship(source, target, branch)
      );
    }
  }

  return {
    name: "Branching",
    cardIds,
    relationships,
  };
}

function makeDenseGraph(
  cardCount: number
): BenchmarkScenario {
  const cardIds = Array.from(
    { length: cardCount },
    (_, index) => index + 1
  );

  const relationships: CardRelationship[] = [];

  for (const source of cardIds) {
    for (const target of cardIds) {
      if (source === target) {
        continue;
      }

      relationships.push(
        makeRelationship(
          source,
          target,
          source + target
        )
      );
    }
  }

  return {
    name: "Dense",
    cardIds,
    relationships,
  };
}

function makeDuplicateHeavyGraph(
  cardCount: number,
  copiesPerEdge: number
): BenchmarkScenario {
  const base = makeLinearGraph(cardCount);

  return {
    name: "Duplicate-heavy",
    cardIds: base.cardIds,
    relationships: base.relationships.flatMap(
      relationship =>
        Array.from(
          { length: copiesPerEdge },
          () => ({ ...relationship })
        )
    ),
  };
}

function benchmarkScenario(
  scenario: BenchmarkScenario,
  iterations = 5
): BenchmarkResult {
  const options = {
    maxDepth: 4,
    minDepth: 1,
    maxCandidates: 30,
    maxExploredStates: 10000,
  };

  // Warm up before recording measurements.
  discoverComboCandidatesDetailed(
    scenario.cardIds,
    scenario.relationships,
    options
  );

  let totalMs = 0;

  let lastResult = discoverComboCandidatesDetailed(
    scenario.cardIds,
    scenario.relationships,
    options
  );

  for (let index = 0; index < iterations; index++) {
    const start = performance.now();

    lastResult = discoverComboCandidatesDetailed(
      scenario.cardIds,
      scenario.relationships,
      options
    );

    totalMs += performance.now() - start;
  }

  const { diagnostics } = lastResult;

  return {
    scenario: scenario.name,
    cards: scenario.cardIds.length,
    relationships: scenario.relationships.length,
    averageMs: Number(
      (totalMs / iterations).toFixed(3)
    ),
    exploredStates: diagnostics.exploredStates,
    generatedCandidates:
      diagnostics.generatedCandidates,
    returnedCandidates:
      diagnostics.returnedCandidates,
    prunedBranches: diagnostics.prunedBranches,
    complete: diagnostics.complete,
  };
}

describe("combo discovery performance", () => {
  it("benchmarks representative graph structures", () => {
    const scenarios: BenchmarkScenario[] = [
      makeLinearGraph(100),
      makeBranchingGraph(100, 3),
      makeDenseGraph(35),
      makeDuplicateHeavyGraph(100, 20),
    ];

    const results = scenarios.map(scenario =>
      benchmarkScenario(scenario)
    );

    console.log("\nCombo Discovery Benchmark Results");
    console.table(results);

    for (const result of results) {
      expect(result.averageMs).toBeGreaterThanOrEqual(0);

      expect(result.exploredStates).toBeLessThanOrEqual(
        10000
      );

      expect(result.returnedCandidates).toBeLessThanOrEqual(
        30
      );
    }
  });

  it("preserves results when duplicate edges are added", () => {
    const base = makeLinearGraph(20);
    const duplicateHeavy = makeDuplicateHeavyGraph(
      20,
      20
    );

    const options = {
      maxDepth: 4,
      maxExploredStates: 10000,
    };

    const original = discoverComboCandidatesDetailed(
      base.cardIds,
      base.relationships,
      options
    );

    const duplicated = discoverComboCandidatesDetailed(
      duplicateHeavy.cardIds,
      duplicateHeavy.relationships,
      options
    );

    expect(duplicated.candidates).toEqual(
      original.candidates
    );

    expect(
      duplicated.diagnostics.exploredStates
    ).toBe(original.diagnostics.exploredStates);
  });
});