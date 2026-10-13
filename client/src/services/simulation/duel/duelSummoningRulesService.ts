
import type {
  DuelRulesState,
  MonsterPosition,
  PlayerId,
  RuleCheck,
  RuleResult,
  RuleZone,
} from "../../../models/DuelRules";

export interface SummonRequest {
  player: PlayerId;
  instanceId: string;
  kind: "normal" | "special";
  from: RuleZone;
  position: MonsterPosition;
  tributeInstanceIds?: string[];
  procedureVerified?: boolean;
}

export function validateSummon(
  state: DuelRulesState,
  request: SummonRequest
): RuleCheck {
  const errors: string[] = [];

  const card = state.cards.find(
    item => item.instanceId === request.instanceId
  );

  if (!card) {
    return {
      legal: false,
      errors: ["Summoned card does not exist."],
      warnings: [],
    };
  }

  if (card.controller !== request.player) {
    errors.push("Player does not control the card.");
  }

  if (card.zone !== request.from) {
    errors.push("Card is not in the declared source zone.");
  }

  if (state.chain.length > 0) {
    errors.push(
      "This summon operation cannot occur while a chain is open."
    );
  }

  const occupied = state.cards.filter(
    item =>
      item.controller === request.player &&
      item.zone === "monster"
  ).length;

  const tributes = request.tributeInstanceIds ?? [];
  const uniqueTributes = new Set(tributes);

  if (uniqueTributes.size !== tributes.length) {
    errors.push("Duplicate tribute instances.");
  }

  for (const tributeId of tributes) {
    const tribute = state.cards.find(
      item => item.instanceId === tributeId
    );

    if (!tribute ||
        tribute.controller !== request.player ||
        tribute.zone !== "monster") {
      errors.push(`Invalid tribute: ${tributeId}`);
    }

    if (tributeId === request.instanceId) {
      errors.push("A monster cannot tribute itself here.");
    }
  }

  const capacityAfterTributes =
    occupied - uniqueTributes.size;

  if (capacityAfterTributes >= 5) {
    errors.push("No available Main Monster Zone.");
  }

  if (request.kind === "normal") {
    if (request.from !== "hand") {
      errors.push("Normal Summon must be from hand.");
    }

    if (
      state.turnPlayer !== request.player ||
      !["main1", "main2"].includes(state.phase)
    ) {
      errors.push("Normal Summon timing is invalid.");
    }

    if (state.normalSummonsUsed[request.player] >=
        state.normalSummonLimits[request.player]) {
      errors.push("Normal Summon limit reached.");
    }

    if (state.restrictions.some(
      r => r.player === request.player &&
           r.kind === "no-normal-summon"
    )) {
      errors.push("Normal Summoning is restricted.");
    }

    if (card.level === undefined) {
      errors.push(
        "Monster Level is required for Normal Summon validation."
      );
    } else {
      const required =
        card.level >= 7 ? 2 :
        card.level >= 5 ? 1 : 0;

      if (tributes.length !== required) {
        errors.push(
          `This summon requires ${required} tribute(s).`
        );
      }
    }

    if (card.monsterTypes?.some(
      type => ["fusion", "synchro", "xyz", "link", "ritual"]
        .includes(type)
    )) {
      errors.push(
        "This monster is not supported by the Normal Summon validator."
      );
    }

    if (request.position !== "face-up-attack") {
      errors.push(
        "This operation supports face-up Attack Position only."
      );
    }
  } else {
    if (state.restrictions.some(
      r => r.player === request.player &&
           r.kind === "no-special-summon"
    )) {
      errors.push("Special Summoning is restricted.");
    }

    if (!request.procedureVerified) {
      errors.push(
        "Special Summon procedure has not been verified."
      );
    }

    if (request.position === "face-down-defense") {
      errors.push(
        "Face-down Special Summoning is not supported."
      );
    }

    if (tributes.length > 0) {
      errors.push(
        "Tribute-based Special Summoning needs a specific procedure."
      );
    }
  }

  return {
    legal: errors.length === 0,
    errors,
    warnings: [
      "Advanced summon conditions and Extra Monster Zones are not modeled.",
    ],
  };
}

export function executeSummon(
  state: DuelRulesState,
  request: SummonRequest
): RuleResult {
  const check = validateSummon(state, request);

  if (!check.legal) {
    return { ...check, state };
  }

  const next = structuredClone(state);

  for (const id of request.tributeInstanceIds ?? []) {
    const tribute = next.cards.find(
      item => item.instanceId === id
    )!;

    tribute.zone = "graveyard";
    tribute.faceUp = true;
    tribute.monsterPosition = undefined;
  }

  const summoned = next.cards.find(
    item => item.instanceId === request.instanceId
  )!;

  summoned.zone = "monster";
  summoned.faceUp = true;
  summoned.monsterPosition = request.position;

  if (request.kind === "normal") {
    next.normalSummonsUsed[request.player]++;
  }

  return {
    legal: true,
    errors: [],
    warnings: check.warnings,
    state: next,
  };
}
