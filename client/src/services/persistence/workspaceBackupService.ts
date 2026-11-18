import type { Card } from "../../models/card/Card";
import type { Combo } from "../../models/combo/Combo";
import type { StoredDeck, CachedCard, StoredCollectionCard, StorageMetadata } from "../../models/persistence/StoredRecords";
import type { CardEffectDefinition } from "../../models/effect/CardEffect";
import type { CardRelationship } from "../../models/effect/CardRelationship";
import type { CardEffectTemplate } from "../effect/cardEffectTemplateService";
import { getBuiltInTemplates, parseEffectTemplates } from "../effect/cardEffectTemplateService";
import { parseCardEffects } from "../effect/definition/cardEffectSchemaService";
import { getDatabase } from "./indexedDbService";
import { waitForPersonalWrites } from "./personalWriteQueue";

const FORMAT = "yugioh-deck-builder-backup";
const VERSION = 1;
const STORE_NAMES = [
  "cards", "collection", "decks", "combos", "metadata",
  "cardEffects", "effectTemplates", "relationships",
] as const;

type DataRows = {
  cards: CachedCard[];
  collection: StoredCollectionCard[];
  decks: StoredDeck[];
  combos: Combo[];
  metadata: StorageMetadata[];
  cardEffects: { id: string; data: CardEffectDefinition }[];
  effectTemplates: { id: string; data: CardEffectTemplate }[];
  relationships: { id: string; data: CardRelationship }[];
};

