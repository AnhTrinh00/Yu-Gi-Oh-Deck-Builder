
import { describe, expect, it } from "vitest";

import type { CardRelationship } from "../../models/CardRelationship";

import { analyzeRelationshipGraph } from "../relationship/relationshipGraphAnalysisService";

const relationships: CardRelationship[] = [
  { sourceCardId: 1, targetCardId: 2, type: "searches" },
  { sourceCardId: 1, targetCardId: 2, type: "supports" },
  { sourceCardId: 2, targetCardId: 3, type: "summons" },
  { sourceCardId: 3, targetCardId: 1, type: "enables" },
];

describe("relationshipGraphAnalysisService", () => {
  it("calculates incoming and outgoing connections", () => {
    const result = analyzeRelationshipGraph(
      [1, 2, 3],
      relationships
    );

    const card1 = result.metrics.find(
      (metric) => metric.cardId === 1
    );

    expect(card1).toEqual({
      cardId: 1,
      incoming: 1,
      outgoing: 1,
      totalConnections: 2,
      relationshipCount: 3,
      isolated: false,
    });
  });

  it("does not double-count neighboring cards", () => {
    const result = analyzeRelationshipGraph(
      [1, 2],
      relationships
    );

    const card1 = result.metrics.find(
      (metric) => metric.cardId === 1
    );

    expect(card1?.outgoing).toBe(1);
    expect(card1?.totalConnections).toBe(1);
  });

  it("identifies isolated cards", () => {
    const result = analyzeRelationshipGraph(
      [1, 2, 3, 4],
      relationships
    );

    expect(result.isolatedCardIds).toEqual([4]);
    expect(result.connectedCardCount).toBe(3);
  });

  it("excludes relationships outside the selected cards", () => {
    const result = analyzeRelationshipGraph(
      [1, 2],
      relationships
    );

    expect(result.relationshipCount).toBe(2);
  });

  it("ranks connected cards as hubs", () => {
    const result = analyzeRelationshipGraph(
      [1, 2, 3, 4],
      relationships
    );

    expect(result.hubs).toHaveLength(3);
    expect(result.hubs[0].totalConnections).toBe(2);
    expect(result.hubs.some(
      (metric) => metric.cardId === 4
    )).toBe(false);
  });

  it("handles an empty graph", () => {
    const result = analyzeRelationshipGraph([], []);

    expect(result.cardCount).toBe(0);
    expect(result.relationshipCount).toBe(0);
    expect(result.hubs).toEqual([]);
    expect(result.isolatedCardIds).toEqual([]);
  });

  it("handles self-referencing relationships", () => {
    const result = analyzeRelationshipGraph(
      [1],
      [
        {
          sourceCardId: 1,
          targetCardId: 1,
          type: "supports",
        },
      ]
    );

    expect(result.relationshipCount).toBe(1);
    expect(result.metrics[0].incoming).toBe(1);
    expect(result.metrics[0].outgoing).toBe(1);
    expect(result.metrics[0].totalConnections).toBe(0);
    expect(result.metrics[0].isolated).toBe(false);
  });
});
