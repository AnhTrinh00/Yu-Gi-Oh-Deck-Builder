import { describe, expect, it } from "vitest";

import type { Card } from "../../models/card/Card";

import {
  validateSummonRules,
} from "../simulation/summon/summonRulesService";

function card(
  id: number,
  type: string,
  overrides: Partial<Card> = {}
): Card {
  return {
    id,
    name: `Card ${id}`,
    type,
    frameType: "effect",
    description: "",
    race: "Dragon",
    imageUrl: "",
    imageUrlSmall: "",
    ...overrides,
  };
}

const tuner = card(100, "Tuner Monster", {
  level: 3,
});

const nonTuner = card(200, "Effect Monster", {
  level: 5,
});

const synchro = card(900, "Synchro Monster", {
  level: 8,
});

const xyz = card(901, "XYZ Monster", {
  level: 4,
});

const link = card(902, "Link Monster", {
  linkval: 4,
});

function material(
  instanceId: string,
  monster: Card
) {
  return {
    instanceId,
    card: monster,
  };
}

describe("summonRulesService", () => {
  it("accepts a valid Synchro combination", () => {
    const result = validateSummonRules({
      summonType: "synchro",
      summonedMonster: synchro,
      materials: [
        material("a", tuner),
        material("b", nonTuner),
      ],
    });

    expect(result.valid).toBe(true);
  });

  it("rejects incorrect Synchro Levels", () => {
    const result = validateSummonRules({
      summonType: "synchro",
      summonedMonster: synchro,
      materials: [
        material("a", tuner),
        material(
          "b",
          card(201, "Effect Monster", {
            level: 4,
          })
        ),
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(
      /Synchro Levels total/
    );
  });

  it("requires a Tuner for Synchro Summons", () => {
    const result = validateSummonRules({
      summonType: "synchro",
      summonedMonster: synchro,
      materials: [
        material(
          "a",
          card(101, "Effect Monster", {
            level: 3,
          })
        ),
        material("b", nonTuner),
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(
      /Tuner/
    );
  });

  it("accepts effective Level overrides", () => {
    const result = validateSummonRules({
      summonType: "synchro",
      summonedMonster: synchro,
      materials: [
        {
          ...material("a", tuner),
          effectiveLevel: 4,
        },
        {
          ...material("b", nonTuner),
          effectiveLevel: 4,
        },
      ],
    });

    expect(result.valid).toBe(true);
  });

  it("accepts matching Xyz Levels", () => {
    const level4 = card(300, "Effect Monster", {
      level: 4,
    });

    const result = validateSummonRules({
      summonType: "xyz",
      summonedMonster: xyz,
      materials: [
        material("a", level4),
        material("b", level4),
      ],
    });

    expect(result.valid).toBe(true);
  });

  it("rejects incorrect Xyz Levels", () => {
    const result = validateSummonRules({
      summonType: "xyz",
      summonedMonster: xyz,
      materials: [
        material("a", tuner),
        material("b", nonTuner),
      ],
    });

    expect(result.valid).toBe(false);
  });

  it("accepts four non-Link materials for Link-4", () => {
    const monster = card(400, "Effect Monster");

    const result = validateSummonRules({
      summonType: "link",
      summonedMonster: link,
      materials: [
        material("a", monster),
        material("b", monster),
        material("c", monster),
        material("d", monster),
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.linkContributions).toEqual([
      1, 1, 1, 1,
    ]);
  });

  it("accepts Link-3 plus one material for Link-4", () => {
    const link3 = card(401, "Link Monster", {
      linkval: 3,
    });

    const result = validateSummonRules({
      summonType: "link",
      summonedMonster: link,
      materials: [
        material("a", link3),
        material("b", nonTuner),
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.linkContributions).toEqual([
      3, 1,
    ]);
  });

  it("rejects insufficient Link contributions", () => {
    const result = validateSummonRules({
      summonType: "link",
      summonedMonster: link,
      materials: [
        material("a", tuner),
        material("b", nonTuner),
      ],
    });

    expect(result.valid).toBe(false);
  });

  it("rejects using the same physical copy twice", () => {
    const result = validateSummonRules({
      summonType: "synchro",
      summonedMonster: synchro,
      materials: [
        material("same", tuner),
        material("same", nonTuner),
      ],
    });

    expect(result.valid).toBe(false);
  });

  it("rejects Spell Cards as materials", () => {
    const spell = card(500, "Spell Card");

    const result = validateSummonRules({
      summonType: "link",
      summonedMonster: link,
      materials: [
        material("a", spell),
        material("b", nonTuner),
        material("c", tuner),
        material("d", nonTuner),
      ],
    });

    expect(result.valid).toBe(false);
  });
});