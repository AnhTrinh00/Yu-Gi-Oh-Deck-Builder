import type { GameZone } from "./GameState";

export type CardSelectionKind =
  | "target"
  | "choose"
  | "cost";

export interface CardInstanceSelection {
  /**
   * Index of the effect step being resolved.
   * Costs are handled separately.
   */
  stepIndex: number;

  /**
   * Physical card copy to use.
   */
  instanceId: string;

  /**
   * Describes the selection's declared purpose.
   *
   * This does not independently establish
   * whether an actual card effect targets.
   */
  kind: CardSelectionKind;

  /**
   * Optional expected source zone.
   */
  expectedZone?: GameZone | "overlay";
}

export interface CardSelectionContext {
  selections: CardInstanceSelection[];
}
