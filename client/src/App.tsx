import { useState } from "react";
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
  const [cards, setCards] = useState<Card[]>([]);
  const [collection, setCollection] = useState<CollectionCard[]>(
    getCollection()
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      </main>
    </div>
  );
}

export default App;