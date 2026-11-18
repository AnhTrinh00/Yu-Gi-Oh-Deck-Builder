// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createEmptyDeck } from "../services/deck/deckService";

const { mockController } = vi.hoisted(() => ({
  mockController: vi.fn(),
}));

vi.mock("../hooks/useActiveDeckController", () => ({
  useActiveDeckController: mockController,
}));

import App from "../App";

function renderAt(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("Application navigation", () => {
  beforeEach(() => {
    const deck = createEmptyDeck("Navigation Test Deck");
    const noOp = vi.fn(async () => {});

    mockController.mockReturnValue({
      deck,
      activeDeckId: "test-deck",
      decks: [],
      isLoading: false,
      isTransitioning: false,
      workspaceError: null,
      saveStatus: "idle",
      saveError: null,
      initialize: noOp,
      updateDeck: vi.fn(),
      ensureSaved: noOp,
      retrySave: noOp,
      selectDeck: noOp,
      createDeck: noOp,
      duplicateDeck: noOp,
      deleteDeck: noOp,
      renameDeck: noOp,
      workspaceManager: {
        workspace: {
          activeDeckId: "test-deck",
          activeDeck: deck,
          decks: [],
        },
        isLoading: false,
        error: null,
        clearError: vi.fn(),
        createDeck: noOp,
        selectDeck: noOp,
        renameDeck: noOp,
        duplicateDeck: noOp,
        deleteDeck: noOp,
      },
    });
  });

  it("renders the Builder page after hydration", () => {
    const html = renderAt("/");
    expect(html).toContain("Card Builder");
    expect(html).toContain("Search Cards");
  });

  it("renders the Collection page", () => {
    expect(renderAt("/collection")).toContain("My Collection");
  });

  it("renders the Deck Manager", () => {
    const html = renderAt("/deck");
    expect(html).toContain("My Deck");
    expect(html).toContain("Deck Workspace");
  });

  it("renders the Analysis page", () => {
    const html = renderAt("/analysis");
    expect(html).toContain("Deck Analysis");
    expect(html).toContain("Overview");
  });

  it("shows startup UI instead of an empty deck before hydration", () => {
    mockController.mockReturnValue({
      deck: null,
      workspaceError: null,
      initialize: vi.fn(async () => {}),
    });

    expect(renderAt("/")).toContain("Preparing your saved deck workspace");
    expect(renderAt("/")).not.toContain("Card Builder");
  });
});
