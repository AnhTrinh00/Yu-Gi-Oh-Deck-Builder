
import { describe, expect, it } from "vitest";

import { findShortestPath } from "../relationship/cardRelationshipGraphService";
import { getPathSteps } from "../relationship/relationshipPathService";

import type { CardRelationship } from "../../models/effect/CardRelationship";

const relationships: CardRelationship[] = [
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
  {
    sourceCardId: 2,
    targetCardId: 3,
    type: "summons",
  },
  {
    sourceCardId: 1,
    targetCardId: 4,
    type: "enables",
  },
  {
    sourceCardId: 4,
    targetCardId: 5,
    type: "extends",
  },
  {
    sourceCardId: 5,
    targetCardId: 3,
    type: "requires",
  },
];

describe("Relationship Path Visualization", () => {
  it("finds the shortest directed path", () => {
    const path = findShortestPath(1, 3, relationships);

    expect(path).toEqual([1, 2, 3]);
  });

  it("includes all relationship types along the path", () => {
    const path = findShortestPath(1, 3, relationships);

    expect(path).not.toBeNull();

    const steps = getPathSteps(path!, relationships);

    expect(steps).toEqual([
      {
        sourceCardId: 1,
        targetCardId: 2,
        types: ["searches", "supports"],
      },
      {
        sourceCardId: 2,
        targetCardId: 3,
        types: ["summons"],
      },
    ]);
  });

  it("returns null when no directed path exists", () => {
    const path = findShortestPath(3, 1, relationships);

    expect(path).toBeNull();
  });

  it("returns null for an unreachable destination", () => {
    const path = findShortestPath(1, 99, relationships);

    expect(path).toBeNull();
  });

  it("handles identical source and destination cards", () => {
    const path = findShortestPath(2, 2, relationships);

    expect(path).toEqual([2]);
    expect(getPathSteps(path!, relationships)).toEqual([]);
  });

  it("only traverses relationships between deck cards", () => {
    const deckCardIds = new Set([1, 2, 3]);

    const visibleRelationships = relationships.filter(
      (relationship) =>
        deckCardIds.has(relationship.sourceCardId) &&
        deckCardIds.has(relationship.targetCardId)
    );

    expect(
      findShortestPath(1, 3, visibleRelationships)
    ).toEqual([1, 2, 3]);

    expect(
      findShortestPath(1, 4, visibleRelationships)
    ).toBeNull();
  });
});
