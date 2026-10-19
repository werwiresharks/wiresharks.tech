import type { CSSProperties } from "react";
import { PanelBar } from "./PanelBar";
import { useInView } from "../useInView";

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
  const [ref, entrance] = useInView<HTMLDivElement>();
  const state = entrance === "still" ? "" : entrance === "play" ? " is-streaming in" : " is-streaming";
  return (
    <div ref={ref} className={`panel compare${state}`} data-ui aria-label="Talon-1 compared with other models">
      <PanelBar title="talon-1 / compare" />
      <div className="compare-prompt">
        <span className="tag">User</span>
        <p>{prompt}</p>
      </div>
      <div className="compare-grid">
        <div>
          <span className="tag tag-ok">Talon-1</span>
          <ol>
            {answer.map((line, i) => (
              <li key={line} style={{ "--i": i } as CSSProperties}>
                {line}
              </li>
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
