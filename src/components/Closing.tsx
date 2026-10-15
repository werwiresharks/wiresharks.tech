import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { Countdown } from "./Countdown";

export function Closing({ title, text }: { title: string; text: string }) {
  return (
    <section className="closing section-wrap" aria-label="Release">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="hero-actions">
          <Link className="button" to="/talon">
            Talon-1 <ArrowRight size={14} />
          </Link>
          <Link className="button button-ghost" to="/talos">
            Talos <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <Countdown />
    </section>
  );
}
