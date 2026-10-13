
import { describe, expect, it } from "vitest";

import type { GameState } from "../../models/simulation/GameState";

import { CardEffectRegistry } from "../effect/cardEffectRegistryService";

import {
  CARD_IDS,
  potOfGreedEffect,
  createFoolishBurialEffect,
  initializeCardEffectLibrary,
  registerFoolishBurialCandidate,
} from "../effect/definition/cardEffectLibraryService";

function createState(): GameState {
  return {
    zones: {
      hand: [
        CARD_IDS.POT_OF_GREED,
        CARD_IDS.FOOLISH_BURIAL,
      ],
      deck: [100, 200, 300],
      extra: [],
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  };
}

describe("cardEffectLibraryService", () => {
  it("defines Pot of Greed as a two-card draw", () => {
    expect(potOfGreedEffect.sourceCardId).toBe(
      CARD_IDS.POT_OF_GREED
    );

    expect(potOfGreedEffect.steps).toEqual([
      {
        type: "draw",
        count: 2,
      },
    ]);

    expect(potOfGreedEffect.verification).toBe(
      "experimental"
    );
  });

  it("registers initial effects", () => {
    const registry = new CardEffectRegistry();

    initializeCardEffectLibrary(registry);

    expect(
      registry.getEffectsForCard(CARD_IDS.POT_OF_GREED)
    ).toHaveLength(1);
  });

  it("does not duplicate effects during initialization", () => {
    const registry = new CardEffectRegistry();

    initializeCardEffectLibrary(registry);
    initializeCardEffectLibrary(registry);

    expect(registry.getEffectCount()).toBe(1);
  });

  it("creates a target-specific Foolish Burial candidate", () => {
    const effect = createFoolishBurialEffect(100);

    expect(effect.sourceCardId).toBe(
      CARD_IDS.FOOLISH_BURIAL
    );

    expect(effect.steps).toEqual([
      {
        type: "move",
        cardId: 100,
        from: "deck",
        to: "graveyard",
      },
    ]);
  });

  it("rejects invalid selected card IDs", () => {
    expect(() =>
      createFoolishBurialEffect(-1)
    ).toThrow("Invalid selected monster ID.");
  });

  it("registers a Foolish Burial candidate", () => {
    const registry = new CardEffectRegistry();

    registerFoolishBurialCandidate(100, registry);

    expect(
      registry.getEffectsForCard(CARD_IDS.FOOLISH_BURIAL)
    ).toHaveLength(1);
  });

  it("does not duplicate a target-specific candidate", () => {
    const registry = new CardEffectRegistry();

    registerFoolishBurialCandidate(100, registry);
    registerFoolishBurialCandidate(100, registry);

    expect(registry.getEffectCount()).toBe(1);
  });

  it("validates Pot of Greed's declared prerequisites", () => {
    const registry = new CardEffectRegistry();

    initializeCardEffectLibrary(registry);

    const result = registry.validateRegisteredEffect(
      createState(),
      "pot-of-greed-draw"
    );

    expect(result.found).toBe(true);
    expect(result.result?.valid).toBe(true);
    expect(result.result?.warnings.length).toBeGreaterThan(0);
  });

  it("rejects a Foolish Burial candidate with a missing target", () => {
    const registry = new CardEffectRegistry();

    const effect = registerFoolishBurialCandidate(
      999,
      registry
    );

    const result = registry.validateRegisteredEffect(
      createState(),
      effect.id
    );

    expect(result.result?.valid).toBe(false);
  });

  it("keeps effects for different target selections separate", () => {
    const registry = new CardEffectRegistry();

    registerFoolishBurialCandidate(100, registry);
    registerFoolishBurialCandidate(200, registry);

    expect(
      registry.getEffectsForCard(CARD_IDS.FOOLISH_BURIAL)
    ).toHaveLength(2);
  });
});
