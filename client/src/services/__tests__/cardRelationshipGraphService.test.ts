
import { describe, expect, it } from "vitest";

import type {
  CardRelationship,
} from "../../models/effect/CardRelationship";

import {
  buildRelationshipGraph,
  getReachableCardIds,
  findShortestPath,
  hasRelationshipPath,
  hasRelationshipCycle,
  getDisconnectedCardIds,
} from "../relationship/cardRelationshipGraphService";

const relationships: CardRelationship[] = [
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
  {
    sourceCardId: 3,
    targetCardId: 4,
    type: "enables",
  },
  {
    sourceCardId: 1,
    targetCardId: 4,
    type: "supports",
  },
];

describe("cardRelationshipGraphService", () => {
  describe("buildRelationshipGraph", () => {
    it("builds a directed adjacency list", () => {
      const graph = buildRelationshipGraph(relationships);

      expect([...graph.get(1)!]).toEqual([2, 4]);
      expect([...graph.get(2)!]).toEqual([3]);
      expect([...graph.get(3)!]).toEqual([4]);
      expect([...graph.get(4)!]).toEqual([]);
    });

    it("does not duplicate edges", () => {
      const duplicate: CardRelationship = {
        sourceCardId: 1,
        targetCardId: 2,
        type: "summons",
      };

      const graph = buildRelationshipGraph([
        ...relationships,
        duplicate,
      ]);

      expect(graph.get(1)?.size).toBe(2);
    });

    it("returns an empty graph for no relationships", () => {
      expect(buildRelationshipGraph([]).size).toBe(0);
    });
  });

  describe("getReachableCardIds", () => {
    it("finds all reachable cards", () => {
      expect(
        getReachableCardIds(1, relationships)
      ).toEqual([2, 4, 3]);
    });

    it("respects relationship direction", () => {
      expect(
        getReachableCardIds(4, relationships)
      ).toEqual([]);
    });

    it("returns an empty array for an unknown card", () => {
      expect(
        getReachableCardIds(999, relationships)
      ).toEqual([]);
    });

    it("does not revisit cards in a cycle", () => {
      const cyclic: CardRelationship[] = [
        { sourceCardId: 1, targetCardId: 2, type: "searches" },
        { sourceCardId: 2, targetCardId: 1, type: "supports" },
      ];

      expect(getReachableCardIds(1, cyclic)).toEqual([2]);
    });
  });

  describe("findShortestPath", () => {
    it("finds the shortest directed path", () => {
      expect(
        findShortestPath(1, 4, relationships)
      ).toEqual([1, 4]);
    });

    it("finds a multi-step path", () => {
      expect(
        findShortestPath(1, 3, relationships)
      ).toEqual([1, 2, 3]);
    });

    it("returns null when no path exists", () => {
      expect(
        findShortestPath(4, 1, relationships)
      ).toBeNull();
    });

    it("returns the starting card for a self-path", () => {
      expect(
        findShortestPath(1, 1, relationships)
      ).toEqual([1]);
    });
  });

  describe("hasRelationshipPath", () => {
    it("returns true when a path exists", () => {
      expect(
        hasRelationshipPath(1, 3, relationships)
      ).toBe(true);
    });

    it("returns false when no path exists", () => {
      expect(
        hasRelationshipPath(4, 1, relationships)
      ).toBe(false);
    });
  });

  describe("hasRelationshipCycle", () => {
    it("returns false for an acyclic graph", () => {
      expect(
        hasRelationshipCycle(relationships)
      ).toBe(false);
    });

    it("detects a directed cycle", () => {
      const cyclic: CardRelationship[] = [
        ...relationships,
        {
          sourceCardId: 4,
          targetCardId: 1,
          type: "enables",
        },
      ];

      expect(hasRelationshipCycle(cyclic)).toBe(true);
    });

    it("detects self-loops", () => {
      expect(
        hasRelationshipCycle([
          {
            sourceCardId: 1,
            targetCardId: 1,
            type: "supports",
          },
        ])
      ).toBe(true);
    });
  });

  describe("getDisconnectedCardIds", () => {
    it("finds cards without connections", () => {
      expect(
        getDisconnectedCardIds(
          [1, 2, 3, 4, 5, 6],
          relationships
        )
      ).toEqual([5, 6]);
    });

    it("ignores relationships outside the supplied card set", () => {
      expect(
        getDisconnectedCardIds(
          [1, 5],
          relationships
        )
      ).toEqual([1, 5]);
    });

    it("returns all cards when no relationships exist", () => {
      expect(
        getDisconnectedCardIds([1, 2, 3], [])
      ).toEqual([1, 2, 3]);
    });

    it("does not return duplicate card IDs", () => {
      expect(
        getDisconnectedCardIds([1, 1, 5, 5], [])
      ).toEqual([1, 5]);
    });
  });
});
