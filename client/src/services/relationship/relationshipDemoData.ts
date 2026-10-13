
import type {
  CardRelationship,
} from "../../models/CardRelationship";

// Fictional card IDs for testing graph behavior.
// These are not verified Yu-Gi-Oh! card interactions.
export const DEMO_CARD_IDS = {
  cardA: 900000001,
  cardB: 900000002,
  cardC: 900000003,
  cardD: 900000004,
} as const;

export const demoRelationships: CardRelationship[] = [
  {
    sourceCardId: DEMO_CARD_IDS.cardA,
    targetCardId: DEMO_CARD_IDS.cardB,
    type: "searches",
    description: "Demo: Card A searches Card B.",
  },
  {
    sourceCardId: DEMO_CARD_IDS.cardB,
    targetCardId: DEMO_CARD_IDS.cardC,
    type: "summons",
    description: "Demo: Card B summons Card C.",
  },
  {
    sourceCardId: DEMO_CARD_IDS.cardC,
    targetCardId: DEMO_CARD_IDS.cardD,
    type: "enables",
    description: "Demo: Card C enables Card D.",
  },
];
