
import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  CardEffectDefinition,
} from "../../models/effect/CardEffect";

import type {
  GameState,
} from "../../models/simulation/GameState";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  generateComboCandidates,
} from "../combo/comboCandidateGenerationService";

function createState(): GameState {
  return normalizeGameState({
    zones: {
      hand: [100, 200, 200],
      deck: [300, 400],
      extra: [],
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  });
}

function effect(
  id: string,
  overrides: Partial<CardEffectDefinition> = {}
): CardEffectDefinition {
  return {
    id,
    sourceCardId: 100,
    label: id,
    activationZone: "hand",
    conditions: [],
    costs: [],
    steps: [],
    verification: "manually-verified",
    ...overrides,
  };
}

function registry(
  ...effects: CardEffectDefinition[]
) {
  return {
    getAll: () => effects,
  };
}

describe("comboCandidateGenerationService", () => {
  it("generates a candidate for an available effect", () => {
    const result = generateComboCandidates(
      createState(),
      registry(effect("effect-a"))
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].effectId).toBe(
      "effect-a"
    );
  });

  it("rejects effects whose source is unavailable", () => {
    const result = generateComboCandidates(
      createState(),
      registry(
        effect("effect-a", {
          sourceCardId: 999,
        })
      )
    );

    expect(result.candidates).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
  });

  it("rejects already-used effects", () => {
    const state = createState();
    state.usedEffects.push("once-key");

    const result = generateComboCandidates(
      state,
      registry(
        effect("effect-a", {
          oncePerTurnKey: "once-key",
        })
      )
    );

    expect(result.candidates).toHaveLength(0);
  });

  it("rejects ambiguous duplicate-card costs", () => {
    const result = generateComboCandidates(
      createState(),
      registry(
        effect("effect-a", {
          costs: [
            {
              type: "move-card",
              cardId: 200,
              from: "hand",
              to: "graveyard",
            },
          ],
        })
      )
    );

    expect(result.candidates).toHaveLength(0);
    expect(result.rejected[0].reason).toContain(
      "selection"
    );
  });

  it("rejects ambiguous duplicate-card searches", () => {
    const state = createState();
    state.zones.deck.push(300);

    const result = generateComboCandidates(
      state,
      registry(
        effect("effect-a", {
          steps: [
            {
              type: "search",
              cardId: 300,
            },
          ],
        })
      )
    );

    expect(result.candidates).toHaveLength(0);
  });

  it("excludes experimental effects by default", () => {
    const result = generateComboCandidates(
      createState(),
      registry(
        effect("effect-a", {
          verification: "experimental",
        })
      )
    );

    expect(result.candidates).toHaveLength(0);
  });

  it("can include experimental effects", () => {
    const result = generateComboCandidates(
      createState(),
      registry(
        effect("effect-a", {
          verification: "experimental",
        })
      ),
      { includeExperimental: true }
    );

    expect(result.candidates).toHaveLength(1);
  });

  it("sorts candidates deterministically", () => {
    const result = generateComboCandidates(
      createState(),
      registry(
        effect("effect-z"),
        effect("effect-a")
      )
    );

    expect(
      result.candidates.map(c => c.effectId)
    ).toEqual(["effect-a", "effect-z"]);
  });

  it("respects the candidate limit", () => {
    const result = generateComboCandidates(
      createState(),
      registry(
        effect("effect-a"),
        effect("effect-b"),
        effect("effect-c")
      ),
      { maxCandidates: 2 }
    );

    expect(result.candidates).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });

  it("does not mutate the original state", () => {
    const state = createState();

    generateComboCandidates(
      state,
      registry(effect("effect-a"))
    );

    expect(state.zones.hand).toEqual([
      100,
      200,
      200,
    ]);
  });
});
