
import { useMemo } from "react";
import type { CardRelationship } from "../../models/effect/CardRelationship";
import { createRelationshipGraphLayout } from "../../services/relationship/relationshipGraphLayoutService";

interface Props {
  cards: { id: number; name: string }[];
  relationships: CardRelationship[];
  highlightedPath?: number[] | null;
}

export default function RelationshipGraph({
  cards,
  relationships,
  highlightedPath,
}: Props) {
  const layout = useMemo(
    () =>
      createRelationshipGraphLayout(
        cards.map((card) => card.id),
        relationships
      ),
    [cards, relationships]
  );

  const names = new Map(cards.map((card) => [card.id, card.name]));
  const positions = new Map(layout.nodes.map((node) => [node.id, node]));

  const highlightedEdges = new Set<string>();

  if (highlightedPath) {
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      highlightedEdges.add(
        `${highlightedPath[i]}:${highlightedPath[i + 1]}`
      );
    }
  }

  if (layout.nodes.length === 0) {
    return <p>Add cards to your deck to display the graph.</p>;
  }

  return (
    <div className="relationship-graph">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label="Directed card relationship graph"
      >
        <defs>
          <marker
            id="relationship-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
          <marker
            id="relationship-arrow-highlight"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a" />
          </marker>
        </defs>

        {layout.edges.map((edge) => {
          const source = positions.get(edge.source);
          const target = positions.get(edge.target);

          if (!source || !target) return null;

          const highlighted = highlightedEdges.has(
            `${edge.source}:${edge.target}`
          );

          // Stop the arrow before the target node.
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.hypot(dx, dy) || 1;
          const endX = target.x - (dx / distance) * 24;
          const endY = target.y - (dy / distance) * 24;

          return (
            <line
              key={`${edge.source}-${edge.target}`}
              x1={source.x}
              y1={source.y}
              x2={endX}
              y2={endY}
              stroke={highlighted ? "#16a34a" : "#64748b"}
              strokeWidth={highlighted ? 4 : 2}
              markerEnd={
                highlighted
                  ? "url(#relationship-arrow-highlight)"
                  : "url(#relationship-arrow)"
              }
            >
              <title>{edge.types.join(", ")}</title>
            </line>
          );
        })}

        {layout.nodes.map((node) => {
          const highlighted = highlightedPath?.includes(node.id);

          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r="24"
                fill={highlighted ? "#bbf7d0" : "#dbeafe"}
                stroke={highlighted ? "#16a34a" : "#2563eb"}
                strokeWidth="2"
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fontSize="11"
                fill="#111827"
              >
                {node.id}
              </text>
              <title>{names.get(node.id) ?? `Card ${node.id}`}</title>
            </g>
          );
        })}
      </svg>
      <p className="graph-help">
        Hover over a node to see its card name, or an edge
        to see its relationship types. Green highlights the
        selected shortest path.
      </p>
    </div>
  );
}
