import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Pause, Play } from "@phosphor-icons/react";
import { TalosStage } from "../talos/react/TalosStage";
import { useIdleEngine } from "../talos/react/hooks.ts";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function Hero() {
  const engine = useIdleEngine();
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const frame = useCallback((w: number, h: number) => {
    if (w >= 768) {
      // Keep the boundary clear of the masthead and the bottom strip.
      const top = 80;
      const usable = h - top - 56;
      const radius = Math.min(w * 0.19, usable * 0.36);
      return { x: w * 0.69, y: top + usable * 0.5, radius };
    }
    const radius = Math.min(w * 0.33, h * 0.21);
    return { x: w / 2, y: radius * 1.55 + 12, radius };
  }, []);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <TalosStage
        engine={engine}
        frame={frame}
        interactive
        paused={paused}
        className="hero-stage"
      />
      <div className="hero-marks" aria-hidden="true">
        <i />
        <i />
      </div>
      <div className="hero-copy section-wrap">
        <p className="eyebrow eyebrow-rule">Wiresharks / Talos</p>
        <h1 id="hero-title">
          Talos.
          <span>Autonomy you can inspect.</span>
        </h1>
        <p className="hero-summary">
          Wiresharks is building Talos, a unified autonomous agent system: tools, memory,
          specialized intelligence, and agent orchestration in one environment, with authority
          kept outside the model.
        </p>
        <div className="hero-actions">
          <Link className="button" to="/#talos">
            Explore Talos <ArrowRight size={16} />
          </Link>
          <Link className="text-link" to="/#talon">
            Talon-1 <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <div className="hero-strip section-wrap">
        <span className="hero-caption">
          <b>Talos Particle Engine</b> / Primary agent, idle. A visualization, not a live agent.
        </span>
        <button
          type="button"
          className="motion-toggle"
          onClick={() => setPaused(!paused)}
          disabled={reduced}
          aria-pressed={reduced ? undefined : paused}
        >
          {paused || reduced ? <Play size={12} /> : <Pause size={12} />}
          <span>{reduced ? "Reduced motion" : paused ? "Play motion" : "Pause motion"}</span>
        </button>
      </div>
    </section>
  );
}
