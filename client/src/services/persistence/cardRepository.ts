import type { Card } from "../../models/card/Card";
import type { CachedCard } from "../../models/persistence/StoredRecords";

import { getDatabase } from "./indexedDbService";

export async function getCachedCard(
  cardId: number,
): Promise<Card | null> {
  const database = await getDatabase();
  const record = await database.get("cards", cardId);

  return record?.card ?? null;
}

export async function getCachedCards(
  cardIds: number[],
): Promise<Card[]> {
  const database = await getDatabase();

  const uniqueIds = [...new Set(cardIds)];

  const records = await Promise.all(
    uniqueIds.map((id) => database.get("cards", id)),
  );

  return records
    .filter(
      (record): record is CachedCard =>
        record !== undefined,
    )
    .map((record) => record.card);
}

export async function cacheCard(
  card: Card,
): Promise<void> {
  const database = await getDatabase();

  const record: CachedCard = {
    id: card.id,
    card,
    cachedAt: new Date().toISOString(),
  };

  await database.put("cards", record);
}

export async function cacheCards(
  cards: Card[],
): Promise<void> {
  const database = await getDatabase();

  const transaction = database.transaction(
    "cards",
    "readwrite",
  );

  const store = transaction.objectStore("cards");
  const timestamp = new Date().toISOString();

  for (const card of cards) {
    store.put({
      id: card.id,
      card,
      cachedAt: timestamp,
    });
  }

  await transaction.done;
}

export async function hasCachedCard(
  cardId: number,
): Promise<boolean> {
  const database = await getDatabase();

  const key = await database.getKey("cards", cardId);

  return key !== undefined;
}

export async function clearCardCache(): Promise<void> {
  const database = await getDatabase();

  await database.clear("cards");
}