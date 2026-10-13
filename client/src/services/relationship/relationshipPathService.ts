
import type {
  CardRelationship,
  CardRelationshipType,
} from "../../models/CardRelationship";

export interface RelationshipPathStep {
  sourceCardId: number;
  targetCardId: number;
  types: CardRelationshipType[];
}

/**
 * Converts a directed card-ID path into relationship steps.
 * Each step includes all recorded relationship types
 * between the source and target cards.
 */
export function getPathSteps(
  path: number[],
  relationships: CardRelationship[]
): RelationshipPathStep[] {
  return path.slice(1).map((targetCardId, index) => {
    const sourceCardId = path[index];

    const types = [
      ...new Set(
        relationships
          .filter(
            (relationship) =>
              relationship.sourceCardId === sourceCardId &&
              relationship.targetCardId === targetCardId
          )
          .map((relationship) => relationship.type)
      ),
    ];

    return {
      sourceCardId,
      targetCardId,
      types,
    };
  });
}
