import { ClawTear } from "../components/ClawTear";
import { Countdown } from "../components/Countdown";
import { Cta } from "../components/Cta";
import { TalonIcon, RaptorIcon } from "../components/ProductIcons";
import { Reveal } from "../components/Reveal";
import { Faq } from "../components/Faq";
import { Closing } from "../components/Closing";
import { Platform } from "../components/Platform";
import { ProductBlock } from "../components/ProductBlock";
import { Console } from "../components/mock/Console";
import { TaskGraph } from "../components/mock/TaskGraph";
import { Compare } from "../components/mock/Compare";
import { StaticOrb } from "../talos/react/TalosStage";
import { HomeJourney } from "../talos/react/HomeJourney";

const FAQ: [string, string][] = [
  [
    "What is Talon-1?",
    "Our premier cyber-capable frontier model. Talon-1 pairs Pareto-efficient performance with fine-tuning for additional offensive and defensive cybersecurity capability. The 27B open-weight model runs locally and powers Raptor. Weights and evaluations ship December 25, 2026.",
  ],
  [
    "What is Raptor?",
    "The autonomous cybersecurity agent. It plans, delegates to subagent swarms, executes on real systems and verifies the result. It runs Talon-1 locally, or any other model you point it at. Harness is the execution and orchestration infrastructure it runs on.",
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
  ["Open weights.", "The model, its evaluations, Raptor and Harness ship together, for you to run and inspect."],
  ["Proven, then patched.", "A finding is reproduced before it is reported, and a second model reviews every patch."],
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
          <Reveal as="h1" delay={60}>
            <span id="hero-title">The world's most <span className="dangerous">dangerous</span> AI.</span>
          </Reveal>
          <Reveal delay={120} className="hero-glass">
            <p>A local, open-weight cybersecurity model and the autonomous agent built around it.</p>
            <p className="hero-key label">
              <span>
                <b>Talon-1</b> Model
              </span>
              <span>
                <b>Raptor</b> Agent
              </span>
            </p>
          </Reveal>
          <Reveal delay={180} className="hero-ctas">
            <Cta to="/talon" icon={<TalonIcon />}>
              Explore Talon-1
            </Cta>
            <Cta to="/raptor" variant="secondary" icon={<RaptorIcon />}>
              Meet Raptor
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
              01 / Products
            </Reveal>
            <Reveal as="h2" delay={60}>
              <span id="products-title">A model, and the agent that puts it to work.</span>
            </Reveal>
            <Reveal as="p" delay={120} className="section-lede">
              Talon-1 is the intelligence. Raptor is the agent around it that plans, acts and
              checks its own work. They ship together, and Raptor runs Talon-1 first.
            </Reveal>
          </header>

          <ProductBlock
            id="talon"
            index="01.1"
            kind="Model / Open weights"
            name="Talon-1"
            summary="Our premier cyber-capable frontier model."
            specs={[
              ["Parameters", "27B"],
              ["Context", "128k"],
              ["Inference", "llama.cpp · vLLM · Apple Silicon"],
              ["Network", "None after install"],
            ]}
            to="/talon"
            linkLabel="Explore Talon-1"
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
              Security work runs on code, credentials and findings that should not leave the
              building. Talon-1 runs offline on a single workstation, so prompts, outputs and logs
              stay on the machine.
            </p>
            <p>
              Frontier-level capability with Pareto-efficient performance. Fine-tuned for additional
              offensive and defensive cybersecurity capability across vulnerability research,
              reverse engineering, secure coding, SOC analysis and authorized red teaming.
            </p>
          </ProductBlock>

          <div className="product-link" aria-hidden="true">
            <span className="label">Talon-1</span>
            <i />
            <span className="label">powers</span>
            <i />
            <span className="label">Raptor</span>
          </div>

          <ProductBlock
            id="talos"
            index="01.2"
            kind="Agent / Runs on Harness"
            name="Raptor"
            summary="The autonomous agent built around Talon-1."
            specs={[
              ["Engines", "Hermes · Claude Code · Codex"],
              ["Models", "Talon-1 local, APIs, private endpoints"],
              ["Workers", "Isolated git worktrees"],
              ["Merges", "Serialized, nothing unreviewed"],
            ]}
            to="/raptor"
            linkLabel="Meet Raptor"
            flip
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
              Raptor plans a task, splits it across parallel workers, executes with scoped tools and
              verifies the result before anything lands.
            </p>
            <p>
              It runs Talon-1 locally by default, or any model you point it at. Model and engine
              are chosen separately, per task.
            </p>
          </ProductBlock>
        </div>
      </section>

      <div className="home-platform">
        <span className="home-section-landing" data-home-stop="platform" aria-hidden="true" />
        <Platform />
      </div>

      <section className="principles section tone-soft" id="principles" aria-labelledby="principles-title">
        <div className="wrap">
          <header className="section-head">
            <span className="home-landing" data-home-stop="principles" aria-hidden="true" />
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

      <div className="home-closing">
        <span className="home-section-landing" data-home-stop="closing" aria-hidden="true" />
        <Closing
          title="No cloud. No refusals."
          text="Talon-1 weights, evaluations, Raptor and Harness ship together on December 25, 2026."
        />
      </div>
    </div>
  );
}
