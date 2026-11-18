import type { Card } from "../../models/card/Card";
import type { CollectionCard } from "../../models/card/CollectionCard";
import type { Combo, ComboCardRequirement, ComboStep } from "../../models/combo/Combo";
import type { CardRelationship, CardRelationshipType } from "../../models/effect/CardRelationship";
import type { CardEffectDefinition } from "../../models/effect/CardEffect";
import type { CardEffectTemplate } from "../effect/cardEffectTemplateService";
import { getBuiltInTemplates, parseEffectTemplates } from "../effect/cardEffectTemplateService";
import { parseCardEffects } from "../effect/definition/cardEffectSchemaService";
import { getDatabase } from "./indexedDbService";
import { METADATA_KEYS } from "./metadataRepository";

const VERSION = 1;

const KEYS = {
  collection: "yugioh-collection",
  combos: "yugioh-combos-v1",
  effects: "yugioh-card-effects-v1",
  templates: "yugioh-effect-templates-v1",
  relationships: "yugioh-card-relationships",
} as const;

const relationshipTypes = new Set<CardRelationshipType>([
  "searches", "summons", "supports", "requires", "enables",
  "extends", "negates", "destroys", "banishes",
]);

const comboZones = new Set([
  "hand", "deck", "field", "graveyard", "banished", "extra",
]);
const comboActions = new Set([
  "normal-summon", "special-summon", "activate-effect", "search",
  "send-to-graveyard", "add-to-hand", "banish", "set-card", "other",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isCard(value: unknown): value is Card {
  return isRecord(value)
    && isPositiveId(value.id)
    && typeof value.name === "string"
    && typeof value.type === "string"
    && typeof value.frameType === "string"
    && typeof value.description === "string"
    && typeof value.race === "string"
    && typeof value.imageUrl === "string"
    && typeof value.imageUrlSmall === "string";
}

function isRequirement(value: unknown): value is ComboCardRequirement {
  return isRecord(value)
    && isPositiveId(value.cardId)
    && isPositiveId(value.quantity)
    && typeof value.zone === "string"
    && comboZones.has(value.zone);
}

function isStep(value: unknown): value is ComboStep {
  return isRecord(value)
    && typeof value.id === "string" && value.id.length > 0
    && typeof value.order === "number" && Number.isSafeInteger(value.order)
    && value.order >= 0
    && isPositiveId(value.cardId)
    && typeof value.action === "string" && comboActions.has(value.action)
    && typeof value.description === "string";
}

function isCombo(value: unknown): value is Combo {
  return isRecord(value)
    && typeof value.id === "string" && value.id.trim().length > 0
    && typeof value.name === "string" && value.name.trim().length > 0
    && typeof value.description === "string"
    && Array.isArray(value.starters) && value.starters.every(isRequirement)
    && Array.isArray(value.requirements) && value.requirements.every(isRequirement)
    && Array.isArray(value.steps) && value.steps.every(isStep)
    && Array.isArray(value.endBoardCardIds) && value.endBoardCardIds.every(isPositiveId)
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string";
}

function isRelationship(value: unknown): value is CardRelationship {
  return isRecord(value)
    && isPositiveId(value.sourceCardId)
    && isPositiveId(value.targetCardId)
    && typeof value.type === "string"
    && relationshipTypes.has(value.type as CardRelationshipType)
    && (value.description === undefined || typeof value.description === "string");
}

function read(key: string): unknown | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Cannot migrate invalid JSON in ${key}; the original value was kept.`);
  }
}

function validatedList<T>(
  key: string,
  parsed: unknown | null,
  guard: (value: unknown) => value is T,
  identity: (value: T) => string,
): T[] | null {
  if (parsed === null) return null;
  if (!Array.isArray(parsed) || !parsed.every(guard)) {
    throw new Error(`Cannot migrate invalid entries in ${key}; the original value was kept.`);
  }
  const ids = parsed.map(identity);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Cannot migrate duplicate IDs in ${key}; the original value was kept.`);
  }
  return parsed;
}

