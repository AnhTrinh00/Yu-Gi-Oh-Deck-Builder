
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card } from "../../models/Card";
import type { CollectionCard } from "../../models/CollectionCard";
import type { Deck, DeckSection } from "../../models/Deck";
import {
  DECK_LIMITS,
  getDeckCardCount,
  validateDeck,
} from "../../services/deck/deckService";
import DeckCardTile from "./DeckCardTile";
import { checkDeckAddition } from "../../services/deck/deckAdditionPolicyService";
import { validateDeckOwnership } from "../../services/deck/deckOwnershipService";
import DeckOwnershipWarnings from "./DeckOwnershipWarnings";

interface DeckManagerProps {
  deck: Deck;
  collection: CollectionCard[];
  selectedSection: DeckSection;
  onSelectSection: (section: DeckSection) => void;
  onRenameDeck: (name: string) => void;
  onAddCard: (card: Card, section: DeckSection) => void;
  onRemoveCard: (cardId: number, section: DeckSection) => void;
  onRemoveAll: (cardId: number, section: DeckSection) => void;
  onClearDeck: () => void;
}

const sections: {
  key: DeckSection;
  label: string;
  max: number;
}[] = [
  { key: "main", label: "Main Deck", max: DECK_LIMITS.MAIN_MAX },
  { key: "extra", label: "Extra Deck", max: DECK_LIMITS.EXTRA_MAX },
  { key: "side", label: "Side Deck", max: DECK_LIMITS.SIDE_MAX },
];

export default function DeckManager({
  deck,
  collection,
  selectedSection,
  onSelectSection,
  onRenameDeck,
  onAddCard,
  onRemoveCard,
  onRemoveAll,
  onClearDeck,
}: DeckManagerProps) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [confirmClear, setConfirmClear] = useState(false);

  const validation = validateDeck(deck);
  const selectedCards = deck[selectedSection];

  const ownershipReport = useMemo(
    () => validateDeckOwnership(deck, collection),
    [deck, collection]
  );

  function canAddAnother(card: Card): boolean {
    return checkDeckAddition(
      deck,
      collection,
      card,
      selectedSection
    ).allowed;
  }

  return (
    <div className="deck-manager">
      <header className="deck-manager-header">
        <div>
          <h1>My Deck</h1>
          <p>Organize and manage your active deck.</p>
        </div>

        <Link to="/" className="deck-manager-builder-link">
          Add Cards from Builder →
        </Link>
      </header>

      <section className="deck-manager-info">
        <div className="deck-manager-name">
          <label htmlFor="deck-manager-name">Deck Name</label>
          <input
            id="deck-manager-name"
            value={deck.name}
            onChange={(event) => onRenameDeck(event.target.value)}
            maxLength={100}
          />
        </div>

        <div className="deck-manager-actions">
          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={
                deck.main.length === 0 &&
                deck.extra.length === 0 &&
                deck.side.length === 0
              }
            >
              Clear Deck
            </button>
          ) : (
            <>
              <span>Remove every card?</span>
              <button
                type="button"
                onClick={() => {
                  onClearDeck();
                  setConfirmClear(false);
                }}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </section>

      <div className="deck-manager-sections" aria-label="Deck sections">
        {sections.map(({ key, label, max }) => {
          const count = getDeckCardCount(deck, key);

          return (
            <button
              key={key}
              type="button"
              className={`deck-manager-section ${
                selectedSection === key ? "selected" : ""
              }`}
              onClick={() => onSelectSection(key)}
              aria-pressed={selectedSection === key}
            >
              <span>{label}</span>
              <strong>{count} / {max}</strong>
              <progress
                value={Math.min(count, max)}
                max={max}
                aria-label={`${label} capacity`}
              />
              <small>{Math.round((count / max) * 100)}%</small>
            </button>
          );
        })}
      </div>

      <DeckOwnershipWarnings report={ownershipReport} />

      <section className="deck-manager-validation">
        <h2>Deck Validation</h2>

        <p className={validation.isDeckValid ? "valid" : "invalid"}>
          {validation.isDeckValid
            ? "Deck passes the current validation checks."
            : `${validation.errors.length} validation issue(s)`}
        </p>

        {validation.errors.length > 0 && (
          <ul>
            {validation.errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="deck-manager-contents">
        <div className="deck-manager-toolbar">
          <div>
            <h2>
              {sections.find((s) => s.key === selectedSection)?.label}
            </h2>
            <p>{selectedCards.length} unique cards</p>
          </div>

          <div className="deck-manager-view-toggle">
            <button
              type="button"
              className={view === "grid" ? "selected" : ""}
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
            >
              Grid
            </button>
            <button
              type="button"
              className={view === "list" ? "selected" : ""}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
            >
              List
            </button>
          </div>
        </div>

        {selectedCards.length === 0 ? (
          <div className="deck-manager-empty">
            <h3>No cards in this section</h3>
            <p>Search for cards on the Builder page to add them.</p>
            <Link to="/">Open Builder</Link>
          </div>
        ) : (
          <div className={`deck-manager-grid deck-manager-grid--${view}`}>
            {selectedCards.map((entry) => (
              <DeckCardTile
                key={entry.card.id}
                entry={entry}
                view={view}
                canAdd={canAddAnother(entry.card)}
                onAdd={() => onAddCard(entry.card, selectedSection)}
                onRemove={(cardId) =>
                  onRemoveCard(cardId, selectedSection)
                }
                onRemoveAll={(cardId) =>
                  onRemoveAll(cardId, selectedSection)
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
