
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import DeckManager from "../DeckManager";
import { createEmptyDeck } from "../../../services/deckService";

describe("DeckManager", () => {
  const callbacks = {
    onSelectSection: vi.fn(),
    onRenameDeck: vi.fn(),
    onAddCard: vi.fn(),
    onRemoveCard: vi.fn(),
    onRemoveAll: vi.fn(),
    onClearDeck: vi.fn(),
  };

  it("renders the deck name and section capacities", () => {
    const deck = createEmptyDeck("Test Deck");

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DeckManager
          deck={deck}
          collection={[]}
          selectedSection="main"
          {...callbacks}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Test Deck");
    expect(html).toContain("Main Deck");
    expect(html).toContain("Extra Deck");
    expect(html).toContain("Side Deck");
    expect(html).toContain("0 / 60");
    expect(html).toContain("0 / 15");
  });

  it("shows an empty state for an empty deck", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DeckManager
          deck={createEmptyDeck()}
          collection={[]}
          selectedSection="main"
          {...callbacks}
        />
      </MemoryRouter>
    );

    expect(html).toContain("No cards in this section");
  });
});
