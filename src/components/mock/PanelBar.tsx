/**
 * Title bar shared by every mock panel. The panels show representative
 * sessions, not recorded output, so each one says so.
 */
export function PanelBar({ title, note = "Illustrative" }: { title: string; note?: string }) {
  return (
    <div className="panel-bar">
      <span className="panel-dots" aria-hidden="true" />
      <span>{title}</span>
      <span className="panel-note">{note}</span>
    </div>
  );
}
