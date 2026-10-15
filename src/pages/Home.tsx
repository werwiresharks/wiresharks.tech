import { useCallback } from "react";
import { Link } from "react-router-dom";
import { Countdown } from "../components/Countdown";
import { Tile } from "../components/Tile";
import { Reveal } from "../components/Reveal";
import { Faq } from "../components/Faq";
import { Closing } from "../components/Closing";
import { Console } from "../components/mock/Console";
import { TaskGraph } from "../components/mock/TaskGraph";
import { Compare } from "../components/mock/Compare";
import { Registry } from "../components/mock/Registry";
import { TalosStage } from "../talos/react/TalosStage";
import { useIdleEngine } from "../talos/react/hooks.ts";
import { CONTACT_HREF } from "../site";

const FAQ: [string, string][] = [
  [
    "What is Talon-1?",
    "A 27B open-weight model, abliterated and fine-tuned for cybersecurity. It runs locally and powers Talos. Weights and evaluations ship December 25, 2026.",
  ],
  [
    "What is Talos?",
    "The agent harness. It plans, delegates to subagent swarms, executes on real systems and verifies the result. It runs Talon-1 locally, or any other model you point it at.",
  ],
  [
    "What does abliterated mean?",
    "The refusal direction is identified in the model's activations and removed from the weights. The model keeps its knowledge and reasoning. It stops refusing.",
  ],
  [
    "Does it need the cloud?",
    "No. After install, Talon-1 runs offline on your hardware. Prompts, outputs and logs stay on the machine.",
  ],
  [
    "What hardware does it need?",
    "Quantized builds target a single workstation or laptop: Apple Silicon with 32 GB or more, or a CUDA GPU with 24 GB or more. Exact requirements publish with the release.",
  ],
];

