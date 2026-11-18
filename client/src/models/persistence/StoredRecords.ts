import type { Card } from "../card/Card";
import type { Combo } from "../combo/Combo";

export interface CachedCard {
  id: number;
  card: Card;
  cachedAt: string;
}

export interface StoredCollectionCard {
  cardId: number;
  quantity: number;
  updatedAt: string;
}

export interface StoredDeckCard {
  cardId: number;
  quantity: number;
}

export interface StoredDeck {
  id: string;
  name: string;

  main: StoredDeckCard[];
  extra: StoredDeckCard[];
  side: StoredDeckCard[];

  createdAt: string;
  updatedAt: string;
}

export interface StorageMetadata {
  key: string;
  value: unknown;
}

// Personal combos retain the existing domain model.
export type StoredCombo = Combo;