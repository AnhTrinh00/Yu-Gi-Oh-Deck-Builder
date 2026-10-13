
export type ComboZone =
  | "hand"
  | "deck"
  | "field"
  | "graveyard"
  | "banished"
  | "extra";

export type ComboAction =
  | "normal-summon"
  | "special-summon"
  | "activate-effect"
  | "search"
  | "send-to-graveyard"
  | "add-to-hand"
  | "banish"
  | "set-card"
  | "other";

export interface ComboCardRequirement {
  cardId: number;
  quantity: number;
  zone: ComboZone;
}

export interface ComboStep {
  id: string;
  order: number;
  action: ComboAction;
  cardId: number;
  description: string;
}

export interface Combo {
  id: string;
  name: string;
  description: string;
  starters: ComboCardRequirement[];
  requirements: ComboCardRequirement[];
  steps: ComboStep[];
  endBoardCardIds: number[];
  createdAt: string;
  updatedAt: string;
}
