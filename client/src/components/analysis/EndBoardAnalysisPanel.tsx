import type {
  EndBoardAnalysis,
} from "../../models/EndBoardAnalysis";

import type {
  EndBoardResourceSnapshot,
} from "../../models/EndBoardResources";

import type {
  DisruptionAnalysis,
} from "../../models/DisruptionAnalysis";

import type {
  EndBoardScore,
} from "../../models/EndBoardScore";

import EndBoardScoreBreakdown from "./EndBoardScoreBreakdown";
import EndBoardDisruptionList from "./EndBoardDisruptionList";

import "./endBoardAnalysis.css";

interface Props {
  board: EndBoardAnalysis;
  resources: EndBoardResourceSnapshot;
  disruptions: DisruptionAnalysis;
  score: EndBoardScore;
}

export default function EndBoardAnalysisPanel({
  board,
  resources,
  disruptions,
  score,
}: Props) {
  const warnings = Array.from(
    new Set([
      ...board.warnings,
      ...disruptions.warnings,
      ...score.warnings,
    ])
  );

  return (
    <section
      className="end-board-analysis-panel"
      aria-label="End-board analysis"
    >
      <header>
        <h3>End-Board Analysis</h3>

        <p>
          Analysis status:{" "}
          <strong>{score.confidence}</strong>
        </p>
      </header>

      <div className="end-board-metrics">
        <div>
          <span>Board Score</span>
          <strong>{score.total.toFixed(2)} / 100</strong>
        </div>

        <div>
          <span>Field Monsters</span>
          <strong>{resources.fieldMonsters}</strong>
        </div>

        <div>
          <span>Spell/Traps</span>
          <strong>{resources.fieldSpellTraps}</strong>
        </div>

        <div>
          <span>Hand Cards</span>
          <strong>{resources.hand.total}</strong>
        </div>

        <div>
          <span>Graveyard Cards</span>
          <strong>{resources.graveyard.total}</strong>
        </div>

        <div>
          <span>Xyz Materials</span>
          <strong>{resources.xyzMaterials}</strong>
        </div>

        <div>
          <span>Normal Summon</span>
          <strong>
            {resources.normalSummonAvailable
              ? "Available"
              : "Used"}
          </strong>
        </div>
      </div>
      
      <EndBoardScoreBreakdown score={score} />
      <EndBoardDisruptionList analysis={disruptions} />

      <details>
        <summary>Board Cards</summary>

        <h4>Monsters</h4>

        <ul>
          {board.monsters.map((monster) => (
            <li key={monster.instanceId}>
              Card {monster.cardId}
              {" · "}
              {monster.position}
              {" · "}
              {monster.xyzMaterials.length} material(s)
            </li>
          ))}
        </ul>

        <h4>Spell/Traps</h4>

        <ul>
          {board.spellTraps.map((card) => (
            <li key={card.instanceId}>
              Card {card.cardId}
              {" · "}
              {card.position}
            </li>
          ))}
        </ul>

        {board.fieldSpell && (
          <p>
            Field Spell: Card {board.fieldSpell.cardId}
          </p>
        )}
      </details>

      {warnings.length > 0 && (
        <section
          className="end-board-analysis-warnings"
          aria-label="Analysis limitations"
        >
          <h4>Analysis Limitations</h4>

          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}