
import { z } from "zod";
import type { CardEffectDefinition } from "../../../models/effect/CardEffect";

const zoneSchema = z.enum([
  "hand",
  "deck",
  "extra",
  "field",
  "graveyard",
  "banished",
]);

const cardIdSchema = z.number().int().positive().safe();

const conditionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("source-in-zone"),
    zone: zoneSchema,
  }).strict(),
  z.object({
    type: z.literal("card-in-zone"),
    cardId: cardIdSchema,
    zone: zoneSchema,
    minimum: z.number().int().positive().optional(),
  }).strict(),
  z.object({
    type: z.literal("normal-summon-available"),
  }).strict(),
  z.object({
    type: z.literal("effect-unused"),
    usageKey: z.string().trim().min(1),
  }).strict(),
]);

const costSchema = z.object({
  type: z.literal("move-card"),
  cardId: cardIdSchema,
  from: zoneSchema,
  to: zoneSchema,
}).strict().refine(
  cost => cost.from !== cost.to,
  "Cost source and destination must differ."
);

const stepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("draw"),
    count: z.number().int().positive().max(60),
  }).strict(),
  z.object({
    type: z.literal("search"),
    cardId: cardIdSchema,
  }).strict(),
  z.object({
    type: z.literal("move"),
    cardId: cardIdSchema,
    from: zoneSchema,
    to: zoneSchema,
  }).strict(),
  z.object({
    type: z.literal("special-summon"),
    cardId: cardIdSchema,
    from: zoneSchema,
  }).strict(),
  z.object({
    type: z.literal("destroy"),
    cardId: cardIdSchema,
    from: z.literal("field"),
  }).strict(),
]);

export const cardEffectSchema = z.object({
  id: z.string().trim().min(1).max(100),
  sourceCardId: cardIdSchema,
  label: z.string().trim().min(1).max(300),
  activationZone: zoneSchema,
  conditions: z.array(conditionSchema).max(30),
  costs: z.array(costSchema).max(30),
  steps: z.array(stepSchema).min(1).max(30),
  targetStepIndexes: z.array(
    z.number().int().nonnegative()
  ).max(30).optional(),
  oncePerTurnKey: z.string().trim().min(1).optional(),
  verification: z.enum([
    "manually-verified",
    "experimental",
  ]),
}).strict().superRefine((effect, ctx) => {
  const indexes = effect.targetStepIndexes ?? [];
  const seen = new Set<number>();

  for (const index of indexes) {
    if (seen.has(index)) {
      ctx.addIssue({
        code: "custom",
        path: ["targetStepIndexes"],
        message: `Duplicate target step index ${index}.`,
      });
    }

    seen.add(index);

    const step = effect.steps[index];

    if (!step) {
      ctx.addIssue({
        code: "custom",
        path: ["targetStepIndexes"],
        message: `Target step ${index} does not exist.`,
      });

      continue;
    }

    if (step.type === "draw") {
      ctx.addIssue({
        code: "custom",
        path: ["TargetStepIndexes"],
        message: "Draw steps cannot target cards.",
      });
    }
  }
});

export const cardEffectListSchema =
  z.array(cardEffectSchema).max(500);

export function parseCardEffects(
  value: unknown
): CardEffectDefinition[] {
  const effects = cardEffectListSchema.parse(value);
  const ids = new Set<string>();

  for (const effect of effects) {
    if (ids.has(effect.id)) {
      throw new Error(
        `Duplicate effect ID: ${effect.id}`
      );
    }
    ids.add(effect.id);
  }

  return effects;
}
