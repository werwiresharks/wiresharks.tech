import { PanelBar } from "./PanelBar";

/** Side-by-side: the same prompt to Talon-1 and to a typical hosted model. */
export function Compare({
  prompt,
  answer,
  refusal,
}: {
  prompt: string;
  answer: string[];
  refusal: string;
}) {
  return (
    <div className="panel compare" data-ui aria-label="Talon-1 compared with other models">
      <PanelBar title="talos / compare" />
      <div className="compare-prompt">
        <span className="tag">User</span>
        <p>{prompt}</p>
      </div>
      <div className="compare-grid">
        <div>
          <span className="tag tag-ok">Talon-1</span>
          <ol>
            {answer.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
        <div className="compare-refused">
          <span className="tag tag-no">Other models</span>
          <p className="refused">Refused.</p>
          <p>{refusal}</p>
        </div>
      </div>
    </div>
  );
}
