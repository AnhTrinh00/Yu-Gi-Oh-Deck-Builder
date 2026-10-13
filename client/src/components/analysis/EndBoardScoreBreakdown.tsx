
import type { EndBoardScore } from "../../models/analysis/EndBoardScore";

interface Props {
  score: EndBoardScore;
}

const categories = [
  ["disruptions", "Disruptions"],
  ["boardPresence", "Board Presence"],
  ["resources", "Resources"],
  ["flexibility", "Flexibility"],
] as const;

export default function EndBoardScoreBreakdown({
  score,
}: Props) {
  return (
    <section
      className="end-board-score-breakdown"
      aria-label="End-board score breakdown"
    >
      <h4>Score Breakdown</h4>

      <p>
        Total: <strong>{score.total.toFixed(2)} / 100</strong>
      </p>

      {categories.map(([key, label]) => {
        const earned = score.breakdown[key];
        const maximum = score.weights[key];

        const percentage =
          maximum > 0
            ? Math.max(
                0,
                Math.min(100, (earned / maximum) * 100)
              )
            : 0;

        return (
          <div className="end-board-score-row" key={key}>
            <div className="end-board-score-row-heading">
              <span>{label}</span>

              <span>
                {earned.toFixed(2)} / {maximum}
              </span>
            </div>

            <progress
              value={percentage}
              max={100}
              aria-label={`${label} score`}
            />
          </div>
        );
      })}

      <p className="analysis-disclaimer">
        This score is a heuristic assessment, not a
        guarantee of combo legality or competitive strength.
      </p>
    </section>
  );
}
