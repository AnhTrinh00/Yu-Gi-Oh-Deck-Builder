import type { DBSchema } from "idb";

import type {
  CachedCard,
  StoredCollectionCard,
  StoredCombo,
  StoredDeck,
  StorageMetadata,
} from "./StoredRecords";

export const DATABASE_NAME = "yugioh-deck-builder";
export const DATABASE_VERSION = 1;

export interface DeckBuilderDB extends DBSchema {
  cards: {
    key: number;
    value: CachedCard;
  };

  collection: {
    key: number;
    value: StoredCollectionCard;
  };

  decks: {
    key: string;
    value: StoredDeck;
    indexes: {
      "by-updated-at": string;
    };
  };

  combos: {
    key: string;
    value: StoredCombo;
  };

  metadata: {
    key: string;
    value: StorageMetadata;
  };

  cardEffects: {
    key: string;
    value: {
      id: string;
      data: unknown;
    };
  };

  effectTemplates: {
    key: string;
    value: {
      id: string;
      data: unknown;
    };
  };

  relationships: {
    key: string;
    value: {
      id: string;
      data: unknown;
    };
  };
}