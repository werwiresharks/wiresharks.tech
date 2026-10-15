const AREAS = [
  ["Agent orchestration", "Coordinating many agents toward one outcome."],
  ["Persistent memory", "Knowledge that survives beyond a single session."],
  ["Context continuity", "Carrying the thread of work across handoffs."],
  ["Tool execution", "Acting on real systems through well-defined interfaces."],
  ["Specialized skills", "Reusable workflows for recurring kinds of work."],
  ["Model flexibility", "Choosing the right model for each task."],
  ["Multi-agent coordination", "Parallel work that stays legible."],
  ["Transparent authorization", "Control that is visible and held by the runtime."],
];

export function PhilosophySection() {
  return (
    <section className="section philosophy section-wrap" id="philosophy" aria-labelledby="philosophy-title">
      <header className="section-head">
        <p className="eyebrow">04 / Engineering philosophy</p>
        <h2 id="philosophy-title">
          On the shoulders
          <br />
          of giants.
        </h2>
        <div className="section-lede">
          <p>
            Much of what makes agents useful was pioneered elsewhere: tool use, retrieval and
            memory, multi-agent coordination, long-running context management. Wiresharks did not
            invent these ideas. Our work is to study the strongest of them, integrate them into
            one coherent system, and improve them where integration exposes gaps.
          </p>
        </div>
      </header>
      <ol className="areas" aria-label="Areas of interest">
        {AREAS.map(([name, text], i) => (
          <li key={name}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <h3>{name}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
