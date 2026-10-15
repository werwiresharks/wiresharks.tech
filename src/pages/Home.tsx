import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { Countdown } from "../components/Countdown";
import { TalosStage } from "../talos/react/TalosStage";
import { useIdleEngine } from "../talos/react/hooks.ts";

export function Home() {
  const engine = useIdleEngine();
  const frame = useCallback((w: number, h: number) => {
    const top = w >= 768 ? 80 : 64;
    return { x: w / 2, y: top + (h - top) / 2, radius: Math.min(w * 0.4, (h - top) * 0.38) };
  }, []);

  return (
    <>
      <title>Wiresharks | The world's most dangerous AI.</title>
      <section className="hero" aria-labelledby="hero-title">
        <TalosStage engine={engine} frame={frame} interactive className="hero-stage" />
        <div className="hero-copy section-wrap">
          <p className="eyebrow eyebrow-rule">Wiresharks</p>
          <h1 id="hero-title">The world's most dangerous AI.</h1>
          <Countdown />
          <div className="hero-actions">
            <Link className="button" to="/talon">
              Talon-1 <ArrowRight size={16} />
            </Link>
            <Link className="text-link" to="/talos">
              Talos <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
      <section className="tiles section-wrap" aria-label="Products">
        <Link className="tile" to="/talos">
          <span className="eyebrow">01 / Harness</span>
          <h2>Talos</h2>
          <p>The world's most capable harness.</p>
          <ArrowRight size={20} />
        </Link>
        <Link className="tile" to="/talon">
          <span className="eyebrow">02 / Model</span>
          <h2>Talon-1</h2>
          <p>The world's most dangerous model.</p>
          <ArrowRight size={20} />
        </Link>
      </section>
    </>
  );
}
