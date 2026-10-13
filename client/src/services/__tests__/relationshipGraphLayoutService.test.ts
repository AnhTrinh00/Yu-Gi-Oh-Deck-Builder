
import { describe, expect, it } from "vitest";
import { createRelationshipGraphLayout } from "../relationship/relationshipGraphLayoutService";

describe("relationshipGraphLayoutService", () => {
  it("creates one node per unique card", () => {
    const graph = createRelationshipGraphLayout(
      [1, 2, 2, 3],
      []
    );

    expect(graph.nodes.map((node) => node.id)).toEqual([1, 2, 3]);
  });

  it("groups multiple relationship types", () => {
    const graph = createRelationshipGraphLayout(
      [1, 2],
      [
        { sourceCardId: 1, targetCardId: 2, type: "searches" },
        { sourceCardId: 1, targetCardId: 2, type: "supports" },
      ]
    );

    expect(graph.edges).toEqual([
      {
        source: 1,
        target: 2,
        types: ["searches", "supports"],
      },
    ]);
  });

  it("excludes relationships outside the deck", () => {
    const graph = createRelationshipGraphLayout(
      [1, 2],
      [
        { sourceCardId: 1, targetCardId: 2, type: "searches" },
        { sourceCardId: 2, targetCardId: 3, type: "summons" },
      ]
    );

    expect(graph.edges).toHaveLength(1);
  });

  it("preserves relationship direction", () => {
    const graph = createRelationshipGraphLayout(
      [1, 2],
      [
        { sourceCardId: 1, targetCardId: 2, type: "searches" },
        { sourceCardId: 2, targetCardId: 1, type: "supports" },
      ]
    );

    expect(graph.edges).toHaveLength(2);
  });

  it("handles an empty deck", () => {
    const graph = createRelationshipGraphLayout([], []);

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });
});
