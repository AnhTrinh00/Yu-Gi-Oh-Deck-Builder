import type {
  SummonRulesRequest,
  SummonRulesResult,
  SummonMaterialCard,
} from "../models/SummonRules";

function isMonster(type: string): boolean {
  return type.includes("Monster");
}

function isTuner(material: SummonMaterialCard): boolean {
  return material.isTuner ??
    material.card.type.includes("Tuner");
}

function levelOf(material: SummonMaterialCard): number | undefined {
  return material.effectiveLevel ?? material.card.level;
}

function linkRatingOf(
  material: SummonMaterialCard
): number | undefined {
  return material.effectiveLinkRating ??
    material.card.linkval;
}

function positiveInteger(
  value: number | undefined
): value is number {
  return (
    value !== undefined &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function validateFusion(
  request: SummonRulesRequest,
  errors: string[]
): void {
  if (!request.summonedMonster.type.includes("Fusion")) {
    errors.push("Summoned monster is not a Fusion Monster.");
  }

  // Card-specific Fusion materials must still be
  // checked by SummonMaterialRequirement.
}

function validateSynchro(
  request: SummonRulesRequest,
  errors: string[]
): void {
  if (!request.summonedMonster.type.includes("Synchro")) {
    errors.push("Summoned monster is not a Synchro Monster.");
  }

  const targetLevel = request.summonedMonster.level;

  if (!positiveInteger(targetLevel)) {
    errors.push("Synchro Monster has no valid Level.");
    return;
  }

  const requiredTuners = request.requiredTuners ?? 1;

  if (
    !Number.isSafeInteger(requiredTuners) ||
    requiredTuners < 1
  ) {
    errors.push("Invalid required Tuner count.");
    return;
  }

  const tunerCount = request.materials.filter(isTuner).length;

  if (tunerCount !== requiredTuners) {
    errors.push(
      `Synchro Summon requires exactly ${requiredTuners} ` +
      `Tuner material(s); found ${tunerCount}.`
    );
  }

  let totalLevel = 0;

  for (const material of request.materials) {
    const level = levelOf(material);

    if (!positiveInteger(level)) {
      errors.push(
        `Material ${material.instanceId} has no valid Level.`
      );
      continue;
    }

    totalLevel += level;
  }

  if (errors.length === 0 && totalLevel !== targetLevel) {
    errors.push(
      `Synchro Levels total ${totalLevel}, ` +
      `but the monster requires ${targetLevel}.`
    );
  }
}

function validateXyz(
  request: SummonRulesRequest,
  errors: string[]
): void {
  if (!request.summonedMonster.type.includes("XYZ")) {
    errors.push("Summoned monster is not an Xyz Monster.");
  }

  const rank = request.summonedMonster.level;

  if (!positiveInteger(rank)) {
    errors.push("Xyz Monster has no valid Rank.");
    return;
  }

  for (const material of request.materials) {
    const level = levelOf(material);

    if (level !== rank) {
      errors.push(
        `Material ${material.instanceId} must be Level ${rank}.`
      );
    }
  }
}

/**
 * Returns one valid set of Link contributions,
 * or null if none can reach the required rating.
 *
 * A Link Monster can normally contribute either
 * one material or its own Link Rating.
 */
function findLinkContributions(
  materials: SummonMaterialCard[],
  requiredRating: number
): number[] | null {
  const options = materials.map(material => {
    const rating = linkRatingOf(material);

    if (material.card.type.includes("Link")) {
      if (!positiveInteger(rating)) {
        return [];
      }

      return rating === 1 ? [1] : [1, rating];
    }

    return [1];
  });

  if (options.some(values => values.length === 0)) {
    return null;
  }

  function search(
    index: number,
    sum: number,
    chosen: number[]
  ): number[] | null {
    if (sum > requiredRating) {
      return null;
    }

    if (index === options.length) {
      return sum === requiredRating ? chosen : null;
    }

    for (const contribution of options[index]) {
      const result = search(
        index + 1,
        sum + contribution,
        [...chosen, contribution]
      );

      if (result) {
        return result;
      }
    }

    return null;
  }

  return search(0, 0, []);
}

function validateLink(
  request: SummonRulesRequest,
  errors: string[]
): number[] | undefined {
  if (!request.summonedMonster.type.includes("Link")) {
    errors.push("Summoned monster is not a Link Monster.");
  }

  const rating = request.summonedMonster.linkval;

  if (!positiveInteger(rating)) {
    errors.push("Link Monster has no valid Link Rating.");
    return undefined;
  }

  const contributions = findLinkContributions(
    request.materials,
    rating
  );

  if (!contributions) {
    errors.push(
      `Selected materials cannot produce Link Rating ${rating}.`
    );

    return undefined;
  }

  return contributions;
}

/**
 * Checks summon-type-specific arithmetic and
 * basic monster classification.
 *
 * This does not validate:
 * - Card-specific material text
 * - Summoning permissions or restrictions
 * - Available Extra Monster Zones / linked zones
 * - Xyz material attachment
 * - Whether the summon was properly conducted
 */
export function validateSummonRules(
  request: SummonRulesRequest
): SummonRulesResult {
  const errors: string[] = [];

  if (request.materials.length === 0) {
    errors.push("At least one material is required.");
  }

  const seen = new Set<string>();

  for (const material of request.materials) {
    if (seen.has(material.instanceId)) {
      errors.push(
        `Duplicate physical material ${material.instanceId}.`
      );
    }

    seen.add(material.instanceId);

    if (!isMonster(material.card.type)) {
      errors.push(
        `Material ${material.instanceId} is not a monster.`
      );
    }
  }

  if (!isMonster(request.summonedMonster.type)) {
    errors.push("The summoned card is not a monster.");
  }

  let linkContributions: number[] | undefined;

  switch (request.summonType) {
    case "fusion":
      validateFusion(request, errors);
      break;

    case "synchro":
      validateSynchro(request, errors);
      break;

    case "xyz":
      validateXyz(request, errors);
      break;

    case "link":
      linkContributions = validateLink(request, errors);
      break;

    default:
      errors.push("Unsupported summon type.");
  }

  return {
    valid: errors.length === 0,
    errors,
    linkContributions,
  };
}