
import { useMemo } from "react";

import type { Deck } from "../models/deck/Deck";
import type { CollectionCard } from "../models/card/CollectionCard";
import type { CardRelationship } from "../models/effect/CardRelationship";
import type { Combo } from "../models/combo/Combo";

import type { DeckFormat } from "../services/deck/banlistService";

import { discoverComboCandidates } from "../services/combo/comboDiscoveryService";
import { analyzeComboCandidates } from "../services/combo/discovery/comboCandidateAnalysisService";
import { generateDeckRecommendations } from "../services/deck/deckRecommendationService";
import { simulateTrackedCombo } from "../services/simulation/trackedComboSimulationService";

import { analyzeDataHealth } from "../services/analysis/analysisHealthService";

export interface DeckAnalysisInput {
  deck: Deck;
  collection: CollectionCard[];
  relationships: CardRelationship[];
  combos: Combo[];
  format: DeckFormat;
  maxDepth?: number;
}

export function useDeckAnalysis({
  deck,
  collection,
  relationships,
  combos,
  format,
  maxDepth = 3,
}: DeckAnalysisInput) {
  const cards = useMemo(() => {
    const seen = new Map<number, Deck["main"][number]["card"]>();

    for (const entry of [
      ...deck.main,
      ...deck.extra,
      ...deck.side,
    ]) {
      seen.set(entry.card.id, entry.card);
    }

    return [...seen.values()];
  }, [deck]);

  const cardNames = useMemo(() => {
    const names = new Map<number, string>();

    for (const item of collection) {
      names.set(item.card.id, item.card.name);
    }

    for (const card of cards) {
      names.set(card.id, card.name);
    }

    return names;
  }, [cards, collection]);

  const counts = useMemo(
    () => ({
      main: deck.main.reduce(
        (sum, entry) => sum + entry.quantity, 0
      ),
      extra: deck.extra.reduce(
        (sum, entry) => sum + entry.quantity, 0
      ),
      side: deck.side.reduce(
        (sum, entry) => sum + entry.quantity, 0
      ),
      unique: cards.length,
    }),
    [deck, cards]
  );

  const candidates = useMemo(() => {
    const discovered = discoverComboCandidates(
      cards.map((card) => card.id),
      relationships,
      {
        maxDepth,
        minDepth: 1,
        maxCandidates: 200,
      }
    );

    return analyzeComboCandidates(discovered, deck);
  }, [cards, relationships, deck, maxDepth]);

  const recommendations = useMemo(
    () =>
      generateDeckRecommendations({
        deck,
        collection,
        relationships,
        combos,
        format,
      }),
    [deck, collection, relationships, combos, format]
  );

  const simulations = useMemo(
    () =>
      combos.map((combo) => ({
        combo,
        result: simulateTrackedCombo(combo, deck),
      })),
    [combos, deck]
  );

  const health = useMemo(
    () =>
      analyzeDataHealth({
        deck,
        collection,
        relationships,
        combos,
      }),
      [deck, collection, relationships, combos]
  );

  const summary = useMemo(
    () => ({
      candidateCount: candidates.length,
      accessibleCandidates: candidates.filter(
        (candidate) => candidate.availableInMainDeck
      ).length,
      recommendationCount: recommendations.length,
      highPriorityCount: recommendations.filter(
        (recommendation) =>
          recommendation.priority === "high"
      ).length,
      simulatedCombos: simulations.length,
      successfulSimulations: simulations.filter(
        (entry) => entry.result.success
      ).length,
    }),
    [candidates, recommendations, simulations]
  );

  return {
    cards,
    cardNames,
    counts,
    candidates,
    recommendations,
    simulations,
    summary,
    health,
  };
}
