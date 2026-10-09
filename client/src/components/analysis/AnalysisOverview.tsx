
import type { Deck } from "../../models/Deck";
import { getDeckCardCount } from "../../services/deckService";

interface AnalysisOverviewProps {
  deck: Deck;
  comboCount: number;
  candidateCount: number;
}

export default function AnalysisOverview({
  deck,
  comboCount,
  candidateCount,
}: AnalysisOverviewProps) {
  const mainCount = getDeckCardCount(deck, "main");
  const extraCount = getDeckCardCount(deck, "extra");
  const sideCount = getDeckCardCount(deck, "side");

  const uniqueCardIds = new Set(
    [...deck.main, ...deck.extra, ...deck.side].map(
      (entry) => entry.card.id
    )
  );

  const statistics = [
    { label: "Main Deck", value: mainCount },
    { label: "Extra Deck", value: extraCount },
    { label: "Side Deck", value: sideCount },
    { label: "Unique Cards", value: uniqueCardIds.size },
    { label: "Saved Combos", value: comboCount },
    { label: "Combo Candidates", value: candidateCount },
  ];

  return (
    <div className="analysis-overview">
      <div className="analysis-section-heading">
        <h2>Deck Overview</h2>
        <p>Summary of your current deck and combo data.</p>
      </div>

      <div className="analysis-overview-grid">
        {statistics.map(({ label, value }) => (
          <div className="analysis-overview-card" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {mainCount < 40 && (
        <p className="analysis-overview-notice">
          Your Main Deck currently contains fewer than
          40 cards. Complete the deck before relying on
          opening-hand consistency calculations.
        </p>
      )}
    </div>
  );
}
