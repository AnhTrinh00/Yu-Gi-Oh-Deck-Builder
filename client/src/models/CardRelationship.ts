
export type CardRelationshipType =
  | "searches"
  | "summons"
  | "supports"
  | "requires"
  | "enables"
  | "extends"
  | "negates"
  | "destroys"
  | "banishes";

export interface CardRelationship {
  sourceCardId: number;
  targetCardId: number;
  type: CardRelationshipType;
  description?: string;
}
