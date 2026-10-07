import { describe, expect, it } from "vitest";
import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";
import {
    getDeckStatistics,
} from "../deckStatisticsService";

const createCard = (
    id: number,
    name: string,
    type: string
): Card => ({
    id,
    name,
    type,
    frameType: "normal",
    description: "",
    race: "Warrior",
    imageUrl: "",
    imageUrlSmall: "",
});

describe("deckStatisticsService", () => {
    it("calculates deck section counts", () => {
        const deck: Deck = {
            name: "Test Deck",
            main: [
                {
                    card: createCard(
                        1,
                        "Monster",
                        "Effect Monster"
                    ),
                    quantity: 3,
                },
            ],
            extra: [
                {
                    card: createCard(
                        2,
                        "Fusion",
                        "Fusion Monster"
                    ),
                    quantity: 2,
                },
            ],
            side: [
                {
                    card: createCard(
                        3,
                        "Side Card",
                        "Spell Card"
                    ),
                    quantity: 1,
                },
            ],
        };

        const statistics =
            getDeckStatistics(deck);

        expect(statistics.mainCount).toBe(3);
        expect(statistics.extraCount).toBe(2);
        expect(statistics.sideCount).toBe(1);
    });

    it("calculates unique card counts", () => {
        const deck: Deck = {
            name: "Test Deck",
            main: [
                {
                    card: createCard(
                        1,
                        "Monster",
                        "Effect Monster"
                    ),
                    quantity: 3,
                },
                {
                    card: createCard(
                        2,
                        "Spell",
                        "Spell Card"
                    ),
                    quantity: 2,
                },
            ],
            extra: [
                {
                    card: createCard(
                        3,
                        "Fusion",
                        "Fusion Monster"
                    ),
                    quantity: 2,
                },
            ],
            side: [],
        };

        const statistics =
            getDeckStatistics(deck);

        expect(
            statistics.uniqueMainCards
        ).toBe(2);

        expect(
            statistics.uniqueExtraCards
        ).toBe(1);

        expect(
            statistics.uniqueSideCards
        ).toBe(0);
    });

    it("calculates monster, spell, and trap counts", () => {
        const deck: Deck = {
            name: "Test Deck",
            main: [
                {
                    card: createCard(
                        1,
                        "Monster",
                        "Effect Monster"
                    ),
                    quantity: 20,
                },
                {
                    card: createCard(
                        2,
                        "Spell",
                        "Spell Card"
                    ),
                    quantity: 10,
                },
                {
                    card: createCard(
                        3,
                        "Trap",
                        "Trap Card"
                    ),
                    quantity: 10,
                },
            ],
            extra: [],
            side: [],
        };

        const statistics =
            getDeckStatistics(deck);

        expect(
            statistics.monsterCount
        ).toBe(20);

        expect(
            statistics.spellCount
        ).toBe(10);

        expect(
            statistics.trapCount
        ).toBe(10);
    });

    it("calculates Main Deck percentages", () => {
        const deck: Deck = {
            name: "Test Deck",
            main: [
                {
                    card: createCard(
                        1,
                        "Monster",
                        "Effect Monster"
                    ),
                    quantity: 20,
                },
                {
                    card: createCard(
                        2,
                        "Spell",
                        "Spell Card"
                    ),
                    quantity: 10,
                },
                {
                    card: createCard(
                        3,
                        "Trap",
                        "Trap Card"
                    ),
                    quantity: 10,
                },
            ],
            extra: [],
            side: [],
        };

        const statistics =
            getDeckStatistics(deck);

        expect(
            statistics.monsterPercentage
        ).toBe(50);

        expect(
            statistics.spellPercentage
        ).toBe(25);

        expect(
            statistics.trapPercentage
        ).toBe(25);
    });

    it("returns zero percentages for an empty Main Deck", () => {
        const deck: Deck = {
            name: "Empty Deck",
            main: [],
            extra: [],
            side: [],
        };

        const statistics =
            getDeckStatistics(deck);

        expect(
            statistics.monsterPercentage
        ).toBe(0);

        expect(
            statistics.spellPercentage
        ).toBe(0);

        expect(
            statistics.trapPercentage
        ).toBe(0);
    });
});