
export interface AIRelationshipEvidence {
  sourceCardId: number;
  targetCardId: number;
  type: string;
  description?: string;
  verification: "registered";
}

export interface AIComboEvidence {
  id: string;
  name: string;
  description: string;
  starters: Array<{
    cardId: number;
    quantity: number;
    zone: string;
  }>;
  steps: Array<{
    action: string;
    cardId: number;
    description: string;
  }>;
  endBoardCardIds: number[];
  verification: "saved-unverified";
}

export interface AISimulationEvidence {
  comboId: string;
  outcome: "completed" | "failed";
  summary: string;
  endBoardScore?: number;
  warnings: string[];
  verification: "simulator-reported";
}

export interface AIDeckEvidence {
  relationships: AIRelationshipEvidence[];
  savedCombos: AIComboEvidence[];
  simulations: AISimulationEvidence[];
  limitations: string[];
}
