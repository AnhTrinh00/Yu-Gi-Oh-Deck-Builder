import type { Card } from "../../models/card/Card";
import type { CollectionCard } from "../../models/card/CollectionCard";
import type { StoredCollectionCard } from "../../models/persistence/StoredRecords";

import { getDatabase } from "./indexedDbService";

function validateQuantity(quantity: number): void {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error(
      "Collection quantity must be a positive integer.",
    );
  }
}

function validateCardId(cardId: number): void {
  if (!Number.isSafeInteger(cardId) || cardId <= 0) {
    throw new Error("Invalid card ID.");
  }
}

export async function getStoredCollection(): Promise<
  StoredCollectionCard[]
> {
  const database = await getDatabase();

  return database.getAll("collection");
}

export async function getCollectionQuantity(
  cardId: number,
): Promise<number> {
  validateCardId(cardId);

  const database = await getDatabase();
  const record = await database.get("collection", cardId);

  return record?.quantity ?? 0;
}

export async function getPersistedCollection(): Promise<
  CollectionCard[]
> {
  const database = await getDatabase();

  const transaction = database.transaction(
    ["collection", "cards"],
    "readonly",
  );

  const collectionStore = transaction.objectStore("collection");
  const cardStore = transaction.objectStore("cards");

  const entries = await collectionStore.getAll();

  const cards = await Promise.all(
    entries.map((entry) => cardStore.get(entry.cardId)),
  );

  await transaction.done;

  return entries.map((entry, index) => {
    const cachedCard = cards[index];

    if (!cachedCard) {
      throw new Error(
        `Missing cached card ${entry.cardId} in collection.`,
      );
    }

    return {
      card: cachedCard.card,
      quantity: entry.quantity,
    };
  });
}

export async function setCollectionQuantity(
  card: Card,
  quantity: number,
): Promise<void> {
  validateCardId(card.id);

  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error(
      "Collection quantity must be a non-negative integer.",
    );
  }

  const database = await getDatabase();

  const transaction = database.transaction(
    ["cards", "collection"],
    "readwrite",
  );

  const cardStore = transaction.objectStore("cards");
  const collectionStore = transaction.objectStore("collection");

  if (quantity === 0) {
    await collectionStore.delete(card.id);
  } else {
    const timestamp = new Date().toISOString();

    await cardStore.put({
      id: card.id,
      card,
      cachedAt: timestamp,
    });

    await collectionStore.put({
      cardId: card.id,
      quantity,
      updatedAt: timestamp,
    });
  }

  await transaction.done;
}

export async function addCollectionQuantity(
  card: Card,
  quantity: number = 1,
): Promise<void> {
  validateCardId(card.id);
  validateQuantity(quantity);

  const database = await getDatabase();

  const transaction = database.transaction(
    ["cards", "collection"],
    "readwrite",
  );

  const cardStore = transaction.objectStore("cards");
  const collectionStore = transaction.objectStore("collection");

  const existing = await collectionStore.get(card.id);
  const nextQuantity = (existing?.quantity ?? 0) + quantity;

  if (!Number.isSafeInteger(nextQuantity)) {
    transaction.abort();
    throw new Error("Collection quantity exceeds safe integer range.");
  }

  const timestamp = new Date().toISOString();

  await cardStore.put({
    id: card.id,
    card,
    cachedAt: timestamp,
  });

  await collectionStore.put({
    cardId: card.id,
    quantity: nextQuantity,
    updatedAt: timestamp,
  });

  await transaction.done;
}

export async function removeCollectionQuantity(
  cardId: number,
  quantity: number = 1,
): Promise<void> {
  validateCardId(cardId);
  validateQuantity(quantity);

  const database = await getDatabase();

  const transaction = database.transaction(
    "collection",
    "readwrite",
  );

  const store = transaction.objectStore("collection");
  const existing = await store.get(cardId);

  if (!existing) {
    await transaction.done;
    return;
  }

  const nextQuantity = existing.quantity - quantity;

  if (nextQuantity <= 0) {
    await store.delete(cardId);
  } else {
    await store.put({
      ...existing,
      quantity: nextQuantity,
      updatedAt: new Date().toISOString(),
    });
  }

  await transaction.done;
}

export async function clearPersistedCollection(): Promise<void> {
  const database = await getDatabase();

  await database.clear("collection");
}