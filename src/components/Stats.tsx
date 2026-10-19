/** Large tabular numerals over mono captions: the headline specs of a product. */
export function Stats({ items }: { items: [value: string, caption: string][] }) {
  return (
    <dl className="stats">
      {items.map(([value, caption]) => (
        <div key={caption}>
          <dt className="label">{caption}</dt>
          <dd className="stat">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
