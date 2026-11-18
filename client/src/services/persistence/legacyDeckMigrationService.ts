import type { Card } from "../../models/card/Card";
import type { Deck, DeckSection } from "../../models/deck/Deck";
import type {
  StoredDeck,
  StoredDeckCard,
} from "../../models/persistence/StoredRecords";

import { getDatabase } from "./indexedDbService";

const LEGACY_DECK_KEY = "yugioh-deck-builder-deck";

const MIGRATION_KEY = "legacyDeckMigrationVersion";
const MIGRATION_VERSION = 1;

const SECTIONS: DeckSection[] = [
  "main",
  "extra",
  "side",
];

export interface LegacyDeckMigrationResult {
  status: "migrated" | "already-migrated" | "no-legacy-deck";
  deckId: string | null;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isCard(value: unknown): value is Card {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    typeof value.name === "string" &&
    typeof value.type === "string" &&
    typeof value.frameType === "string" &&
    typeof value.description === "string" &&
    typeof value.race === "string" &&
    typeof value.imageUrl === "string" &&
    typeof value.imageUrlSmall === "string"
  );
}

function isDeck(value: unknown): value is Deck {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.name !== "string" ||
    !value.name.trim()
  ) {
    return false;
  }

  for (const section of SECTIONS) {
    const entries = value[section];

    if (!Array.isArray(entries)) {
      return false;
    }

    const seen = new Set<number>();

    for (const entry of entries) {
      if (!isRecord(entry)) {
        return false;
      }

      if (
        !isCard(entry.card) ||
        typeof entry.quantity !== "number" ||
        !Number.isSafeInteger(entry.quantity) ||
        entry.quantity <= 0
      ) {
        return false;
      }

      if (seen.has(entry.card.id)) {
        return false;
      }

      seen.add(entry.card.id);
    }
  }

  return true;
}

function serializeSection(
  deck: Deck,
  section: DeckSection,
): StoredDeckCard[] {
  return deck[section].map(({ card, quantity }) => ({
    cardId: card.id,
    quantity,
  }));
}

function getUniqueCards(deck: Deck): Card[] {
  const cards = new Map<number, Card>();

  for (const section of SECTIONS) {
    for (const entry of deck[section]) {
      cards.set(entry.card.id, entry.card);
    }
  }

  return [...cards.values()];
}

export async function migrateLegacyDeck():
  Promise<LegacyDeckMigrationResult> {
  const database = await getDatabase();

  // Read the legacy value without changing or removing it.
  const raw = localStorage.getItem(LEGACY_DECK_KEY);

  const transaction = database.transaction(
    ["cards", "decks", "metadata"],
    "readwrite",
  );

  const cardStore = transaction.objectStore("cards");
  const deckStore = transaction.objectStore("decks");
  const metadataStore = transaction.objectStore("metadata");

  const existingMigration = await metadataStore.get(
    MIGRATION_KEY,
  );

  if (existingMigration?.value === MIGRATION_VERSION) {
    const activeDeck = await metadataStore.get(
      "activeDeckId",
    );

    await transaction.done;

    return {
      status: "already-migrated",
      deckId:
        typeof activeDeck?.value === "string"
          ? activeDeck.value
          : null,
    };
  }

  const existingDeckCount = await deckStore.count();

  // An existing IndexedDB workspace must not be overwritten
  // by a legacy localStorage deck.
  if (existingDeckCount > 0) {
    await transaction.done;

    return {
      status: "already-migrated",
      deckId: null,
    };
  }

  if (raw === null) {
    await transaction.done;

    return {
      status: "no-legacy-deck",
      deckId: null,
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    await transaction.done;

    throw new Error(
      "Legacy deck data is not valid JSON. The original data has been preserved.",
    );
  }

  if (!isDeck(parsed)) {
    await transaction.done;

    throw new Error(
      "Legacy deck data has an invalid structure. The original data has been preserved.",
    );
  }

  const now = new Date().toISOString();
  const deckId = crypto.randomUUID();

  const storedDeck: StoredDeck = {
    id: deckId,
    name: parsed.name,
    main: serializeSection(parsed, "main"),
    extra: serializeSection(parsed, "extra"),
    side: serializeSection(parsed, "side"),
    createdAt: now,
    updatedAt: now,
  };

  for (const card of getUniqueCards(parsed)) {
    cardStore.put({
      id: card.id,
      card,
      cachedAt: now,
    });
  }

  deckStore.add(storedDeck);

  metadataStore.put({
    key: "activeDeckId",
    value: deckId,
  });

  metadataStore.put({
    key: MIGRATION_KEY,
    value: MIGRATION_VERSION,
  });

  await transaction.done;

  return {
    status: "migrated",
    deckId,
  };
}