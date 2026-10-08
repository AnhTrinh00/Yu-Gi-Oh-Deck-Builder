
import type { CardRelationshipType } from "./CardRelationship";

export interface ComboCandidateStep {
  sourceCardId: number;
  targetCardId: number;
  relationshipTypes: CardRelationshipType[];
}

export interface ComboCandidate {
  id: string;
  starterCardId: number;
  targetCardId: number;
  cardIds: number[];
  steps: ComboCandidateStep[];
  score: number;
  reasons: string[];
}

export interface ComboDiscoveryOptions {
  maxDepth: number;
  maxCandidates: number;
  minDepth: number;
}

export const DEFAULT_DISCOVERY_OPTIONS: ComboDiscoveryOptions = {
  maxDepth: 4,
  maxCandidates: 30,
  minDepth: 1,
};
