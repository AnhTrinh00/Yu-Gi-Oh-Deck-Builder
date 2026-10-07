import type { Deck } from "../models/Deck";

export interface ArchetypeSummary {
    archetype: string;
    cardCount: number;
    uniqueCards: number;
}

export const getArchetypeSummaries = (
    deck: Deck
): ArchetypeSummary[] => {
    const counts = new Map<string, { count: number; unique: number; }>();

    for (const deckCard of deck.main) {
        const archetype = deckCard.card.archetype;

        if (!archetype) {
            continue;
        }

        const existing = counts.get(archetype);

        if (existing) {
            existing.count += deckCard.quantity;
            existing.unique += 1;
        } else {
            counts.set(archetype, {
                count: deckCard.quantity,
                unique: 1
            });
        }
    }

    return Array.from(counts.entries())
        .map(([archetype, data]) => ({
            archetype,
            cardCount: data.count,
            uniqueCards: data.unique,
        }))
        .sort((a, b) => b.cardCount - a.cardCount);
};
