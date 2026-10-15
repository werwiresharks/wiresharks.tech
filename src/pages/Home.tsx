import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { Countdown } from "../components/Countdown";
import { Feature } from "../components/Feature";
import { Faq } from "../components/Faq";
import { Closing } from "../components/Closing";
import { Stack } from "../components/Stack";
import { Compare } from "../components/mock/Compare";
import { Console } from "../components/mock/Console";
import { TaskGraph } from "../components/mock/TaskGraph";
import { TalosStage } from "../talos/react/TalosStage";
import { useIdleEngine } from "../talos/react/hooks.ts";

const PRIVACY: [string, string][] = [
  ["Prompts", "Never leave the machine"],
  ["Weights", "Yours, on disk"],
  ["Network", "Not required"],
  ["Logs", "Local only"],
];

const STACK: [string, string][] = [
  ["Runtime", "Hermes"],
  ["Engine", "Claude Code"],
  ["Engine", "Codex"],
  ["Inference", "llama.cpp"],
  ["Inference", "vLLM"],
  ["Inference", "Apple Silicon"],
  ["Protocol", "MCP"],
  ["OS", "macOS"],
  ["OS", "Windows"],
  ["OS", "Linux"],
];

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
    if (w < 1024) {
      const radius = Math.min(w * 0.3, 140);
      return { x: w / 2, y: 80 + radius, radius };
    }
    return { x: w * 0.74, y: h * 0.5, radius: Math.min(w * 0.17, h * 0.34) };
  }, []);

  return (
    <>
      <title>Wiresharks | The world's most dangerous AI.</title>
      <section className="hero" aria-labelledby="hero-title">
        <TalosStage engine={engine} frame={frame} interactive className="hero-stage" />
        <div className="hero-copy section-wrap">
          <p className="eyebrow eyebrow-rule">Wiresharks / Talos · Talon-1</p>
          <h1 id="hero-title">The world's most dangerous AI.</h1>
          <p className="hero-sub">
            A local, open-weight cybersecurity model and the autonomous agent built around it.
            For red teams, security researchers and defense. No cloud. No refusals.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/talon">
              Talon-1 <ArrowRight size={14} />
            </Link>
            <Link className="button button-ghost" to="/talos">
              Talos <ArrowRight size={14} />
            </Link>
          </div>
          <Countdown />
        </div>
      </section>

      <section className="section-wrap lead-panel" aria-label="Example">
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
      </section>

      <Feature
        index="01"
        eyebrow="The model"
        title="Answers what other models won't."
        cta={{ to: "/talon", label: "Explore Talon-1" }}
        panel={
          <Console
            title="talon-1 / local"
            lines={[
              "$ talos model use talon-1",
              "# talon-1 · 27B · Q4_K_M · 16.2 GB",
              "loaded in 3.1s on Apple M4 Max (metal)",
              "context 128k · tools on · network off",
              "",
              "$ talos ask \"triage the findings in scan.json by exploitability\"",
              "reading scan.json (142 findings)",
              "3 critical · 11 high · 128 informational",
              "critical/1  CVE-2024-3094  reachable from sshd",
              "critical/2  CWE-78         unsanitized exec in deploy.sh:41",
              "critical/3  CWE-502        pickle.loads on user upload",
            ]}
          />
        }
      >
        <p>
          Talon-1 is a 27B open-weight model, abliterated and then fine-tuned on vulnerability
          research, reverse engineering, secure coding, SOC analysis and authorized red teaming.
        </p>
        <p>
          It runs on one machine, offline, inside Talos or behind any OpenAI-compatible endpoint
          you host yourself.
        </p>
      </Feature>

      <Feature
        index="02"
        eyebrow="The agent"
        title="Every engine. One harness."
        cta={{ to: "/talos", label: "Explore Talos" }}
        flip
        panel={
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
          Talos is built on Hermes Agent and adds first-class engines for Claude Code and Codex.
          It splits a task across parallel workers, each in its own worktree, and verifies every
          result with a second model before it lands.
        </p>
        <p>Skills load on demand. Memory persists across sessions. Nothing merges unreviewed.</p>
      </Feature>

      <section className="statement section-wrap" aria-labelledby="statement-title">
        <p className="eyebrow">Local by design</p>
        <h2 id="statement-title">
          Runs here.
          <br />
          Stays here.
        </h2>
        <dl className="privacy">
          {PRIVACY.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="block section-wrap" aria-labelledby="stack-title">
        <p className="eyebrow">Integrations</p>
        <h2 id="stack-title">Fits the tools you already run.</h2>
        <p className="block-lede">
          Keep the coding tools you already use. Talos drives them. Talon-1 runs under any
          inference backend you prefer.
        </p>
        <Stack items={STACK} />
      </section>

      <Faq items={FAQ} />

      <Closing
        title="No cloud. No refusals."
        text="Talon-1 weights, evaluations and the Talos harness ship together on December 25, 2026."
      />
    </>
  );
}
