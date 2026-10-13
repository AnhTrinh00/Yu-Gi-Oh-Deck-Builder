
import type { Combo } from "../../../models/combo/Combo";
import type { Deck } from "../../../models/deck/Deck";

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;

  k = Math.min(k, n - k);

  let result = 1;

  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }

  return result;
}

export function calculateComboOpeningProbability(
  combo: Combo,
  deck: Deck,
  handSize = 5
): number {
  const mainDeck = deck.main;
  const deckSize = mainDeck.reduce(
    (total, entry) => total + entry.quantity,
    0
  );

  if (
    !Number.isSafeInteger(handSize) ||
    handSize < 0 ||
    handSize > deckSize ||
    combo.starters.length === 0
  ) {
    return 0;
  }

  const required = new Map<number, number>();

  for (const starter of combo.starters) {
    if (
      starter.zone !== "hand" ||
      !Number.isSafeInteger(starter.quantity) ||
      starter.quantity < 1
    ) {
      return 0;
    }

    required.set(
      starter.cardId,
      (required.get(starter.cardId) ?? 0) + starter.quantity
    );
  }

  const groups = [...required].map(([cardId, minimum]) => ({
    minimum,
    copies: mainDeck
      .filter((entry) => entry.card.id === cardId)
      .reduce((sum, entry) => sum + entry.quantity, 0),
  }));

  if (groups.some((group) => group.copies < group.minimum)) {
    return 0;
  }

  const otherCopies =
    deckSize -
    groups.reduce((sum, group) => sum + group.copies, 0);

  let favorable = 0;

  function countHands(
    index: number,
    selected: number,
    combinations: number
  ): void {
    if (index === groups.length) {
      favorable +=
        combinations *
        choose(otherCopies, handSize - selected);
      return;
    }

    const group = groups[index];

    for (
      let count = group.minimum;
      count <= Math.min(group.copies, handSize - selected);
      count++
    ) {
      countHands(
        index + 1,
        selected + count,
        combinations * choose(group.copies, count)
      );
    }
  }

  countHands(0, 0, 1);

  const total = choose(deckSize, handSize);

  return total === 0 ? 0 : favorable / total;
}
