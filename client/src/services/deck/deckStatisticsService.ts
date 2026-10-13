import type { Deck } from "../../models/Deck";

import { getDeckCardCount } from "./deckService";

export interface DeckStatistics {
    mainCount: number;
    extraCount: number;
    sideCount: number;

    uniqueMainCards: number;
    uniqueExtraCards: number;
    uniqueSideCards: number;

    monsterCount: number;
    spellCount: number;
    trapCount: number;

    monsterPercentage: number;
    spellPercentage: number;
    trapPercentage: number;
}

export const getDeckStatistics = (
    deck: Deck
): DeckStatistics => {
    const mainCount = getDeckCardCount(deck, "main");
    const extraCount = getDeckCardCount(deck, "extra");
    const sideCount = getDeckCardCount(deck, "side");

    let monsterCount = 0;
    let spellCount = 0;
    let trapCount = 0;

    for (const deckCard of deck.main) {
        const type = deckCard.card.type.toLowerCase();

        if (type.includes("monster")) {
            monsterCount += deckCard.quantity;
        } else if (type.includes("spell")) {
            spellCount += deckCard.quantity;
        } else if (type.includes("trap")) {
            trapCount += deckCard.quantity;
        }
    }

    return {
        mainCount,
        extraCount,
        sideCount,

        uniqueMainCards: deck.main.length,
        uniqueExtraCards: deck.extra.length,
        uniqueSideCards: deck.side.length,

        monsterCount,
        spellCount,
        trapCount,

        monsterPercentage: 
            mainCount > 0
                ? (monsterCount / mainCount) * 100
                : 0,
        spellPercentage:
            mainCount > 0
                ? (spellCount / mainCount) * 100
                : 0,
        trapPercentage:
            mainCount > 0
                ? (trapCount / mainCount) * 100
                : 0,
    };
};