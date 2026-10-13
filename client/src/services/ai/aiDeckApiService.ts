
import type {
  AIDeckContext,
} from "../../models/ai/AIDeckContext";

export interface AIDeckAnalysisRequest {
  question: string;
  context: AIDeckContext;
}

export interface AIDeckAnalysisAcknowledgement {
  status: "accepted";
  contextVersion: 1;
  deckName: string;
  cardEntries: number;
  evidenceIncluded: boolean;
  aiAnalysisPerformed: false;
}

export class AIDeckApiError extends Error {
  public readonly status: number | null;

  constructor(
    message: string,
    status: number | null = null
  ) {
    super(message);

    this.name = "AIDeckApiError";
    this.status = status;
  }
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  "http://lcalhost:3000"
).replace(/\/$/, "");

const REQUEST_TIMEOUT_MS = 20_000;

export async function submitAIDeckAnalysis(
  request: AIDeckAnalysisRequest,
  options: {
    signal?: AbortSignal;
  } = {}
): Promise<AIDeckAnalysisAcknowledgement> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  const onAbort = () => controller.abort();

  options.signal?.addEventListener(
    "abort",
    onAbort,
    { once: true }
  );

  try {
    if (options.signal?.aborted) {
      throw new AIDeckApiError("Request cancelled.");
    }

    let response: Response;

    try {
      response = await fetch(
        `${API_BASE_URL}/api/ai/analyze-deck`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        }
      );
    } catch {
    if (controller.signal.aborted) {
        throw new AIDeckApiError(
        options.signal?.aborted
            ? "Request cancelled."
            : "The AI service request timed out."
        );
    }

    throw new AIDeckApiError(
        "Unable to connect to the AI service."
    );
    }

    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new AIDeckApiError(
            "The deck analysis request is invalid.",
            400
          );

        case 413:
          throw new AIDeckApiError(
            "The deck context exceeds the server request limit.",
            413
          );

        case 429:
          throw new AIDeckApiError(
            "Too many requests. Please try again later.",
            429
          );

        default:
          throw new AIDeckApiError(
            "The AI service could not process the request.",
            response.status
          );
      }
    }

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      throw new AIDeckApiError(
        "The AI service returned invalid JSON.",
        response.status
      );
    }

    if (
      typeof data !== "object" ||
      data === null ||
      !("status" in data) ||
      data.status !== "accepted" ||
      !("contextVersion" in data) ||
      data.contextVersion !== 1 ||
      !("deckName" in data) ||
      typeof data.deckName !== "string" ||
      !("cardEntries" in data) ||
      typeof data.cardEntries !== "number" ||
      !Number.isInteger(data.cardEntries) ||
      data.cardEntries < 0 ||
      !("evidenceIncluded" in data) ||
      typeof data.evidenceIncluded !== "boolean" ||
      !("aiAnalysisPerformed" in data) ||
      data.aiAnalysisPerformed !== false
    ) {
      throw new AIDeckApiError(
        "The AI service returned an unexpected response.",
        response.status
      );
    }

    return {
      status: "accepted",
      contextVersion: 1,
      deckName: data.deckName,
      cardEntries: data.cardEntries,
      evidenceIncluded: data.evidenceIncluded,
      aiAnalysisPerformed: false,
    };
  } finally {
    clearTimeout(timeout);

    options.signal?.removeEventListener(
      "abort",
      onAbort
    );
  }
}
