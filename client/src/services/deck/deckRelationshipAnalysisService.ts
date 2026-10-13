import type { Deck } from "../../models/deck/Deck";
import type {
  CardRelationship,
  CardRelationshipType,
} from "../../models/effect/CardRelationship";

import {
  getDeckRelationships,
} from "../relationship/cardRelationshipService";

import {
  getReachableCardIds,
  getDisconnectedCardIds,
} from "../relationship/cardRelationshipGraphService";

export interface CardConnectionSummary {
  cardId: number;
  cardName: string;
  outgoingCount: number;
  incomingCount: number;
  reachableCardCount: number;
}

export interface DeckRelationshipAnalysis {
  totalUniqueCards: number;
  totalRelationships: number;
  connectedCardCount: number;
  disconnectedCardCount: number;
  disconnectedCardIds: number[];
  relationshipTypeCounts: Partial<
    Record<CardRelationshipType, number>
  >;
  cardConnections: CardConnectionSummary[];
}

export function analyzeDeckRelationships(
  deck: Deck,
  relationships: CardRelationship[]
): DeckRelationshipAnalysis {
  // Gather unique cards across all deck sections.
  const cardMap = new Map<number, string>();

  for (const deckCard of [
    ...deck.main,
    ...deck.extra,
    ...deck.side,
  ]) {
    cardMap.set(
      deckCard.card.id,
      deckCard.card.name
    );
  }

  const cardIds = Array.from(cardMap.keys());

  // Only relationships whose endpoints
  // are both present in this deck.
  const deckRelationships = getDeckRelationships(
    deck,
    relationships
  );

  const disconnectedCardIds =
    getDisconnectedCardIds(
      cardIds,
      deckRelationships
    );

  const relationshipTypeCounts: Partial<
    Record<CardRelationshipType, number>
  > = {};

  for (const relationship of deckRelationships) {
    relationshipTypeCounts[relationship.type] =
      (relationshipTypeCounts[relationship.type] ?? 0) + 1;
  }

  const cardConnections: CardConnectionSummary[] =
    cardIds.map((cardId) => {
      const outgoingCount = deckRelationships.filter(
        (relationship) =>
          relationship.sourceCardId === cardId
      ).length;

      const incomingCount = deckRelationships.filter(
        (relationship) =>
          relationship.targetCardId === cardId
      ).length;

      const reachableCardCount =
        getReachableCardIds(
          cardId,
          deckRelationships
        ).length;

      return {
        cardId,
        cardName: cardMap.get(cardId)!,
        outgoingCount,
        incomingCount,
        reachableCardCount,
      };
    });

  cardConnections.sort(
    (a, b) =>
      b.reachableCardCount - a.reachableCardCount ||
      b.outgoingCount - a.outgoingCount ||
      a.cardName.localeCompare(b.cardName)
  );

  return {
    totalUniqueCards: cardIds.length,
    totalRelationships: deckRelationships.length,
    connectedCardCount:
      cardIds.length - disconnectedCardIds.length,
    disconnectedCardCount:
      disconnectedCardIds.length,
    disconnectedCardIds,
    relationshipTypeCounts,
    cardConnections,
  };
}
