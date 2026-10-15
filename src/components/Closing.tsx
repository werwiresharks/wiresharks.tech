import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";
import { Countdown } from "./Countdown";

export function Closing({ title, text }: { title: string; text: string }) {
  return (
    <section className="closing" aria-label="Release">
      <Reveal as="h2">{title}</Reveal>
      <Reveal as="p" delay={70}>
        {text}
      </Reveal>
      <Reveal className="closing-foot" delay={140}>
        <Countdown />
      </Reveal>
      <Reveal className="ptile-links" delay={200}>
        <Link className="learn learn-light" to="/talon">
          Talon-1<span aria-hidden="true"> ›</span>
        </Link>
        <Link className="learn learn-light" to="/talos">
          Talos<span aria-hidden="true"> ›</span>
        </Link>
      </Reveal>
    </section>
  );
}
