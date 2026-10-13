
import {
  describe,
  expect,
  it,
} from "vitest";

import type { Deck } from "../../models/deck/Deck";
import type { Card } from "../../models/card/Card";

import {
  createComboExplorerState,
} from "../combo/discovery/comboExplorerStateService";

const testCard: Card = {
  id: 100,
  name: "Test Monster",
  type: "Effect Monster",
  frameType: "effect",
  description: "A test card.",
  race: "Warrior",
  imageUrl: "",
  imageUrlSmall: "",
};

const deck: Deck = {
  name: "Test Deck",
  main: [
    {
      card: testCard,
      quantity: 3,
    },
  ],
  extra: [],
  side: [],
};

describe("createComboExplorerState", () => {
  it("moves selected cards into the hand", () => {
    const state = createComboExplorerState(
      deck,
      [100, 100]
    );

    expect(state.zones.hand).toEqual([100, 100]);
    expect(state.zones.deck).toEqual([100]);
  });

  it("initializes extended game state", () => {
    const state = createComboExplorerState(
      deck,
      [100]
    );

    expect(state.fieldState).toBeDefined();
    expect(state.turnState).toBeDefined();
    expect(state.effectUsage).toBeDefined();
    expect(state.cardInstances).toBeDefined();
  });

  it("tracks individual card copies", () => {
    const state = createComboExplorerState(
      deck,
      [100, 100]
    );

    const handInstances =
      state.cardInstances?.instances.filter(
        instance => instance.zone === "hand"
      );

    expect(handInstances).toHaveLength(2);

    expect(
      new Set(
        handInstances?.map(
          instance => instance.instanceId
        )
      ).size
    ).toBe(2);
  });

  it("rejects more copies than the deck owns", () => {
    expect(() =>
      createComboExplorerState(
        deck,
        [100, 100, 100, 100]
      )
    ).toThrow(/no remaining Main Deck copies/);
  });

  it("does not mutate the original deck", () => {
    createComboExplorerState(deck, [100]);

    expect(deck.main[0].quantity).toBe(3);
  });
});
