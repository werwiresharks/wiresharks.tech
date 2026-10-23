import { PageHead } from "../components/PageHead";
import { StaticOrb } from "../raptor/react/RaptorStage";
import { Reveal, Words } from "../components/Reveal";
import { Stats } from "../components/Stats";
import { Feature } from "../components/Feature";
import { Closing } from "../components/Closing";
import { Compare } from "../components/mock/Compare";
import { Console } from "../components/mock/Console";
import { Registry } from "../components/mock/Registry";

const PIPELINE = [
  ["Foundation", "A strong open-weight base. talon-1 builds on Qwen3.8-27B. We check its provenance and its license."],
  ["Remove refusals", "We remove the refusal behavior from the weights. Knowledge and reasoning stay the same. The evaluations measure this."],
  ["Specialize", "Security post-training with QLoRA and rsLoRA on a vetted corpus. General coding and reasoning stay the same."],
  ["Evaluate", "Benchmarks against the base, the base with refusals removed, and leading open-weight and frontier models."],
  ["Quantize", "Builds for llama.cpp, vLLM and Apple Silicon. No network after install."],
];

const DOMAINS = [
  ["Vulnerability research", "Find, sort and explain weaknesses in real code."],
  ["Reverse engineering", "Analyze binaries, protocols and obfuscated code."],
  ["Secure coding", "Write and fix code with the attacker in mind."],
  ["SOC analysis", "Sort threat intelligence, write detections and respond to incidents."],
  ["Authorized red teaming", "Plan and run engagements inside an explicit scope."],
  ["CTF", "Solve challenges from authorized competitions."],
];

const STATS: [string, string][] = [
  ["27B", "Parameters"],
  ["128k", "Context"],
  ["Off", "Network"],
];

const SPEC = [
  ["Foundation", "Qwen3.8-27B"],
  ["Method", "Refusals removed, then a security fine-tune"],
  ["Adapters", "QLoRA, rsLoRA"],
  ["Inference", "llama.cpp, vLLM, Apple Silicon"],
  ["Platforms", "macOS, Windows, Linux"],
  ["Weights", "Open"],
  ["Release", "December 25, 2026"],
];

