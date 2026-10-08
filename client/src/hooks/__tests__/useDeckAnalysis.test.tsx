
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";
import type { CollectionCard } from "../../models/CollectionCard";
import type { CardRelationship } from "../../models/CardRelationship";

import { useDeckAnalysis } from "../useDeckAnalysis";

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

const deck: Deck = {
  name: "Integration Test",
  main: [
    { card: a, quantity: 3 },
    { card: b, quantity: 2 },
  ],
  extra: [],
  side: [],
};

const collection: CollectionCard[] = [
  { card: a, quantity: 3 },
  { card: b, quantity: 2 },
];

const relationships: CardRelationship[] = [
  {
    sourceCardId: 1,
    targetCardId: 2,
    type: "searches",
  },
];

function AnalysisProbe({
  currentDeck,
  currentRelationships,
}: {
  currentDeck: Deck;
  currentRelationships: CardRelationship[];
}) {
  const analysis = useDeckAnalysis({
    deck: currentDeck,
    collection,
    relationships: currentRelationships,
    combos: [],
    format: "advanced",
    maxDepth: 2,
  });

  return (
    <output
        data-main={analysis.counts.main}
        data-unique={analysis.counts.unique}
        data-candidates={analysis.summary.candidateCount}
        data-name={analysis.cardNames.get(1)}
    />
    );
}

describe("useDeckAnalysis", () => {
  it("calculates deck counts", () => {
    const html = renderToStaticMarkup(
      <AnalysisProbe
        currentDeck={deck}
        currentRelationships={relationships}
      />
    );

    expect(html).toContain('data-main="5"');
    expect(html).toContain('data-unique="2"');
  });

  it("discovers recorded interaction paths", () => {
    const html = renderToStaticMarkup(
      <AnalysisProbe
        currentDeck={deck}
        currentRelationships={relationships}
      />
    );

    expect(html).toContain('data-candidates="1"');
  });

  it("updates results for an empty relationship graph", () => {
    const html = renderToStaticMarkup(
      <AnalysisProbe
        currentDeck={deck}
        currentRelationships={[]}
      />
    );

    expect(html).toContain('data-candidates="0"');
  });

  it("resolves card names", () => {
    const html = renderToStaticMarkup(
      <AnalysisProbe
        currentDeck={deck}
        currentRelationships={relationships}
      />
    );

    expect(html).toContain('data-name="Card 1"');
  });

  it("reflects changes in deck contents", () => {
    const updatedDeck: Deck = {
        ...deck,
        main: [{ card: a, quantity: 1 }],
    };

    const html = renderToStaticMarkup(
        <AnalysisProbe
        currentDeck={updatedDeck}
        currentRelationships={relationships}
        />
    );

    expect(html).toContain('data-main="1"');
    expect(html).toContain('data-unique="1"');
    expect(html).toContain('data-candidates="0"');
    });
});
