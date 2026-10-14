import type {
  AIDeckContext,
} from "../../models/ai/AIDeckContext";

import type {
  ValidatedDeckRecommendationApiResponse,
} from "../../models/ai/AIDeckRecommendationValidation";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  ""
).replace(/\/$/, "");

const REQUEST_TIMEOUT_MS = 30_000;

export interface AIRecommendationRequest {
  question?: string;
  context: AIDeckContext;
}

export async function requestAIDeckRecommendations(
  request: AIRecommendationRequest,
  signal?: AbortSignal
): Promise<ValidatedDeckRecommendationApiResponse> {
  const timeoutSignal = AbortSignal.timeout(
    REQUEST_TIMEOUT_MS
  );

  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  const response = await fetch(
    `${API_BASE_URL}/api/ai/recommend-deck`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: combinedSignal,
    }
  );

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error(
        "The deck context is invalid."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "Too many AI requests. Please try again later."
      );
    }

    if (response.status === 502) {
      throw new Error(
        "The AI recommendation service is temporarily unavailable."
      );
    }

    throw new Error(
      `AI recommendation request failed (${response.status}).`
    );
  }

  const result: unknown = await response.json();

  if (
    typeof result !== "object" ||
    result === null ||
    !("analysis" in result) ||
    !("grounding" in result) ||
    !("validation" in result) ||
    !("simulation" in result)
  ) {
    throw new Error(
      "The AI recommendation service returned an invalid response."
    );
  }

  return result as ValidatedDeckRecommendationApiResponse;
}