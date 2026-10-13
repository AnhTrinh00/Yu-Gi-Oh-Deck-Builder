
import { describe, expect, it } from "vitest";
import type { Card } from "../../models/card/Card";
import type { Deck } from "../../models/deck/Deck";
import {
  getCardRoles,
  getDeckRoleSummaries,
} from "../card/cardRoleService";
import { createEmptyDeck } from "../deck/deckService";

// Create a reusable mock card
function createMockCard(
  overrides: Partial<Card> = {}
): Card {
  return {
    id: 1,
    name: "Test Card",
    type: "Effect Monster",
    frameType: "effect",
    description: "A test monster.",
    race: "Warrior",
    imageUrl: "",
    imageUrlSmall: "",
    ...overrides,
  };
}

// Create a deck without applying deck-building restrictions.
// This lets us test role analysis independently.
function createMockDeck(
  cards: Array<{ card: Card; quantity: number }>
): Deck {
  return {
    ...createEmptyDeck(),
    main: cards,
  };
}

describe("cardRoleService", () => {
  describe("getCardRoles", () => {
    it("identifies archetype cards as engine cards", () => {
      const card = createMockCard({
        archetype: "Mitsurugi",
      });

      expect(getCardRoles(card)).toContain("engine");
    });

    it("identifies searchers", () => {
      const card = createMockCard({
        description:
          "Add 1 monster from your Deck to your hand.",
      });

      expect(getCardRoles(card)).toContain("searcher");
    });

    it("identifies extenders", () => {
      const card = createMockCard({
        description:
          "You can Special Summon this card from your hand.",
      });

      expect(getCardRoles(card)).toContain("extender");
    });

    it("identifies interaction cards", () => {
      const card = createMockCard({
        description:
          "When your opponent activates a monster effect: negate that activation.",
      });

      expect(getCardRoles(card)).toContain("interaction");
    });

    it("identifies hand traps", () => {
      const card = createMockCard({
        description:
          "When your opponent activates a card effect, you can discard this card from your hand; negate that effect.",
      });

      expect(getCardRoles(card)).toContain("hand-trap");
    });

    it("identifies board breakers", () => {
      const card = createMockCard({
        type: "Spell Card",
        frameType: "spell",
        description:
          "Destroy all monsters your opponent controls.",
      });

      expect(getCardRoles(card)).toContain("board-breaker");
    });

    it("supports multiple roles for the same card", () => {
      const card = createMockCard({
        archetype: "Example",
        description:
          "You can Special Summon this card from your hand. If this card is summoned: Add 1 monster from your Deck to your hand.",
      });

      const roles = getCardRoles(card);

      expect(roles).toContain("engine");
      expect(roles).toContain("extender");
      expect(roles).toContain("searcher");
    });

    it("identifies generic cards when no roles match", () => {
      const card = createMockCard({
        archetype: undefined,
        description: "A normal monster.",
      });

      expect(getCardRoles(card)).toEqual(["generic"]);
    });

    it("does not automatically identify starters", () => {
      const card = createMockCard({
        archetype: "Example",
        description:
          "Add 1 monster from your Deck to your hand.",
      });

      expect(getCardRoles(card)).not.toContain("starter");
    });

    it("does not classify unrelated effects as searchers", () => {
      const card = createMockCard({
        description:
          "Draw 1 card, then discard 1 card.",
      });

      expect(getCardRoles(card)).not.toContain("searcher");
    });
  });

  describe("getDeckRoleSummaries", () => {
    it("returns an empty array for an empty deck", () => {
      const deck = createEmptyDeck();

      expect(getDeckRoleSummaries(deck)).toEqual([]);
    });

    it("counts multiple copies correctly", () => {
      const card = createMockCard({
        archetype: "Mitsurugi",
      });

      const deck = createMockDeck([
        { card, quantity: 3 },
      ]);

      expect(getDeckRoleSummaries(deck)).toContainEqual({
        role: "engine",
        cardCount: 3,
        uniqueCards: 1,
      });
    });

    it("counts unique cards separately from total copies", () => {
      const first = createMockCard({
        id: 1,
        archetype: "Mitsurugi",
      });

      const second = createMockCard({
        id: 2,
        archetype: "Mitsurugi",
      });

      const deck = createMockDeck([
        { card: first, quantity: 3 },
        { card: second, quantity: 2 },
      ]);

      expect(getDeckRoleSummaries(deck)).toContainEqual({
        role: "engine",
        cardCount: 5,
        uniqueCards: 2,
      });
    });

    it("counts cards in multiple role categories", () => {
      const card = createMockCard({
        archetype: "Mitsurugi",
        description:
          "You can Special Summon this card from your hand. Add 1 monster from your Deck to your hand.",
      });

      const deck = createMockDeck([
        { card, quantity: 3 },
      ]);

      const summaries = getDeckRoleSummaries(deck);

      expect(summaries).toContainEqual({
        role: "engine",
        cardCount: 3,
        uniqueCards: 1,
      });

      expect(summaries).toContainEqual({
        role: "extender",
        cardCount: 3,
        uniqueCards: 1,
      });

      expect(summaries).toContainEqual({
        role: "searcher",
        cardCount: 3,
        uniqueCards: 1,
      });
    });

    it("sorts roles by total card count descending", () => {
      const engine = createMockCard({
        id: 1,
        archetype: "Mitsurugi",
      });

      const generic = createMockCard({
        id: 2,
        description: "A normal monster.",
      });

      const deck = createMockDeck([
        { card: generic, quantity: 1 },
        { card: engine, quantity: 3 },
      ]);

      const summaries = getDeckRoleSummaries(deck);

      expect(summaries[0].role).toBe("engine");
      expect(summaries[0].cardCount).toBe(3);
    });

    it("only analyzes Main Deck cards", () => {
      const card = createMockCard({
        archetype: "Mitsurugi",
      });

      const deck: Deck = {
        ...createEmptyDeck(),
        extra: [{ card, quantity: 1 }],
        side: [{ card, quantity: 2 }],
      };

      expect(getDeckRoleSummaries(deck)).toEqual([]);
    });
  });
});
