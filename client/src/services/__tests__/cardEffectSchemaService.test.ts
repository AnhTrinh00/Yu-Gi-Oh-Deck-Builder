
import { describe, expect, it } from "vitest";
import type { CardEffectDefinition } from "../../models/CardEffect";
import { parseCardEffects } from "../cardEffectSchemaService";

function createEffect(
  id = "test-effect"
): CardEffectDefinition {
  return {
    id,
    sourceCardId: 100,
    label: "Test card effect",
    activationZone: "hand",
    conditions: [],
    costs: [],
    steps: [{ type: "draw", count: 1 }],
    verification: "manually-verified",
  };
}

describe("cardEffectSchemaService", () => {
  it("accepts a valid effect", () => {
    const effect = createEffect();

    expect(parseCardEffects([effect])).toEqual([effect]);
  });

  it("rejects duplicate effect IDs", () => {
    expect(() =>
      parseCardEffects([
        createEffect("duplicate"),
        createEffect("duplicate"),
      ])
    ).toThrow("Duplicate effect ID");
  });

  it("rejects invalid activation zones", () => {
    const effect = {
      ...createEffect(),
      activationZone: "unknown",
    };

    expect(() =>
      parseCardEffects([effect])
    ).toThrow();
  });

  it("rejects malformed effect steps", () => {
    const effect = {
      ...createEffect(),
      steps: [{ type: "draw", count: -1 }],
    };

    expect(() =>
      parseCardEffects([effect])
    ).toThrow();
  });

  it("rejects unsupported operations", () => {
    const effect = {
      ...createEffect(),
      steps: [{ type: "teleport", cardId: 100 }],
    };

    expect(() =>
      parseCardEffects([effect])
    ).toThrow();
  });

  it("rejects invalid card IDs", () => {
    const effect = {
      ...createEffect(),
      sourceCardId: -100,
    };

    expect(() =>
      parseCardEffects([effect])
    ).toThrow();
  });

  it("rejects invalid verification statuses", () => {
    const effect = {
      ...createEffect(),
      verification: "verified-by-ai",
    };

    expect(() =>
      parseCardEffects([effect])
    ).toThrow();
  });

  it("rejects non-array input", () => {
    expect(() =>
      parseCardEffects(createEffect())
    ).toThrow();
  });
});
