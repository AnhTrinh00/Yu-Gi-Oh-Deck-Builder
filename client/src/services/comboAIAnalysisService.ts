
import type {
  AIAnalysisRequest,
} from "./comboAIContextService";

export interface AIComboExplanation {
  comboId: string;
  explanation: string;
  advantages: string[];
  limitations: string[];
}

export interface AIComboAnalysis {
  summary: string;
  recommendedComboId: string;
  explanations: AIComboExplanation[];
  caveats: string[];
}

export interface AIComboAnalysisResponse {
  analysis: AIComboAnalysis;
  source: string;
  rulesVerified: boolean;
}

export async function requestComboAIAnalysis(
  request: AIAnalysisRequest,
  signal?: AbortSignal
): Promise<AIComboAnalysisResponse> {
  const baseUrl = (
    import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const response = await fetch(
    `${baseUrl}/api/ai/analyze-combos`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Combo analysis request failed (${response.status}).`
    );
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("analysis" in data)
  ) {
    throw new Error("Invalid backend response.");
  }

  return data as AIComboAnalysisResponse;
}
