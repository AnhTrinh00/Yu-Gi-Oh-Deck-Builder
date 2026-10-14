import { z } from "zod";

const text = (max: number) => z.string().max(max);
const cardId = z.number().int().positive();
const quantity = z.number().int().min(0).max(60);

const deckSectionSchema = z.enum(["main", "extra", "side"]);

const deckCardSchema = z.object({
  id: cardId,
  name: text(150),
  section: deckSectionSchema,
  quantity: z.number().int().min(1).max(60),
  type: text(100),
  race: text(100),
  attribute: text(50).optional(),
  level: z.number().int().min(0).max(13).optional(),
  atk: z.number().int().min(-1).max(99999).optional(),
  def: z.number().int().min(-1).max(99999).optional(),
  archetype: text(150).optional(),
  description: text(1000),
  ownedQuantity: quantity,
  missingQuantity: quantity,
  banlistStatus: z.enum([
    "Forbidden",
    "Limited",
    "Semi-Limited",
    "Unlimited",
  ]),
  allowedCopies: z.number().int().min(0).max(3),
});

const availableCollectionCardSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  description: z.string().max(500),
  ownedQuantity: z.number().int().min(1).max(999),
  deckQuantity: z.number().int().min(0).max(130),
  availableQuantity: z.number().int().min(1).max(999),
  allowedCopies: z.number().int().min(0).max(3).optional(),
}).strict().superRefine((card, ctx) => {
  if (
    card.availableQuantity !==
    Math.max(0, card.ownedQuantity - card.deckQuantity)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["availableQuantity"],
      message: "Available quantity is inconsistent.",
    });
  }
});

const statisticsSchema = z.object({
  mainCount: z.number().int().min(0).max(60),
  extraCount: z.number().int().min(0).max(15),
  sideCount: z.number().int().min(0).max(15),
  totalCount: z.number().int().min(0).max(90),
  uniqueCards: z.number().int().min(0).max(90),
  missingCopies: z.number().int().min(0).max(90),
  isDeckValid: z.boolean(),
  validationErrors: z.array(text(300)).max(20),
});

const relationshipSchema = z.object({
  sourceCardId: cardId,
  targetCardId: cardId,
  type: text(100),
  description: text(300).optional(),
  verification: z.literal("registered"),
});

const savedComboSchema = z.object({
  id: text(100).min(1),
  name: text(300),
  description: text(300),
  starters: z.array(z.object({
    cardId,
    quantity: z.number().int().min(1).max(3),
    zone: text(50),
  })).max(15),
  steps: z.array(z.object({
    action: text(100),
    cardId,
    description: text(300),
  })).max(20),
  endBoardCardIds: z.array(cardId).max(15),
  verification: z.literal("saved-unverified"),
});

const simulationSchema = z.object({
  comboId: text(100).min(1),
  outcome: z.enum(["completed", "failed"]),
  summary: text(300),
  endBoardScore: z.number().finite().min(0).max(100).optional(),
  warnings: z.array(text(300)).max(10),
  verification: z.literal("simulator-reported"),
});

const evidenceSchema = z.object({
  relationships: z.array(relationshipSchema).max(50),
  savedCombos: z.array(savedComboSchema).max(10),
  simulations: z.array(simulationSchema).max(10),
  limitations: z.array(text(300)).max(20),
});

export const deckContextSchema = z.object({
  version: z.literal(1),
  deckName: text(150),
  format: z.literal("advanced"),
  cards: z.array(deckCardSchema).max(100),
  statistics: statisticsSchema,
  evidence: evidenceSchema.optional(),
  limitations: z.array(text(300)).max(20),

  availableCollectionCards: z
    .array(availableCollectionCardSchema)
    .max(100)
    .optional(),

  collectionCatalogTruncated: z.boolean().optional(),
}).superRefine((context, ctx) => {
  const totals = { main: 0, extra: 0, side: 0 };
  const cardIds = new Set<number>();
  let missingCopies = 0;

  for (const card of context.cards) {
    totals[card.section] += card.quantity;
    cardIds.add(card.id);
    missingCopies += card.missingQuantity;

    if (card.missingQuantity > card.quantity) {
      ctx.addIssue({
        code: "custom",
        message: "Missing quantity exceeds deck quantity.",
        path: ["cards"],
      });
    }
  }

  const deckQuantities = new Map<number, number>();

  for (const card of context.cards) {
    deckQuantities.set(
      card.id,
      (deckQuantities.get(card.id) ?? 0) +
        card.quantity
    );
  }

  const collectionIds = new Set<number>();

  for (const [index, card] of (
    context.availableCollectionCards ?? []
  ).entries()) {
    if (collectionIds.has(card.id)) {
      ctx.addIssue({
        code: "custom",
        message: "Duplicate collection card ID.",
        path: ["availableCollectionCards", index, "id"],
      });
    }

    collectionIds.add(card.id);

    const actualDeckQuantity =
      deckQuantities.get(card.id) ?? 0;

    if (card.deckQuantity !== actualDeckQuantity) {
      ctx.addIssue({
        code: "custom",
        message:
          "Collection deck quantity does not match deck entries.",
        path: [
          "availableCollectionCards",
          index,
          "deckQuantity",
        ],
      });
    }
  }

  const stats = context.statistics;

  if (
    totals.main !== stats.mainCount ||
    totals.extra !== stats.extraCount ||
    totals.side !== stats.sideCount ||
    totals.main + totals.extra + totals.side !== stats.totalCount ||
    cardIds.size !== stats.uniqueCards ||
    missingCopies !== stats.missingCopies
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Deck statistics do not match card entries.",
      path: ["statistics"],
    });
  }

  if (context.evidence) {
    const comboIds = new Set(
      context.evidence.savedCombos.map(combo => combo.id)
    );

    if (comboIds.size !== context.evidence.savedCombos.length) {
      ctx.addIssue({
        code: "custom",
        message: "Duplicate saved combo IDs.",
        path: ["evidence", "savedCombos"],
      });
    }

    for (const simulation of context.evidence.simulations) {
      if (!comboIds.has(simulation.comboId)) {
        ctx.addIssue({
          code: "custom",
          message: "Simulation references an unknown saved combo.",
          path: ["evidence", "simulations"],
        });
      }
    }
  }
});

export const deckAnalysisRequestSchema = z.object({
  question: text(1000).default(""),
  context: deckContextSchema,
});

export type DeckAnalysisRequest =
  z.infer<typeof deckAnalysisRequestSchema>;
