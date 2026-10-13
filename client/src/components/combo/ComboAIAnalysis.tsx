import {
  useRef,
  useState,
} from "react";

import type {
  EvaluatedCombo,
} from "../../models/ComboEvaluation";

import {
  buildComboAIContext,
} from "../../services/ai/comboAIContextService";

import {
  requestComboAIAnalysis,
  type AIComboAnalysis,
} from "../../services/ai/comboAIAnalysisService";

interface Props {
  combos: EvaluatedCombo[];
}

function ComboAIAnalysisContent({ combos }: Props) {
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] =
    useState<AIComboAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  async function handleAnalyze() {
    if (loading || combos.length === 0) return;

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const request = buildComboAIContext(
        combos.slice(0, 10),
        question
      );

      const result = await requestComboAIAnalysis(
        request
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      setAnalysis(result.analysis);
    } catch (cause) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(
        cause instanceof Error
          ? cause.message
          : "AI analysis failed."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }

  return (
    <section className="combo-ai-analysis">
      <h2>AI Combo Analysis</h2>

      <p>
        Compare discovered combo lines using
        their simulated outcomes and scores.
      </p>

      <label htmlFor="combo-ai-question">
        What would you like to analyze?
      </label>

      <textarea
        id="combo-ai-question"
        value={question}
        maxLength={1000}
        onChange={event =>
          setQuestion(event.target.value)
        }
        placeholder="Which combo gives me the best end board?"
      />

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading || combos.length === 0}
      >
        {loading ? "Analyzing..." : "Analyze Combos"}
      </button>

      {error && <p role="alert">{error}</p>}

      {analysis && (
        <div aria-live="polite">
          <h3>Analysis Summary</h3>
          <p>{analysis.summary}</p>

          <p>
            <strong>Recommended combo:</strong>{" "}
            {analysis.recommendedComboId}
          </p>

          {analysis.explanations.map(item => (
            <article key={item.comboId}>
              <h4>{item.comboId}</h4>
              <p>{item.explanation}</p>

              <h5>Advantages</h5>
              <ul>
                {item.advantages.map((value, index) => (
                  <li key={index}>{value}</li>
                ))}
              </ul>

              <h5>Limitations</h5>
              <ul>
                {item.limitations.map((value, index) => (
                  <li key={index}>{value}</li>
                ))}
              </ul>
            </article>
          ))}

          <h4>Important caveats</h4>
          <ul>
            {analysis.caveats.map((value, index) => (
              <li key={index}>{value}</li>
            ))}
          </ul>

          <p>
            AI explanations are based on supplied
            simulator evidence. Official duel legality
            has not been verified.
          </p>
        </div>
      )}
    </section>
  );
}

export function ComboAIAnalysis({ combos }: Props) {
  const comboKey = JSON.stringify(
    combos.map(item => ({
      id: item.combo.id,
      stateKey: item.combo.stateKey,
      score: item.score,
    }))
  );

  return (
    <ComboAIAnalysisContent
      key={comboKey}
      combos={combos}
    />
  );
}