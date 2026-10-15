import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { Countdown } from "../components/Countdown";
import { TalosStage } from "../talos/react/TalosStage";
import { useIdleEngine } from "../talos/react/hooks.ts";

const STATS = [
  ["27B", "parameters, runs on one machine"],
  ["0", "cloud calls after install"],
  ["3", "coding engines in one harness"],
  ["Dec 25", "open-weight release"],
];

const DOMAINS = [
  "Vulnerability research",
  "Reverse engineering",
  "Secure coding",
  "SOC analysis",
  "Authorized red teaming",
  "CTF",
];

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
          <p className="hero-sub">
            An autonomous agent and the cybersecurity model that powers it. Local, open-weight,
            and built to work as one.
          </p>
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

      <section className="split section-wrap" aria-label="Two parts">
        <Link className="split-item" to="/talos">
          <span className="eyebrow">01 / The agent</span>
          <h2>Talos</h2>
          <p>
            The harness. It plans, delegates to subagent swarms, executes on real systems and
            verifies the result. Built on Hermes, running Claude Code, Codex and its own engine
            in one workspace.
          </p>
          <span className="split-cta">
            Explore Talos <ArrowRight size={14} />
          </span>
        </Link>
        <Link className="split-item" to="/talon">
          <span className="eyebrow">02 / The model</span>
          <h2>Talon-1</h2>
          <p>
            The intelligence. A 27B open-weight model, abliterated and fine-tuned for
            cybersecurity. Runs offline on a laptop. Powers Talos without a cloud.
          </p>
          <span className="split-cta">
            Explore Talon-1 <ArrowRight size={14} />
          </span>
        </Link>
      </section>

      <section className="stats section-wrap" aria-label="At a glance">
        {STATS.map(([value, label]) => (
          <div key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="domains section-wrap" aria-labelledby="domains-title">
        <p id="domains-title" className="eyebrow">Trained for</p>
        <ul>
          {DOMAINS.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
