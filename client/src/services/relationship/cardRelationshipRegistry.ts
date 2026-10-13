
import type {
  CardRelationship,
} from "../../models/effect/CardRelationship";

const STORAGE_KEY = "yugioh-card-relationships";

export function loadRelationships(): CardRelationship[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is CardRelationship => {
        if (
          typeof item !== "object" ||
          item === null
        ) {
          return false;
        }

        const relationship = item as Record<string, unknown>;

        return (
          Number.isSafeInteger(relationship.sourceCardId) &&
          Number.isSafeInteger(relationship.targetCardId) &&
          typeof relationship.type === "string" &&
          (
            relationship.description === undefined ||
            typeof relationship.description === "string"
          )
        );
      }
    );
  } catch {
    return [];
  }
}

export function saveRelationships(
  relationships: CardRelationship[]
): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(relationships)
  );
}

export function addRelationship(
  relationship: CardRelationship
): CardRelationship[] {
  const relationships = loadRelationships();

  const exists = relationships.some(
    (existing) =>
      existing.sourceCardId === relationship.sourceCardId &&
      existing.targetCardId === relationship.targetCardId &&
      existing.type === relationship.type
  );

  if (exists) {
    return relationships;
  }

  const updated = [...relationships, relationship];

  saveRelationships(updated);

  return updated;
}

export function removeRelationship(
  sourceCardId: number,
  targetCardId: number,
  type: CardRelationship["type"]
): CardRelationship[] {
  const relationships = loadRelationships();

  const updated = relationships.filter(
    (relationship) =>
      !(
        relationship.sourceCardId === sourceCardId &&
        relationship.targetCardId === targetCardId &&
        relationship.type === type
      )
  );

  saveRelationships(updated);

  return updated;
}

export function clearRelationships(): void {
  localStorage.removeItem(STORAGE_KEY);
}
