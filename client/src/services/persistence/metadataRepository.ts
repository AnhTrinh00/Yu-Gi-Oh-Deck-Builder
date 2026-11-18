import { getDatabase } from "./indexedDbService";

export const METADATA_KEYS = {
  ACTIVE_DECK_ID: "activeDeckId",
  LOCAL_STORAGE_MIGRATION_VERSION:
    "localStorageMigrationVersion",
} as const;

export async function getMetadata<T>(
  key: string,
): Promise<T | null> {
  const database = await getDatabase();

  const record = await database.get("metadata", key);

  return record ? (record.value as T) : null;
}

export async function setMetadata(
  key: string,
  value: unknown,
): Promise<void> {
  if (!key.trim()) {
    throw new Error("Metadata key cannot be empty.");
  }

  const database = await getDatabase();

  await database.put("metadata", {
    key,
    value,
  });
}

export async function deleteMetadata(
  key: string,
): Promise<void> {
  const database = await getDatabase();

  await database.delete("metadata", key);
}

export async function getActiveDeckId(): Promise<
  string | null
> {
  const value = await getMetadata<unknown>(
    METADATA_KEYS.ACTIVE_DECK_ID,
  );

  return typeof value === "string" ? value : null;
}

export async function setActiveDeckId(
  deckId: string | null,
): Promise<void> {
  if (deckId === null) {
    await deleteMetadata(
      METADATA_KEYS.ACTIVE_DECK_ID,
    );
    return;
  }

  if (!deckId.trim()) {
    throw new Error("Active deck ID cannot be empty.");
  }

  await setMetadata(
    METADATA_KEYS.ACTIVE_DECK_ID,
    deckId,
  );
}