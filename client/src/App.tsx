import { useEffect, useState } from "react";
import type { Deck, DeckSection } from "./models/Deck";
import {
  createEmptyDeck,
  addCardToDeck,
  removeCardFromDeck,
  removeAllCardsFromDeck,
  getDeckCardCount,
  validateDeck,
  saveDeck,
  loadDeck,
  clearSavedDeck,
  canAddCardToSection,
  getCardQuantityInDeck,
  DECK_LIMITS,
} from "./services/deckService";
import "./App.css";
import { searchCards } from "./services/cardApi";
import {
  addToCollection,
  getCollection,
  removeFromCollection,
} from "./services/collectionService";
import type { Card } from "./models/Card";
import type { CollectionCard } from "./models/CollectionCard";
import {
  getBanlistCopyLimit,
  getBanlistStatus,
} from "./services/banlistService";

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deck, setDeck] = useState<Deck>(() => {
    return loadDeck() ?? createEmptyDeck()
  });
  const [selectedSection, setSelectedSection] = useState<DeckSection>("main");
  const [cards, setCards] = useState<Card[]>([]);
  const [collection, setCollection] = useState<CollectionCard[]>(
    getCollection()
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    saveDeck(deck);
  }, [deck]);

  async function handleSearch() {
    if (!searchTerm.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await searchCards(searchTerm);
      setCards(results);
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to search for cards.");
      }

      setCards([]);
    } finally {
      setLoading(false);
    }
  }

  function handleAddCard(card: Card) {
    addToCollection(card, 1);
    setCollection([...getCollection()]);
  }

  function handleAddToDeck(card: Card) {
    setDeck((currentDeck) =>
      addCardToDeck(currentDeck, card, selectedSection)
    );
  }

  function handleRemoveFromDeck(cardId: number) {
    setDeck((currentDeck) => 
      removeCardFromDeck(currentDeck, cardId, selectedSection)
    );
  }

  function handleRemoveAllFromDeck(cardId: number) {
    setDeck((currentDeck) => 
      removeAllCardsFromDeck(currentDeck, cardId, selectedSection)
    );
  }

  function handleRemoveCard(cardId: number) {
    removeFromCollection(cardId, 1);
    setCollection([...getCollection()]);
  }

  function getCardQuantity(cardId: number): number {
    const collectionCard = collection.find(
      (item) => item.card.id === cardId
    );
    return collectionCard?.quantity ?? 0;
  }

  function handleClearDeck() {
    const confirmed = window.confirm(
      "Are you sure you want to clear this deck? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    clearSavedDeck();
    setDeck(createEmptyDeck());
  }

  function isCardAddable(card: Card): boolean {
    if (!canAddCardToSection(card, selectedSection)) {
        return false;
    }

    const currentQuantity = getCardQuantityInDeck(
        deck,
        card.id
    );

    const banlistLimit = getBanlistCopyLimit(
        card,
        "advanced"
    );

    if (currentQuantity >= banlistLimit) {
        return false;
    }

    if (
        getDeckCardCount(deck, selectedSection) >=
        (selectedSection === "main"
            ? DECK_LIMITS.MAIN_MAX
            : selectedSection === "extra"
            ? DECK_LIMITS.EXTRA_MAX
            : DECK_LIMITS.SIDE_MAX)
    ) {
        return false;
    }

    return true;
  }

  function getAddCardDisabledReason(
    card: Card
  ): string | null {
    if (!canAddCardToSection(card, selectedSection)) {
      if (selectedSection === "main") {
        return "This card cannot be placed in the Main Deck.";
      }

      if (selectedSection === "extra") {
        return "This card cannot be placed in the Extra Deck.";
      }

      return "This card cannot be placed in the Side Deck.";
    }

    const banlistStatus = getBanlistStatus(
        card,
        "advanced"
    );

    const banlistLimit = getBanlistCopyLimit(
        card,
        "advanced"
    );

    const currentQuantity = getCardQuantityInDeck(
        deck,
        card.id
    );

    if (currentQuantity >= banlistLimit) {
        if (banlistStatus === "Forbidden") {
            return "This card is Forbidden in Advanced Format.";
        }

        if (banlistStatus === "Limited") {
            return "This card is Limited to 1 copy in Advanced Format.";
        }

        if (banlistStatus === "Semi-Limited") {
            return "This card is Semi-Limited to 2 copies in Advanced Format.";
        }

        return "You already have the maximum allowed copies of this card.";
    }

    const sectionLimit =
      selectedSection === "main"
        ? DECK_LIMITS.MAIN_MAX
        : selectedSection === "extra"
        ? DECK_LIMITS.EXTRA_MAX
        : DECK_LIMITS.SIDE_MAX;

    if (
      getDeckCardCount(deck, selectedSection) >=
      sectionLimit
    ) {
      return `${selectedSection === "main"
        ? "Main"
        : selectedSection === "extra"
        ? "Extra"
        : "Side"} Deck is full.`;
    }

    return null;
  }

  const selectedDeckCards = deck[selectedSection];
  
  const mainCount = getDeckCardCount(deck, "main");
  const extraCount = getDeckCardCount(deck, "extra");
  const sideCount = getDeckCardCount(deck, "side");
  
  const selectedDifferentCardCount = selectedDeckCards.length;
  
  const deckValidation = validateDeck(deck);

  return (
    <div className="app">
      <header>
        <h1>Yu-Gi-Oh! Deck Builder</h1>
      </header>

      <main>
        <section>
          <h2>Search Cards</h2>

          <div className="search-bar">
            <input
              type="text"
              value={searchTerm}
              placeholder="Search for a card..."
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
            />

            <button onClick={handleSearch}>
              Search
            </button>
          </div>

          {loading && <p>Searching...</p>}

          {error && <p>{error}</p>}

          {!loading && !error && cards.length === 0 && (
            <p>No cards found.</p>
          )}

          <p>
            Adding cards to:{" "}
            <strong>
              {selectedSection === "main" && "Main Deck"}
              {selectedSection === "extra" && "Extra Deck"}
              {selectedSection === "side" && "Side Deck"}
            </strong>
          </p>

          <div className="card-grid">
            {cards.map((card) => (
              <div className="card-result" key={card.id}>
                <img
                  src={card.imageUrl}
                  alt={card.name}
                />

                <h3>{card.name}</h3>

                <p>{card.type}</p>

                <button onClick={() => handleAddCard(card)}>
                  Add to Collection
                </button>

                {(() => {
                  const disabledReason =
                    getAddCardDisabledReason(card);

                  return (
                    <>
                      <button
                        onClick={() => handleAddToDeck(card)}
                        disabled={!isCardAddable(card)}
                      >
                        {disabledReason
                          ? "Cannot Add"
                          : "Add to Deck"}
                      </button>

                      {disabledReason && (
                        <p className="card-add-warning">
                          {disabledReason}
                        </p>
                      )}
                    </>
                  );
                })()}

                {getCardQuantity(card.id) > 0 && (
                  <p>
                    Owned: {getCardQuantity(card.id)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>My Collection</h2>

          {collection.length === 0 ? (
            <p>Your collection is empty.</p>
          ) : (
            <div className="collection-list">
              {collection.map((item) => (
                <div
                  className="collection-card"
                  key={item.card.id}
                >
                  <img
                    src={item.card.imageUrlSmall}
                    alt={item.card.name}
                  />

                  <div className="collection-info">
                    <h3>{item.card.name}</h3>

                    <p>
                      Quantity: {item.quantity}
                    </p>

                    <div>
                      <button
                        onClick={() =>
                          handleRemoveCard(item.card.id)
                        }
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        onClick={() =>
                          handleAddCard(item.card)
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="deck-section">
          <div className="deck-header">
            <div>
              <label htmlFor="deck-name">
                Deck Name
              </label>

              <input
                id="deck-name"
                type="text"
                value={deck.name}
                onChange={(event) => {
                  setDeck((currentDeck) => ({
                    ...currentDeck,
                    name: event.target.value,
                  }));
                }}
                onBlur={() => {
                  setDeck((currentDeck) => ({
                    ...currentDeck,
                    name:
                      currentDeck.name.trim() || "Untitled Deck",
                  }));
                }}
                placeholder="Enter deck name"
                maxLength={50}
              />
            </div>
          </div>

          <p className="deck-save-status">
            Deck automatically saves to your browser.
          </p>

          <button onClick={handleClearDeck}>
            Clear Deck
          </button>

          <div className="deck-tabs">
            <button
              onClick={() => setSelectedSection("main")}
              className={
                selectedSection === "main" ? "active" : ""
              }
            >
              Main Deck ({mainCount})
            </button>

            <button
              onClick={() => setSelectedSection("extra")}
              className={
                selectedSection === "extra" ? "active" : ""
              }
            >
              Extra Deck ({extraCount})
            </button>

            <button
              onClick={() => setSelectedSection("side")}
              className={
                selectedSection === "side" ? "active" : ""
              }
            >
              Side Deck ({sideCount})
            </button>
          </div>

          <div className="deck-status">

            <div className="deck-stat">
              <span>Main</span>
              <strong
                className={
                  mainCount >= DECK_LIMITS.MAIN_MIN &&
                  mainCount <= DECK_LIMITS.MAIN_MAX
                    ? "count-valid"
                    : "count-invalid"
                }
              >
                {mainCount} / {DECK_LIMITS.MAIN_MIN}–
                {DECK_LIMITS.MAIN_MAX}
              </strong>
            </div>

            <div className="deck-stat">
              <span>Extra</span>
              <strong
                className={
                  extraCount <= DECK_LIMITS.EXTRA_MAX
                    ? "count-valid"
                    : "count-invalid"
                }
              >
                {extraCount} / {DECK_LIMITS.EXTRA_MAX}
              </strong>
            </div>

            <div className="deck-stat">
              <span>Side</span>
              <strong
                className={
                  sideCount <= DECK_LIMITS.SIDE_MAX
                    ? "count-valid"
                    : "count-invalid"
                }
              >
                {sideCount} / {DECK_LIMITS.SIDE_MAX}
              </strong>
            </div>

            <div className="deck-stat">
              <span>Different Cards</span>
              <strong>{selectedDifferentCardCount}</strong>
            </div>
          </div>
          
          <div
            className={
              deckValidation.isDeckValid
                ? "deck-valid"
                : "deck-invalid"
            }
          >
            {deckValidation.isDeckValid
              ? "Deck is valid"
              : "Deck is not valid"}
          </div>

          {deckValidation.errors.length > 0 && (
            <div className="deck-errors">
              {deckValidation.errors.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </div>
          )}

          {selectedDeckCards.length === 0 ? (
            <p className="empty-deck">
              This deck section is empty.
            </p>
          ) : (
            <div className="deck-list">
              {selectedDeckCards.map((deckCard) => (
                <div
                  className="deck-card"
                  key={deckCard.card.id}
                >
                  <img
                    src={deckCard.card.imageUrlSmall}
                    alt={deckCard.card.name}
                  />

                  <div className="deck-card-info">
                    <h3>{deckCard.card.name}</h3>

                    <p>{deckCard.card.type}</p>

                  <div className="deck-card-controls">
                    <button
                      onClick={() =>
                        handleRemoveFromDeck(
                          deckCard.card.id
                        )
                      }
                      aria-label={`Remove one ${deckCard.card.name}`}
                    >
                      −
                    </button>

                    <span>{deckCard.quantity}</span>

                    <button
                      onClick={() =>
                        handleAddToDeck(deckCard.card)
                      }
                      disabled={!isCardAddable(deckCard.card)}
                      aria-label={`Add one ${deckCard.card.name}`}
                    >
                      +
                    </button>

                    <button
                      onClick={() =>
                        handleRemoveAllFromDeck(
                          deckCard.card.id
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default App;