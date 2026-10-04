import type { Card } from "../models/Card"

export type DeckSection = "main" | "extra" | "side";

export const DECK_LIMITS = {
    MAIN_MIN: 40,
    MAIN_MAX: 60,
    EXTRA_MAX: 15,
    SIDE_MAX: 15,
    MAX_COPIES: 3,
};

export function getAllowedSections(card: Card): DeckSection[] {
    const type = card.type.toLowerCase();

    if (
        type.includes("fusion") ||
        type.includes("synchro") ||
        type.includes("xyz") ||
        type.includes("link")
    ) {
        return ["extra", "side"];
    }

    return ["main", "side"];
}

export function canAddCardToSection(
    card: Card,
    section: DeckSection
): boolean {
    return getAllowedSections(card).includes(section);
}

export interface DeckValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDeck(deck: {
  mainDeck: Card[];
  extraDeck: Card[];
  sideDeck: Card[];
}): DeckValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (deck.mainDeck.length < DECK_LIMITS.MAIN_MIN) {
    errors.push(
      `Main Deck must contain at least ${DECK_LIMITS.MAIN_MIN} cards.`
    );
  }

  if (deck.mainDeck.length > DECK_LIMITS.MAIN_MAX) {
    errors.push(
      `Main Deck cannot contain more than ${DECK_LIMITS.MAIN_MAX} cards.`
    );
  }

  if (deck.extraDeck.length > DECK_LIMITS.EXTRA_MAX) {
    errors.push(
      `Extra Deck cannot contain more than ${DECK_LIMITS.EXTRA_MAX} cards.`
    );
  }

  if (deck.sideDeck.length > DECK_LIMITS.SIDE_MAX) {
    errors.push(
      `Side Deck cannot contain more than ${DECK_LIMITS.SIDE_MAX} cards.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateCardPlacement(
  card: Card,
  section: DeckSection
): string | null {
  if (!canAddCardToSection(card, section)) {
    return `${card.name} cannot be placed in the ${section} deck.`;
  }

  return null;
}