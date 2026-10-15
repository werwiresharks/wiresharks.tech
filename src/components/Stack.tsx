/** "Works with your stack": a tagged grid of tools. */
export function Stack({ items }: { items: [string, string][] }) {
  return (
    <ul className="stackgrid">
      {items.map(([kind, name]) => (
        <li key={name}>
          <span className="stack-kind">{kind}</span>
          <b>{name}</b>
        </li>
      ))}
    </ul>
  );
}
