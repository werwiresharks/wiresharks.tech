import { useCallback, useState } from "react";
import { Countdown } from "../components/Countdown";
import { Cta } from "../components/Cta";
import { Reveal } from "../components/Reveal";
import { Faq } from "../components/Faq";
import { Closing } from "../components/Closing";
import { Platform } from "../components/Platform";
import { ProductBlock } from "../components/ProductBlock";
import { Console } from "../components/mock/Console";
import { TaskGraph } from "../components/mock/TaskGraph";
import { Compare } from "../components/mock/Compare";
import { TalosStage } from "../talos/react/TalosStage";
import { useIdleEngine } from "../talos/react/hooks.ts";

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

const PRINCIPLES: [string, string][] = [
  ["Runs here. Stays here.", "Prompts, outputs and weights never leave your machine. No network after install, no telemetry to turn off."],
  ["Answers what others won't.", "Abliterated, so it stops refusing, then fine-tuned so it actually helps with real security work."],
  ["Open weights.", "The model, its evaluations and the Talos harness ship together, for you to run and inspect."],
  ["Proven, then patched.", "A finding is reproduced before it is reported, and a second model reviews every patch."],
];

/**
 * Where the orb sits in the hero. Wide screens put it to the right of the
 * copy so the headline reads on clear ground; tablets lift it above the copy;
 * phones tuck it into the top-right corner, partly off-canvas. Breakpoints
 * match the hero rules in styles.css.
 */
function heroFrame(w: number, h: number) {
  if (w >= 1024) {
    const radius = Math.min(w * 0.19, (h * 0.8) / 2 / 1.24);
    return { x: w * 0.73, y: h * 0.53, radius };
  }
  if (w >= 768) {
    // Tablet: orb in the upper field, copy anchored to the bottom (see CSS).
    const radius = Math.min(w * 0.26, h * 0.2);
    return { x: w * 0.66, y: Math.max(radius * 1.3 + 70, h * 0.26), radius };
  }
  return { x: w * 0.82, y: Math.min(h * 0.2, 190), radius: Math.min(w * 0.36, 220) };
}