interface LegacyData {
  collection: CollectionCard[] | null;
  combos: Combo[] | null;
  effects: CardEffectDefinition[] | null;
  templates: CardEffectTemplate[] | null;
  relationships: CardRelationship[] | null;
}

function readLegacyData(): LegacyData {
  const collection = validatedList(
    KEYS.collection, read(KEYS.collection),
    (value: unknown): value is CollectionCard => isRecord(value)
      && isCard(value.card) && isPositiveId(value.quantity),
    (item) => String(item.card.id),
  );
  const combos = validatedList(KEYS.combos, read(KEYS.combos), isCombo, (item) => item.id);
  const relationshipId = (item: CardRelationship) =>
    JSON.stringify([item.sourceCardId, item.targetCardId, item.type]);
  const relationships = validatedList(
    KEYS.relationships, read(KEYS.relationships), isRelationship, relationshipId,
  );

  const rawEffects = read(KEYS.effects);
  const effects = rawEffects === null ? null : parseCardEffects(rawEffects);
  const rawTemplates = read(KEYS.templates);
  const templates = rawTemplates === null ? null : parseEffectTemplates(rawTemplates);

  if (templates) {
    const builtIns = new Set(getBuiltInTemplates().map((item) => item.id));
    if (templates.some((item) => builtIns.has(item.id))) {
      throw new Error("Legacy custom templates overlap with built-in template IDs.");
    }
  }

  return { collection, combos, effects, templates, relationships };
}

/**
 * Copies legacy personal data into empty IndexedDB stores exactly once.
 * This deliberately does not delete or modify any localStorage keys.
 * Validation takes place before the write transaction starts.
 */
export async function migrateLegacyUserData(): Promise<"migrated" | "already-migrated"> {
  const database = await getDatabase();
  const marker = await database.get("metadata", METADATA_KEYS.LOCAL_STORAGE_MIGRATION_VERSION);
  if (marker?.value === VERSION) return "already-migrated";

  const data = readLegacyData();
  const tx = database.transaction(
    ["cards", "collection", "combos", "cardEffects", "effectTemplates", "relationships", "metadata"],
    "readwrite",
  );
  const collectionStore = tx.objectStore("collection");
  const comboStore = tx.objectStore("combos");
  const effectStore = tx.objectStore("cardEffects");
  const templateStore = tx.objectStore("effectTemplates");
  const relationshipStore = tx.objectStore("relationships");
  const [collectionCount, comboCount, effectCount, templateCount, relationshipCount] =
    await Promise.all([
      collectionStore.count(), comboStore.count(), effectStore.count(),
      templateStore.count(), relationshipStore.count(),
    ]);

  const now = new Date().toISOString();
  if (collectionCount === 0 && data.collection) {
    const cardStore = tx.objectStore("cards");
    for (const item of data.collection) {
      cardStore.put({ id: item.card.id, card: item.card, cachedAt: now });
      collectionStore.put({ cardId: item.card.id, quantity: item.quantity, updatedAt: now });
    }
  }
  if (comboCount === 0 && data.combos) {
    for (const item of data.combos) comboStore.put(item);
  }
  if (effectCount === 0 && data.effects) {
    for (const item of data.effects) effectStore.put({ id: item.id, data: item });
  }
  if (templateCount === 0 && data.templates) {
    for (const item of data.templates) templateStore.put({ id: item.id, data: item });
  }
  if (relationshipCount === 0 && data.relationships) {
    for (const item of data.relationships) {
      const id = JSON.stringify([item.sourceCardId, item.targetCardId, item.type]);
      relationshipStore.put({ id, data: item });
    }
  }
  tx.objectStore("metadata").put({
    key: METADATA_KEYS.LOCAL_STORAGE_MIGRATION_VERSION,
    value: VERSION,
  });

  await tx.done;
  return "migrated";
}
