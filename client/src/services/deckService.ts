import type { Card } from "../models/Card";
import type { Deck, DeckCard, DeckSection } from "../models/Deck";

export const createEmptyDeck = (name: string = "Untitled Deck"): Deck => {
    return {
        name,
        main: [],
        extra: [],
        side: [],
    };
};

export const getCardQuantityInDeck = (
    deck: Deck,
    cardId: number 
): number => {
    return [...deck.main, ...deck.extra, ...deck.side]
    .filter((deckCard) => deckCard.card.id === cardId)
    .reduce(
        (total, deckCard) => total + deckCard.quantity,
        0
    );
};

export const addCardToDeck = (
    deck: Deck,
    card: Card,
    section: DeckSection = "main"
): Deck => {
    const totalQuantity = getCardQuantityInDeck(
        deck,
        card.id 
    );

    if (totalQuantity >= 3) {
        return deck;
    }

    const deckCards = deck[section];

    const existingCard = deckCards.find(
        (deckCard) => deckCard.card.id === card.id
    );

    if (existingCard) {
        if (existingCard.quantity >= 3) {
            return deck;
        }

        return {
            ...deck,
            [section]: deckCards.map((deckCard) =>
                deckCard.card.id === card.id
                    ? {
                          ...deckCard,
                          quantity: deckCard.quantity + 1,
                      }
                    : deckCard
            ),
        };
    }

    const newDeckCard: DeckCard = {
        card,
        quantity: 1,
    };

    return {
        ...deck,
        [section]: [...deckCards, newDeckCard],
    };
};

export const removeCardFromDeck = (
    deck: Deck,
    cardId: number,
    section: DeckSection = "main"
): Deck => {
    const deckCards = deck[section];

    const existingCard = deckCards.find(
        (deckCard) => deckCard.card.id === cardId
    );

    if (!existingCard) {
        return deck;
    }

    if (existingCard.quantity > 1) {
        return {
            ...deck,
            [section]: deckCards.map((deckCard) => 
                deckCard.card.id === cardId
                    ? {
                        ...deckCard,
                        quantity: deckCard.quantity - 1,
                    }
                    : deckCard
                ),
        };
    }

    return {
        ...deck,
        [section]: deckCards.filter(
            (deckCard) => deckCard.card.id !== cardId
        ),
    };
};

export const removeAllCardsFromDeck = (
    deck: Deck,
    cardId: number,
    section: DeckSection = "main"
): Deck => {
    return {
        ...deck,
        [section]: deck[section].filter(
            (deckCard) => deckCard.card.id !== cardId
        ),
    };
};

export const getDeckCardCount = (
    deck: Deck,
    section: DeckSection
): number => {
    return deck[section].reduce(
        (total, deckCard) => total + deckCard.quantity,
        0 
    );
}

export interface DeckValidation {
    mainCount: number;
    extraCount: number;
    sideCount: number;
    isMainDeckValid: boolean;
    isExtraDeckValid: boolean;
    isSideDeckValid: boolean;
    isDeckValid: boolean;
    errors: string[];
}

export const validateDeck = (
    deck: Deck 
): DeckValidation => {
    const mainCount = getDeckCardCount(deck, "main");
    const extraCount = getDeckCardCount(deck, "extra");
    const sideCount = getDeckCardCount(deck, "side");

    const errors: string[] = [];

    if (mainCount < 40) {
        errors.push(
            `Main Deck must contain at least 40 cards. Currently: ${mainCount}.`
        );
    }

    if (mainCount > 60) {
        errors.push(
            `Main Deck cannot contain more than 60 cards. Currently: ${mainCount}.`
        );
    }

    if (extraCount > 15) {
        errors.push(
            `Extra Deck cannot contain more than 15 cards. Currently: ${extraCount}.`
        );
    }

    if (sideCount > 15) {
        errors.push(
            `Side Deck cannot contain more than 15 cards. Currently: ${sideCount}.`
        )
    }

    const allCards = [
        ...deck.main,
        ...deck.extra,
        ...deck.side,
    ];

    const cardQuantities = new Map<number, number>();

    for (const deckCard of allCards) {
        const currentQuantity = cardQuantities.get(deckCard.card.id) ?? 0;

        cardQuantities.set(
            deckCard.card.id,
            currentQuantity + deckCard.quantity
        );
    }

    for (const [cardId, quantity] of cardQuantities) {
        if (quantity > 3) {
            const card = allCards.find(
                (deckCard) => deckCard.card.id === cardId
            );

            errors.push(
                `${card?.card.name ?? "Unknown card"} cannot have more than 3 copies. Currently: ${quantity}`
            )
        }
    }

    const isMainDeckValid = mainCount >= 40 && mainCount <= 60;
    const isExtraDeckValid = extraCount <= 15;
    const isSideDeckValid = sideCount <= 15;

    return {
        mainCount,
        extraCount,
        sideCount,
        isMainDeckValid,
        isExtraDeckValid,
        isSideDeckValid,
        isDeckValid:
            isMainDeckValid &&
            isExtraDeckValid &&
            isSideDeckValid &&
            errors.every(
                (error) => !error.includes("more than 3 copies")
            ),
        errors,
    };
};

const DECK_STORAGE_KEY = "yugioh-deck-builder-deck";

export const saveDeck = (deck: Deck): void => {
    localStorage.setItem(
        DECK_STORAGE_KEY,
        JSON.stringify(deck)
    );
};

export const loadDeck = (): Deck | null => {
    const savedDeck = localStorage.getItem(
        DECK_STORAGE_KEY
    );

    if (!savedDeck) {
        return null;
    }

    try {
        return JSON.parse(savedDeck) as Deck;
    } catch (error) {
        console.error("Failed to load saved deck:", error);
        return null;
    }
};

export const clearSavedDeck = (): void => {
    localStorage.removeItem(DECK_STORAGE_KEY);
}