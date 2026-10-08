
import type { Card } from "../models/Card";
import type { Deck, DeckSection } from "../models/Deck";
import type {
  CardRelationship,
  CardRelationshipType,
} from "../models/CardRelationship";
import { getCardRoles } from "./cardRoleService";
import type { CardRole } from "./cardRoleService";

export interface RelationshipGraphFilters {
  relationshipType: CardRelationshipType | "all";
  deckSection: DeckSection | "all";
  cardRole: CardRole | "all";
}

export interface FilteredRelationshipGraph {
  cards: Card[];
  relationships: CardRelationship[];
}

export const DEFAULT_GRAPH_FILTERS: RelationshipGraphFilters = {
  relationshipType: "all",
  deckSection: "all",
  cardRole: "all",
};

export function filterRelationshipGraph(
  deck: Deck,
  relationships: CardRelationship[],
  filters: RelationshipGraphFilters
): FilteredRelationshipGraph {
  const sections: DeckSection[] =
    filters.deckSection === "all"
      ? ["main", "extra", "side"]
      : [filters.deckSection];

  const cardsById = new Map<number, Card>();

  for (const section of sections) {
    for (const entry of deck[section]) {
      const card = entry.card;

      if (
        filters.cardRole !== "all" &&
        !getCardRoles(card).includes(filters.cardRole)
      ) {
        continue;
      }

      cardsById.set(card.id, card);
    }
  }

  const allowedIds = new Set(cardsById.keys());

  const filteredRelationships = relationships.filter(
    (relationship) =>
      allowedIds.has(relationship.sourceCardId) &&
      allowedIds.has(relationship.targetCardId) &&
      (filters.relationshipType === "all" ||
        relationship.type === filters.relationshipType)
  );

  return {
    cards: [...cardsById.values()],
    relationships: filteredRelationships,
  };
}
