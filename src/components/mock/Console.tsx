import { PanelBar } from "./PanelBar";

/** A terminal transcript. Lines starting with "$" render as commands. */
export function Console({ title, note, lines }: { title: string; note?: string; lines: string[] }) {
  return (
    <div className="panel console" data-ui aria-label={title}>
      <PanelBar title={title} note={note} />
      <pre>
        {lines.map((line, i) => (
          <span key={i} className={line.startsWith("$") ? "cmd" : line.startsWith("#") ? "dim" : undefined}>
            {line}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}
