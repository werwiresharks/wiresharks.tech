import { Reveal } from "./Reveal";
import { Countdown } from "./Countdown";
import { Cta } from "./Cta";

export function Closing({ title, text }: { title: string; text: string }) {
  return (
    <section className="closing section tone-dark" aria-labelledby="closing-title">
      <div className="wrap closing-inner">
        <div>
          <Reveal as="p" className="label">
            Release
          </Reveal>
          <Reveal as="h2" delay={60}>
            <span id="closing-title">{title}</span>
          </Reveal>
          <Reveal as="p" delay={120} className="section-lede">
            {text}
          </Reveal>
          <Reveal delay={180} className="closing-ctas">
            <Cta to="/talon" variant="inverse">
              Explore Talon-1
            </Cta>
            <Cta to="/talos" variant="secondary">
              Meet Talos
            </Cta>
          </Reveal>
        </div>
        <Reveal delay={200} className="closing-launch">
          <Countdown />
        </Reveal>
      </div>
    </section>
  );
}
