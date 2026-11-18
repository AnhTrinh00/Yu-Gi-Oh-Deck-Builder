import { openDB, deleteDB } from "idb";
import type { IDBPDatabase } from "idb";

import {
  DATABASE_NAME,
  DATABASE_VERSION,
} from "../../models/persistence/DeckBuilderDB";

import type { DeckBuilderDB } from "../../models/persistence/DeckBuilderDB";

let databasePromise: Promise<IDBPDatabase<DeckBuilderDB>> | null =
  null;

function createObjectStores(
  database: IDBPDatabase<DeckBuilderDB>,
): void {
  if (!database.objectStoreNames.contains("cards")) {
    database.createObjectStore("cards", {
      keyPath: "id",
    });
  }

  if (!database.objectStoreNames.contains("collection")) {
    database.createObjectStore("collection", {
      keyPath: "cardId",
    });
  }

  if (!database.objectStoreNames.contains("decks")) {
    const deckStore = database.createObjectStore("decks", {
      keyPath: "id",
    });

    deckStore.createIndex("by-updated-at", "updatedAt");
  }

  if (!database.objectStoreNames.contains("combos")) {
    database.createObjectStore("combos", {
      keyPath: "id",
    });
  }

  if (!database.objectStoreNames.contains("metadata")) {
    database.createObjectStore("metadata", {
      keyPath: "key",
    });
  }

  if (!database.objectStoreNames.contains("cardEffects")) {
    database.createObjectStore("cardEffects", {
      keyPath: "id",
    });
  }

  if (!database.objectStoreNames.contains("effectTemplates")) {
    database.createObjectStore("effectTemplates", {
      keyPath: "id",
    });
  }

  if (!database.objectStoreNames.contains("relationships")) {
    database.createObjectStore("relationships", {
      keyPath: "id",
    });
  }
}

export function getDatabase(): Promise<
  IDBPDatabase<DeckBuilderDB>
> {
  if (databasePromise) {
    return databasePromise;
  }

  const connectionPromise = openDB<DeckBuilderDB>(
    DATABASE_NAME,
    DATABASE_VERSION,
    {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          createObjectStores(database);
        }
      },

      blocked() {
        console.warn(
          "IndexedDB upgrade blocked by another open connection.",
        );
      },

      blocking() {
        console.warn(
          "Closing an outdated IndexedDB connection.",
        );

        void closeDatabase();
      },

      terminated() {
        console.warn(
          "IndexedDB connection terminated unexpectedly.",
        );

        if (databasePromise === connectionPromise) {
          databasePromise = null;
        }
      },
    },
  ).catch((error: unknown) => {
    if (databasePromise === connectionPromise) {
      databasePromise = null;
    }

    throw error;
  });

  databasePromise = connectionPromise;

  return connectionPromise;
}

export async function closeDatabase(): Promise<void> {
  const currentPromise = databasePromise;
  databasePromise = null;

  if (!currentPromise) {
    return;
  }

  try {
    const database = await currentPromise;
    database.close();
  } catch {
    // A failed database opening has no connection to close.
  }
}

/**
 * Deletes the IndexedDB database.
 *
 * Intended for tests and explicit reset operations only.
 * Never call this automatically during normal startup.
 */
export async function deleteDatabase(): Promise<void> {
  await closeDatabase();

  await deleteDB(DATABASE_NAME, {
    blocked() {
      console.warn(
        "IndexedDB deletion blocked by another open connection.",
      );
    },
  });
}