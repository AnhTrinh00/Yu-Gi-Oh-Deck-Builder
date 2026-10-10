
import { GoogleGenAI } from "@google/genai";

import {
  analysisResponseSchema,
  type AnalysisRequest,
  type AnalysisResponse,
} from "../schemas/analysis.js";

import {
  COMBO_ANALYSIS_SYSTEM_PROMPT,
  buildComboAnalysisPrompt,
} from "./promptService.js";

export interface LLMProvider {
  analyze(
    request: AnalysisRequest
  ): Promise<AnalysisResponse>;
}

export class GeminiComboProvider implements LLMProvider {
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model: string
  ) {
    if (!apiKey.trim()) {
      throw new Error("GEMINI_API_KEY is required.");
    }

    this.client = new GoogleGenAI({ apiKey });
  }

  async analyze(
    request: AnalysisRequest
  ): Promise<AnalysisResponse> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildComboAnalysisPrompt(request),
            },
          ],
        },
      ],
      config: {
        systemInstruction: COMBO_ANALYSIS_SYSTEM_PROMPT,
        temperature: 0.2,
        responseMimeType: "application/json",
        abortSignal: AbortSignal.timeout(20000),
      },
    });

    const content = response.text;

    if (!content?.trim()) {
      throw new Error("Gemini returned an empty response.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Gemini returned invalid JSON.");
    }

    return analysisResponseSchema.parse(parsed);
  }
}
