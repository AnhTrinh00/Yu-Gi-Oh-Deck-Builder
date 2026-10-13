
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DeckSummary from "../DeckSummary";
import { createEmptyDeck } from "../../../services/deck/deckService";

describe("DeckSummary", () => {
  it("renders empty deck capacities", () => {
    const deck = createEmptyDeck();

    const html = renderToStaticMarkup(
      <DeckSummary deck={deck} />
    );

    expect(html).toContain("Main Deck");
    expect(html).toContain("Extra Deck");
    expect(html).toContain("Side Deck");
    expect(html).toContain("0% capacity");
  });

  it("displays the current deck name", () => {
    const deck = {
      ...createEmptyDeck(),
      name: "My Test Deck",
    };

    const html = renderToStaticMarkup(
      <DeckSummary deck={deck} />
    );

    expect(html).toContain("My Test Deck");
  });
});
