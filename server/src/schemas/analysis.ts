
import { z } from "zod";

export const metricSchema = z.object({
  score: z.number().min(0).max(100),
  finalHand: z.number().int().nonnegative(),
  finalField: z.number().int().nonnegative(),
  actionsUsed: z.number().int().nonnegative(),
  potentialInteractions: z.number().int().nonnegative(),
});

export const comboEvidenceSchema = z.object({
  id: z.string().min(1).max(100),
  actions: z.array(
    z.object({
      effectId: z.string().min(1).max(100),
      description: z.string().max(300),
    })
  ).max(20),
  metrics: metricSchema,
  strengths: z.array(z.string().max(300)).max(10),
  weaknesses: z.array(z.string().max(300)).max(10),
});

export const analysisRequestSchema = z.object({
  question: z.string().max(1000).default(""),
  combos: z.array(comboEvidenceSchema).min(1).max(10),
});

export const analysisResponseSchema = z.object({
  summary: z.string().min(1).max(2000),
  recommendedComboId: z.string().min(1).max(100),
  explanations: z.array(z.object({
    comboId: z.string(),
    explanation: z.string().min(1).max(1500),
    advantages: z.array(z.string().max(300)).max(5),
    limitations: z.array(z.string().max(300)).max(5),
  })).min(1).max(10),
  caveats: z.array(z.string().max(500)).max(10),
});

export type AnalysisRequest =
  z.infer<typeof analysisRequestSchema>;

export type AnalysisResponse =
  z.infer<typeof analysisResponseSchema>;
