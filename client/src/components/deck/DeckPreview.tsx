
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Deck, DeckSection } from "../../models/Deck";
import { getDeckCardCount } from "../../services/deckService";

interface DeckPreviewProps {
  deck: Deck;
  selectedSection: DeckSection;
  onSelectSection: (section: DeckSection) => void;
  onRemoveCard: (cardId: number, section: DeckSection) => void;
}

const sections: { key: DeckSection; label: string }[] = [
  { key: "main", label: "Main Deck" },
  { key: "extra", label: "Extra Deck" },
  { key: "side", label: "Side Deck" },
];

export default function DeckPreview({
  deck,
  selectedSection,
  onSelectSection,
  onRemoveCard,
}: DeckPreviewProps) {
  const [expanded, setExpanded] = useState(true);

  if (!expanded) {
    return (
      <aside className="deck-preview deck-preview-collapsed">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          aria-controls="deck-preview-content"
        >
          Show Deck Preview
        </button>
      </aside>
    );
  }

  return (
    <aside className="deck-preview">
      <div className="deck-preview-header">
        <div>
          <h2>Deck Preview</h2>
          <p>{deck.name}</p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Collapse deck preview"
          aria-expanded={true}
          aria-controls="deck-preview-content"
        >
          Hide
        </button>
      </div>

      <div id="deck-preview-content">
        {sections.map(({ key, label }) => (
          <section className="deck-preview-section" key={key}>
            <button
              type="button"
              className={
                selectedSection === key
                  ? "deck-preview-section-button selected"
                  : "deck-preview-section-button"
              }
              onClick={() => onSelectSection(key)}
              aria-pressed={selectedSection === key}
            >
              <span>{label}</span>
              <span>{getDeckCardCount(deck, key)}</span>
            </button>

            {deck[key].length === 0 ? (
              <p className="deck-preview-empty">
                No cards added.
              </p>
            ) : (
              <ul className="deck-preview-list">
                {deck[key].map(({ card, quantity }) => (
                  <li key={card.id} className="deck-preview-card">
                    <img
                      src={card.imageUrlSmall}
                      alt=""
                      loading="lazy"
                    />

                    <div className="deck-preview-card-info">
                      <span title={card.name}>{card.name}</span>
                      <small>Quantity: {quantity}</small>
                    </div>

                    <button
                      type="button"
                      className="deck-preview-remove"
                      onClick={() => onRemoveCard(card.id, key)}
                      aria-label={`Remove one ${card.name} from ${label}`}
                      title="Remove one copy"
                    >
                      −
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <Link className="deck-preview-manage" to="/deck">
        Open Deck Manager →
      </Link>
    </aside>
  );
}
