// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import App from "../App";

vi.mock("../services/cardApi", () => ({
  searchCards: vi.fn(),
}));

function renderAt(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Application navigation", () => {
  it("renders the Builder page", () => {
    const html = renderAt("/");

    expect(html).toContain("Card Builder");
    expect(html).toContain("Search Cards");
  });

  it("renders the Collection page", () => {
    const html = renderAt("/collection");

    expect(html).toContain("My Collection");
  });

  it("renders the Deck Manager", () => {
    const html = renderAt("/deck");

    expect(html).toContain("My Deck");
  });

  it("renders the Analysis page", () => {
    const html = renderAt("/analysis");

    expect(html).toContain("Deck Analysis");
    expect(html).toContain("Overview");
  });
});
