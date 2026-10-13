import type {
  DuelPhase,
  GameZone,
  PlayerId,
} from "../simulation/GameState";

export type ActivationSpeed = 1 | 2 | 3;

export type ActivationRequirement =
  | {
      type: "phase";
      allowedPhases: DuelPhase[];
    }
  | {
      type: "active-player";
      player: PlayerId;
    }
  | {
      type: "source-zone";
      zone: GameZone;
    }
  | {
      type: "minimum-cards";
      zone: GameZone;
      cardId: number;
      minimum: number;
    }
  | {
      type: "normal-summon-available";
    }
  | {
      type: "restriction-absent";
      restrictionId: string;
    }
  | {
      type: "effect-unused";
      usageKey: string;
    };

export interface EffectActivationDefinition {
  effectId: string;
  speed: ActivationSpeed;
  requirements: ActivationRequirement[];
}

export interface ActivationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}