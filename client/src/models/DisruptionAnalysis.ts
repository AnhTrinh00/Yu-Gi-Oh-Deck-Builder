import type { GameZone } from "./GameState";

export type DisruptionType =
  | "monster-negate"
  | "spell-negate"
  | "trap-negate"
  | "activation-negate"
  | "effect-negate"
  | "destruction"
  | "banishment"
  | "bounce"
  | "other";

export type DisruptionSpeed =
  | "quick-effect"
  | "quick-play-spell"
  | "trap"
  | "counter-trap";

export interface DisruptionDefinition {
  id: string;
  cardId: number;
  effectKey: string;
  type: DisruptionType;
  speed: DisruptionSpeed;

  allowedZones: GameZone[];

  /**
   * Required Xyz Materials currently attached
   * to this physical card instance.
   */
  minimumXyzMaterials?: number;

  /**
   * Optional key for matching effectUsage records.
   */
  usageKey?: string;

  description: string;
}

export type DisruptionAvailability =
  | "potential"
  | "conditionally-available"
  | "unavailable"
  | "unknown";

export interface DetectedDisruption {
  definitionId: string;
  cardId: number;
  instanceId: string;
  effectKey: string;
  type: DisruptionType;
  speed: DisruptionSpeed;
  zone: GameZone;

  availability: DisruptionAvailability;
  reasons: string[];

  description: string;
}

export interface DisruptionAnalysis {
  disruptions: DetectedDisruption[];

  potentialCount: number;
  conditionallyAvailableCount: number;
  unavailableCount: number;
  unknownCount: number;

  complete: boolean;
  warnings: string[];
}