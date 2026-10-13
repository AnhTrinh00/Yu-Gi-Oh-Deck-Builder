
import type { Deck } from "../../../models/deck/Deck";
import type { ComboCandidate } from "../../../models/combo/ComboCandidate";

export interface AnalyzedComboCandidate extends ComboCandidate {
  starterCopies: number;
  openingProbability: number;
  availableInMainDeck: boolean;
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;

  k = Math.min(k, n - k);
  let result = 1;

  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }

  return result;
}

export function analyzeComboCandidates(
  candidates: ComboCandidate[],
  deck: Deck,
  handSize = 5
): AnalyzedComboCandidate[] {
  const deckSize = deck.main.reduce(
    (total, entry) => total + entry.quantity,
    0
  );

  const validHandSize =
    Number.isSafeInteger(handSize) &&
    handSize >= 0 &&
    handSize <= deckSize;

  return candidates.map((candidate) => {
    const starterCopies = deck.main
      .filter(
        (entry) =>
          entry.card.id === candidate.starterCardId
      )
      .reduce(
        (total, entry) => total + entry.quantity,
        0
      );

    const openingProbability =
      validHandSize && starterCopies > 0
        ? 1 -
          choose(deckSize - starterCopies, handSize) /
            choose(deckSize, handSize)
        : 0;

    return {
      ...candidate,
      starterCopies,
      openingProbability,
      availableInMainDeck: starterCopies > 0,
    };
  }).sort(
    (a, b) =>
      Number(b.availableInMainDeck) -
        Number(a.availableInMainDeck) ||
      b.openingProbability - a.openingProbability ||
      b.score - a.score ||
      a.id.localeCompare(b.id)
  );
}
