
export type AnalysisIssueSeverity =
  | "error"
  | "warning"
  | "info";

export type AnalysisIssueType =
  | "invalid-quantity"
  | "deck-size"
  | "collection-shortage"
  | "missing-combo-card"
  | "external-relationship";

export interface AnalysisIssue {
  id: string;
  type: AnalysisIssueType;
  severity: AnalysisIssueSeverity;
  message: string;
  relatedCardIds: number[];
}

export interface AnalysisHealthReport {
  healthy: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: AnalysisIssue[];
}
