export interface EndBoardScoreWeights {
  disruptions: number;
  boardPresence: number;
  resources: number;
  flexibility: number;
}

export interface EndBoardScoreBreakdown {
  disruptions: number;
  boardPresence: number;
  resources: number;
  flexibility: number;
}

export interface EndBoardScore {
  total: number;
  breakdown: EndBoardScoreBreakdown;
  weights: EndBoardScoreWeights;

  confidence: "partial" | "evaluated";

  warnings: string[];
}

export interface EndBoardScoreComparison {
  first: EndBoardScore;
  second: EndBoardScore;

  scoreDifference: number;

  winner: "first" | "second" | "tie";
}