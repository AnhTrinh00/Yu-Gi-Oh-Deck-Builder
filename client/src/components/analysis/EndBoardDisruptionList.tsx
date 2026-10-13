import type {
  DisruptionAnalysis,
} from "../../models/DisruptionAnalysis";

interface Props {
  analysis: DisruptionAnalysis;
}

export default function EndBoardDisruptionList({
  analysis,
}: Props) {
  return (
    <section aria-label="End-board disruptions">
      <h4>Disruption Analysis</h4>

      <div className="end-board-disruption-summary">
        <p>
          <strong>
            {analysis.conditionallyAvailableCount}
          </strong>
          {" "}Conditionally Available
        </p>

        <p>
          <strong>{analysis.potentialCount}</strong>
          {" "}Potential
        </p>

        <p>
          <strong>{analysis.unknownCount}</strong>
          {" "}Unknown
        </p>

        <p>
          <strong>{analysis.unavailableCount}</strong>
          {" "}Unavailable
        </p>
      </div>

      {analysis.disruptions.length === 0 ? (
        <p>
          No registered disruptions were detected.
          This does not prove the board has no
          interruptions.
        </p>
      ) : (
        <ul className="end-board-disruption-list">
          {analysis.disruptions.map((disruption) => (
            <li
              key={`${disruption.definitionId}-${disruption.instanceId}`}
            >
              <strong>{disruption.description}</strong>

              <p>
                Type: {disruption.type}
                {" · "}
                Status: {disruption.availability}
              </p>

              {disruption.reasons.length > 0 && (
                <ul>
                  {disruption.reasons.map(
                    (reason, index) => (
                      <li key={index}>{reason}</li>
                    )
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}