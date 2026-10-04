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
  clearSavedDeck
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

                <button onClick={() => handleAddToDeck(card)}>
                  Add to Deck
                </button>

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
              <strong>{mainCount} / 40–60</strong>
            </div>

            <div className="deck-stat">
              <span>Extra</span>
              <strong>{extraCount} / 15</strong>
            </div>

            <div className="deck-stat">
              <span>Side</span>
              <strong>{sideCount} / 15</strong>
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