import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { Deck } from "../../../models/Deck";

import { ChainSimulator } from "../ChainSimulator";

vi.mock(
  "../../../services/cardEffectRegistryService",
  () => ({
    cardEffectRegistry: {
      getAllEffects: () => [],
    },
  })
);

const emptyDeck = {
  name: "Test Deck",
  main: [],
  extra: [],
  side: [],
} as Deck;

describe("ChainSimulator", () => {
  it("renders the chain simulator", () => {
    const html = renderToStaticMarkup(
      <ChainSimulator deck={emptyDeck} />
    );

    expect(html).toContain(
      "Chain Simulator"
    );

    expect(html).toContain(
      "Start Chain Simulation"
    );
  });

  it("shows an empty starting hand", () => {
    const html = renderToStaticMarkup(
      <ChainSimulator deck={emptyDeck} />
    );

    expect(html).toContain(
      "Select Starting Hand"
    );
  });
});