import type { ReactNode } from "react";
import { Reveal, Words } from "./Reveal";
import { Countdown } from "./Countdown";
import { Cta } from "./Cta";

export function Closing({ title, text, mark }: { title: string; text: string; mark?: ReactNode }) {
  return (
    <section className="closing section tone-dark" aria-labelledby="closing-title">
      <div className="wrap closing-inner">
        <div>
          <Reveal as="h2" delay={60} words>
            <span id="closing-title"><Words>{title}</Words></span>
          </Reveal>
          <Reveal as="p" delay={120} className="section-lede">
            {text}
          </Reveal>
          <Reveal delay={180} className="closing-ctas">
            <Cta to="/raptor" variant="inverse">
              Meet raptor
            </Cta>
            <Cta to="/talon" variant="secondary">
              Explore talon-1
            </Cta>
          </Reveal>
        </div>
        {mark && (
          <div className="closing-mark" aria-hidden="true">
            {mark}
          </div>
        )}
        <div className="closing-launch">
          <Countdown mega />
        </div>
      </div>
    </section>
  );
}
