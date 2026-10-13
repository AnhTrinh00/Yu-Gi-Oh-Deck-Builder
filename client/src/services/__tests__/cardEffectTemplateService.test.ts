import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createEffectFromTemplate,
  exportEffectTemplates,
  getBuiltInTemplates,
  importEffectTemplates,
  loadCustomTemplates,
  parseEffectTemplates,
  saveCustomTemplates,
} from "../effect/cardEffectTemplateService";

import type {
  CardEffectTemplate,
} from "../effect/cardEffectTemplateService";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();

  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      memory.get(key) ?? null,

    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },

    removeItem: (key: string) => {
      memory.delete(key);
    },
  });
});

function sampleTemplate(): CardEffectTemplate {
  return {
    id: "custom-search",
    name: "Custom Searcher",
    description: "A sample search effect.",
    effect: createEffectFromTemplate(
      getBuiltInTemplates()[0],
      100,
      "custom-search-effect"
    ),
  };
}

describe("cardEffectTemplateService", () => {
  it("provides six valid built-in templates", () => {
    const templates = getBuiltInTemplates();

    expect(templates).toHaveLength(6);

    expect(() =>
      parseEffectTemplates(templates)
    ).not.toThrow();
  });

  it("creates an experimental effect for a card", () => {
    const template = getBuiltInTemplates()[0];

    const effect = createEffectFromTemplate(
      template,
      12345,
      "my-card-search"
    );

    expect(effect.sourceCardId).toBe(12345);
    expect(effect.id).toBe("my-card-search");
    expect(effect.verification).toBe("experimental");
    expect(effect.steps[0].type).toBe("search");
  });

  it("does not mutate a built-in template", () => {
    const template = getBuiltInTemplates()[0];

    const effect = createEffectFromTemplate(
      template,
      500,
      "effect-500"
    );

    effect.label = "Changed";

    expect(template.effect.label).not.toBe("Changed");
  });

  it("saves and restores custom templates", () => {
    const template = sampleTemplate();

    saveCustomTemplates([template]);

    expect(loadCustomTemplates()).toEqual([template]);
  });

  it("exports and imports templates", () => {
    const template = sampleTemplate();

    const json = exportEffectTemplates([template]);

    const imported = importEffectTemplates(json, []);

    expect(imported).toEqual([template]);
  });

  it("rejects duplicate template IDs", () => {
    const template = sampleTemplate();

    expect(() =>
      parseEffectTemplates([template, template])
    ).toThrow(/Duplicate template ID/);
  });

  it("rejects importing an existing template ID", () => {
    const template = sampleTemplate();

    expect(() =>
      importEffectTemplates(
        JSON.stringify([template]),
        [template]
      )
    ).toThrow(/already exists/);
  });

  it("rejects overwriting a built-in preset", () => {
    expect(() =>
      saveCustomTemplates([
        getBuiltInTemplates()[0],
      ])
    ).toThrow(/built-in/);
  });

  it("rejects invalid imported JSON", () => {
    expect(() =>
      importEffectTemplates("not-json", [])
    ).toThrow();
  });

  it("rejects invalid saved template data", () => {
    memory.set(
      "yugioh-effect-templates-v1",
      JSON.stringify([{ invalid: true }])
    );

    expect(() =>
      loadCustomTemplates()
    ).toThrow();
  });
});