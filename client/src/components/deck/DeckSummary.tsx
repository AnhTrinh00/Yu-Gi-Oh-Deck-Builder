
import type { Deck, DeckSection } from "../../models/Deck";
import {
  DECK_LIMITS,
  getDeckCardCount,
} from "../../services/deckService";

interface DeckSummaryProps {
  deck: Deck;
}

const sections: {
  key: DeckSection;
  label: string;
  max: number;
}[] = [
  { key: "main", label: "Main Deck", max: DECK_LIMITS.MAIN_MAX },
  { key: "extra", label: "Extra Deck", max: DECK_LIMITS.EXTRA_MAX },
  { key: "side", label: "Side Deck", max: DECK_LIMITS.SIDE_MAX },
];

export default function DeckSummary({ deck }: DeckSummaryProps) {
  return (
    <section className="builder-overview" aria-label="Deck summary">
      <div className="builder-section-heading">
        <h2>Deck Overview</h2>
        <span>{deck.name}</span>
      </div>

      <div className="builder-deck-summary">
        {sections.map(({ key, label, max }) => {
          const count = getDeckCardCount(deck, key);
          const percentage = Math.round((count / max) * 100);

          return (
            <div className="builder-summary-card" key={key}>
              <span>{label}</span>

              <strong>
                {count} <small>/ {max}</small>
              </strong>

              <progress
                value={Math.min(count, max)}
                max={max}
                aria-label={`${label} capacity`}
              />

              <small>{percentage}% capacity</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
