
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createDuelRulesState,
  type RuleCard,
} from "../../models/simulation/DuelRules";

import {
  validateActivation,
} from "../simulation/duel/duelActivationRulesService";

import {
  executeSummon,
  validateSummon,
} from "../simulation/duel/duelSummoningRulesService";

import {
  validateTargets,
} from "../simulation/duel/duelTargetingRulesService";

import {
  addChainLink,
  passChainPriority,
  negateChainLink,
  resolveChainOrder,
} from "../simulation/duel/duelChainRulesService";

import {
  validateEffectLegality,
} from "../simulation/duel/duelRulesEngineService";

function card(
  instanceId: string,
  zone: RuleCard["zone"],
  level = 4
): RuleCard {
  return {
    instanceId,
    cardId: Number(instanceId.replace(/\D/g, "")),
    owner: "player",
    controller: "player",
    zone,
    faceUp: zone === "monster",
    level,
    canBeTargeted: true,
    unaffectedByEffects: false,
  };
}

function activation(
  sourceInstanceId = "card-1"
) {
  return {
    effectId: "test-effect",
    sourceInstanceId,
    player: "player" as const,
    speed: 1 as const,
    allowedPhases: ["main1" as const],
    allowedSourceZones: ["hand" as const],
    requiresOwnTurn: true,
  };
}

describe("Phase 4.4 rules engine", () => {
  it("accepts a legal activation", () => {
    const state = createDuelRulesState([
      card("card-1", "hand"),
    ]);

    expect(
      validateActivation(state, activation()).legal
    ).toBe(true);
  });

  it("rejects the wrong activation phase", () => {
    const state = createDuelRulesState([
      card("card-1", "hand"),
    ]);

    state.phase = "battle";

    expect(
      validateActivation(state, activation()).legal
    ).toBe(false);
  });

  it("rejects a previously used effect", () => {
    const state = createDuelRulesState([
      card("card-1", "hand"),
    ]);

    state.usedEffectKeys.push("once-key");

    expect(
      validateActivation(state, {
        ...activation(),
        usageKey: "once-key",
      }).legal
    ).toBe(false);
  });

  it("executes a legal Normal Summon", () => {
    const state = createDuelRulesState([
      card("card-1", "hand", 4),
    ]);

    const result = executeSummon(state, {
      player: "player",
      instanceId: "card-1",
      kind: "normal",
      from: "hand",
      position: "face-up-attack",
    });

    expect(result.legal).toBe(true);
    expect(result.state.cards[0].zone).toBe("monster");
    expect(
      result.state.normalSummonsUsed.player
    ).toBe(1);
    expect(state.cards[0].zone).toBe("hand");
  });

  it("requires tributes for Level 7 monsters", () => {
    const state = createDuelRulesState([
      card("card-1", "hand", 7),
    ]);

    const check = validateSummon(state, {
      player: "player",
      instanceId: "card-1",
      kind: "normal",
      from: "hand",
      position: "face-up-attack",
    });

    expect(check.legal).toBe(false);
  });

  it("moves tributes to the Graveyard", () => {
    const state = createDuelRulesState([
      card("card-1", "hand", 5),
      card("card-2", "monster", 4),
    ]);

    const result = executeSummon(state, {
      player: "player",
      instanceId: "card-1",
      kind: "normal",
      from: "hand",
      position: "face-up-attack",
      tributeInstanceIds: ["card-2"],
    });

    expect(result.legal).toBe(true);
    expect(result.state.cards[1].zone).toBe("graveyard");
  });

  it("rejects unverified Special Summons", () => {
    const state = createDuelRulesState([
      card("card-1", "hand"),
    ]);

    expect(
      validateSummon(state, {
        player: "player",
        instanceId: "card-1",
        kind: "special",
        from: "hand",
        position: "face-up-attack",
      }).legal
    ).toBe(false);
  });

  it("rejects targeting protected cards", () => {
    const protectedCard = card("card-2", "monster");
    protectedCard.canBeTargeted = false;

    const state = createDuelRulesState([
      protectedCard,
    ]);

    const check = validateTargets(
      state,
      ["card-2"],
      {
        player: "player",
        minimum: 1,
        maximum: 1,
        allowedZones: ["monster"],
      }
    );

    expect(check.legal).toBe(false);
  });

  it("rejects duplicate targets", () => {
    const state = createDuelRulesState([
      card("card-2", "monster"),
    ]);

    expect(
      validateTargets(
        state,
        ["card-2", "card-2"],
        {
          player: "player",
          minimum: 2,
          maximum: 2,
          allowedZones: ["monster"],
        }
      ).legal
    ).toBe(false);
  });

  it("validates activation and targets together", () => {
    const state = createDuelRulesState([
      card("card-1", "hand"),
      card("card-2", "monster"),
    ]);

    const check = validateEffectLegality(
      state,
      {
        activation: activation(),
        targets: {
          instanceIds: ["card-2"],
          rule: {
            player: "player",
            minimum: 1,
            maximum: 1,
            allowedZones: ["monster"],
          },
        },
      }
    );

    expect(check.legal).toBe(true);
  });

  it("rejects Spell Speed 1 chain responses", () => {
    const state = createDuelRulesState([
      card("card-1", "hand"),
    ]);

    state.chain.push({
      id: "existing",
      effectId: "other-effect",
      player: "opponent",
      speed: 2,
      sourceInstanceId: "other",
      targetInstanceIds: [],
      negated: false,
    });

    expect(
      validateActivation(state, activation()).legal
    ).toBe(false);
  });

  it("adds and resolves a chain link", () => {
    const state = createDuelRulesState([
      card("card-1", "hand"),
    ]);

    const added = addChainLink(
      state,
      activation()
    );

    expect(added.legal).toBe(true);
    expect(added.state.chain).toHaveLength(1);

    const pass1 = passChainPriority(
      added.state,
      "opponent"
    );

    const pass2 = passChainPriority(
      pass1.state,
      "player"
    );

    const resolution = resolveChainOrder(
      pass2.state
    );

    expect(resolution.resolved).toHaveLength(1);
    expect(resolution.state.chain).toHaveLength(0);
  });

  it("marks negated chain links as skipped", () => {
    const state = createDuelRulesState([
      card("card-1", "hand"),
    ]);

    const added = addChainLink(
      state,
      activation()
    );

    const linkId = added.state.chain[0].id;

    const negated = negateChainLink(
      added.state,
      linkId
    );

    const pass1 = passChainPriority(
      negated.state,
      "opponent"
    );

    const pass2 = passChainPriority(
      pass1.state,
      "player"
    );

    const resolution = resolveChainOrder(
      pass2.state
    );

    expect(resolution.resolved).toHaveLength(0);
    expect(resolution.skipped).toHaveLength(1);
  });
});
