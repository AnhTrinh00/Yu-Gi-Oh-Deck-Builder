import {
  describe,
  expect,
  it,
} from "vitest";

import {
  canPlaceCardInSection,
  getCardPlacementType,
} from "../services/deckCardPlacementService.js";

describe("deckCardPlacementService", () => {
    it.each([
    ["Normal Monster", "main"],
    ["Effect Monster", "main"],
    ["Ritual Monster", "main"],
    ["Spell Card", "main"],
    ["Trap Card", "main"],
    ["Fusion Monster", "extra"],
    ["Synchro Monster", "extra"],
    ["XYZ Monster", "extra"],
    ["Link Monster", "extra"],
    ] as const)(
    "classifies %s as %s",
    (cardType, expected) => {
        expect(getCardPlacementType(cardType)).toBe(
        expected
        );
    }
    );

    it.each([
    ["Fusion Effect Monster", "extra"],
    ["Synchro Tuner Monster", "extra"],
    ["XYZ Pendulum Effect Monster", "extra"],
    ["Link Effect Monster", "extra"],
    ["Ritual Effect Monster", "main"],
    ["Pendulum Effect Monster", "main"],
    ] as const)(
    "classifies compound type %s as %s",
    (type, expected) => {
        expect(getCardPlacementType(type)).toBe(expected);
    }
    );

    it("recognizes compound Extra Deck types", () => {
    expect(
        getCardPlacementType("Synchro Tuner Monster")
    ).toBe("extra");

    expect(
        getCardPlacementType("Fusion Effect Monster")
    ).toBe("extra");
    });

    it("allows Main Deck cards in the Main Deck", () => {
    expect(
        canPlaceCardInSection("Effect Monster", "main")
    ).toBe(true);

    expect(
        canPlaceCardInSection("Spell Card", "main")
    ).toBe(true);
    });

    it("rejects Extra Deck monsters in the Main Deck", () => {
    expect(
        canPlaceCardInSection("Fusion Monster", "main")
    ).toBe(false);

    expect(
        canPlaceCardInSection("Link Monster", "main")
    ).toBe(false);
    });

    it("rejects Main Deck cards in the Extra Deck", () => {
    expect(
        canPlaceCardInSection("Effect Monster", "extra")
    ).toBe(false);

    expect(
        canPlaceCardInSection("Trap Card", "extra")
    ).toBe(false);
    });

    it("allows both card categories in the Side Deck", () => {
    expect(
        canPlaceCardInSection("Effect Monster", "side")
    ).toBe(true);

    expect(
        canPlaceCardInSection("Xyz Monster", "side")
    ).toBe(true);
    });

    it("rejects unknown card types", () => {
    expect(getCardPlacementType("")).toBe("unknown");

    expect(
        canPlaceCardInSection("Unknown", "side")
    ).toBe(false);
    });
});
