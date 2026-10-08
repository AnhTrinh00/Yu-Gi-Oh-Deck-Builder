
import type { CardRelationship } from "../models/CardRelationship";

export interface GraphNode {
  id: number;
  x: number;
  y: number;
}

export interface GraphEdge {
  source: number;
  target: number;
  types: CardRelationship["type"][];
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

export function createRelationshipGraphLayout(
  cardIds: number[],
  relationships: CardRelationship[]
): GraphLayout {
  const ids = [...new Set(cardIds)];
  const allowed = new Set(ids);

  const width = 800;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  const nodes = ids.map((id, index) => {
    const angle = (2 * Math.PI * index) / ids.length - Math.PI / 2;

    return {
      id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const edgeMap = new Map<string, GraphEdge>();

  for (const relationship of relationships) {
    const { sourceCardId, targetCardId, type } = relationship;

    if (!allowed.has(sourceCardId) || !allowed.has(targetCardId)) {
      continue;
    }

    const key = `${sourceCardId}:${targetCardId}`;
    const existing = edgeMap.get(key);

    if (existing) {
      if (!existing.types.includes(type)) {
        existing.types.push(type);
      }
    } else {
      edgeMap.set(key, {
        source: sourceCardId,
        target: targetCardId,
        types: [type],
      });
    }
  }

  return {
    nodes,
    edges: [...edgeMap.values()],
    width,
    height,
  };
}
