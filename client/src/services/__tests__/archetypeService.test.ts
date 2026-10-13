import { describe, expect, it } from "vitest";
import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";
import {
    getArchetypeSummaries,
} from "../card/archetypeService";

const createCard = (
    id: number,
    name: string,
    archetype?: string
): Card => ({
    id,
    name,
    type: "Effect Monster",
    frameType: "effect",
    description: "",
    race: "Warrior",
    imageUrl: "",
    imageUrlSmall: "",
    archetype,
});

const createDeck = (
    main: Deck["main"] = [],
    extra: Deck["extra"] = [],
    side: Deck["side"] = []
): Deck => ({
    name: "Test Deck",
    main,
    extra,
    side,
});

describe("getArchetypeSummaries", () => {
    it("detects archetypes in the Main Deck", () => {
        const archetypeCard = createCard(
            1,
            "Archetype Card",
            "Test Archetype"
        );

        const deck = createDeck([
            {
                card: archetypeCard,
                quantity: 3,
            },
        ]);

        const result = getArchetypeSummaries(deck);

        expect(result).toEqual([
            {
                archetype: "Test Archetype",
                cardCount: 3,
                uniqueCards: 1,
            },
        ]);
    });

    it("groups multiple cards from the same archetype", () => {
        const card1 = createCard(
            1,
            "Test Card 1",
            "Test Archetype"
        );

        const card2 = createCard(
            2,
            "Test Card 2",
            "Test Archetype"
        );

        const deck = createDeck([
            {
                card: card1,
                quantity: 3,
            },
            {
                card: card2,
                quantity: 2,
            },
        ]);

        const result = getArchetypeSummaries(deck);

        expect(result).toEqual([
            {
                archetype: "Test Archetype",
                cardCount: 5,
                uniqueCards: 2,
            },
        ]);
    });

    it("detects multiple archetypes", () => {
        const archetypeA = createCard(
            1,
            "Card A",
            "Archetype A"
        );

        const archetypeB = createCard(
            2,
            "Card B",
            "Archetype B"
        );

        const deck = createDeck([
            {
                card: archetypeA,
                quantity: 3,
            },
            {
                card: archetypeB,
                quantity: 2,
            },
        ]);

        const result = getArchetypeSummaries(deck);

        expect(result).toEqual([
            {
                archetype: "Archetype A",
                cardCount: 3,
                uniqueCards: 1,
            },
            {
                archetype: "Archetype B",
                cardCount: 2,
                uniqueCards: 1,
            },
        ]);
    });

    it("sorts archetypes by card count", () => {
        const small = createCard(
            1,
            "Small Engine",
            "Small"
        );

        const large = createCard(
            2,
            "Large Engine",
            "Large"
        );

        const deck = createDeck([
            {
                card: small,
                quantity: 2,
            },
            {
                card: large,
                quantity: 3,
            },
        ]);

        const result = getArchetypeSummaries(deck);

        expect(result[0].archetype).toBe("Large");
        expect(result[1].archetype).toBe("Small");
    });

    it("ignores cards without an archetype", () => {
        const archetypeCard = createCard(
            1,
            "Archetype Card",
            "Test Archetype"
        );

        const genericCard = createCard(
            2,
            "Generic Card"
        );

        const deck = createDeck([
            {
                card: archetypeCard,
                quantity: 3,
            },
            {
                card: genericCard,
                quantity: 3,
            },
        ]);

        const result = getArchetypeSummaries(deck);

        expect(result).toEqual([
            {
                archetype: "Test Archetype",
                cardCount: 3,
                uniqueCards: 1,
            },
        ]);
    });

    it("returns an empty array for an empty deck", () => {
        const deck = createDeck();

        const result = getArchetypeSummaries(deck);

        expect(result).toEqual([]);
    });
});