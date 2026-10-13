
import type { CardEffectDefinition } from "../../models/CardEffect";
import { CardEffectRegistry } from "./cardEffectRegistryService";
import { parseCardEffects } from "./definition/cardEffectSchemaService";

const STORAGE_KEY = "yugioh-card-effects-v1";

export function loadPersistedEffects(): CardEffectDefinition[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw === null) return [];

  return parseCardEffects(JSON.parse(raw));
}

export function savePersistedEffects(
  effects: CardEffectDefinition[]
): void {
  const validated = parseCardEffects(effects);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(validated)
  );
}

export function createPersistentEffectRegistry():
  CardEffectRegistry {
  const registry = new CardEffectRegistry();

  registry.registerEffects(loadPersistedEffects());

  return registry;
}

export function persistRegistry(
  registry: CardEffectRegistry
): void {
  savePersistedEffects(registry.getAllEffects());
}
