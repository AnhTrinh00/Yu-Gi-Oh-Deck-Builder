
import type { Deck } from "../../models/deck/Deck";
import type { CollectionCard } from "../../models/card/CollectionCard";

export interface OwnershipIssue {
  cardId: number;
  cardName: string;
  owned: number;
  used: number;
  missing: number;
}

export interface DeckOwnershipReport {
  valid: boolean;
  issues: OwnershipIssue[];
  totalMissingCopies: number;
  affectedCards: number;
}

export function validateDeckOwnership(
  deck: Deck,
  collection: CollectionCard[]
): DeckOwnershipReport {
  const ownedById = new Map<number, number>();

  for (const entry of collection) {
    ownedById.set(
      entry.card.id,
      (ownedById.get(entry.card.id) ?? 0) +
        entry.quantity
    );
  }

  const usedById = new Map<
    number,
    { name: string; quantity: number }
  >();

  for (const entry of [
    ...deck.main,
    ...deck.extra,
    ...deck.side,
  ]) {
    const previous = usedById.get(entry.card.id);

    usedById.set(entry.card.id, {
      name: entry.card.name,
      quantity:
        (previous?.quantity ?? 0) + entry.quantity,
    });
  }

  const issues: OwnershipIssue[] = [];

  for (const [cardId, used] of usedById) {
    const owned = ownedById.get(cardId) ?? 0;

    if (used.quantity > owned) {
      issues.push({
        cardId,
        cardName: used.name,
        owned,
        used: used.quantity,
        missing: used.quantity - owned,
      });
    }
  }

  issues.sort((a, b) =>
    a.cardName.localeCompare(b.cardName)
  );

  return {
    valid: issues.length === 0,
    issues,
    totalMissingCopies: issues.reduce(
      (sum, issue) => sum + issue.missing,
      0
    ),
    affectedCards: issues.length,
  };
}
