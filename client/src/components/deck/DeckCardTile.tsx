
import type { DeckCard } from "../../models/Deck";

interface DeckCardTileProps {
  entry: DeckCard;
  view: "grid" | "list";
  onAdd: (cardId: number) => void;
  onRemove: (cardId: number) => void;
  onRemoveAll: (cardId: number) => void;
  canAdd: boolean;
}

export default function DeckCardTile({
  entry,
  view,
  onAdd,
  onRemove,
  onRemoveAll,
  canAdd,
}: DeckCardTileProps) {
  const { card, quantity } = entry;

  return (
    <article className={`deck-manager-card deck-manager-card--${view}`}>
      <div className="deck-manager-card-art">
        <img
          src={card.imageUrlSmall || card.imageUrl}
          alt={card.name}
          loading="lazy"
        />
        <span className="deck-manager-card-quantity">×{quantity}</span>
      </div>

      <div className="deck-manager-card-details">
        <h3 title={card.name}>{card.name}</h3>
        <p>{card.type}</p>

        <div className="deck-manager-card-controls">
          <button
            type="button"
            onClick={() => onRemove(card.id)}
            aria-label={`Remove one ${card.name}`}
          >
            −
          </button>

          <span>{quantity}</span>

          <button
            type="button"
            onClick={() => onAdd(card.id)}
            disabled={!canAdd}
            aria-label={`Add one ${card.name}`}
          >
            +
          </button>
        </div>

        <button
          type="button"
          className="deck-manager-remove-all"
          onClick={() => onRemoveAll(card.id)}
        >
          Remove All
        </button>
      </div>
    </article>
  );
}
