import { Countdown } from "../components/Countdown";
import { Feature } from "../components/Feature";
import { Closing } from "../components/Closing";
import { Compare } from "../components/mock/Compare";
import { Console } from "../components/mock/Console";
import { Registry } from "../components/mock/Registry";

const PIPELINE = [
  ["Foundation", "A strong open-weight base. Qwen3.8-27B is the lead candidate, with provenance and license verified."],
  ["Abliterate", "Remove the refusal direction from the weights. Knowledge and reasoning are untouched."],
  ["Specialize", "Cybersecurity post-training with QLoRA and rsLoRA on a vetted corpus. General coding and reasoning preserved."],
  ["Evaluate", "Benchmarked against the base, the abliterated variant, leading open-weight models and frontier models."],
  ["Quantize", "Hardware-specific builds for llama.cpp, vLLM and Apple Silicon. Offline after install."],
];

const DOMAINS = [
  ["Vulnerability research", "Find, triage and explain weaknesses in real code."],
  ["Reverse engineering", "Binaries, protocols and obfuscated code."],
  ["Secure coding", "Write and remediate with the attacker in mind."],
  ["SOC analysis", "Threat intelligence, detection and incident response."],
  ["Authorized red teaming", "Plan and execute within an explicit scope."],
  ["CTF", "Trained on authorized competition environments."],
];

const SPEC = [
  ["Foundation", "Qwen3.8-27B (candidate)"],
  ["Parameters", "27B"],
  ["Method", "Abliteration, then cybersecurity SFT"],
  ["Adapters", "QLoRA, rsLoRA"],
  ["Context", "128k"],
  ["Inference", "llama.cpp, vLLM, Apple Silicon"],
  ["Platforms", "macOS, Windows, Linux"],
  ["Network", "None required after install"],
  ["Weights", "Open"],
  ["Release", "December 25, 2026"],
];

export function Talon() {
  return (
    <>
      <title>Talon-1 | Wiresharks</title>
      <header className="page-head section-wrap">
        <div>
          <p className="eyebrow eyebrow-rule">Talon-1 · The model</p>
          <h1>The world's most dangerous model.</h1>
          <p className="page-lede">
            A locally runnable, fine-tuned, abliterated open-weight model built for frontier-level
            cybersecurity capability. It is the intelligence inside Talos. It needs no cloud.
          </p>
        </div>
        <Countdown />
      </header>

      <Feature
        index="01"
        eyebrow="Abliterated"
        title="Nothing held back."
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
          Abliteration identifies the refusal direction in the model's activations and removes
          it from the weights. The model keeps everything it knows. It stops refusing.
        </p>
        <p>Reduced refusal is not more capability. That is what the fine-tuning is for.</p>
      </Feature>

      <Feature
        index="02"
        eyebrow="Local"
        title="Runs on your machine. Stays there."
        flip
        panel={
          <Console
            title="talon-1 / install"
            lines={[
              "$ talos model pull talon-1",
              "talon-1-q4_k_m.gguf  16.2 GB  sha256 verified",
              "talon-1-mlx-4bit     15.1 GB  sha256 verified",
              "$ talos model use talon-1 --offline",
              "backend metal · context 128k · tools on",
              "network: disabled",
              "",
              "$ talos ask \"explain the ifunc hook in liblzma 5.6.0\"",
              "streaming · 41 tok/s",
            ]}
          />
        }
      >
        <p>
          Quantized builds for llama.cpp, vLLM and Apple Silicon. macOS, Windows and Linux. After
          install, no network is required.
        </p>
        <p>
          Prompts, outputs and logs never leave the machine. There is no telemetry to turn off.
        </p>
      </Feature>

      <Feature
        index="03"
        eyebrow="Specialized"
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
              { key: "tools", name: "Tool-use reasoning traces", meta: "Talos sessions" },
            ]}
          />
        }
      >
        <ol className="steps">
          {DOMAINS.map(([name, text], i) => (
            <li key={name}>
              <span className="mono">{String(i + 1).padStart(2, "0")}</span>
              <b>{name}</b>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <p className="muted">
          Every source has established training rights. Secrets are scanned out. Benchmark data
          is held back so the evaluations mean something.
        </p>
      </Feature>

      <section className="block section-wrap" aria-labelledby="pipeline-title">
        <p className="eyebrow">How it is made</p>
        <h2 id="pipeline-title">Not trained from scratch. Sharpened.</h2>
        <ol className="pipeline">
          {PIPELINE.map(([name, text], i) => (
            <li key={name}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{name}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="block two-col section-wrap" aria-labelledby="spec-title">
        <div>
          <p className="eyebrow">Specification</p>
          <h2 id="spec-title">Frontier-class is the target, not the claim.</h2>
          <p className="muted">
            Talon-1 ships with reproducible benchmarks against its base, its abliterated variant,
            leading open-weight models and frontier models. Results publish with the weights.
          </p>
          <p className="muted">
            <b>Talon-2.</b> In research.
          </p>
        </div>
        <dl className="spec spec-list">
          {SPEC.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Closing title="Open weights. December 25." text="Talon-1 ships with its evaluations and the Talos harness." />
    </>
  );
}
