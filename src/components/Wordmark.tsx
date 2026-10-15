export function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <span className={large ? "wordmark wordmark-large" : "wordmark"}>
      WIRE<span>SHARKS</span>
      <i aria-hidden="true" />
    </span>
  );
}