export function Home() {
  const engine = useIdleEngine();
  const frame = useCallback(heroFrame, []);
  // Phones get fewer particles on top of the renderer's own hardware tiers.
  const [particleScale] = useState(() => (window.matchMedia("(max-width: 767px)").matches ? 0.55 : 1));

  return (
    <>
      <title>Wiresharks | The world's most dangerous AI.</title>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-backdrop" aria-hidden="true">
          <TalosStage
            engine={engine}
            frame={frame}
            interactive
            particleScale={particleScale}
            className="hero-stage"
          />
        </div>
        <div className="hero-inner wrap">
          <Reveal as="p" className="label hero-eyebrow">
            Wiresharks / Autonomous cybersecurity
          </Reveal>
          <Reveal as="h1" delay={60}>
            <span id="hero-title">The world's most dangerous AI.</span>
          </Reveal>
          <Reveal delay={120} className="hero-glass">
            <p>A local, open-weight cybersecurity model and the autonomous agent built around it.</p>
            <p className="hero-key label">
              <span>
                <b>Talon-1</b> Model
              </span>
              <span>
                <b>Talos</b> Agent
              </span>
            </p>
          </Reveal>
          <Reveal delay={180} className="hero-ctas">
            <Cta to="/talon">Explore Talon-1</Cta>
            <Cta to="/talos" variant="secondary">
              Meet Talos
            </Cta>
          </Reveal>
          <Reveal delay={240} className="hero-launch">
            <Countdown />
          </Reveal>
        </div>
      </section>

      <section className="products section tone-dark" id="products" aria-labelledby="products-title">
        <div className="wrap">
          <header className="section-head">
            <Reveal as="p" className="label">
              01 / Products
            </Reveal>
            <Reveal as="h2" delay={60}>
              <span id="products-title">A model, and the agent that puts it to work.</span>
            </Reveal>
            <Reveal as="p" delay={120} className="section-lede">
              Talon-1 is the intelligence. Talos is the system around it that plans, acts and
              checks its own work. They ship together, and Talos runs Talon-1 first.
            </Reveal>
          </header>

          <ProductBlock
            id="talon"
            index="01.1"
            kind="Model / Open weights"
            name="Talon-1"
            summary="A local, open-weight model, abliterated and fine-tuned for cybersecurity."
            specs={[
              ["Parameters", "27B"],
              ["Context", "128k"],
              ["Inference", "llama.cpp · vLLM · Apple Silicon"],
              ["Network", "None after install"],
            ]}
            to="/talon"
            linkLabel="Explore Talon-1"
            visual={
              <Console
                title="talon-1 / local"
                lines={[
                  "$ talos model use talon-1",
                  "# talon-1 · 27B · Q4_K_M · 16.2 GB",
                  "loaded in 3.1s on Apple M4 Max (metal)",
                  "context 128k · tools on · network off",
                  "",
                  '$ talos ask "triage scan.json by exploitability"',
                  "3 critical · 11 high · 128 informational",
                  "critical/1  CVE-2024-3094  reachable from sshd",
                  "critical/2  CWE-78         exec in deploy.sh:41",
                  "critical/3  CWE-502        pickle.loads on upload",
                ]}
              />
            }
          >
            <p>
              Security work runs on code, credentials and findings that should not leave the
              building. Talon-1 runs offline on a single workstation, so prompts, outputs and logs
              stay on the machine.
            </p>
            <p>
              Post-trained across vulnerability research, reverse engineering, secure coding, SOC
              analysis and authorized red teaming.
            </p>
          </ProductBlock>

          <div className="product-link" aria-hidden="true">
            <span className="label">Talon-1</span>
            <i />
            <span className="label">powers</span>
            <i />
            <span className="label">Talos</span>
          </div>

          <ProductBlock
            id="talos"
            index="01.2"
            kind="Agent / Harness"
            name="Talos"
            summary="The autonomous agent built around Talon-1."
            specs={[
              ["Engines", "Hermes · Claude Code · Codex"],
              ["Models", "Talon-1 local, APIs, private endpoints"],
              ["Workers", "Isolated git worktrees"],
              ["Merges", "Serialized, nothing unreviewed"],
            ]}
            to="/talos"
            linkLabel="Meet Talos"
            flip
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
          >
            <p>
              Talos plans a task, splits it across parallel workers, executes with scoped tools and
              verifies the result before anything lands.
            </p>
            <p>
              It runs Talon-1 locally by default, or any model you point it at. Model and engine
              are chosen separately, per task.
            </p>
          </ProductBlock>
        </div>
      </section>

      <Platform />

      <section className="principles section tone-soft" aria-labelledby="principles-title">
        <div className="wrap">
          <header className="section-head">
            <Reveal as="p" className="label">
              03 / Principles
            </Reveal>
            <Reveal as="h2" delay={60}>
              <span id="principles-title">Built for security intelligence.</span>
            </Reveal>
          </header>
          <ul className="principle-grid">
            {PRINCIPLES.map(([title, text], i) => (
              <Reveal as="li" key={title} delay={i * 70}>
                <span className="label">{String(i + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </ul>
          <div className="split">
            <div className="split-copy">
              <Reveal as="h3">One prompt. Two answers.</Reveal>
              <Reveal as="p" delay={60}>
                The same request to Talon-1 and to a typical hosted model, inside an authorized lab.
              </Reveal>
            </div>
            <Reveal className="split-visual" delay={120}>
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
            </Reveal>
          </div>
        </div>
      </section>

      <Faq items={FAQ} />

      <Closing
        title="No cloud. No refusals."
        text="Talon-1 weights, evaluations and the Talos harness ship together on December 25, 2026."
      />
    </>
  );
}
