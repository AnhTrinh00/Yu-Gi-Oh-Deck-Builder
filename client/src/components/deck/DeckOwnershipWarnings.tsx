
import type { DeckOwnershipReport } from "../../services/deckOwnershipService";

interface DeckOwnershipWarningsProps {
  report: DeckOwnershipReport;
}

export default function DeckOwnershipWarnings({
  report,
}: DeckOwnershipWarningsProps) {
  if (report.valid) {
    return (
      <section
        className="deck-ownership-status deck-ownership-status--valid"
        aria-label="Deck ownership status"
      >
        <h2>Collection Compatibility</h2>
        <p>
          Your collection contains enough copies of
          every card currently used in this deck.
        </p>
      </section>
    );
  }

  return (
    <section
      className="deck-ownership-status deck-ownership-status--warning"
      aria-label="Deck ownership status"
    >
      <h2>Collection Compatibility</h2>

      <p role="status">
        Your deck requires {report.totalMissingCopies} additional
        {" "}
        {report.totalMissingCopies === 1 ? "copy" : "copies"}
        {" "}
        across {report.affectedCards}
        {" "}
        {report.affectedCards === 1 ? "card" : "cards"}.
      </p>

      <ul className="deck-ownership-issues">
        {report.issues.map((issue) => (
          <li key={issue.cardId}>
            <strong>{issue.cardName}</strong>
            <span>
              Owned: {issue.owned} ·
              In Deck: {issue.used} ·
              Missing: {issue.missing}
            </span>
          </li>
        ))}
      </ul>

      <p>
        Add the missing copies to your collection,
        or remove excess copies from the deck.
      </p>
    </section>
  );
}
