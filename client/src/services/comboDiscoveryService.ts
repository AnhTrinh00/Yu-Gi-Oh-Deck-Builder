
import type { CardRelationship } from "../models/CardRelationship";
import type {
  ComboCandidate,
  ComboCandidateStep,
  ComboDiscoveryOptions,
} from "../models/ComboCandidate";

import { DEFAULT_DISCOVERY_OPTIONS } from "../models/ComboCandidate";

export function discoverComboCandidates(
  cardIds: number[],
  relationships: CardRelationship[],
  options: Partial<ComboDiscoveryOptions> = {}
): ComboCandidate[] {
  const settings = {
    ...DEFAULT_DISCOVERY_OPTIONS,
    ...options,
  };

  const { maxDepth, maxCandidates, minDepth } = settings;

  if (
    !Number.isSafeInteger(maxDepth) ||
    !Number.isSafeInteger(minDepth) ||
    !Number.isSafeInteger(maxCandidates) ||
    maxDepth < 1 ||
    minDepth < 1 ||
    minDepth > maxDepth ||
    maxCandidates < 1
  ) {
    return [];
  }

  const allowedIds = new Set(cardIds);
  const adjacency = new Map<number, Map<number, CardRelationship[]>>();

  for (const id of allowedIds) {
    adjacency.set(id, new Map());
  }

  for (const relationship of relationships) {
    const { sourceCardId, targetCardId } = relationship;

    if (
      !allowedIds.has(sourceCardId) ||
      !allowedIds.has(targetCardId)
    ) {
      continue;
    }

    const neighbors = adjacency.get(sourceCardId)!;
    const existing = neighbors.get(targetCardId) ?? [];

    existing.push(relationship);
    neighbors.set(targetCardId, existing);
  }

  const candidates: ComboCandidate[] = [];
  const seen = new Set<string>();

  function addCandidate(path: number[]): void {
    const id = path.join("->");

    if (seen.has(id)) return;
    seen.add(id);

    const steps: ComboCandidateStep[] = [];

    for (let index = 0; index < path.length - 1; index++) {
      const sourceCardId = path[index];
      const targetCardId = path[index + 1];

      const edges =
        adjacency.get(sourceCardId)?.get(targetCardId) ?? [];

      const relationshipTypes = [
        ...new Set(edges.map((edge) => edge.type)),
      ];

      steps.push({
        sourceCardId,
        targetCardId,
        relationshipTypes,
      });
    }

    const distinctTypes = new Set(
      steps.flatMap((step) => step.relationshipTypes)
    );

    // Heuristic only: this is not a gameplay-strength score.
    const score =
      steps.length * 10 +
      distinctTypes.size * 3;

    candidates.push({
      id,
      starterCardId: path[0],
      targetCardId: path[path.length - 1],
      cardIds: [...path],
      steps,
      score,
      reasons: [
        `${steps.length} recorded interaction(s)`,
        `${distinctTypes.size} relationship type(s)`,
      ],
    });
  }

  function explore(
    currentId: number,
    path: number[],
    visited: Set<number>
  ): void {
    const depth = path.length - 1;

    if (depth >= minDepth) {
      addCandidate(path);
    }

    if (depth >= maxDepth) return;

    const neighbors = adjacency.get(currentId);

    if (!neighbors) return;

    for (const nextId of neighbors.keys()) {
      if (visited.has(nextId)) continue;

      visited.add(nextId);
      path.push(nextId);

      explore(nextId, path, visited);

      path.pop();
      visited.delete(nextId);
    }
  }

  for (const starterId of allowedIds) {
    explore(starterId, [starterId], new Set([starterId]));
  }

  return candidates
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.cardIds.length - b.cardIds.length ||
        a.id.localeCompare(b.id)
    )
    .slice(0, maxCandidates);
}
