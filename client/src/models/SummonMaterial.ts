import type { GameZone } from "./GameState";

export type ExtraDeckSummonType =
  | "fusion"
  | "synchro"
  | "xyz"
  | "link";

export interface SummonMaterialRequirement {
  summonType: ExtraDeckSummonType;

  minimumMaterials: number;
  maximumMaterials: number;

  /**
   * Allowed locations of materials before
   * they are used for the summon.
   *
   * Defaults to ["field"].
   */
  allowedZones?: GameZone[];

  /**
   * Optional restrictions on card identities.
   */
  allowedCardIds?: number[];

  /**
   * Every listed card ID must be represented
   * by at least one selected material.
   */
  requiredCardIds?: number[];

  /**
   * Number of distinct card IDs required.
   */
  minimumDistinctCardIds?: number;
}

export interface SummonMaterialSelection {
  instanceIds: string[];
}

export interface SummonMaterialValidation {
  valid: boolean;
  errors: string[];
  selectedCardIds: number[];
}