import type {
  CardRelationship,
  CardRelationshipType,
} from "../../models/effect/CardRelationship";

import type {
  ComboCandidate,
  ComboCandidateStep,
  ComboDiscoveryOptions,
  ComboDiscoveryResult,
} from "../../models/combo/ComboCandidate";

import {
  DEFAULT_DISCOVERY_OPTIONS,
} from "../../models/combo/ComboCandidate";

type Adjacency = Map<
  number,
  Map<number, CardRelationshipType[]>
>;

function buildAdjacency(
  allowedIds: Set<number>,
  relationships: CardRelationship[]
): Adjacency {
  const temporary = new Map<
    number,
    Map<number, Set<CardRelationshipType>>
  >();

  for (const id of allowedIds) {
    temporary.set(id, new Map());
  }

  for (const relationship of relationships) {
    const { sourceCardId, targetCardId, type } =
      relationship;

    if (
      !allowedIds.has(sourceCardId) ||
      !allowedIds.has(targetCardId)
    ) {
      continue;
    }

    const neighbors = temporary.get(sourceCardId)!;

    let types = neighbors.get(targetCardId);

    if (!types) {
      types = new Set<CardRelationshipType>();
      neighbors.set(targetCardId, types);
    }

    types.add(type);
  }

  const adjacency: Adjacency = new Map();

  for (const [sourceId, neighbors] of temporary) {
    const indexedNeighbors = new Map<
      number,
      CardRelationshipType[]
    >();

    for (const [targetId, types] of neighbors) {
      indexedNeighbors.set(targetId, [...types]);
    }

    adjacency.set(sourceId, indexedNeighbors);
  }

  return adjacency;
}

function compareCandidates(
  a: ComboCandidate,
  b: ComboCandidate
): number {
  return (
    b.score - a.score ||
    a.cardIds.length - b.cardIds.length ||
    a.id.localeCompare(b.id)
  );
}

/**
 * Detailed combo discovery with search diagnostics.
 *
 * A bounded search can return incomplete results.
 * Candidates are relationship paths, not verified
 * gameplay sequences.
 */
export function discoverComboCandidatesDetailed(
  cardIds: number[],
  relationships: CardRelationship[],
  options: Partial<ComboDiscoveryOptions> = {}
): ComboDiscoveryResult {
  const settings = {
    ...DEFAULT_DISCOVERY_OPTIONS,
    ...options,
  };

  const {
    maxDepth,
    maxCandidates,
    minDepth,
    maxExploredStates,
  } = settings;

  const diagnostics = {
    exploredStates: 0,
    generatedCandidates: 0,
    returnedCandidates: 0,
    prunedBranches: 0,
    budgetExhausted: false,
    complete: true,
    invalidOptions: false,
  };

  if (
    !Number.isSafeInteger(maxDepth) ||
    !Number.isSafeInteger(minDepth) ||
    !Number.isSafeInteger(maxCandidates) ||
    !Number.isSafeInteger(maxExploredStates) ||
    maxDepth < 1 ||
    minDepth < 1 ||
    minDepth > maxDepth ||
    maxCandidates < 1 ||
    maxExploredStates < 1
  ) {
    diagnostics.invalidOptions = true;
    diagnostics.complete = false;
    
    return {
      candidates: [],
      diagnostics,
    };
  }

  const allowedIds = new Set(cardIds);

  const adjacency = buildAdjacency(
    allowedIds,
    relationships
  );

  const candidates: ComboCandidate[] = [];

  function addCandidate(path: number[]): void {
    const steps: ComboCandidateStep[] = [];

    const distinctTypes = new Set<CardRelationshipType>();

    for (
      let index = 0;
      index < path.length - 1;
      index++
    ) {
      const sourceCardId = path[index];
      const targetCardId = path[index + 1];

      const relationshipTypes =
        adjacency
          .get(sourceCardId)
          ?.get(targetCardId) ?? [];

      for (const type of relationshipTypes) {
        distinctTypes.add(type);
      }

      steps.push({
        sourceCardId,
        targetCardId,
        relationshipTypes: [...relationshipTypes],
      });
    }

    const score =
      steps.length * 10 +
      distinctTypes.size * 3;

    const candidate: ComboCandidate = {
      id: path.join("->"),
      starterCardId: path[0],
      targetCardId: path[path.length - 1],
      cardIds: [...path],
      steps,
      score,
      reasons: [
        `${steps.length} recorded interaction(s)`,
        `${distinctTypes.size} relationship type(s)`,
      ],
    };

    diagnostics.generatedCandidates++;

    // Keep only the highest-ranked maxCandidates entries.
    if (candidates.length < maxCandidates) {
      candidates.push(candidate);
      candidates.sort(compareCandidates);
      return;
    }

    const worst = candidates[candidates.length - 1];

    if (compareCandidates(candidate, worst) < 0) {
      candidates.pop();
      candidates.push(candidate);
      candidates.sort(compareCandidates);
    }
  }

  function explore(
    currentId: number,
    path: number[],
    visited: Set<number>
  ): void {
    diagnostics.exploredStates++;

    const depth = path.length - 1;

    if (depth >= minDepth) {
      addCandidate(path);
    }

    if (depth >= maxDepth) {
      return;
    }

    const remainingUnvisitedCards =
      allowedIds.size - visited.size;

    if (
      depth + remainingUnvisitedCards < minDepth
    ) {
      diagnostics.prunedBranches++;
      return;
    }

    const neighbors = adjacency.get(currentId);

    if (!neighbors) {
      return;
    }

    for (const nextId of neighbors.keys()) {
      if (visited.has(nextId)) {
        continue;
      }

      // There is another eligible branch, but no budget
      // remaining to explore it.
      if (
        diagnostics.exploredStates >= maxExploredStates
      ) {
        diagnostics.budgetExhausted = true;
        return;
      }

      visited.add(nextId);
      path.push(nextId);

      explore(nextId, path, visited);

      path.pop();
      visited.delete(nextId);

      if (diagnostics.budgetExhausted) {
        return;
      }
    }
  }

  for (const starterId of allowedIds) {
    if (
      diagnostics.exploredStates >= maxExploredStates
    ) {
      diagnostics.budgetExhausted = true;
      break;
    }

    explore(
      starterId,
      [starterId],
      new Set([starterId])
    );

    if (diagnostics.budgetExhausted) {
      break;
    }
  }

  diagnostics.complete = !diagnostics.budgetExhausted;
  diagnostics.returnedCandidates = candidates.length;

  return {
    candidates,
    diagnostics,
  };
}

/**
 * Backward-compatible API used by existing components.
 */
export function discoverComboCandidates(
  cardIds: number[],
  relationships: CardRelationship[],
  options: Partial<ComboDiscoveryOptions> = {}
): ComboCandidate[] {
  return discoverComboCandidatesDetailed(
    cardIds,
    relationships,
    options
  ).candidates;
}