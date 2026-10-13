
import type { CardRelationship } from "../../models/effect/CardRelationship";

export interface CardGraphMetrics {
  cardId: number;
  incoming: number;
  outgoing: number;
  totalConnections: number;
  relationshipCount: number;
  isolated: boolean;
}

export interface RelationshipGraphAnalysis {
  cardCount: number;
  relationshipCount: number;
  connectedCardCount: number;
  isolatedCardIds: number[];
  hubs: CardGraphMetrics[];
  metrics: CardGraphMetrics[];
}

export function analyzeRelationshipGraph(
  cardIds: number[],
  relationships: CardRelationship[]
): RelationshipGraphAnalysis {
  const ids = [...new Set(cardIds)];
  const allowed = new Set(ids);

  const incoming = new Map<number, Set<number>>();
  const outgoing = new Map<number, Set<number>>();
  const counts = new Map<number, number>();

  for (const id of ids) {
    incoming.set(id, new Set());
    outgoing.set(id, new Set());
    counts.set(id, 0);
  }

  let relationshipCount = 0;

  for (const relationship of relationships) {
    const { sourceCardId, targetCardId } = relationship;

    if (
      !allowed.has(sourceCardId) ||
      !allowed.has(targetCardId)
    ) {
      continue;
    }

    relationshipCount++;

    outgoing.get(sourceCardId)!.add(targetCardId);
    incoming.get(targetCardId)!.add(sourceCardId);

    counts.set(
      sourceCardId,
      counts.get(sourceCardId)! + 1
    );

    // A self-loop is one recorded relationship.
    if (sourceCardId !== targetCardId) {
      counts.set(
        targetCardId,
        counts.get(targetCardId)! + 1
      );
    }
  }

  const metrics: CardGraphMetrics[] = ids.map((cardId) => {
    const sources = incoming.get(cardId)!;
    const targets = outgoing.get(cardId)!;

    // Count distinct neighboring cards in either direction.
    const neighbors = new Set([...sources, ...targets]);
    neighbors.delete(cardId);

    return {
      cardId,
      incoming: sources.size,
      outgoing: targets.size,
      totalConnections: neighbors.size,
      relationshipCount: counts.get(cardId)!,
      isolated: sources.size === 0 && targets.size === 0,
    };
  });

  const isolatedCardIds = metrics
    .filter((metric) => metric.isolated)
    .map((metric) => metric.cardId);

  const hubs = metrics
    .filter((metric) => metric.totalConnections > 0)
    .sort(
      (a, b) =>
        b.totalConnections - a.totalConnections ||
        b.outgoing - a.outgoing ||
        a.cardId - b.cardId
    );

  return {
    cardCount: ids.length,
    relationshipCount,
    connectedCardCount: ids.length - isolatedCardIds.length,
    isolatedCardIds,
    hubs,
    metrics,
  };
}
