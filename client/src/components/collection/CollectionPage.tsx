
import { useMemo, useState } from "react";
import type { Card } from "../../models/Card";
import type { CollectionCard } from "../../models/CollectionCard";
import {
  DEFAULT_COLLECTION_FILTERS,
  filterCollection,
  getCollectionArchetypes,
  getCollectionStatistics,
  getMonsterTypes,
  type CollectionCategory,
  type CollectionFilters,
  type CollectionSort,
} from "../../services/collectionFilterService";

interface CollectionPageProps {
  collection: CollectionCard[];
  onAddCard: (card: Card) => void;
  onRemoveCard: (cardId: number) => void;
}

const categories: {
  value: CollectionCategory;
  label: string;
}[] = [
  { value: "all", label: "All Cards" },
  { value: "monster", label: "Monsters" },
  { value: "spell", label: "Spells" },
  { value: "trap", label: "Traps" },
  { value: "extra", label: "Extra Deck" },
];

export default function CollectionPage({
  collection,
  onAddCard,
  onRemoveCard,
}: CollectionPageProps) {
  const [filters, setFilters] = useState<CollectionFilters>(
    DEFAULT_COLLECTION_FILTERS
  );

  const statistics = useMemo(
    () => getCollectionStatistics(collection),
    [collection]
  );

  const monsterTypes = useMemo(
    () => getMonsterTypes(collection),
    [collection]
  );

  const archetypes = useMemo(
    () => getCollectionArchetypes(collection),
    [collection]
  );

  const visibleCards = useMemo(
    () => filterCollection(collection, filters),
    [collection, filters]
  );

  function updateFilters(changes: Partial<CollectionFilters>) {
    setFilters((current) => ({ ...current, ...changes }));
  }

  return (
    <div className="collection-page">
      <header className="collection-page-header">
        <div>
          <h1>My Collection</h1>
          <p>Browse and manage the cards you own.</p>
        </div>
      </header>

      <section
        className="collection-dashboard"
        aria-label="Collection statistics"
      >
        {[
          ["Total Copies", statistics.totalCopies],
          ["Unique Cards", statistics.uniqueCards],
          ["Monsters", statistics.monsters],
          ["Spells", statistics.spells],
          ["Traps", statistics.traps],
          ["Extra Deck", statistics.extraDeck],
        ].map(([label, value]) => (
          <div className="collection-stat" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="collection-controls">
        <div className="collection-search">
          <label htmlFor="collection-search">
            Search your collection
          </label>
          <input
            id="collection-search"
            type="search"
            placeholder="Search by name, type, or archetype..."
            value={filters.search}
            onChange={(event) =>
              updateFilters({ search: event.target.value })
            }
          />
        </div>

        <div
          className="collection-category-tabs"
          aria-label="Card category"
        >
          {categories.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={
                filters.category === value ? "selected" : ""
              }
              aria-pressed={filters.category === value}
              onClick={() =>
                updateFilters({
                  category: value,
                  monsterType: "all",
                })
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="collection-filter-row">
          <div>
            <label htmlFor="collection-monster-type">
              Monster Type
            </label>
            <select
              id="collection-monster-type"
              value={filters.monsterType}
              onChange={(event) =>
                updateFilters({
                  monsterType: event.target.value,
                })
              }
            >
              <option value="all">All Monster Types</option>
              {monsterTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="collection-archetype">
              Archetype
            </label>
            <select
              id="collection-archetype"
              value={filters.archetype}
              onChange={(event) =>
                updateFilters({
                  archetype: event.target.value,
                })
              }
            >
              <option value="all">All Archetypes</option>
              {archetypes.map((archetype) => (
                <option key={archetype} value={archetype}>
                  {archetype}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="collection-sort">
              Sort By
            </label>
            <select
              id="collection-sort"
              value={filters.sort}
              onChange={(event) =>
                updateFilters({
                  sort: event.target.value as CollectionSort,
                })
              }
            >
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
              <option value="quantity-desc">Most Owned</option>
              <option value="quantity-asc">Least Owned</option>
              <option value="type">Card Type</option>
              <option value="archetype">Archetype</option>
            </select>
          </div>
        </div>

        <div className="collection-results-heading">
          <span>
            Showing {visibleCards.length} of{" "}
            {collection.length} unique cards
          </span>

          <button
            type="button"
            onClick={() =>
              setFilters({ ...DEFAULT_COLLECTION_FILTERS })
            }
          >
            Reset Filters
          </button>
        </div>
      </section>

      {collection.length === 0 ? (
        <div className="collection-empty">
          <h2>Your collection is empty</h2>
          <p>
            Visit the Builder page to search for cards
            and add them to your collection.
          </p>
        </div>
      ) : visibleCards.length === 0 ? (
        <div className="collection-empty">
          <h2>No matching cards</h2>
          <p>Try changing your search or filters.</p>
        </div>
      ) : (
        <div className="collection-card-grid">
          {visibleCards.map(({ card, quantity }) => (
            <article
              className="collection-grid-card"
              key={card.id}
            >
              <div className="collection-card-art">
                <img
                  src={card.imageUrlSmall || card.imageUrl}
                  alt={card.name}
                  loading="lazy"
                />
                <span className="collection-quantity">
                  ×{quantity}
                </span>
              </div>

              <div className="collection-card-details">
                <h3 title={card.name}>{card.name}</h3>
                <p>{card.type}</p>

                {card.archetype && (
                  <small>{card.archetype}</small>
                )}

                <div className="collection-quantity-controls">
                  <button
                    type="button"
                    onClick={() => onRemoveCard(card.id)}
                    aria-label={`Remove one ${card.name}`}
                    title="Remove one copy"
                  >
                    −
                  </button>

                  <span aria-label={`${quantity} copies owned`}>
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => onAddCard(card)}
                    aria-label={`Add one ${card.name}`}
                    title="Add one copy"
                  >
                    +
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
