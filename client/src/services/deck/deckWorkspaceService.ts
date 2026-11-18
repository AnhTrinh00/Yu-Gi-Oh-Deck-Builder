import type { Deck } from "../../models/deck/Deck";
import type { StoredDeck } from "../../models/persistence/StoredRecords";

import {
  createSavedDeck,
  deleteSavedDeck,
  duplicateSavedDeck,
  getSavedDeck,
  getStoredDeck,
  listSavedDecks,
  updateSavedDeck,
} from "../persistence/deckRepository";

import {
  getActiveDeckId,
  setActiveDeckId,
} from "../persistence/metadataRepository";

export interface DeckWorkspace {
  activeDeckId: string;
  activeDeck: Deck;
  decks: StoredDeck[];
}

function createEmptyWorkspaceDeck(): Deck {
  return {
    name: "New Deck",
    main: [],
    extra: [],
    side: [],
  };
}

async function loadWorkspace(
  activeDeckId: string,
): Promise<DeckWorkspace> {
  const activeDeck = await getSavedDeck(activeDeckId);

  if (!activeDeck) {
    throw new Error(
      `Active deck ${activeDeckId} could not be loaded.`,
    );
  }

  return {
    activeDeckId,
    activeDeck,
    decks: await listSavedDecks(),
  };
}

/**
 * Initializes the deck workspace.
 *
 * If no saved decks exist, creates a new empty deck.
 * If the active deck ID is missing or invalid, selects
 * an existing saved deck.
 */
export async function initializeDeckWorkspace():
  Promise<DeckWorkspace> {
  const decks = await listSavedDecks();
  const activeId = await getActiveDeckId();

  if (activeId && decks.some((deck) => deck.id === activeId)) {
    return loadWorkspace(activeId);
  }

  if (decks.length > 0) {
    const firstDeck = decks[0];

    await setActiveDeckId(firstDeck.id);

    return loadWorkspace(firstDeck.id);
  }

  const created = await createSavedDeck(
    createEmptyWorkspaceDeck(),
  );

  await setActiveDeckId(created.id);

  return loadWorkspace(created.id);
}

/**
 * Creates a new deck and makes it active.
 */
export async function createWorkspaceDeck(
  name = "New Deck",
): Promise<DeckWorkspace> {
  const deck = createEmptyWorkspaceDeck();
  deck.name = name;

  const created = await createSavedDeck(deck);

  await setActiveDeckId(created.id);

  return loadWorkspace(created.id);
}

/**
 * Switches to an existing saved deck.
 */
export async function selectWorkspaceDeck(
  deckId: string,
): Promise<DeckWorkspace> {
  const deck = await getSavedDeck(deckId);

  if (!deck) {
    throw new Error(`Deck ${deckId} does not exist.`);
  }

  await setActiveDeckId(deckId);

  return loadWorkspace(deckId);
}

/**
 * Saves changes to an existing deck.
 */
export async function saveWorkspaceDeck(
  deckId: string,
  deck: Deck,
): Promise<StoredDeck> {
  return updateSavedDeck(deckId, deck);
}

/**
 * Renames a saved deck without changing its cards.
 */
export async function renameWorkspaceDeck(
  deckId: string,
  name: string,
): Promise<StoredDeck> {
  const deck = await getSavedDeck(deckId);

  if (!deck) {
    throw new Error(`Deck ${deckId} does not exist.`);
  }

  return updateSavedDeck(deckId, {
    ...deck,
    name,
  });
}

/**
 * Duplicates a saved deck and activates the copy.
 */
export async function duplicateWorkspaceDeck(
  deckId: string,
): Promise<DeckWorkspace> {
  const duplicated = await duplicateSavedDeck(deckId);

  await setActiveDeckId(duplicated.id);

  return loadWorkspace(duplicated.id);
}

/**
 * Deletes a saved deck and selects a replacement.
 *
 * The workspace always retains at least one deck.
 */
export async function deleteWorkspaceDeck(
  deckId: string,
): Promise<DeckWorkspace> {
  const existing = await getStoredDeck(deckId);

  if (!existing) {
    throw new Error(`Deck ${deckId} does not exist.`);
  }

  const activeId = await getActiveDeckId();

  await deleteSavedDeck(deckId);

  const remaining = await listSavedDecks();

  if (remaining.length === 0) {
    const created = await createSavedDeck(
      createEmptyWorkspaceDeck(),
    );

    await setActiveDeckId(created.id);

    return loadWorkspace(created.id);
  }

  if (
    activeId &&
    activeId !== deckId &&
    remaining.some((deck) => deck.id === activeId)
  ) {
    return loadWorkspace(activeId);
  }

  const nextId = remaining[0].id;

  await setActiveDeckId(nextId);

  return loadWorkspace(nextId);
}