export interface WorkspaceBackup {
  format: typeof FORMAT;
  version: typeof VERSION;
  exportedAt: string;
  records: DataRows;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function id(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function text(value: unknown): value is string {
  return typeof value === "string";
}
function nonempty(value: unknown): value is string {
  return text(value) && value.trim().length > 0;
}
function isCard(value: unknown): value is Card {
  return record(value) && id(value.id) && text(value.name) && text(value.type) &&
    text(value.frameType) && text(value.description) && text(value.race) &&
    text(value.imageUrl) && text(value.imageUrlSmall);
}
function isCachedCard(value: unknown): value is CachedCard {
  return record(value) && id(value.id) && isCard(value.card) &&
    value.card.id === value.id && text(value.cachedAt);
}
function isCollection(value: unknown): value is StoredCollectionCard {
  return record(value) && id(value.cardId) && id(value.quantity) && text(value.updatedAt);
}
function isDeckPart(value: unknown): boolean {
  return Array.isArray(value) && value.every(entry => record(entry) && id(entry.cardId) && id(entry.quantity)) &&
    new Set(value.map(entry => entry.cardId as number)).size === value.length;
}
function isDeck(value: unknown): value is StoredDeck {
  return record(value) && nonempty(value.id) && nonempty(value.name) &&
    isDeckPart(value.main) && isDeckPart(value.extra) && isDeckPart(value.side) &&
    text(value.createdAt) && text(value.updatedAt);
}
function isCombo(value: unknown): value is Combo {
  if (!record(value) || !nonempty(value.id) || !nonempty(value.name) ||
      !text(value.description) || !text(value.createdAt) || !text(value.updatedAt) ||
      !Array.isArray(value.starters) || !Array.isArray(value.requirements) ||
      !Array.isArray(value.steps) || !Array.isArray(value.endBoardCardIds)) return false;
  const requirement = (entry: unknown): boolean => record(entry) && id(entry.cardId) &&
    id(entry.quantity) && typeof entry.zone === "string" &&
    ["hand", "deck", "field", "graveyard", "banished", "extra"].includes(entry.zone);
  return value.starters.every(requirement) && value.requirements.every(requirement) &&
    value.endBoardCardIds.every(id) && value.steps.every((entry: unknown) =>
      record(entry) && nonempty(entry.id) && Number.isSafeInteger(entry.order) &&
      (entry.order as number) >= 0 && id(entry.cardId) && text(entry.description) &&
      typeof entry.action === "string" && ["normal-summon", "special-summon", "activate-effect",
        "search", "send-to-graveyard", "add-to-hand", "banish", "set-card", "other"].includes(entry.action));
}
function isMetadata(value: unknown): value is StorageMetadata {
  return record(value) && nonempty(value.key) && Object.hasOwn(value, "value");
}
function isRelationship(value: unknown): value is CardRelationship {
  return record(value) && id(value.sourceCardId) && id(value.targetCardId) &&
    typeof value.type === "string" &&
    ["searches", "summons", "supports", "requires", "enables", "extends",
      "negates", "destroys", "banishes"].includes(value.type) &&
    (value.description === undefined || text(value.description));
}
function checkedList<T>(value: unknown, name: string, guard: (value: unknown) => value is T,
  key: (entry: T) => string): T[] {
  if (!Array.isArray(value) || value.length > 100_000 || !value.every(guard)) {
    throw new Error(`Backup contains invalid ${name}.`);
  }
  const keys = value.map(key);
  if (new Set(keys).size !== keys.length) throw new Error(`Backup contains duplicate ${name}.`);
  return value;
}
export function parseWorkspaceBackup(json: string): WorkspaceBackup {
  if (json.length > 50_000_000) throw new Error("Backup exceeds the 50 MB JSON limit.");
  const value: unknown = JSON.parse(json);
  if (!record(value) || value.format !== FORMAT || value.version !== VERSION ||
      !text(value.exportedAt) || !record(value.records)) {
    throw new Error("Unsupported or malformed workspace backup.");
  }
  const r = value.records;
  const cards = checkedList(r.cards, "cards", isCachedCard, item => String(item.id));
  const collection = checkedList(r.collection, "collection", isCollection, item => String(item.cardId));
  const decks = checkedList(r.decks, "decks", isDeck, item => item.id);
  const combos = checkedList(r.combos, "combos", isCombo, item => item.id);
  const metadata = checkedList(r.metadata, "metadata", isMetadata, item => item.key);
  const effectRows = checkedList(r.cardEffects, "cardEffects",
    (row: unknown): row is { id: string; data: CardEffectDefinition } => record(row) && nonempty(row.id) && record(row.data) && row.data.id === row.id,
    item => item.id);
  const templateRows = checkedList(r.effectTemplates, "effectTemplates",
    (row: unknown): row is { id: string; data: CardEffectTemplate } => record(row) && nonempty(row.id) && record(row.data) && row.data.id === row.id,
    item => item.id);
  const relationshipRows = checkedList(r.relationships, "relationships",
    (row: unknown): row is { id: string; data: CardRelationship } => record(row) && nonempty(row.id) && isRelationship(row.data) &&
      row.id === JSON.stringify([row.data.sourceCardId, row.data.targetCardId, row.data.type]),
    item => item.id);

  // Apply the same domain validations as normal effect/template persistence.
  parseCardEffects(effectRows.map(row => row.data));
  parseEffectTemplates(templateRows.map(row => row.data));
  const reserved = new Set(getBuiltInTemplates().map(item => item.id));
  if (templateRows.some(row => reserved.has(row.id))) throw new Error("Backup replaces a built-in template ID.");

  if (decks.length === 0) throw new Error("Backup must contain at least one saved deck.");
  const cacheIds = new Set(cards.map(item => item.id));
  if (collection.some(item => !cacheIds.has(item.cardId)) || decks.some(deck =>
    [...deck.main, ...deck.extra, ...deck.side].some(entry => !cacheIds.has(entry.cardId)))) {
    throw new Error("Backup has collection or deck entries without cached cards.");
  }
  const active = metadata.find(row => row.key === "activeDeckId")?.value;
  if (!text(active) || !decks.some(deck => deck.id === active)) {
    throw new Error("Backup active deck is missing or invalid.");
  }
  // Preserve legacy data in localStorage after restore: explicitly mark both
  // migrations as complete to prevent old browser data replacing restored data.
  const protectedMetadata = metadata.filter(item => item.key !== "legacyDeckMigrationVersion" &&
    item.key !== "localStorageMigrationVersion");
  protectedMetadata.push({ key: "legacyDeckMigrationVersion", value: 1 });
  protectedMetadata.push({ key: "localStorageMigrationVersion", value: 1 });

  return {
    format: FORMAT, version: VERSION, exportedAt: value.exportedAt,
    records: { cards, collection, decks, combos, metadata: protectedMetadata,
      cardEffects: effectRows, effectTemplates: templateRows, relationships: relationshipRows },
  };
}

export async function exportWorkspaceBackup(): Promise<string> {
  await waitForPersonalWrites();
  const database = await getDatabase();
  const tx = database.transaction(STORE_NAMES, "readonly");
  const requests = [
    tx.objectStore("cards").getAll(), tx.objectStore("collection").getAll(),
    tx.objectStore("decks").getAll(), tx.objectStore("combos").getAll(),
    tx.objectStore("metadata").getAll(), tx.objectStore("cardEffects").getAll(),
    tx.objectStore("effectTemplates").getAll(), tx.objectStore("relationships").getAll(),
  ] as const;
  const [cards, collection, decks, combos, metadata, cardEffects, effectTemplates, relationships] =
    await Promise.all(requests);
  await tx.done;
  const snapshot: WorkspaceBackup = { format: FORMAT, version: VERSION,
    exportedAt: new Date().toISOString(),
    records: {
      cards, collection, decks, combos, metadata,
      cardEffects: cardEffects as DataRows["cardEffects"],
      effectTemplates: effectTemplates as DataRows["effectTemplates"],
      relationships: relationships as DataRows["relationships"],
    },
  };
  return JSON.stringify(snapshot, null, 2);
}

/**
 * Atomically replace all personal IndexedDB stores. The application must
 * reload after success so in-memory controllers stop using the old state.
 * Call only after confirmation and flushing queued deck/personal writes.
 */
export async function restoreWorkspaceBackup(json: string): Promise<void> {
  const backup = parseWorkspaceBackup(json);
  await waitForPersonalWrites();
  const database = await getDatabase();
  const tx = database.transaction(STORE_NAMES, "readwrite");
  for (const name of STORE_NAMES) tx.objectStore(name).clear();
  const r = backup.records;
  for (const item of r.cards) tx.objectStore("cards").put(item);
  for (const item of r.collection) tx.objectStore("collection").put(item);
  for (const item of r.decks) tx.objectStore("decks").put(item);
  for (const item of r.combos) tx.objectStore("combos").put(item);
  for (const item of r.metadata) tx.objectStore("metadata").put(item);
  for (const item of r.cardEffects) tx.objectStore("cardEffects").put(item);
  for (const item of r.effectTemplates) tx.objectStore("effectTemplates").put(item);
  for (const item of r.relationships) tx.objectStore("relationships").put(item);
  await tx.done;
}
