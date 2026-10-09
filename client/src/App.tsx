import { useEffect, useState, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layouts/AppLayout";
import DeckPreview from "./components/deck/DeckPreview";
import DeckSummary from "./components/deck/DeckSummary";
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
import { getDeckStatistics } from "./services/deckStatisticsService";
import { getArchetypeSummaries } from "./services/archetypeService";
import type { CardRelationship, CardRelationshipType } from "./models/CardRelationship";
import {
  loadRelationships,
  addRelationship,
  removeRelationship
} from "./services/cardRelationshipRegistry";
import {
  analyzeDeckRelationships,
} from "./services/deckRelationshipAnalysisService";
import {
  createRelationship,
} from "./services/cardRelationshipService";
import { findShortestPath } from "./services/cardRelationshipGraphService";
import { getPathSteps } from "./services/relationshipPathService";
import RelationshipGraph from "./components/RelationshipGraph";
import {
  DEFAULT_GRAPH_FILTERS,
  filterRelationshipGraph,
} from "./services/relationshipGraphFilterService";
import type {
  RelationshipGraphFilters,
} from "./services/relationshipGraphFilterService";
import type { CardRole } from "./services/cardRoleService";
import { analyzeRelationshipGraph } from "./services/relationshipGraphAnalysisService";
import ComboEditor from "./components/ComboEditor";
import type { Combo } from "./models/Combo";
import {
  loadCombos,
  upsertCombo,
  deleteCombo,
} from "./services/comboRegistryService";
import { validateCombo } from "./services/comboValidationService";
import { calculateComboOpeningProbability } from "./services/comboProbabilityService";
import DeckAnalysisWorkspace from "./components/DeckAnalysisWorkspace";
import CollectionPage from "./components/collection/CollectionPage";

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
  const [relationships, setRelationships] = useState<CardRelationship[]>(() => loadRelationships());
  const [sourceCardId, setSourceCardId] = useState("");
  const [targetCardId, setTargetCardId] = useState("");
  const [pathSourceId, setPathSourceId] = useState("");
  const [pathTargetId, setPathTargetId] = useState("");
  const [relationshipType, setRelationshipType] = useState<CardRelationshipType>("searches");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphFilters, setGraphFilters] =
    useState<RelationshipGraphFilters>({
      ...DEFAULT_GRAPH_FILTERS,
    });
  const [combos, setCombos] = useState<Combo[]>(() => loadCombos());
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [showComboEditor, setShowComboEditor] = useState(false);

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
  function handleAddRelationship() {
    if (!sourceCardId || !targetCardId) {
      return;
    }

    const sourceId = Number(sourceCardId);
    const targetId = Number(targetCardId);

    if (sourceId === targetId) {
      return;
    }

    const deckCards = [
      ...deck.main,
      ...deck.extra,
      ...deck.side,
    ];

    const source = deckCards.find(
      (item) => item.card.id === sourceId
    )?.card;

    const target = deckCards.find(
      (item) => item.card.id === targetId
    )?.card;

    if (!source || !target) {
      return;
    }

    const relationship = createRelationship(
      source,
      target,
      relationshipType
    );

    const updated = addRelationship(relationship);

    setRelationships(updated);
  }
  function handleRemoveRelationship(
    sourceId: number,
    targetId: number,
    type: CardRelationshipType
  ) {
    const updated = removeRelationship(
      sourceId,
      targetId,
      type
    );

    setRelationships(updated);
  }
  function handleSaveCombo(combo: Combo): boolean {
    const result = validateCombo(combo, deck);

    if (!result.valid) {
      window.alert(result.errors.join("\n"));
      return false;
    }

    try {
      const updated = upsertCombo(combo);

      setCombos(updated);
      setEditingCombo(null);
      setShowComboEditor(false);

      return true;
    } catch {
      window.alert("Unable to save combo.");
      return false;
    }
  }
  function handleDeleteCombo(comboId: string) {
    if (!window.confirm("Delete this combo?")) return;

    try {
      setCombos(deleteCombo(comboId));
    } catch {
      window.alert("Unable to delete combo.");
    }
  }
  function handleEditCombo(combo: Combo) {
    setEditingCombo(combo);
    setShowComboEditor(true);
  }
  function handleRemovePreviewCard(
    cardId: number,
    section: DeckSection
  ) {
    setDeck((currentDeck) =>
      removeCardFromDeck(currentDeck, cardId, section)
    );
  }

  const selectedDeckCards = deck[selectedSection];
  const mainCount = getDeckCardCount(deck, "main");
  const extraCount = getDeckCardCount(deck, "extra");
  const sideCount = getDeckCardCount(deck, "side");
  const deckStatistics = getDeckStatistics(deck);
  const archetypeSummaries = getArchetypeSummaries(deck);
  const deckRelationshipAnalysis = analyzeDeckRelationships(deck, relationships);
  const uniqueDeckCards = Array.from(
    new Map(
      [...deck.main, ...deck.extra, ...deck.side].map(
        (item) => [item.card.id, item.card]
      )
    ).values()
  );
  const deckCardMap = new Map(
    uniqueDeckCards.map((card) => [card.id, card.name])
  );
  const deckCardIds = new Set(deckCardMap.keys());
  const visibleRelationships = relationships.filter(
    (relationship) =>
      deckCardIds.has(relationship.sourceCardId) &&
      deckCardIds.has(relationship.targetCardId)
  );
  const pathSelectionValid =
    pathSourceId !== "" &&
    pathTargetId !== "" &&
    deckCardIds.has(Number(pathSourceId)) &&
    deckCardIds.has(Number(pathTargetId));
  const shortestPath = pathSelectionValid
    ? findShortestPath(
        Number(pathSourceId),
        Number(pathTargetId),
        visibleRelationships
      )
    : null;
  const pathSteps = shortestPath
    ? getPathSteps(shortestPath, visibleRelationships)
    : [];
  const filteredGraph = useMemo(
    () =>
      filterRelationshipGraph(
        deck,
        relationships,
        graphFilters
      ),
    [deck, relationships, graphFilters]
  );
  const graphAnalysis = useMemo(
    () =>
      analyzeRelationshipGraph(
        filteredGraph.cards.map((card) => card.id),
        filteredGraph.relationships
      ),
    [filteredGraph]
  );
  const filteredCardIds = new Set(
    filteredGraph.cards.map((card) => card.id)
  );
  const filteredShortestPath =
    shortestPath &&
    shortestPath.every((id) => filteredCardIds.has(id)) &&
    shortestPath.slice(1).every((id, index) =>
      filteredGraph.relationships.some(
        (relationship) =>
          relationship.sourceCardId === shortestPath[index] &&
          relationship.targetCardId === id
      )
    )
      ? shortestPath
      : null;
  const relationshipTypes: CardRelationshipType[] = [
    "searches",
    "summons",
    "supports",
    "requires",
    "enables",
    "extends",
    "negates",
    "destroys",
    "banishes",
  ];
  const selectedDifferentCardCount = selectedDeckCards.length;
  const deckValidation = validateDeck(deck);

  const builderContent = (
  <div className="builder-page">
    <div className="builder-page-heading">
      <div>
        <h1>Card Builder</h1>
        <p>
          Search cards, grow your collection, and build your deck.
        </p>
      </div>
    </div>

    <DeckSummary deck={deck} />

    <div className="builder-layout">
      <section className="builder-search-panel">
        <div className="builder-section-heading">
          <h2>Search Cards</h2>
          <span>{cards.length} results</span>
        </div>

        <div className="search-bar">
          <input
            type="search"
            value={searchTerm}
            placeholder="Search for a Yu-Gi-Oh! card..."
            aria-label="Search cards"
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSearch();
              }
            }}
          />

          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="builder-target-section">
          <label htmlFor="builder-deck-section">
            Add cards to:
          </label>

          <select
            id="builder-deck-section"
            value={selectedSection}
            onChange={(event) =>
              setSelectedSection(
                event.target.value as DeckSection
              )
            }
          >
            <option value="main">Main Deck</option>
            <option value="extra">Extra Deck</option>
            <option value="side">Side Deck</option>
          </select>
        </div>

        {loading && (
          <p role="status">Searching cards...</p>
        )}

        {error && (
          <p role="alert" className="card-add-warning">
            {error}
          </p>
        )}

        {!loading &&
          !error &&
          cards.length === 0 && (
            <p className="builder-empty-state">
              Search for a card to get started.
            </p>
          )}

        <div className="card-grid builder-card-grid">
          {cards.map((card) => {
            const disabledReason =
              getAddCardDisabledReason(card);

            return (
              <article className="card-result" key={card.id}>
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  loading="lazy"
                />

                <h3>{card.name}</h3>
                <p>{card.type}</p>

                <div className="builder-card-actions">
                  <button
                    type="button"
                    onClick={() => handleAddCard(card)}
                  >
                    Add to Collection
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddToDeck(card)}
                    disabled={!isCardAddable(card)}
                    title={disabledReason ?? undefined}
                  >
                    Add to Deck
                  </button>
                </div>

                {disabledReason && (
                  <p className="card-add-warning">
                    {disabledReason}
                  </p>
                )}

                {getCardQuantity(card.id) > 0 && (
                  <p className="builder-owned-count">
                    Owned: {getCardQuantity(card.id)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <DeckPreview
        deck={deck}
        selectedSection={selectedSection}
        onSelectSection={setSelectedSection}
        onRemoveCard={handleRemovePreviewCard}
      />
    </div>
  </div>
  );

  const collectionContent = (
    <CollectionPage
      collection={collection}
      onAddCard={handleAddCard}
      onRemoveCard={handleRemoveCard}
    />
  );

  const deckContent = (
    <>
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

    </>
  );

  const analysisContent = (
    <section className="analysis-page">
      <h2>Deck Analysis</h2>
            <div className="deck-statistics">
              <h3>Deck Statistics</h3>

              <div className="statistics-grid">
                  <div>
                      <span>Unique Main Cards</span>
                      <strong>
                          {deckStatistics.uniqueMainCards}
                      </strong>
                  </div>

                  <div>
                      <span>Unique Extra Cards</span>
                      <strong>
                          {deckStatistics.uniqueExtraCards}
                      </strong>
                  </div>

                  <div>
                      <span>Unique Side Cards</span>
                      <strong>
                          {deckStatistics.uniqueSideCards}
                      </strong>
                  </div>

                  <div>
                      <span>Monsters</span>
                      <strong>
                          {deckStatistics.monsterCount}
                          {" "}
                          ({deckStatistics.monsterPercentage.toFixed(1)}%)
                      </strong>
                  </div>

                  <div>
                      <span>Spells</span>
                      <strong>
                          {deckStatistics.spellCount}
                          {" "}
                          ({deckStatistics.spellPercentage.toFixed(1)}%)
                      </strong>
                  </div>

                  <div>
                      <span>Traps</span>
                      <strong>
                          {deckStatistics.trapCount}
                          {" "}
                          ({deckStatistics.trapPercentage.toFixed(1)}%)
                      </strong>
                  </div>
              </div>

            </div>

            <div className="archetype-analysis">
              <h3>Archetype Analysis</h3>

              {archetypeSummaries.length === 0 ? (
                <p>No archetypes detected in the Main Deck.</p>
              ) : (
                <div className="archetype-list">
                  {archetypeSummaries.map((summary) => (
                    <div
                      className="archetype-summary"
                      key={summary.archetype}
                    >
                      <strong>{summary.archetype}</strong>

                      <span>
                        {summary.cardCount}{" "}
                        {summary.cardCount === 1 ? "card" : "cards"}
                      </span>

                      <span>
                        {summary.uniqueCards}{" "}
                        {summary.uniqueCards === 1
                          ? "unique card"
                          : "unique cards"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relationship-analysis">
              <h3>Card Relationship Analysis</h3>

              <div className="relationship-statistics">
                <p>
                  Unique Cards:{" "}
                  <strong>
                    {deckRelationshipAnalysis.totalUniqueCards}
                  </strong>
                </p>

                <p>
                  Recorded Relationships:{" "}
                  <strong>
                    {deckRelationshipAnalysis.totalRelationships}
                  </strong>
                </p>

                <p>
                  Connected Cards:{" "}
                  <strong>
                    {deckRelationshipAnalysis.connectedCardCount}
                  </strong>
                </p>

                <p>
                  No Recorded Connections:{" "}
                  <strong>
                    {deckRelationshipAnalysis.disconnectedCardCount}
                  </strong>
                </p>
              </div>

              <h4>Add Card Relationship</h4>

              <div className="relationship-editor">
                <select
                  value={sourceCardId}
                  onChange={(event) =>
                    setSourceCardId(event.target.value)
                  }
                >
                  <option value="">Select source card</option>

                  {uniqueDeckCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>

                <select
                  value={relationshipType}
                  onChange={(event) =>
                    setRelationshipType(
                      event.target.value as CardRelationshipType
                    )
                  }
                >
                  {relationshipTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <select
                  value={targetCardId}
                  onChange={(event) =>
                    setTargetCardId(event.target.value)
                  }
                >
                  <option value="">Select target card</option>

                  {uniqueDeckCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleAddRelationship}
                  disabled={
                    !sourceCardId ||
                    !targetCardId ||
                    sourceCardId === targetCardId ||
                    !deckCardIds.has(Number(sourceCardId)) ||
                    !deckCardIds.has(Number(targetCardId))
                  }
                >
                  Add Relationship
                </button>
              </div>

              <section
                className="relationship-path"
                aria-label="Relationship path finder"
              >
                <h4>Shortest Relationship Path</h4>

                <div className="relationship-editor">
                  <label>
                    From card
                    <select
                      aria-label="Path source card"
                      value={pathSourceId}
                      onChange={(e) => setPathSourceId(e.target.value)}
                    >
                      <option value="">Select source card</option>

                      {uniqueDeckCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    To card
                    <select
                      aria-label="Path destination card"
                      value={pathTargetId}
                      onChange={(e) => setPathTargetId(e.target.value)}
                    >
                      <option value="">Select destination card</option>

                      {uniqueDeckCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {!pathSelectionValid ? (
                  <p>Select two cards from the deck to find a path.</p>
                ) : shortestPath === null ? (
                  <p>
                    No directed relationship path exists between these cards.
                  </p>
                ) : (
                  <div aria-live="polite">
                    <p>
                      Shortest path: {shortestPath.length - 1} relationship(s)
                    </p>

                    <ol className="relationship-path-steps">
                      <li>{deckCardMap.get(shortestPath[0])}</li>

                      {pathSteps.map((step, index) => (
                        <li
                          key={`${index}-${step.sourceCardId}-${step.targetCardId}`}
                        >
                          <span>
                            {"— "}
                            {step.types.join(" / ")}
                            {" → "}
                          </span>

                          <strong>
                            {deckCardMap.get(step.targetCardId)}
                          </strong>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </section>
                
              <div className="graph-filters">
                <label>
                  Relationship Type
                  <select
                    value={graphFilters.relationshipType}
                    onChange={(event) =>
                      setGraphFilters((previous) => ({
                        ...previous,
                        relationshipType: event.target.value as
                          CardRelationshipType | "all",
                      }))
                    }
                  >
                    <option value="all">All Relationships</option>
                    <option value="searches">Searches</option>
                    <option value="summons">Summons</option>
                    <option value="supports">Supports</option>
                    <option value="requires">Requires</option>
                    <option value="enables">Enables</option>
                    <option value="extends">Extends</option>
                    <option value="negates">Negates</option>
                    <option value="destroys">Destroys</option>
                    <option value="banishes">Banishes</option>
                  </select>
                </label>

                <label>
                  Deck Section
                  <select
                    value={graphFilters.deckSection}
                    onChange={(event) =>
                      setGraphFilters((previous) => ({
                        ...previous,
                        deckSection: event.target.value as
                          DeckSection | "all",
                      }))
                    }
                  >
                    <option value="all">All Sections</option>
                    <option value="main">Main Deck</option>
                    <option value="extra">Extra Deck</option>
                    <option value="side">Side Deck</option>
                  </select>
                </label>

                <label>
                  Card Role
                  <select
                    value={graphFilters.cardRole}
                    onChange={(event) =>
                      setGraphFilters((previous) => ({
                        ...previous,
                        cardRole: event.target.value as CardRole | "all",
                      }))
                    }
                  >
                    <option value="all">All Roles</option>
                    <option value="starter">Starter</option>
                    <option value="extender">Extender</option>
                    <option value="searcher">Searcher</option>
                    <option value="engine">Engine</option>
                    <option value="hand-trap">Hand Trap</option>
                    <option value="board-breaker">Board Breaker</option>
                    <option value="interaction">Interaction</option>
                    <option value="generic">Generic</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setGraphFilters({ ...DEFAULT_GRAPH_FILTERS })
                  }
                >
                  Reset Filters
                </button>
              </div>

              <h4>Card Relationship Graph</h4>
          
              <RelationshipGraph
                cards={filteredGraph.cards}
                relationships={filteredGraph.relationships}
                highlightedPath={filteredShortestPath}
              />
      
              <section className="graph-analysis">
                <h4>Relationship Graph Analysis</h4>

                <div className="graph-analysis-summary">
                  <p>
                    <strong>Total Cards:</strong>{" "}
                    {graphAnalysis.cardCount}
                  </p>

                  <p>
                    <strong>Recorded Relationships:</strong>{" "}
                    {graphAnalysis.relationshipCount}
                  </p>

                  <p>
                    <strong>Connected Cards:</strong>{" "}
                    {graphAnalysis.connectedCardCount}
                  </p>

                  <p>
                    <strong>Isolated Cards:</strong>{" "}
                    {graphAnalysis.isolatedCardIds.length}
                  </p>
                </div>

                <h5>Top Interaction Hubs</h5>

                {graphAnalysis.hubs.length === 0 ? (
                  <p>No connected cards found.</p>
                ) : (
                  <table className="graph-analysis-table">
                    <thead>
                      <tr>
                        <th>Card</th>
                        <th>Incoming</th>
                        <th>Outgoing</th>
                        <th>Connections</th>
                      </tr>
                    </thead>

                    <tbody>
                      {graphAnalysis.hubs.slice(0, 10).map((metric) => (
                        <tr key={metric.cardId}>
                          <td>
                            {deckCardMap.get(metric.cardId) ??
                              `Card ${metric.cardId}`}
                          </td>
                          <td>{metric.incoming}</td>
                          <td>{metric.outgoing}</td>
                          <td>{metric.totalConnections}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <h5>Isolated Cards</h5>

                {graphAnalysis.isolatedCardIds.length === 0 ? (
                  <p>No isolated cards found.</p>
                ) : (
                  <ul>
                    {graphAnalysis.isolatedCardIds.map((cardId) => (
                      <li key={cardId}>
                        {deckCardMap.get(cardId) ?? `Card ${cardId}`}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <p>
                Showing {filteredGraph.cards.length} cards and{" "}
                {filteredGraph.relationships.length} relationships.
              </p>

              <h4>Recorded Relationships</h4>

              {visibleRelationships.length === 0 ? (
                <p>
                  No relationships recorded between cards in
                  this deck.
                </p>
              ) : (
                <div className="relationship-list">
                  {visibleRelationships.map((relationship) => (
                    <div
                      className="relationship-item"
                      key={`${relationship.sourceCardId}-${relationship.targetCardId}-${relationship.type}`}
                    >
                      <span>
                        {deckCardMap.get(relationship.sourceCardId)}
                        {" → "}
                        {relationship.type}
                        {" → "}
                        {deckCardMap.get(relationship.targetCardId)}
                      </span>

                      <button
                        onClick={() =>
                          handleRemoveRelationship(
                            relationship.sourceCardId,
                            relationship.targetCardId,
                            relationship.type
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
     
            <section className="combo-section">
              <h2>Combo Foundations</h2>

              <p>
                Create and manage manually recorded combo sequences
                using cards in your current deck.
              </p>

              {!showComboEditor && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCombo(null);
                    setShowComboEditor(true);
                  }}
                >
                  Create New Combo
                </button>
              )}

              {showComboEditor && (
                <ComboEditor
                  key={editingCombo?.id ?? "new-combo"}
                  cards={uniqueDeckCards}
                  editingCombo={editingCombo}
                  onSave={handleSaveCombo}
                  onCancel={() => {
                    setEditingCombo(null);
                    setShowComboEditor(false);
                  }}
                />
              )}

              <h3>Saved Combos</h3>

              {combos.length === 0 ? (
                <p>No combos have been saved yet.</p>
              ) : (
                <div className="combo-list">
                  {combos.map((combo) => {
                    const validation = validateCombo(combo, deck);

                    const probability =
                      calculateComboOpeningProbability(combo, deck);

                    return (
                      <article key={combo.id} className="combo-card">
                        <h4>{combo.name}</h4>
                        <p>{combo.description}</p>

                        <p>
                          <strong>Deck compatibility:</strong>{" "}
                          {validation.valid
                            ? "Requirements satisfied"
                            : "Requirements not satisfied"}
                        </p>

                        <p>
                          <strong>Opening probability:</strong>{" "}
                          {(probability * 100).toFixed(2)}%
                        </p>

                        <p>
                          <strong>Starting cards:</strong>{" "}
                          {combo.starters
                            .map(
                              (item) =>
                                `${deckCardMap.get(item.cardId) ??
                                  `Card ${item.cardId}`} ×${item.quantity}`
                            )
                            .join(", ")}
                        </p>

                        <h5>Combo Sequence</h5>

                        <ol>
                          {[...combo.steps]
                            .sort((a, b) => a.order - b.order)
                            .map((step) => (
                              <li key={step.id}>
                                <strong>
                                  {deckCardMap.get(step.cardId) ??
                                    `Card ${step.cardId}`}
                                </strong>
                                {" — "}{step.action}: {step.description}
                              </li>
                            ))}
                        </ol>

                        <h5>End Board</h5>

                        <ul>
                          {combo.endBoardCardIds.map((id, index) => (
                            <li key={`${id}-${index}`}>
                              {deckCardMap.get(id) ?? `Card ${id}`}
                            </li>
                          ))}
                        </ul>

                        {validation.errors.length > 0 && (
                          <ul className="combo-errors">
                            {validation.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        )}

                        {validation.warnings.length > 0 && (
                          <ul className="combo-warnings">
                            {validation.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        )}

                        <div className="combo-editor-row">
                          <button
                            type="button"
                            onClick={() => handleEditCombo(combo)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCombo(combo.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          
            <DeckAnalysisWorkspace
              deck={deck}
              collection={collection}
              relationships={relationships}
              combos={combos}
              format="advanced"
              onSaveCombo={handleSaveCombo}
            />

    </section>
  );

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={builderContent} />
        <Route path="/collection" element={collectionContent} />
        <Route path="/deck" element={deckContent} />
        <Route path="/analysis" element={analysisContent} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