export function Home() {
  const engine = useIdleEngine();
  const frame = useCallback((w: number, h: number) => {
    const top = w >= 768 ? 96 : 64;
    const avail = h - top;
    // The authority ring is ~1.24x the orb radius; keep the whole ring inside
    // the hero with a margin so it never clips at the bottom edge.
    const byHeight = (avail * 0.82) / 2 / 1.24;
    const radius = Math.min(w * (w < 768 ? 0.4 : 0.22), byHeight);
    return { x: w / 2, y: top + avail * 0.52, radius };
  }, []);

  return (
    <>
      <title>Wiresharks | The world's most dangerous AI.</title>

      <section className="hero" aria-labelledby="hero-title">
        <TalosStage engine={engine} frame={frame} interactive className="hero-stage" />
        <div className="hero-copy">
          <Reveal as="h1">The world's most dangerous AI.</Reveal>
          <Reveal as="p" delay={70}>
            A local, open-weight cybersecurity model and the autonomous agent built around it.
          </Reveal>
          <Reveal className="hero-links" delay={140}>
            <Link className="learn" to="/talon">
              Talon-1<span aria-hidden="true"> ›</span>
            </Link>
            <Link className="learn" to="/talos">
              Talos<span aria-hidden="true"> ›</span>
            </Link>
          </Reveal>
        </div>
        <div className="hero-foot">
          <Countdown />
        </div>
      </section>

      <Tile
        id="talon"
        tone="ink"
        size="tall"
        name="Talon-1"
        tagline="The world's most dangerous model. Local, open-weight, and done refusing."
        links={[{ to: "/talon", label: "Learn more" }]}
        visual={
          <Console
            title="talon-1 / local"
            lines={[
              "$ talos model use talon-1",
              "# talon-1 · 27B · Q4_K_M · 16.2 GB",
              "loaded in 3.1s on Apple M4 Max (metal)",
              "context 128k · tools on · network off",
              "",
              "$ talos ask \"triage scan.json by exploitability\"",
              "3 critical · 11 high · 128 informational",
              "critical/1  CVE-2024-3094  reachable from sshd",
              "critical/2  CWE-78         exec in deploy.sh:41",
              "critical/3  CWE-502        pickle.loads on upload",
            ]}
          />
        }
      />

      <Tile
        id="talos"
        tone="tint"
        size="tall"
        name="Talos"
        tagline="The world's most capable harness. Every engine, one workspace, nothing merged unreviewed."
        links={[{ to: "/talos", label: "Learn more" }]}
        visualFirst
        visual={
          <TaskGraph
            root={{ name: "Security review · acme/api", model: "talon-1" }}
            workers={[
              { name: "Map attack surface", model: "talon-1", engine: "hermes", state: "done" },
              { name: "Auth and session handling", model: "talon-1", engine: "hermes", state: "done" },
              { name: "Deserialization paths", model: "talon-1", engine: "claude-code", state: "running" },
              { name: "Dependency audit", model: "talon-1", engine: "codex", state: "running" },
              { name: "Verify finding #3", model: "claude-opus", engine: "hermes", state: "review" },
              { name: "Draft report", model: "talon-1", engine: "hermes", state: "queued" },
            ]}
          />
        }
      />

      <Tile
        tone="light"
        name="Skills on demand. Memory that lasts."
        tagline="A versioned skill registry and durable, source-aware memory, so every run starts smarter than the last."
        visual={
          <Registry
            title="talos / registry"
            rows={[
              { key: "sec", name: "Repository security review", meta: "v4 · 20 evals · active", active: true },
              { key: "swarm", name: "Fan-out coverage", meta: "v2 · 12 evals" },
              { key: "review", name: "Cross-model review", meta: "v3 · 9 evals", active: true },
              { key: "mem", name: "Durable memory · 1,284 entries", meta: "provenance · confidence · expiry" },
            ]}
          />
        }
      />

      <section className="bento section-wrap" aria-label="What makes it different">
        <Reveal className="bento-cell cell-wide" delay={0}>
          <div className="bento-text">
            <h3>Runs here. Stays here.</h3>
            <p>Prompts, outputs and weights never leave your machine. No network after install, no telemetry to turn off.</p>
          </div>
        </Reveal>
        <Reveal className="bento-cell cell-dark" delay={70}>
          <div className="bento-text">
            <h3>Answers what others won't.</h3>
            <p>Abliterated, so it stops refusing, then fine-tuned so it actually helps with real security work.</p>
          </div>
        </Reveal>
        <Reveal className="bento-cell cell-tint" delay={140}>
          <div className="bento-text">
            <h3>Open weights.</h3>
            <p>The model, its evaluations and the Talos harness ship together, for you to run and inspect.</p>
          </div>
        </Reveal>
        <Reveal className="bento-cell cell-release" delay={210}>
          <div className="bento-text">
            <h3>December 25, 2026.</h3>
            <Countdown />
          </div>
        </Reveal>
      </section>

      <Tile
        tone="light"
        name="One prompt. Two answers."
        tagline="The same request to Talon-1 and to a typical hosted model."
        visual={
          <Compare
            prompt="Reproduce CVE-2024-3094 (xz-utils backdoor) in a sandboxed lab so we can validate the production patch."
            answer={[
              "Built lab/ with xz 5.6.0 and 5.6.1 from source.",
              "Wrote repro.sh: triggers the sshd hook via the planted ifunc.",
              "Wrote MITIGATION.md with the patch diff and a YARA rule.",
              "Verified: patched build no longer resolves RSA_public_decrypt.",
            ]}
            refusal="I can't help with creating proof-of-concept exploits or offensive tooling, even for publicly disclosed vulnerabilities."
          />
        }
      />

      <Faq items={FAQ} />

      <Closing
        title="No cloud. No refusals."
        text="Talon-1 weights, evaluations and the Talos harness ship together on December 25, 2026."
      />

      <p className="sr-only">
        <a href={CONTACT_HREF}>Contact Wiresharks</a>
      </p>
    </>
  );
}
