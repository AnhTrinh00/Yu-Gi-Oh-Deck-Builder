import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";

export type CardRole =
  | "starter"
  | "extender"
  | "searcher"
  | "hand-trap"
  | "board-breaker"
  | "interaction"
  | "engine"
  | "generic";

export interface CardRoleAnalysis {
  card: Card;
  roles: CardRole[];
}

export function getCardRoles(card: Card): CardRole[] {
    const roles = new Set<CardRole>();

    const text = card.description.toLowerCase();
    const type = card.type.toLowerCase();

    if (card.archetype) {
        roles.add("engine");
    }

    if (
        text.includes("add 1") &&
        text.includes("from your deck")
    ) {
        roles.add("searcher");
    }

    if (
        text.includes("special summon this card") ||
        text.includes("special summon this card from your hand")
    ) {
        roles.add("extender");
    }

    if (
        text.includes("negate") ||
        text.includes("destroy") ||
        text.includes("banish")
    ) {
        roles.add("interaction");
    }

    if (
        type.includes("monster") &&
        (
            text.includes("from your hand") ||
            text.includes("discard this card")
        ) &&
        (
            text.includes("negate") ||
            text.includes("your opponent")
        )
    ) {
        roles.add("hand-trap");
    }

    if (
        text.includes("your opponent controls") &&
        (
            text.includes("destroy") ||
            text.includes("banish") ||
            text.includes("send")
        )
    ) {
        roles.add("board-breaker");
    }

    if (roles.size == 0) {
        roles.add("generic");
    }

    return Array.from(roles);
}

export interface DeckRoleSummary {
    role: CardRole;
    cardCount: number;
    uniqueCards: number;
}

export function getDeckRoleSummaries(
  deck: Deck
): DeckRoleSummary[] {
  const summaries = new Map<
    CardRole,
    {
      cardCount: number;
      uniqueCards: number;
    }
  >();

  for (const deckCard of deck.main) {
    const roles = getCardRoles(deckCard.card);

    for (const role of roles) {
      const existing = summaries.get(role);

      if (existing) {
        existing.cardCount += deckCard.quantity;
        existing.uniqueCards += 1;
      } else {
        summaries.set(role, {
          cardCount: deckCard.quantity,
          uniqueCards: 1,
        });
      }
    }
  }

  return Array.from(summaries.entries())
    .map(([role, data]) => ({
      role,
      cardCount: data.cardCount,
      uniqueCards: data.uniqueCards,
    }))
    .sort((a, b) => b.cardCount - a.cardCount);
}