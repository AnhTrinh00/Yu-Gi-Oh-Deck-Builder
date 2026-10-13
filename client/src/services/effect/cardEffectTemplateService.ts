import type {
  CardEffectDefinition,
  EffectCondition,
  EffectCost,
  EffectStep,
} from "../../models/CardEffect";
import { cardEffectSchema } from "../effect/definition/cardEffectSchemaService";
import { z } from "zod";

export interface CardEffectTemplate {
  id: string;
  name: string;
  description: string;
  effect: CardEffectDefinition;
}

const STORAGE_KEY = "yugioh-effect-templates-v1";

const templateSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500),
  effect: cardEffectSchema,
}).strict();

const templateListSchema = z.array(templateSchema).max(100);

function clone<T>(value: T): T {
  return structuredClone(value);
}

function effect(
  id: string,
  label: string,
  activationZone: CardEffectDefinition["activationZone"],
  conditions: EffectCondition[],
  costs: EffectCost[],
  steps: EffectStep[]
): CardEffectDefinition {
  return {
    id,
    sourceCardId: 1,
    label,
    activationZone,
    conditions,
    costs,
    steps,
    verification: "experimental",
  };
}

export const BUILT_IN_EFFECT_TEMPLATES: CardEffectTemplate[] = [
  {
    id: "preset-search",
    name: "Deck Searcher",
    description: "Search for a specified card from the Deck.",
    effect: effect(
      "preset-search-effect",
      "Search a card",
      "field",
      [{ type: "source-in-zone", zone: "field" }],
      [],
      [{ type: "search", cardId: 1 }]
    ),
  },
  {
    id: "preset-draw",
    name: "Draw Cards",
    description: "Draw a configurable number of cards.",
    effect: effect(
      "preset-draw-effect",
      "Draw cards",
      "hand",
      [{ type: "source-in-zone", zone: "hand" }],
      [],
      [{ type: "draw", count: 1 }]
    ),
  },
  {
    id: "preset-special-summon",
    name: "Special Summon from Hand",
    description: "Special Summon a specified card from the hand.",
    effect: effect(
      "preset-special-summon-effect",
      "Special Summon from hand",
      "field",
      [{ type: "source-in-zone", zone: "field" }],
      [],
      [{
        type: "special-summon",
        cardId: 1,
        from: "hand",
      }]
    ),
  },
  {
    id: "preset-revival",
    name: "Graveyard Revival",
    description: "Special Summon a specified card from the GY.",
    effect: effect(
      "preset-revival-effect",
      "Revive a monster",
      "field",
      [{ type: "source-in-zone", zone: "field" }],
      [],
      [{
        type: "special-summon",
        cardId: 1,
        from: "graveyard",
      }]
    ),
  },
  {
    id: "preset-discard-search",
    name: "Discard to Search",
    description: "Move a specified card from hand to GY as a cost, then search.",
    effect: effect(
      "preset-discard-search-effect",
      "Discard to search",
      "hand",
      [{ type: "source-in-zone", zone: "hand" }],
      [{
        type: "move-card",
        cardId: 1,
        from: "hand",
        to: "graveyard",
      }],
      [{ type: "search", cardId: 1 }]
    ),
  },
  {
    id: "preset-send-graveyard",
    name: "Send from Field to GY",
    description: "Move a specified card from field to graveyard.",
    effect: effect(
      "preset-send-graveyard-effect",
      "Send a card to graveyard",
      "field",
      [{ type: "source-in-zone", zone: "field" }],
      [],
      [{
        type: "move",
        cardId: 1,
        from: "field",
        to: "graveyard",
      }]
    ),
  },
];

export function getBuiltInTemplates(): CardEffectTemplate[] {
  return clone(BUILT_IN_EFFECT_TEMPLATES);
}

export function createEffectFromTemplate(
  template: CardEffectTemplate,
  sourceCardId: number,
  effectId: string
): CardEffectDefinition {
  templateSchema.parse(template);

  const draft: CardEffectDefinition = {
    ...clone(template.effect),
    id: effectId,
    sourceCardId,
    verification: "experimental",
  };

  return cardEffectSchema.parse(draft);
}

export function parseEffectTemplates(
  value: unknown
): CardEffectTemplate[] {
  const templates = templateListSchema.parse(value);
  const ids = new Set<string>();

  for (const template of templates) {
    if (ids.has(template.id)) {
      throw new Error(
        `Duplicate template ID: ${template.id}`
      );
    }

    ids.add(template.id);
  }

  return clone(templates);
}

export function loadCustomTemplates(): CardEffectTemplate[] {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === null) {
    return [];
  }

  return parseEffectTemplates(JSON.parse(stored));
}

export function saveCustomTemplates(
  templates: CardEffectTemplate[]
): void {
  const validated = parseEffectTemplates(templates);

  const builtInIds = new Set(
    BUILT_IN_EFFECT_TEMPLATES.map(item => item.id)
  );

  if (validated.some(item => builtInIds.has(item.id))) {
    throw new Error(
      "Custom templates cannot use built-in template IDs."
    );
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(validated)
  );
}

export function exportEffectTemplates(
  templates: CardEffectTemplate[]
): string {
  return JSON.stringify(
    parseEffectTemplates(templates),
    null,
    2
  );
}

export function importEffectTemplates(
  json: string,
  existing: CardEffectTemplate[]
): CardEffectTemplate[] {
  const incoming = parseEffectTemplates(JSON.parse(json));
  const current = parseEffectTemplates(existing);

  const reservedIds = new Set([
    ...BUILT_IN_EFFECT_TEMPLATES.map(item => item.id),
    ...current.map(item => item.id),
  ]);

  for (const template of incoming) {
    if (reservedIds.has(template.id)) {
      throw new Error(
        `Template ID already exists: ${template.id}`
      );
    }

    reservedIds.add(template.id);
  }

  return parseEffectTemplates([
    ...current,
    ...incoming,
  ]);
}