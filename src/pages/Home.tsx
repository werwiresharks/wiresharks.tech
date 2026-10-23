import type { CSSProperties } from "react";
import { ClawTear } from "../components/ClawTear";
import { Countdown } from "../components/Countdown";
import { Cta } from "../components/Cta";
import { TalonIcon, RaptorIcon } from "../components/ProductIcons";
import { Reveal, Words } from "../components/Reveal";
import { RaptorWordmark } from "../components/RaptorWordmark";
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
    "What is raptor?",
    "raptor is the autonomous cybersecurity agent, built on Hermes and running on Harness. It plans a task and splits the work across parallel workers. Each worker gets its own copy of the code. When a command needs your approval, raptor shows you the whole command first. It runs talon-1 on your machine, or any model you choose. Harness is the infrastructure that runs and coordinates raptor's work.",
  ],
  [
    "What is talon-1?",
    "talon-1 is the open-weight security model that powers raptor. It is a 27B model, fine-tuned for offensive and defensive security work. It runs on your machine. It ships with its evaluations on December 25, 2026.",
  ],
  [
    "Does the model refuse security questions?",
    "No. We remove the refusal behavior from the model's weights, so it does not refuse security work. Its knowledge and reasoning stay the same. The evaluations measure this.",
  ],
  [
    "Does it need the cloud?",
    "No. After you install it, talon-1 runs offline. Prompts, outputs and logs stay on your machine.",
  ],
  [
    "What hardware does it need?",
    "Quantized builds run on one workstation or laptop. Use Apple Silicon with 32 GB of memory or more, or a CUDA GPU with 24 GB or more. The release lists the exact requirements.",
  ],
];

const PRINCIPLES: [string, string][] = [
  ["Runs here. Stays here.", "Prompts, outputs and weights stay on your machine. After install, talon-1 needs no network. There is no telemetry to turn off."],
  ["No refusals on security work.", "We remove the refusal behavior from the weights. Then we fine-tune the model for security work."],
  ["Open weights.", "talon-1, its evaluations, raptor and Harness ship together. You run them. You inspect them."],
  ["You approve what runs.", "raptor shows the whole command before you approve it. It records each decision on your machine."],
];

export function Home() {
  return (
    <div className="home-page">
      <HomeJourney />
      <title>Wiresharks | The world's most dangerous AI.</title>
      <link rel="canonical" href="https://wiresharks.tech/" />

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
            <p>An autonomous cybersecurity agent, and the local, open&#8209;weight model that powers it.</p>
            <p className="hero-key label">
              <span>
                <b>
                  <RaptorWordmark />
                </b>{" "}
                Agent
              </span>
              <span>
                <b className="keep-case">talon-1</b> Model
              </span>
            </p>
          </Reveal>
          <Reveal delay={180} className="hero-ctas">
            <Cta to="/raptor" icon={<RaptorIcon />}>
              Meet raptor
            </Cta>
            <Cta to="/talon" variant="secondary" icon={<TalonIcon />}>
              Explore talon-1
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
              <span id="products-title"><Words>An agent, and the model that powers it.</Words></span>
            </Reveal>
            <Reveal as="p" delay={120} className="section-lede">
              raptor is the agent. It plans the work, does it and checks it. talon-1 is the model
              that powers raptor. The two ship together.
            </Reveal>
          </header>

          <ProductBlock
            id="raptor"
            index="01.1"
            kind="Agent / Runs on Harness"
            name={<RaptorWordmark />}
            summary="The autonomous agent. It runs talon-1 by default."
            specs={[
              ["Engines", "Hermes · Claude Code · Codex"],
              ["Models", "talon-1 (local), commercial APIs, private endpoints"],
              ["Workers", "Own copy of the code, resumable"],
              ["Approvals", "The whole command, shown first"],
            ]}
            to="/raptor"
            linkLabel="Meet raptor"
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
              raptor plans a task and splits it across parallel workers. Each worker uses only the
              tools its scope allows. A finished worker can resume later with its full context.
            </p>
            <p>
              By default, raptor runs talon-1 on your machine. You can use any other model. You
              choose the model and the engine for each task.
            </p>
          </ProductBlock>

          <div className="product-link" aria-hidden="true">
            <span className="label keep-case">raptor</span>
            <i />
            <span className="label">powered by</span>
            <i />
            <span className="label keep-case">talon-1</span>
          </div>

          <ProductBlock
            id="talon"
            index="01.2"
            kind="Model / Open weights"
            name="talon-1"
            summary="The open-weight model that powers raptor."
            stats={[
              ["27B", "Parameters"],
              ["128k", "Context"],
              ["Off", "Network"],
            ]}
            specs={[
              ["Inference", "llama.cpp · vLLM · Apple Silicon"],
              ["Weights", "Open"],
            ]}
            to="/talon"
            linkLabel="Explore talon-1"
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
              Security work uses code, credentials and findings that must stay in your building.
              talon-1 runs offline on one workstation. Prompts, outputs and logs stay on your
              machine.
            </p>
            <p>
              talon-1 is fine-tuned for offensive and defensive security work. It covers
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
              <span id="principles-title"><Words>Built for authorized security work.</Words></span>
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
                One request, sent to talon-1 and to a typical hosted model in an authorized lab.
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
          text="talon-1 weights, its evaluations, raptor and Harness ship together on December 25, 2026."
        />
      </div>
    </div>
  );
}
