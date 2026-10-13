
import { GoogleGenAI } from "@google/genai";

import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import {
  deckRecommendationResponseSchema,
  type DeckRecommendationResponse,
} from "../schemas/deckRecommendation.js";

import {
  DECK_RECOMMENDATION_SYSTEM_PROMPT,
  buildDeckRecommendationPrompt,
} from "./deckRecommendationPromptService.js";

export interface DeckRecommendationProvider {
  recommend(
    request: DeckAnalysisRequest
  ): Promise<DeckRecommendationResponse>;
}

export interface GeminiGenerationClient {
  generateContent(
    request: Parameters<
      GoogleGenAI["models"]["generateContent"]
    >[0]
  ): Promise<{ text?: string }>;
}

const REQUEST_TIMEOUT_MS = 20_000;

export class GeminiDeckRecommendationProvider
  implements DeckRecommendationProvider {

  private readonly generationClient: GeminiGenerationClient;

  constructor(
    apiKey: string,
    private readonly model: string,
    generationClient?: GeminiGenerationClient
  ) {
    if (!apiKey.trim() && !generationClient) {
      throw new Error("GEMINI_API_KEY is required.");
    }

    if (!model.trim()) {
      throw new Error("A Gemini model is required.");
    }

    this.generationClient =
      generationClient ??
      new GoogleGenAI({ apiKey }).models;
  }

  async recommend(
    request: DeckAnalysisRequest
  ): Promise<DeckRecommendationResponse> {
    const response =
      await this.generationClient.generateContent({
        model: this.model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: buildDeckRecommendationPrompt(
                  request
                ),
              },
            ],
          },
        ],
        config: {
          systemInstruction:
            DECK_RECOMMENDATION_SYSTEM_PROMPT,
          temperature: 0.2,
          responseMimeType: "application/json",
          abortSignal: AbortSignal.timeout(
            REQUEST_TIMEOUT_MS
          ),
        },
      });

    const content = response.text;

    if (!content?.trim()) {
      throw new Error(
        "Gemini returned an empty recommendation response."
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(
        "Gemini returned invalid recommendation JSON."
      );
    }

    const validated =
      deckRecommendationResponseSchema.safeParse(
        parsed
      );

    if (!validated.success) {
      throw new Error(
        "Gemini returned an invalid recommendation structure."
      );
    }

    return validated.data;
  }
}
