import type { CardEffectDefinition } from "../../models/effect/CardEffect";
import type { CardRelationship, CardRelationshipType } from "../../models/effect/CardRelationship";
import type { CardEffectTemplate } from "../effect/cardEffectTemplateService";
import { getBuiltInTemplates, parseEffectTemplates } from "../effect/cardEffectTemplateService";
import { parseCardEffects } from "../effect/definition/cardEffectSchemaService";
import { getDatabase } from "./indexedDbService";

const relationshipTypes = new Set<CardRelationshipType>([
  "searches", "summons", "supports", "requires", "enables",
  "extends", "negates", "destroys", "banishes",
]);

function relationshipKey(item: CardRelationship): string {
  return JSON.stringify([item.sourceCardId, item.targetCardId, item.type]);
}

function validateRelationships(value: unknown): CardRelationship[] {
  if (!Array.isArray(value)) {
    throw new Error("Relationship data must be an array.");
  }
  const keys = new Set<string>();
  for (const item of value as unknown[]) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error("Invalid relationship entry.");
    }
    const record = item as Record<string, unknown>;
    if (
      !Number.isSafeInteger(record.sourceCardId) ||
      !Number.isSafeInteger(record.targetCardId) ||
      (record.sourceCardId as number) <= 0 ||
      (record.targetCardId as number) <= 0 ||
      typeof record.type !== "string" ||
      !relationshipTypes.has(record.type as CardRelationshipType) ||
      (record.description !== undefined && typeof record.description !== "string")
    ) {
      throw new Error("Invalid relationship entry.");
    }
    const key = relationshipKey(record as unknown as CardRelationship);
    if (keys.has(key)) throw new Error("Duplicate relationship entry.");
    keys.add(key);
  }
  return value as CardRelationship[];
}

export async function getSavedCardEffects(): Promise<CardEffectDefinition[]> {
  const database = await getDatabase();
  const rows = await database.getAll("cardEffects");
  return parseCardEffects(rows.map((row) => row.data));
}

export async function replaceSavedCardEffects(
  effects: CardEffectDefinition[],
): Promise<void> {
  const validated = parseCardEffects(effects);
  const database = await getDatabase();
  const tx = database.transaction("cardEffects", "readwrite");
  const store = tx.objectStore("cardEffects");
  store.clear();
  for (const item of validated) store.put({ id: item.id, data: item });
  await tx.done;
}

export async function getSavedCustomTemplates(): Promise<CardEffectTemplate[]> {
  const database = await getDatabase();
  const rows = await database.getAll("effectTemplates");
  return parseEffectTemplates(rows.map((row) => row.data));
}

export async function replaceSavedCustomTemplates(
  templates: CardEffectTemplate[],
): Promise<void> {
  const validated = parseEffectTemplates(templates);
  const builtInIds = new Set(getBuiltInTemplates().map((item) => item.id));
  if (validated.some((item) => builtInIds.has(item.id))) {
    throw new Error("Custom template ID conflicts with a built-in preset.");
  }
  const database = await getDatabase();
  const tx = database.transaction("effectTemplates", "readwrite");
  const store = tx.objectStore("effectTemplates");
  store.clear();
  for (const item of validated) store.put({ id: item.id, data: item });
  await tx.done;
}

export async function getSavedRelationships(): Promise<CardRelationship[]> {
  const database = await getDatabase();
  const rows = await database.getAll("relationships");
  return validateRelationships(rows.map((row) => row.data));
}

export async function replaceSavedRelationships(
  relationships: CardRelationship[],
): Promise<void> {
  const validated = validateRelationships(relationships);
  const database = await getDatabase();
  const tx = database.transaction("relationships", "readwrite");
  const store = tx.objectStore("relationships");
  store.clear();
  for (const item of validated) {
    store.put({ id: relationshipKey(item), data: item });
  }
  await tx.done;
}