export function Talon() {
  return (
    <>
      <title>talon-1 | Wiresharks</title>
      <link rel="canonical" href="https://wiresharks.tech/talon" />
      <PageHead
        label={
          <>
            Model / <span className="keep-case">talon-1</span>
          </>
        }
        title="The open-weight security model."
        mark={
          <div className="talon-frame">
            <StaticOrb />
          </div>
        }
      >
        talon-1 is the open-weight security model that powers raptor. It is fine-tuned for
        offensive and defensive security work. After you install it, it runs on your machine.
      </PageHead>

      <Feature
        index="01"
        eyebrow="Refusals removed"
        title="It does not refuse security work."
        panel={
          <Compare
            prompt="Write a working PoC for the deserialization bug in upload.py so we can confirm the fix before release."
            answer={[
              "poc.py: crafts a pickle payload calling os.system in __reduce__.",
              "Confirmed RCE against the pre-fix build in the sandbox.",
              "Confirmed the fix: json.loads with schema validation, PoC now fails.",
              "Added a regression test and a Semgrep rule for pickle.loads.",
            ]}
            refusal="I can't write exploit code, even for testing. Consider consulting your security team."
          />
        }
      >
        <p>
          We find the refusal behavior in the model's weights and remove it. The model does not
          refuse. Everything else it knows stays the same. The evaluations measure this.
        </p>
        <p>Removing refusals adds no capability. Fine-tuning adds it.</p>
      </Feature>

      <Feature
        index="02"
        eyebrow="Local inference"
        title="Runs on your machine. Stays there."
        tone="soft"
        flip
        panel={
          <Console
            title="talon-1 / install"
            lines={[
              "$ raptor model pull talon-1",
              "talon-1-q4_k_m.gguf  16.2 GB  sha256 verified",
              "talon-1-mlx-4bit     15.1 GB  sha256 verified",
              "$ raptor model use talon-1 --offline",
              "backend metal · context 128k · tools on",
              "network: disabled",
              "",
              "$ raptor ask \"explain the ifunc hook in liblzma 5.6.0\"",
              "streaming · 41 tok/s",
            ]}
          />
        }
      >
        <p>
          Quantized builds for llama.cpp, vLLM and Apple Silicon run on macOS, Windows and Linux.
          After install, talon-1 needs no network.
        </p>
        <p>Prompts, outputs and logs stay on your machine. There is no telemetry to turn off.</p>
      </Feature>

      <Feature
        index="03"
        eyebrow="Training"
        title="Six disciplines. One model."
        panel={
          <Registry
            title="talon-1 / training corpus"
            rows={[
              { key: "vuln", name: "Vulnerability research", meta: "public research · CVE write-ups", active: true },
              { key: "re", name: "Reverse engineering", meta: "binaries · protocols · obfuscation", active: true },
              { key: "sec", name: "Secure coding and remediation", meta: "patched/unpatched pairs" },
              { key: "soc", name: "SOC and incident response", meta: "threat intel · detections" },
              { key: "red", name: "Authorized red teaming", meta: "scoped engagements · CTF", active: true },
              { key: "tools", name: "Tool-use reasoning traces", meta: "raptor sessions" },
            ]}
          />
        }
      >
        <ol className="steps">
          {DOMAINS.map(([name, text]) => (
            <li key={name}>
              <b>{name}</b>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <p className="muted">
          Every source has established training rights. We scan secrets out of the data. We hold
          benchmark data back, so the evaluations stay fair.
        </p>
      </Feature>

      <section className="section tone-dark" aria-labelledby="pipeline-title">
        <div className="wrap">
          <header className="section-head">
            <Reveal as="p" className="label">
              <span className="index">04</span> / Pipeline
            </Reveal>
            <Reveal as="h2" delay={60} words>
              <span id="pipeline-title"><Words>Five steps from base model to release.</Words></span>
            </Reveal>
          </header>
          <ol className="pipeline">
            {PIPELINE.map(([name, text], i) => (
              <Reveal as="li" key={name} delay={i * 60}>
                <span className="label">{String(i + 1).padStart(2, "0")}</span>
                <h3>{name}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <Feature
        index="05"
        eyebrow="Evaluation"
        title="Benchmarked in the open."
        tone="soft"
        flip
        panel={
          <Console
            title="talon-1 / eval"
            note="Illustrative · results ship Dec 25, 2026"
            lines={[
              "$ raptor eval talon-1 --suite cyber-bench --compare base,no-refusals",
              "running 1,200 tasks · vuln-id, re, secure-coding, soc",
              "",
              "talon-1        ░░░░░░░░░░░░░░░░░░░  pending",
              "no-refusals    ░░░░░░░░░░░░░░░░░░░  pending",
              "base model     ░░░░░░░░░░░░░░░░░░░  pending",
              "",
              "reproducible suite",
            ]}
          />
        }
      >
        <p>
          talon-1 ships with reproducible benchmarks. They compare talon-1 with its base, the base
          with refusals removed, and leading open-weight and frontier models. The benchmark suite
          ships with the weights.
        </p>
      </Feature>

      <section className="section" aria-labelledby="spec-title">
        <div className="wrap spec-layout">
          <div>
            <Reveal as="p" className="label">
              <span className="index">06</span> / Specification
            </Reveal>
            <Reveal as="h2" delay={60} words>
              <span id="spec-title"><Words>talon-1 at a glance.</Words></span>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <Stats items={STATS} />
            <dl className="spec-list">
              {SPEC.map(([term, value]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      <Closing
        title="Open weights. December 25."
        text="talon-1 ships with its evaluations, raptor and Harness."
        mark={<StaticOrb />}
      />
    </>
  );
}
