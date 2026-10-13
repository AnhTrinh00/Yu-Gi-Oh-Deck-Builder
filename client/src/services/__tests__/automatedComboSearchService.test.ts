
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
  initializeCardInstances,
} from "../simulation/cardInstanceService";

import {
  discoverCombos,
} from "../combo/discovery/automatedComboSearchService";

import {
  generateSelectionBranches,
} from "../combo/discovery/comboSelectionBranchService";

import {
  getComboStateFingerprint,
} from "../combo/discovery/comboStateFingerprintService";

function createState(): GameState {
  const base = normalizeGameState({
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

  const initialized = initializeCardInstances(base);

  if (!initialized.success) {
    throw new Error(
      initialized.error ?? "Initialization failed."
    );
  }

  return initialized.state;
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
  const map = new Map(
    effects.map(item => [item.id, item])
  );

  return {
    get: (id: string) => map.get(id),
    getAll: () => [...map.values()],
  };
}

describe("automatedComboSearchService", () => {
  it("discovers a single effect", () => {
    const result = discoverCombos(
      createState(),
      registry(
        effect("search-300", {
          steps: [
            { type: "search", cardId: 300 },
          ],
        })
      )
    );

    expect(result.combos).toHaveLength(1);
    expect(result.combos[0].depth).toBe(1);
    expect(
      result.combos[0].finalState.zones.hand
    ).toContain(300);
  });

  it("discovers a two-effect combo", () => {
    const result = discoverCombos(
      createState(),
      registry(
        effect("first", {
          steps: [
            { type: "search", cardId: 300 },
          ],
          oncePerTurnKey: "first-used",
        }),
        effect("second", {
          sourceCardId: 300,
          steps: [
            { type: "draw", count: 1 },
          ],
          oncePerTurnKey: "second-used",
        })
      ),
      { maxDepth: 2 }
    );

    expect(
      result.combos.some(
        combo =>
          combo.actions.map(a => a.effectId)
            .join(",") === "first,second"
      )
    ).toBe(true);
  });

  it("branches for duplicate card instances", () => {
    const state = createState();

    const definition = effect("discard", {
      costs: [
        {
          type: "move-card",
          cardId: 200,
          from: "hand",
          to: "graveyard",
        },
      ],
    });

    const branches = generateSelectionBranches(
      state,
      definition
    );

    expect(branches).toHaveLength(2);

    const selectedIds = branches.map(
      branch =>
        branch.costSelections[0].instanceId
    );

    expect(new Set(selectedIds).size).toBe(2);
  });

  it("discovers different physical-copy branches", () => {
    const result = discoverCombos(
      createState(),
      registry(
        effect("discard", {
          costs: [
            {
              type: "move-card",
              cardId: 200,
              from: "hand",
              to: "graveyard",
            },
          ],
          oncePerTurnKey: "discard-used",
        })
      ),
      { maxDepth: 1 }
    );

    expect(result.combos).toHaveLength(2);
  });

  it("prevents revisiting identical states", () => {
    const result = discoverCombos(
      createState(),
      registry(
        effect("empty-effect")
      ),
      { maxDepth: 4 }
    );

    expect(result.stats.exploredNodes).toBe(1);
    expect(result.combos).toHaveLength(0);
    expect(result.stats.duplicateStates).toBeGreaterThan(0);
  });

  it("respects the maximum search depth", () => {
    const result = discoverCombos(
      createState(),
      registry(
        effect("first", {
          steps: [
            { type: "search", cardId: 300 },
          ],
        }),
        effect("second", {
          sourceCardId: 300,
          steps: [
            { type: "draw", count: 1 },
          ],
        })
      ),
      { maxDepth: 1 }
    );

    expect(
      result.combos.every(
        combo => combo.depth <= 1
      )
    ).toBe(true);
  });

  it("respects the maximum result count", () => {
    const result = discoverCombos(
      createState(),
      registry(
        effect("first", {
          steps: [
            { type: "search", cardId: 300 },
          ],
        }),
        effect("second", {
          steps: [
            { type: "search", cardId: 400 },
          ],
        })
      ),
      { maxResults: 1 }
    );

    expect(result.combos).toHaveLength(1);
    expect(result.stats.truncated).toBe(true);
  });

  it("rejects states without card-instance tracking", () => {
    const state = createState();

    state.cardInstances = undefined;

    const result = discoverCombos(
      state,
      registry(effect("test"))
    );

    expect(result.combos).toHaveLength(0);
    expect(
      result.warnings.join(" ")
    ).toContain("Card-instance tracking");
  });

  it("produces deterministic fingerprints", () => {
    const state = createState();

    expect(
      getComboStateFingerprint(state)
    ).toBe(
      getComboStateFingerprint(
        structuredClone(state)
      )
    );
  });

  it("does not mutate the initial game state", () => {
    const state = createState();

    const original = structuredClone(state);

    discoverCombos(
      state,
      registry(
        effect("search", {
          steps: [
            { type: "search", cardId: 300 },
          ],
        })
      )
    );

    expect(state).toEqual(original);
  });
});
