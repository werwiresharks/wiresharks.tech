import type { CSSProperties } from "react";
import { ClawTear } from "../components/ClawTear";
import { Countdown } from "../components/Countdown";
import { Cta } from "../components/Cta";
import { TalonIcon, RaptorIcon } from "../components/ProductIcons";
import { Reveal, Words } from "../components/Reveal";
import { Faq } from "../components/Faq";
import { Closing } from "../components/Closing";
import { Platform } from "../components/Platform";
import { ProductBlock } from "../components/ProductBlock";
import { Swarm } from "../components/Swarm";
import { Console } from "../components/mock/Console";
import { TaskGraph } from "../components/mock/TaskGraph";
import { Compare } from "../components/mock/Compare";
import { StaticOrb } from "../raptor/react/RaptorStage";
import { HomeJourney } from "../raptor/react/HomeJourney";

const FAQ: [string, string][] = [
  [
    "What is Raptor-1?",
    "Raptor-1 is the autonomous cybersecurity agent. It plans a task and splits the work across parallel workers. Each worker gets its own copy of the code and tests on real systems. Raptor-1 checks the result. It runs Talon-1 on your machine, or any model you choose. Harness is the infrastructure that runs and coordinates the work.",
  ],
  [
    "What is Talon-1?",
    "Talon-1 is the model that powers Raptor-1. It is a 27B open-weight model, fine-tuned for offensive and defensive cybersecurity. It runs on your machine. It ships with its evaluations on December 25, 2026.",
  ],
  [
    "Does the model refuse security questions?",
    "No. We remove the model's refusal behavior from its weights, so it does not refuse security work. Its knowledge and reasoning stay intact. The evaluations measure this.",
  ],
  [
    "Does it need the cloud?",
    "No. After install, Talon-1 runs offline. Prompts, outputs and logs stay on your machine.",
  ],
  [
    "What hardware does it need?",
    "Quantized builds run on one workstation or laptop. Use Apple Silicon with 32 GB or more, or a CUDA GPU with 24 GB or more. Exact requirements ship with the release.",
  ],
];

const PRINCIPLES: [string, string][] = [
  ["Runs here. Stays here.", "Prompts, outputs and weights never leave your machine. After install, no network is needed. There is no telemetry to turn off."],
  ["Answers what others won't.", "We remove the model's refusal behavior, then fine-tune it for real security work."],
  ["Open weights.", "Talon-1, its evaluations, Raptor-1 and Harness ship together. You run them. You inspect them."],
  ["Proven, then patched.", "Raptor-1 reproduces every finding before it reports it. A second model reviews every patch."],
];

