
import type { DeckSection } from "../deck/Deck";
import type { BanlistStatus } from "../card/Card";
import type { AIDeckEvidence } from "./AIDeckEvidence";

export interface AIDeckCard {
  id: number;
  name: string;
  section: DeckSection;
  quantity: number;

  type: string;
  race: string;
  attribute?: string;
  level?: number;
  atk?: number;
  def?: number;
  archetype?: string;

  description: string;

  ownedQuantity: number;
  missingQuantity: number;

  banlistStatus: BanlistStatus;
  allowedCopies: number;
}

export interface AIDeckStatistics {
  mainCount: number;
  extraCount: number;
  sideCount: number;
  totalCount: number;
  uniqueCards: number;
  missingCopies: number;
  isDeckValid: boolean;
  validationErrors: string[];
}

export interface AIDeckContext {
  version: 1;
  deckName: string;
  format: "advanced";

  cards: AIDeckCard[];
  statistics: AIDeckStatistics;

  evidence?: AIDeckEvidence;

  limitations: string[];

  availableCollectionCards?: AIAvailableCollectionCard[];
  collectionCatalogTruncated?: boolean;
}

export interface AIAvailableCollectionCard {
  id: number;
  name: string;
  type: string;
  description: string;
  ownedQuantity: number;
  deckQuantity: number;
  availableQuantity: number;
  allowedCopies?: number;
}
