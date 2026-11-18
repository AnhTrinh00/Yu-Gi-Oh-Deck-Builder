import type { Card } from "../../models/card/Card";
import type {
  Deck,
  DeckCard,
  DeckSection,
} from "../../models/deck/Deck";
import type {
  StoredDeck,
  StoredDeckCard,
} from "../../models/persistence/StoredRecords";

import { getDatabase } from "./indexedDbService";

const SECTIONS: DeckSection[] = [
  "main",
  "extra",
  "side",
];

function validateDeckName(name: string): void {
  if (!name.trim()) {
    throw new Error("Deck name cannot be empty.");
  }
}

function validateDeckEntries(deck: Deck): void {
  for (const section of SECTIONS) {
    const seen = new Set<number>();

    for (const entry of deck[section]) {
      const id = entry.card.id;

      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Invalid card ID.");
      }

      if (
        !Number.isSafeInteger(entry.quantity) ||
        entry.quantity <= 0
      ) {
        throw new Error("Invalid deck card quantity.");
      }

      if (seen.has(id)) {
        throw new Error(
          `Duplicate card ${id} in ${section}.`,
        );
      }

      seen.add(id);
    }
  }
}

function serializeSection(
  entries: DeckCard[],
): StoredDeckCard[] {
  return entries.map(({ card, quantity }) => ({
    cardId: card.id,
    quantity,
  }));
}

function serializeDeck(
  id: string,
  deck: Deck,
  createdAt: string,
): StoredDeck {
  return {
    id,
    name: deck.name,
    main: serializeSection(deck.main),
    extra: serializeSection(deck.extra),
    side: serializeSection(deck.side),
    createdAt,
    updatedAt: new Date().toISOString(),
  };
}

function collectCards(deck: Deck): Card[] {
  const cards = new Map<number, Card>();

  for (const section of SECTIONS) {
    for (const entry of deck[section]) {
      cards.set(entry.card.id, entry.card);
    }
  }

  return [...cards.values()];
}

export async function createSavedDeck(
  deck: Deck,
): Promise<StoredDeck> {
  validateDeckName(deck.name);
  validateDeckEntries(deck);

  const database = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stored = serializeDeck(id, deck, now);
  stored.updatedAt = now;

  const transaction = database.transaction(
    ["cards", "decks"],
    "readwrite",
  );

  const cardStore = transaction.objectStore("cards");

  for (const card of collectCards(deck)) {
    await cardStore.put({
      id: card.id,
      card,
      cachedAt: now,
    });
  }

  await transaction.objectStore("decks").add(stored);
  await transaction.done;

  return stored;
}

export async function listSavedDecks(): Promise<
  StoredDeck[]
> {
  const database = await getDatabase();

  const decks = await database.getAllFromIndex(
    "decks",
    "by-updated-at",
  );

  return decks.reverse();
}

export async function getStoredDeck(
  id: string,
): Promise<StoredDeck | null> {
  const database = await getDatabase();

  return (await database.get("decks", id)) ?? null;
}

export async function getSavedDeck(
  id: string,
): Promise<Deck | null> {
  const database = await getDatabase();

  const transaction = database.transaction(
    ["cards", "decks"],
    "readonly",
  );

  const stored = await transaction
    .objectStore("decks")
    .get(id);

  if (!stored) {
    await transaction.done;
    return null;
  }

  const cardStore = transaction.objectStore("cards");

  const ids = [
    ...stored.main,
    ...stored.extra,
    ...stored.side,
  ].map((entry) => entry.cardId);

  const uniqueIds = [...new Set(ids)];

  const cached = await Promise.all(
    uniqueIds.map((cardId) => cardStore.get(cardId)),
  );

  await transaction.done;

  const cardMap = new Map<number, Card>();

  uniqueIds.forEach((cardId, index) => {
    const record = cached[index];

    if (!record) {
      throw new Error(
        `Missing cached card ${cardId} in saved deck.`,
      );
    }

    cardMap.set(cardId, record.card);
  });

  function restoreSection(
    entries: StoredDeckCard[],
  ): DeckCard[] {
    return entries.map(({ cardId, quantity }) => {
      const card = cardMap.get(cardId);

      if (!card) {
        throw new Error(
          `Missing card ${cardId} during reconstruction.`,
        );
      }

      return { card, quantity };
    });
  }

  return {
    name: stored.name,
    main: restoreSection(stored.main),
    extra: restoreSection(stored.extra),
    side: restoreSection(stored.side),
  };
}

export async function updateSavedDeck(
  id: string,
  deck: Deck,
): Promise<StoredDeck> {
  validateDeckName(deck.name);
  validateDeckEntries(deck);

  const database = await getDatabase();

  const transaction = database.transaction(
    ["cards", "decks"],
    "readwrite",
  );

  const deckStore = transaction.objectStore("decks");
  const existing = await deckStore.get(id);

  if (!existing) {
    // No writes have occurred, so the transaction can
    // complete normally before we report the missing deck.
    await transaction.done;

    throw new Error(`Deck ${id} does not exist.`);
  }

  const stored = serializeDeck(
    id,
    deck,
    existing.createdAt,
  );

  const cardStore = transaction.objectStore("cards");

  for (const card of collectCards(deck)) {
    await cardStore.put({
      id: card.id,
      card,
      cachedAt: stored.updatedAt,
    });
  }

  await deckStore.put(stored);
  await transaction.done;

  return stored;
}

export async function deleteSavedDeck(
  id: string,
): Promise<void> {
  const database = await getDatabase();

  await database.delete("decks", id);
}

export async function duplicateSavedDeck(
  id: string,
  newName?: string,
): Promise<StoredDeck> {
  const source = await getSavedDeck(id);

  if (!source) {
    throw new Error(`Deck ${id} does not exist.`);
  }

  return createSavedDeck({
    ...source,
    name: newName ?? `${source.name} (Copy)`,
  });
}