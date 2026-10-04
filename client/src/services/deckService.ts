import type { Card } from "../models/Card";
import type { Deck, DeckCard, DeckSection } from "../models/Deck";
import {
    getBanlistCopyLimit,
    getBanlistStatus,
    type DeckFormat,
} from "./banlistService";

export const DECK_LIMITS = {
    MAIN_MIN: 40,
    MAIN_MAX: 60,
    EXTRA_MAX: 15,
    SIDE_MAX: 15,
    MAX_COPIES: 3,
} as const;

export const DEFAULT_DECK_FORMAT: DeckFormat = "advanced";

export const getAllowedSections = (
    card: Card
): DeckSection[] => {
    const type = card.type.toLowerCase();

    const isExtraDeckMonster =
        type.includes("fusion") ||
        type.includes("synchro") ||
        type.includes("xyz") ||
        type.includes("link");

    if (isExtraDeckMonster) {
        return ["extra", "side"];
    }

    return ["main", "side"];
};

export const canAddCardToSection = (
    card: Card,
    section: DeckSection
): boolean => {
    return getAllowedSections(card).includes(section);
};

export const validateCardPlacement = (
    card: Card,
    section: DeckSection
): string | null => {
    if (canAddCardToSection(card, section)) {
        return null;
    }

    if (section === "main") {
        return `${card.name} cannot be placed in the Main Deck.`;
    }

    if (section === "extra") {
        return `${card.name} cannot be placed in the Extra Deck.`;
    }

    return `${card.name} cannot be placed in the Side Deck.`;
};

export const createEmptyDeck = (
    name: string = "Untitled Deck"
): Deck => {
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
    return [
        ...deck.main,
        ...deck.extra,
        ...deck.side,
    ]
        .filter(
            (deckCard) => deckCard.card.id === cardId
        )
        .reduce(
            (total, deckCard) =>
                total + deckCard.quantity,
            0
        );
};

