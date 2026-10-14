import type {
  NormalizedAIRecommendationResult,
} from "../../services/ai/aiRecommendationNormalizationService";

interface Props {
  result: NormalizedAIRecommendationResult;
  cardNames?: ReadonlyMap<number, string>;
}

export default function AIRecommendationPanel({
  result,
  cardNames,
}: Props) {
  function cardName(id: number): string {
    return cardNames?.get(id) ?? `Card ${id}`;
  }

  return (
    <section
      className="ai-recommendation-panel"
      aria-label="AI deck recommendations"
    >
      <h3>AI Deck Recommendations</h3>

      <p>{result.summary}</p>

      <div className="ai-recommendation-summary">
        <p>
          <strong>{result.acceptedCount}</strong>{" "}
          passed simulation
        </p>

        <p>
          <strong>{result.rejectedCount}</strong>{" "}
          rejected
        </p>
      </div>

      {result.recommendations.length === 0 ? (
        <p>
          The AI did not suggest any deck changes.
        </p>
      ) : (
        <div className="analysis-result-list">
          {result.recommendations.map((item) => {
            const {
              recommendation,
              status,
              reasonMessages,
            } = item;

            const passed = status === "accepted";

            return (
              <article
                key={item.index}
                className={
                  `analysis-result-card ` +
                  `ai-recommendation-card ${status}`
                }
              >
                <div className="ai-recommendation-header">
                  <h4>
                    {recommendation.action.toUpperCase()}
                    {" "}
                    {cardName(recommendation.cardId)}
                    {" ×"}
                    {recommendation.quantity}
                  </h4>

                  <span
                    className={
                      `ai-recommendation-status ${status}`
                    }
                  >
                    {passed
                      ? "Passed simulation"
                      : "Rejected"}
                  </span>
                </div>

                {recommendation.action === "replace" &&
                  recommendation.replacementCardId !==
                    undefined && (
                    <p>
                      <strong>Replace with:</strong>{" "}
                      {cardName(
                        recommendation.replacementCardId
                      )}
                    </p>
                  )}

                <p>
                  <strong>Section:</strong>{" "}
                  {recommendation.section}
                </p>

                <p>
                  <strong>Confidence:</strong>{" "}
                  {recommendation.confidence}
                </p>

                <p>{recommendation.reason}</p>

                <details>
                  <summary>
                    Validation details
                  </summary>

                  <ul>
                    <li>
                      Grounding: {item.groundingStatus}
                    </li>

                    <li>
                      Independent validation:{" "}
                      {item.validationStatus}
                    </li>

                    <li>
                      Simulation:{" "}
                      {item.simulationStatus}
                    </li>
                  </ul>

                  {reasonMessages.length > 0 && (
                    <>
                      <strong>Reasons</strong>
                      <ul>
                        {reasonMessages.map(
                          (message, index) => (
                            <li key={index}>
                              {message}
                            </li>
                          )
                        )}
                      </ul>
                    </>
                  )}
                </details>
              </article>
            );
          })}
        </div>
      )}

      <p className="analysis-disclaimer">
        Passing simulation means the proposed change
        passed the current deterministic checks.
        It does not guarantee complete Yu-Gi-Oh!
        rules legality or modify your saved deck.
      </p>
    </section>
  );
}