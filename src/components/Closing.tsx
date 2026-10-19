import { Reveal, Words } from "./Reveal";
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
          <Reveal as="h2" delay={60} words>
            <span id="closing-title"><Words>{title}</Words></span>
          </Reveal>
          <Reveal as="p" delay={120} className="section-lede">
            {text}
          </Reveal>
          <Reveal delay={180} className="closing-ctas">
            <Cta to="/raptor" variant="inverse">
              Meet Raptor-1
            </Cta>
            <Cta to="/talon" variant="secondary">
              Explore Talon-1
            </Cta>
          </Reveal>
        </div>
        <div className="closing-launch">
          <Countdown mega />
        </div>
      </div>
    </section>
  );
}
