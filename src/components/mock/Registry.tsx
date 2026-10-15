/** A keyed list panel, used for skills, memory and engine catalogs. */
export function Registry({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; name: string; meta: string; active?: boolean }[];
}) {
  return (
    <div className="panel registry" data-ui aria-label={title}>
      <div className="panel-bar">
        <span className="panel-dots" aria-hidden="true" />
        <span>{title}</span>
      </div>
      <ol>
        {rows.map((r) => (
          <li key={r.key} className={r.active ? "is-active" : undefined}>
            <span className="mono">{r.key}</span>
            <b>{r.name}</b>
            <span className="mono">{r.meta}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
