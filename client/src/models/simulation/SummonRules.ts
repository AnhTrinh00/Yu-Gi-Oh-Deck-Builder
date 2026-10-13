import type { Card } from "../card/Card";
import type { ExtraDeckSummonType } from "./SummonMaterial";

export interface SummonMaterialCard {
  instanceId: string;
  card: Card;

  /**
   * Effective values at the time of summoning.
   * Overrides printed values when card effects
   * have modified them.
   */
  effectiveLevel?: number;
  effectiveLinkRating?: number;
  isTuner?: boolean;
}

export interface SummonRulesRequest {
  summonType: ExtraDeckSummonType;
  summonedMonster: Card;
  materials: SummonMaterialCard[];

  /**
   * Optional declared Tuner requirement.
   * Synchro defaults to exactly one Tuner.
   */
  requiredTuners?: number;
}

export interface SummonRulesResult {
  valid: boolean;
  errors: string[];
  linkContributions?: number[];
}