
import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";
import type { CollectionCard } from "../../models/CollectionCard";
import type { Combo } from "../../models/Combo";

import { analyzeDataHealth } from "../analysisHealthService";

function card(id: number): Card {
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

const a = card(1);
const b = card(2);
const c = card(3);

const completeDeck: Deck = {
  name: "Health Test",
  main: [
    { card: a, quantity: 3 },
    { card: b, quantity: 3 },
    ...Array.from({ length: 34 }, (_, index) => ({
      card: card(index + 100),
      quantity: 1,
    })),
  ],
  extra: [],
  side: [],
};

const completeCollection: CollectionCard[] =
  completeDeck.main.map((entry) => ({
    card: entry.card,
    quantity: entry.quantity,
  }));

const base = {
  deck: completeDeck,
  collection: completeCollection,
  relationships: [],
  combos: [],
};

describe("analysisHealthService", () => {
  it("accepts consistent data", () => {
    const report = analyzeDataHealth(base);

    expect(report.healthy).toBe(true);
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBe(0);
  });

  it("detects an incomplete Main Deck", () => {
    const report = analyzeDataHealth({
      ...base,
      deck: {
        ...completeDeck,
        main: [{ card: a, quantity: 3 }],
      },
    });

    expect(
      report.issues.some(
        (issue) =>
          issue.id === "size-main-minimum"
      )
    ).toBe(true);
  });

  it("detects insufficient owned copies", () => {
    const report = analyzeDataHealth({
      ...base,
      collection: completeCollection.map((entry) =>
        entry.card.id === 1
          ? { ...entry, quantity: 1 }
          : entry
      ),
    });

    expect(
      report.issues.some(
        (issue) =>
          issue.id === "collection-shortage-1"
      )
    ).toBe(true);
  });

  it("detects invalid quantities", () => {
    const report = analyzeDataHealth({
      ...base,
      deck: {
        ...completeDeck,
        main: [
          { card: a, quantity: -1 },
          ...completeDeck.main.slice(1),
        ],
      },
    });

    expect(report.healthy).toBe(false);

    expect(
      report.issues.some(
        (issue) =>
          issue.type === "invalid-quantity"
      )
    ).toBe(true);
  });

  it("detects an oversized Extra Deck", () => {
    const report = analyzeDataHealth({
      ...base,
      deck: {
        ...completeDeck,
        extra: [
          { card: c, quantity: 16 },
        ],
      },
    });

    expect(
      report.issues.some(
        (issue) =>
          issue.id === "size-Extra"
      )
    ).toBe(true);
  });

  it("detects missing combo cards", () => {
    const combo: Combo = {
      id: "combo-1",
      name: "Test Combo",
      description: "",
      starters: [
        { cardId: 999, quantity: 1, zone: "hand" },
      ],
      requirements: [],
      steps: [],
      endBoardCardIds: [],
      createdAt: "",
      updatedAt: "",
    };

    const report = analyzeDataHealth({
      ...base,
      combos: [combo],
    });

    expect(
      report.issues.some(
        (issue) =>
          issue.id === "combo-combo-1-999"
      )
    ).toBe(true);
  });

  it("marks external relationships as informational", () => {
    const report = analyzeDataHealth({
      ...base,
      relationships: [
        {
          sourceCardId: 1,
          targetCardId: 999,
          type: "supports",
        },
      ],
    });

    expect(report.infoCount).toBe(1);
    expect(report.healthy).toBe(true);
  });
});
