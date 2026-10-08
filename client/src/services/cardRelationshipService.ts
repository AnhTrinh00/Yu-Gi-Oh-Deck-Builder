import type { Card } from "../models/Card";
import type { Deck } from "../models/Deck";
import type {
    CardRelationship, CardRelationshipType,
} from "../models/CardRelationship";

export function createRelationship(
    source: Card,
    target: Card,
    type: CardRelationshipType,
    description?: string
): CardRelationship {
    return {
        sourceCardId: source.id,
        targetCardId: target.id,
        type,
        description,
    };
}

export function getOutgoingRelationships(
    cardId: number,
    relationships: CardRelationship[]
): CardRelationship[] {
    return relationships.filter(
        (relationships) => 
            relationships.sourceCardId === cardId
    );
}

export function getIncomingRelationships(
  cardId: number,
  relationships: CardRelationship[]
): CardRelationship[] {
  return relationships.filter(
    (relationship) =>
      relationship.targetCardId === cardId
  );
}

export function getCardRelationships(
  cardId: number,
  relationships: CardRelationship[]
): CardRelationship[] {
  return relationships.filter(
    (relationship) =>
      relationship.sourceCardId === cardId ||
      relationship.targetCardId === cardId
  );
}

export function getRelationshipsByType(
  relationships: CardRelationship[],
  type: CardRelationshipType
): CardRelationship[] {
  return relationships.filter(
    (relationship) => relationship.type === type
  );
}

export function getDeckRelationships(
  deck: Deck,
  relationships: CardRelationship[]
): CardRelationship[] {
  const cardIds = new Set(
    [...deck.main, ...deck.extra, ...deck.side].map(
      (deckCard) => deckCard.card.id
    )
  );

  return relationships.filter(
    (relationship) =>
      cardIds.has(relationship.sourceCardId) &&
      cardIds.has(relationship.targetCardId)
  );
}

export function getConnectedCardIds(
  cardId: number,
  relationships: CardRelationship[]
): number[] {
  const connected = new Set<number>();

  for (const relationship of relationships) {
    if (relationship.sourceCardId === cardId) {
      connected.add(relationship.targetCardId);
    }

    if (relationship.targetCardId === cardId) {
      connected.add(relationship.sourceCardId);
    }
  }

  return Array.from(connected);
}