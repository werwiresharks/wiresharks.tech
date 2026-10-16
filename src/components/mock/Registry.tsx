import { PanelBar } from "./PanelBar";

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
      <PanelBar title={title} />
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
