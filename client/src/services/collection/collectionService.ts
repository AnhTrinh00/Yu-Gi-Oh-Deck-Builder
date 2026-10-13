import type { Card } from "../../models/Card";
import type { CollectionCard } from "../../models/CollectionCard";

const STORAGE_KEY = "yugioh-collection";

let collection: CollectionCard[] = loadCollection();

function loadCollection(): CollectionCard[] {
  const storedCollection = localStorage.getItem(STORAGE_KEY);

  if (!storedCollection) {
    return [];
  }

  try {
    return JSON.parse(storedCollection) as CollectionCard[];
  } catch (error) {
    console.error("Failed to load collection:", error);
    return [];
  }
}

function saveCollection(): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(collection)
  );
}

export function getCollection(): CollectionCard[] {
  return collection;
}

export function addToCollection(
  card: Card,
  quantity: number = 1
): void {
  if (quantity <= 0) {
    return;
  }

  const existingCard = collection.find(
    (item) => item.card.id === card.id
  );

  if (existingCard) {
    existingCard.quantity += quantity;
  } else {
    collection.push({
      card,
      quantity,
    });
  }

  saveCollection();
}

export function removeFromCollection(
  cardId: number,
  quantity: number = 1
): void {
  if (quantity <= 0) {
    return;
  }

  const existingCard = collection.find(
    (item) => item.card.id === cardId
  );

  if (!existingCard) {
    return;
  }

  existingCard.quantity -= quantity;

  if (existingCard.quantity <= 0) {
    collection = collection.filter(
      (item) => item.card.id !== cardId
    );
  }

  saveCollection();
}

export function clearCollection(): void {
  collection = [];
  saveCollection();
}