export function Home() {
  return (
    <div className="home-page">
      <HomeJourney />
      <title>Wiresharks | The world's most dangerous AI.</title>

      <section className="hero" aria-labelledby="hero-title">
        <ClawTear />
        <div className="hero-backdrop" aria-hidden="true">
          <StaticOrb />
        </div>
        <div className="hero-inner wrap">
          <Reveal as="p" className="label hero-eyebrow">
            Wiresharks / Autonomous cybersecurity
          </Reveal>
          <Reveal as="h1" delay={60} words>
            <span id="hero-title">
              <Words>The world's most</Words>{" "}
              <span className="dangerous word" style={{ "--i": 3 } as CSSProperties}>
                dangerous
              </span>{" "}
              <Words from={4}>AI.</Words>
            </span>
          </Reveal>
          <Reveal delay={120} className="hero-glass">
            <p>An autonomous cybersecurity agent, and the local, open&#8209;weight model it runs on.</p>
            <p className="hero-key label">
              <span>
                <b>Raptor-1</b> Agent
              </span>
              <span>
                <b>Talon-1</b> Model
              </span>
            </p>
          </Reveal>
          <Reveal delay={180} className="hero-ctas">
            <Cta to="/raptor" icon={<RaptorIcon />}>
              Meet Raptor-1
            </Cta>
            <Cta to="/talon" variant="secondary" icon={<TalonIcon />}>
              Explore Talon-1
            </Cta>
          </Reveal>
          {/* Phones stack the orb here, in flow, with the countdown beneath it. */}
          <div className="hero-orb-group">
            <div className="hero-orb-slot" aria-hidden="true">
              <StaticOrb />
            </div>
            <Reveal delay={240} className="hero-launch">
              <Countdown />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="products section tone-dark" id="products" aria-labelledby="products-title">
        <div className="wrap">
          <header className="section-head">
            <span className="home-landing" data-home-stop="products" aria-hidden="true" />
            <Reveal as="p" className="label">
              <span className="index">01</span> / Products
            </Reveal>
            <Reveal as="h2" delay={60} words>
              <span id="products-title"><Words>An agent, and the model it runs on.</Words></span>
            </Reveal>
            <Reveal as="p" delay={120} className="section-lede">
              Raptor-1 is the agent. It plans, acts and checks its own work. Talon-1 is the model
              Raptor-1 runs on. The two ship together.
            </Reveal>
          </header>

          <ProductBlock
            id="raptor"
            index="01.1"
            kind="Agent / Runs on Harness"
            name="Raptor-1"
            summary="The autonomous agent that runs Talon-1 by default."
            specs={[
              ["Engines", "Hermes · Claude Code · Codex"],
              ["Models", "Talon-1 (local), commercial APIs, private endpoints"],
              ["Workers", "Each in its own copy of the code"],
              ["Merges", "One at a time, always reviewed"],
            ]}
            to="/raptor"
            linkLabel="Meet Raptor-1"
            visual={
              <TaskGraph
                journey
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
              Raptor-1 plans a task and splits it across parallel workers. Workers act with scoped
              tools. Raptor-1 verifies the result before anything lands.
            </p>
            <p>
              By default, it runs Talon-1 on your machine. You can point it at any other model. You
              choose the model and the engine separately for each task.
            </p>
          </ProductBlock>

          <div className="product-link" aria-hidden="true">
            <span className="label">Raptor-1</span>
            <i />
            <span className="label">runs on</span>
            <i />
            <span className="label">Talon-1</span>
          </div>

          <ProductBlock
            id="talon"
            index="01.2"
            kind="Model / Open weights"
            name="Talon-1"
            summary="The open-weight model that powers Raptor-1."
            stats={[
              ["27B", "Parameters"],
              ["128k", "Context"],
              ["Off", "Network after install"],
            ]}
            specs={[
              ["Inference", "llama.cpp · vLLM · Apple Silicon"],
              ["Weights", "Open"],
            ]}
            to="/talon"
            linkLabel="Explore Talon-1"
            flip
            visual={
              <div className="home-console">
                <span className="home-local-landing" data-home-stop="talon" aria-hidden="true" />
                <Console
                  title="talon-1 / local"
                  lines={[
                    "$ raptor model use talon-1",
                    "# talon-1 · 27B · Q4_K_M · 16.2 GB",
                    "loaded in 3.1s on Apple M4 Max (metal)",
                    "context 128k · tools on · network off",
                    "",
                    '$ raptor ask "triage scan.json by exploitability"',
                    "3 critical · 11 high · 128 informational",
                    "critical/1  CVE-2024-3094  reachable from sshd",
                    "critical/2  CWE-78         exec in deploy.sh:41",
                    "critical/3  CWE-502        pickle.loads on upload",
                  ]}
                />
              </div>
            }
          >
            <p>
              Security work involves code, credentials and findings that must not leave the
              building. Talon-1 runs offline on one workstation. Prompts, outputs and logs stay on
              your machine.
            </p>
            <p>
              Talon-1 is fine-tuned for offensive and defensive cybersecurity. It covers
              vulnerability research, reverse engineering, secure coding, SOC analysis and
              authorized red teaming.
            </p>
          </ProductBlock>
        </div>
      </section>

      <Swarm />

      <div className="home-platform">
        <span className="home-section-landing" data-home-stop="platform" aria-hidden="true" />
        <Platform />
      </div>

      <section className="principles section tone-soft" id="principles" aria-labelledby="principles-title">
        <div className="wrap">
          <header className="section-head">
            <span className="home-landing" data-home-stop="principles" aria-hidden="true" />
            <Reveal as="p" className="label">
              <span className="index">04</span> / Principles
            </Reveal>
            <Reveal as="h2" delay={60} words>
              <span id="principles-title"><Words>Built for real security work.</Words></span>
            </Reveal>
          </header>
          <ul className="principle-grid">
            {PRINCIPLES.map(([title, text], i) => (
              <Reveal as="li" key={title} delay={i * 70}>
                <span className="principle-number label">{String(i + 1).padStart(2, "0")}<i data-home-principle={i} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </ul>
          <div className="split">
            <div className="split-copy">
              <Reveal as="h3">One prompt. Two answers.</Reveal>
              <Reveal as="p" delay={60}>
                One request, sent to Talon-1 and to a typical hosted model in an authorized lab.
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

      <div className="home-closing">
        <span className="home-section-landing" data-home-stop="closing" aria-hidden="true" />
        <Closing
          title="No cloud. No refusals."
          text="Talon-1 weights, evaluations, Raptor-1 and Harness ship together on December 25, 2026."
        />
      </div>
    </div>
  );
}
