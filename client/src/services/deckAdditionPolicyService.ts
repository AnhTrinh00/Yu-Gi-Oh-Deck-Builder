
import type { Card } from "../models/Card";
import type { CollectionCard } from "../models/CollectionCard";
import type { Deck, DeckSection } from "../models/Deck";

import {
  canAddCardToSection,
  DECK_LIMITS,
  getCardQuantityInDeck,
  getDeckCardCount,
} from "./deckService";

import {
  getBanlistCopyLimit,
  getBanlistStatus,
} from "./banlistService";

export interface DeckAdditionResult {
  allowed: boolean;
  reason: string | null;
}

export function checkDeckAddition(
  deck: Deck,
  collection: CollectionCard[],
  card: Card,
  section: DeckSection
): DeckAdditionResult {
  function reject(reason: string): DeckAdditionResult {
    return { allowed: false, reason };
  }

  if (!canAddCardToSection(card, section)) {
    return reject(
      `This card cannot be placed in the ${section} deck.`
    );
  }

  const sectionLimit =
    section === "main"
      ? DECK_LIMITS.MAIN_MAX
      : section === "extra"
        ? DECK_LIMITS.EXTRA_MAX
        : DECK_LIMITS.SIDE_MAX;

  if (getDeckCardCount(deck, section) >= sectionLimit) {
    return reject(
      `The ${section} deck is full.`
    );
  }

  const ownedQuantity =
    collection.find(
      (entry) => entry.card.id === card.id
    )?.quantity ?? 0;

  const currentQuantity =
    getCardQuantityInDeck(deck, card.id);

  if (currentQuantity >= ownedQuantity) {
    return reject(
      `You only own ${ownedQuantity} ${
        ownedQuantity === 1 ? "copy" : "copies"
      } of this card.`
    );
  }

  if (currentQuantity >= DECK_LIMITS.MAX_COPIES) {
    return reject(
      "A deck cannot contain more than 3 copies of this card."
    );
  }

  const banlistLimit = getBanlistCopyLimit(
    card,
    "advanced"
  );

  if (currentQuantity >= banlistLimit) {
    const status = getBanlistStatus(card, "advanced");

    if (status === "Forbidden") {
      return reject(
        "This card is Forbidden in Advanced Format."
      );
    }

    if (status === "Limited") {
      return reject(
        "This card is Limited to 1 copy in Advanced Format."
      );
    }

    if (status === "Semi-Limited") {
      return reject(
        "This card is Semi-Limited to 2 copies in Advanced Format."
      );
    }

    return reject(
      "You have reached the permitted copy limit."
    );
  }

  return {
    allowed: true,
    reason: null,
  };
}
