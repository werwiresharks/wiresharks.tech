import type { CSSProperties, ReactNode } from "react";
import { PanelBar } from "./PanelBar";
import { useInView } from "../useInView";

// Severity words, success words, then paths and identifiers: the first match wins.
const TOKENS = /\b(critical|high)\b|\b(reproduced|done|verified|approve)\b|((?:\.{0,2}\/)?[\w-]+(?:\/[\w.-]+)+|[\w-]+\.(?:sh|py|md|diff|json|gguf)(?::\d+)?|\b(?:CWE|CVE)-[\d-]+|#\d+)/g;
const CLASSES = ["sev", "ok", "id"];

function highlight(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKENS)) {
    const kind = match.slice(1).findIndex(Boolean);
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <span key={match.index} className={CLASSES[kind]}>
        {match[0]}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Line({ line }: { line: string }) {
  if (line.startsWith("$")) {
    return (
      <span className="cmd">
        <span className="prompt">$</span>
        {line.slice(1)}
      </span>
    );
  }
  if (line.startsWith("#")) return <span className="dim">{line}</span>;
  return <>{highlight(line)}</>;
}

/**
 * A terminal transcript. Lines starting with "$" render as commands, "#" as
 * comments. The lines stream in the first time the panel is seen.
 */
export function Console({ title, note, lines }: { title: string; note?: string; lines: string[] }) {
  const [ref, entrance] = useInView<HTMLDivElement>();
  const state = entrance === "still" ? "" : entrance === "play" ? " is-streaming in" : " is-streaming";
  return (
    <div ref={ref} className={`panel console${state}`} data-ui aria-label={title}>
      <PanelBar title={title} note={note} />
      <pre>
        {lines.map((line, i) => (
          <span key={i} className="line" style={{ "--i": i } as CSSProperties}>
            <Line line={line} />
            {i === lines.length - 1 && <span className="caret" aria-hidden="true" />}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}
