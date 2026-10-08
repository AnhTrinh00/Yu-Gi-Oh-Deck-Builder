import type { CardRelationship } from "../models/CardRelationship";

export type RelationshipGraph = Map<number, Set<number>>;

export function buildRelationshipGraph(
    relationships: CardRelationship[]
): RelationshipGraph {
    const graph: RelationshipGraph = new Map();

    for (const relationship of relationships) {
        const { sourceCardId, targetCardId } = relationship;

        if (!graph.has(sourceCardId)) {
            graph.set(sourceCardId, new Set());
        }

        if (!graph.has(targetCardId)) {
            graph.set(targetCardId, new Set());
        }

        graph.get(sourceCardId)!.add(targetCardId);
    }

    return graph;
}

export function getReachableCardIds(
    startCardId: number,
    relationships: CardRelationship[]
): number[] {
    const graph = buildRelationshipGraph(relationships);

    const visited = new Set<number>([startCardId]);
    const queue: number[] = [startCardId];
    const reachable: number[] = [];

    let head = 0;

    while (head < queue.length) {
        const current = queue[head++];

        for (const neighbor of graph.get(current) ?? []) {
            if (visited.has(neighbor)) {
                continue;
            }

            visited.add(neighbor);
            reachable.push(neighbor);
            queue.push(neighbor);
        }
    }

    return reachable;
}

export function findShortestPath(
    startCardId: number,
    targetCardId: number,
    relationships: CardRelationship[]
): number[] | null {
    if (startCardId === targetCardId) {
        return [startCardId];
    }

    const graph = buildRelationshipGraph(relationships);
    const visited = new Set<number>([startCardId]);
    const previous = new Map<number, number>();
    const queue: number[] = [startCardId];

    let head = 0;

    while (head < queue.length) {
        const current = queue[head++];

        for (const neighbor of graph.get(current) ?? []) {
            if (visited.has(neighbor)) {
                continue;
            }

            visited.add(neighbor);
            previous.set(neighbor, current);

            if (neighbor === targetCardId) {
                const path = [targetCardId];
                let node = targetCardId;

                while (previous.has(node)) {
                    node = previous.get(node)!;
                    path.push(node);
                }

                return path.reverse();
            }

            queue.push(neighbor);
        }
    }

    return null;
}

export function hasRelationshipPath(
    startCardId: number,
    targetCardId: number,
    relationships: CardRelationship[]
): boolean {
    return (
        findShortestPath(
            startCardId,
            targetCardId,
            relationships
        ) !== null
    );
}

export function hasRelationshipCycle(
    relationships: CardRelationship[]
): boolean {
    const graph = buildRelationshipGraph(relationships);

    const visited = new Set<number>();
    const active = new Set<number>();

    function dfs(cardId: number): boolean {
        visited.add(cardId);
        active.add(cardId);

        for (const neighbor of graph.get(cardId) ?? []) {
            if (!visited.has(neighbor)) {
                if (dfs(neighbor)) {
                    return true;
                }
            } else if (active.has(neighbor)) {
                return true;
            }
        }

        active.delete(cardId);
        return false;
    }

    for (const cardId of graph.keys()) {
        if (!visited.has(cardId) && dfs(cardId)) {
            return true;
        }
    }

    return false;
}

export function getDisconnectedCardIds(
    cardIds: number[],
    relationships: CardRelationship[]
): number[] {
    const cardSet = new Set(cardIds);
    const connected = new Set<number>();

    for (const relationship of relationships) {
        if (
            cardSet.has(relationship.sourceCardId) &&
            cardSet.has(relationship.targetCardId)
        ) {
            connected.add(relationship.sourceCardId);
            connected.add(relationship.targetCardId);
        }
    }

    return [...cardSet].filter(
        (cardId) => !connected.has(cardId)
    );
}