export const addCardToDeck = (
    deck: Deck,
    card: Card,
    section: DeckSection = "main"
): Deck => {
    if (!canAddCardToSection(card, section)) {
        return deck;
    }

    const totalQuantity = getCardQuantityInDeck(
    deck,
    card.id
    );

    const banlistLimit = getBanlistCopyLimit(
        card,
        DEFAULT_DECK_FORMAT
    );

    if (totalQuantity >= banlistLimit) {
        return deck;
    }

    const deckCards = deck[section];

    const existingCard = deckCards.find(
        (deckCard) =>
            deckCard.card.id === card.id
    );

    if (existingCard) {
        if (
            existingCard.quantity >=
            banlistLimit
        ) {
            return deck;
        }

        return {
            ...deck,
            [section]: deckCards.map(
                (deckCard) =>
                    deckCard.card.id === card.id
                        ? {
                              ...deckCard,
                              quantity:
                                  deckCard.quantity + 1,
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
        [section]: [
            ...deckCards,
            newDeckCard,
        ],
    };
};

export const removeCardFromDeck = (
    deck: Deck,
    cardId: number,
    section: DeckSection = "main"
): Deck => {
    const deckCards = deck[section];

    const existingCard = deckCards.find(
        (deckCard) =>
            deckCard.card.id === cardId
    );

    if (!existingCard) {
        return deck;
    }

    if (existingCard.quantity > 1) {
        return {
            ...deck,
            [section]: deckCards.map(
                (deckCard) =>
                    deckCard.card.id === cardId
                        ? {
                              ...deckCard,
                              quantity:
                                  deckCard.quantity - 1,
                          }
                        : deckCard
            ),
        };
    }

    return {
        ...deck,
        [section]: deckCards.filter(
            (deckCard) =>
                deckCard.card.id !== cardId
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
            (deckCard) =>
                deckCard.card.id !== cardId
        ),
    };
};

export const getDeckCardCount = (
    deck: Deck,
    section: DeckSection
): number => {
    return deck[section].reduce(
        (total, deckCard) =>
            total + deckCard.quantity,
        0
    );
};

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
    const mainCount = getDeckCardCount(
        deck,
        "main"
    );

    const extraCount = getDeckCardCount(
        deck,
        "extra"
    );

    const sideCount = getDeckCardCount(
        deck,
        "side"
    );

    const errors: string[] = [];

    if (
        mainCount <
        DECK_LIMITS.MAIN_MIN
    ) {
        errors.push(
            `Main Deck must contain at least ${DECK_LIMITS.MAIN_MIN} cards. Currently: ${mainCount}.`
        );
    }

    if (
        mainCount >
        DECK_LIMITS.MAIN_MAX
    ) {
        errors.push(
            `Main Deck cannot contain more than ${DECK_LIMITS.MAIN_MAX} cards. Currently: ${mainCount}.`
        );
    }

    if (
        extraCount >
        DECK_LIMITS.EXTRA_MAX
    ) {
        errors.push(
            `Extra Deck cannot contain more than ${DECK_LIMITS.EXTRA_MAX} cards. Currently: ${extraCount}.`
        );
    }

    if (
        sideCount >
        DECK_LIMITS.SIDE_MAX
    ) {
        errors.push(
            `Side Deck cannot contain more than ${DECK_LIMITS.SIDE_MAX} cards. Currently: ${sideCount}.`
        );
    }

    const allSections: {
        cards: DeckCard[];
        section: DeckSection;
    }[] = [
        {
            cards: deck.main,
            section: "main",
        },
        {
            cards: deck.extra,
            section: "extra",
        },
        {
            cards: deck.side,
            section: "side",
        },
    ];

    const allCards: DeckCard[] = [];

    for (const section of allSections) {
        allCards.push(...section.cards);

        for (const deckCard of section.cards) {
            const placementError =
                validateCardPlacement(
                    deckCard.card,
                    section.section
                );

            if (placementError) {
                errors.push(
                    placementError
                );
            }
        }
    }

    const cardQuantities =
        new Map<number, number>();

    for (const deckCard of allCards) {
        const currentQuantity =
            cardQuantities.get(
                deckCard.card.id
            ) ?? 0;

        cardQuantities.set(
            deckCard.card.id,
            currentQuantity +
                deckCard.quantity
        );
    }

    for (
        const [cardId, quantity]
        of cardQuantities
    ) {
        const card = allCards.find(
            (deckCard) =>
                deckCard.card.id === cardId
        )?.card;

        if (!card) {
            continue;
        }

        const banlistStatus =
            getBanlistStatus(
                card,
                DEFAULT_DECK_FORMAT
            );

        const banlistLimit =
            getBanlistCopyLimit(
                card,
                DEFAULT_DECK_FORMAT
            );

        if (quantity > banlistLimit) {
            errors.push(
                `${card.name} is ${banlistStatus} and cannot have more than ${banlistLimit} copy${banlistLimit === 1 ? "" : "ies"} in the deck. Currently: ${quantity}.`
            );
        }
    }

    const isMainDeckValid =
        mainCount >=
            DECK_LIMITS.MAIN_MIN &&
        mainCount <=
            DECK_LIMITS.MAIN_MAX;

    const isExtraDeckValid =
        extraCount <=
        DECK_LIMITS.EXTRA_MAX;

    const isSideDeckValid =
        sideCount <=
        DECK_LIMITS.SIDE_MAX;

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
            errors.length === 0,
        errors,
    };
};

const DECK_STORAGE_KEY = "yugioh-deck-builder-deck";

export const saveDeck = (
    deck: Deck
): void => {
    localStorage.setItem(
        DECK_STORAGE_KEY,
        JSON.stringify(deck)
    );
};

export const loadDeck = (): Deck | null => {
    const savedDeck =
        localStorage.getItem(
            DECK_STORAGE_KEY
        );

    if (!savedDeck) {
        return null;
    }

    try {
        return JSON.parse(
            savedDeck
        ) as Deck;
    } catch (error) {
        console.error(
            "Failed to load saved deck:",
            error
        );

        return null;
    }
};

export const clearSavedDeck = (): void => {
    localStorage.removeItem(
        DECK_STORAGE_KEY
    );
};
