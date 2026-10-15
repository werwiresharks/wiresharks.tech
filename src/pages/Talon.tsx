import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { Countdown } from "../components/Countdown";

const PIPELINE = [
  ["Foundation", "A strong open-weight base. Qwen3.8-27B is the lead candidate, with provenance and license verified."],
  ["Abliterate", "Remove the refusal direction from the weights. The model engages with the questions others turn away."],
  ["Specialize", "Cybersecurity post-training with QLoRA and rsLoRA on a vetted corpus. General coding and reasoning are preserved."],
  ["Evaluate", "Benchmarked against the base, the abliterated variant, leading open-weight models and frontier models."],
  ["Quantize", "Hardware-specific builds for llama.cpp, vLLM and Apple Silicon. Runs offline after install."],
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
  ["Inference", "llama.cpp, vLLM, Apple Silicon"],
  ["Platforms", "macOS, Windows, Linux"],
  ["Network", "None required after install"],
  ["Weights", "Open"],
  ["Release", "December 25, 2026"],
];

const CORPUS = [
  "Public security research",
  "Authorized CTF environments",
  "Cleared team research",
  "Tool-use reasoning traces",
];

export function Talon() {
  return (
    <>
      <title>Talon-1 | Wiresharks</title>
      <header className="page-head section-wrap">
        <p className="eyebrow eyebrow-rule">Talon-1</p>
        <h1>The world's most dangerous model.</h1>
        <p className="page-lede">
          Talon-1 is a locally runnable, fine-tuned, abliterated open-weight model built for
          frontier-level cybersecurity capability. It is the intelligence inside Talos. It needs
          no cloud.
        </p>
      </header>

      <section className="release release-large section-wrap" aria-label="Talon-1 release">
        <div>
          <Countdown />
        </div>
      </section>

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

      <section className="block section-wrap" aria-labelledby="domains-title">
        <p className="eyebrow">Capabilities</p>
        <h2 id="domains-title">Six disciplines. One model.</h2>
        <ol className="features">
          {DOMAINS.map(([name, text], i) => (
            <li key={name}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{name}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="block section-wrap" aria-labelledby="spec-title">
        <p id="spec-title" className="eyebrow">Specification</p>
        <dl className="spec">
          {SPEC.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="block two-col section-wrap" aria-labelledby="corpus-title">
        <div>
          <p className="eyebrow">Training corpus</p>
          <h2 id="corpus-title">Vetted, scanned, uncontaminated.</h2>
          <p className="muted">
            Every source has established training rights. Secrets are scanned out. Benchmark
            data is held back so the evaluations mean something.
          </p>
        </div>
        <ul className="lineage">
          {CORPUS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section className="block two-col section-wrap" aria-labelledby="eval-title">
        <div>
          <p className="eyebrow">Evaluation</p>
          <h2 id="eval-title">Frontier-class is the target, not the claim.</h2>
          <p className="muted">
            Reduced refusal is not capability. Talon-1 ships with reproducible benchmarks against
            its base, its abliterated variant, leading open-weight models and frontier models.
            Results publish with the weights.
          </p>
        </div>
        <div className="release-inline">
          <Link className="button" to="/talos">
            Runs inside Talos <ArrowRight size={16} />
          </Link>
          <p className="muted">
            <b>Talon-2.</b> In research.
          </p>
        </div>
      </section>
    </>
  );
}
