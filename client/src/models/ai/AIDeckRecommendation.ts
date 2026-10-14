
export type AIRecommendationAction =
  | "add"
  | "remove"
  | "replace";

export type AIRecommendationConfidence =
  | "low"
  | "medium"
  | "high";

export type AIRecommendationSection =
  | "main"
  | "extra"
  | "side";

export interface AIDeckRecommendation {
  action: AIRecommendationAction;
  cardId: number;
  section: AIRecommendationSection;
  quantity: number;
  replacementCardId?: number;
  reason: string;
  confidence: AIRecommendationConfidence;
}

export interface AIDeckRecommendationAnalysis {
  version: 1;
  summary: string;
  recommendations: AIDeckRecommendation[];
  strengths: string[];
  weaknesses: string[];
  warnings: string[];
}

export type AIRecommendationGroundingReason =
  | "UNKNOWN_CARD"
  | "CARD_NOT_IN_SECTION"
  | "INSUFFICIENT_COPIES"
  | "UNKNOWN_REPLACEMENT"
  | "SAME_CARD"
  | "SECTION_MISMATCH";

export interface AIGroundedRecommendation {
  recommendation: AIDeckRecommendation;
  status: "grounded" | "rejected";
  reasons: AIRecommendationGroundingReason[];
}

export interface AIDeckRecommendationGrounding {
  recommendations: AIGroundedRecommendation[];
  groundedCount: number;
  rejectedCount: number;
}

export interface AIDeckRecommendationResult {
  analysis: AIDeckRecommendationAnalysis;
  grounding: AIDeckRecommendationGrounding;
}
