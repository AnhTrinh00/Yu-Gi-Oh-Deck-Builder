import type {
  AIAvailableCollectionCard,
} from "../../models/ai/AIDeckContext";

export interface CollectionAvailabilityInput {
  id: number;
  name: string;
  type: string;
  description: string;
  ownedQuantity: number;
  allowedCopies?: number;
}

export interface DeckQuantityInput {
  id: number;
  quantity: number;
}

export interface CollectionAvailabilityResult {
  cards: AIAvailableCollectionCard[];
  truncated: boolean;
}

const MAX_COLLECTION_CARDS = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export function buildAICollectionAvailability(
  collection: CollectionAvailabilityInput[],
  deckCards: DeckQuantityInput[]
): CollectionAvailabilityResult {
  const deckQuantities = new Map<number, number>();

  for (const card of deckCards) {
    deckQuantities.set(
      card.id,
      (deckQuantities.get(card.id) ?? 0) +
        card.quantity
    );
  }

  const ownedCards = new Map<
    number,
    CollectionAvailabilityInput
  >();

  for (const card of collection) {
    if (!ownedCards.has(card.id)) {
      ownedCards.set(card.id, card);
    }
  }

  const availableCards: AIAvailableCollectionCard[] = [];

  for (const card of ownedCards.values()) {
    const deckQuantity = deckQuantities.get(card.id) ?? 0;

    const availableQuantity = Math.max(
      0,
      card.ownedQuantity - deckQuantity
    );

    if (availableQuantity === 0) {
      continue;
    }

    availableCards.push({
      id: card.id,
      name: card.name,
      type: card.type,
      description: card.description.slice(
        0,
        MAX_DESCRIPTION_LENGTH
      ),
      ownedQuantity: card.ownedQuantity,
      deckQuantity,
      availableQuantity,
      ...(card.allowedCopies !== undefined && {
        allowedCopies: card.allowedCopies,
      }),
    });
  }

  availableCards.sort(
    (a, b) =>
      b.availableQuantity - a.availableQuantity ||
      a.name.localeCompare(b.name) ||
      a.id - b.id
  );

  return {
    cards: availableCards.slice(
      0,
      MAX_COLLECTION_CARDS
    ),
    truncated:
      availableCards.length > MAX_COLLECTION_CARDS,
  };
}
