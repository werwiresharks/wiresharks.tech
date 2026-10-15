/** A terminal transcript. Lines starting with "$" render as commands. */
export function Console({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="panel console" data-ui aria-label={title}>
      <div className="panel-bar">
        <span className="panel-dots" aria-hidden="true" />
        <span>{title}</span>
      </div>
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
