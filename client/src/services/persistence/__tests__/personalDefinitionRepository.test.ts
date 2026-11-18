// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type { CardRelationship } from "../../../models/effect/CardRelationship";
import {
  getSavedCardEffects,
  getSavedCustomTemplates,
  getSavedRelationships,
  replaceSavedCardEffects,
  replaceSavedCustomTemplates,
  replaceSavedRelationships,
} from "../personalDefinitionRepository";
import "./testSetup";

const relationships: CardRelationship[] = [
  { sourceCardId: 1, targetCardId: 2, type: "searches" },
  { sourceCardId: 1, targetCardId: 2, type: "supports" },
];

describe("personal definition persistence", () => {
  it("preserves distinct relationship types and replaces atomically", async () => {
    await replaceSavedRelationships(relationships);
    expect(await getSavedRelationships()).toEqual(relationships);
    await replaceSavedRelationships([relationships[1]]);
    expect(await getSavedRelationships()).toEqual([relationships[1]]);
  });

  it("rejects duplicate relationships without replacing existing data", async () => {
    await replaceSavedRelationships(relationships);
    await expect(replaceSavedRelationships([relationships[0], relationships[0]]))
      .rejects.toThrow("Duplicate relationship");
    expect(await getSavedRelationships()).toEqual(relationships);
  });

  it("allows valid empty effect and custom-template sets", async () => {
    await replaceSavedCardEffects([]);
    await replaceSavedCustomTemplates([]);
    expect(await getSavedCardEffects()).toEqual([]);
    expect(await getSavedCustomTemplates()).toEqual([]);
  });
});
