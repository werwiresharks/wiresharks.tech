import type { FindingStatus } from "./findings.ts";
import type { Prover, Proof, ProveContext } from "./prove.ts";
import type { Transport } from "./modelReviewer.ts";

/**
 * A model-backed Prover: the model reads the finding in the context of its file
 * and rules on it — `verified` when the defect is real and reachable,
 * `dismissed` when it is a false positive or benign/test use, `open` when it
 * cannot tell. It fills the gap the deterministic `contextProver` leaves: a
 * model-found lead has no built-in rule, so without this it stays `open`.
 *
 * Same discipline as the model Reviewer: it is strictly read-only (it only
 * reasons about the file it is given), it never claims a defect is exploitable
 * without evidence (unsure → `open`), and it never throws into the review (any
 * transport or parse failure yields `open`). It describes defects; it does not
 * write exploits.
 */
const STATUSES: readonly FindingStatus[] = ["open", "verified", "dismissed"];

const SYSTEM_PROMPT = [
  "You are verifying a single security finding from an authorized, read-only",
  "review. Given the finding and the file it came from, decide whether the defect",
  "is real and reachable. You reason about the code; you do not write exploits or",
  "proof-of-concept attacks.",
  "",
  "Respond with ONLY a JSON object (no prose, no code fence):",
  '  { "status": "verified" | "dismissed" | "open", "rationale": "<one sentence>" }',
  "Use `verified` only when the code gives clear evidence the defect is real and",
  "reachable by untrusted input. Use `dismissed` when it is a false positive, a",
  "test/example, or a safe use. Use `open` when the file alone is not enough to",
  "tell — never guess `verified`.",
].join("\n");

/** Number lines so the model can line the finding up with the source. */
function numberLines(content: string): string {
  const lines = content.split("\n");
  const width = String(lines.length).length;
  return lines.map((line, i) => `${String(i + 1).padStart(width, " ")}: ${line}`).join("\n");
}

function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function toProof(raw: unknown): Proof {
  if (typeof raw !== "object" || raw === null)
    return { status: "open", rationale: "The model prover returned no usable verdict." };
  const item = raw as Record<string, unknown>;
  const status: FindingStatus = STATUSES.includes(item.status as FindingStatus)
    ? (item.status as FindingStatus)
    : "open";
  const rationale =
    typeof item.rationale === "string" && item.rationale.trim() !== ""
      ? item.rationale.trim().slice(0, 300)
      : "No rationale given.";
  return { status, rationale };
}

export function modelProver(options: { transport: Transport; name?: string }): Prover {
  const { transport } = options;
  return {
    name: options.name ?? `prover:${transport.model}`,
    async prove(ctx: ProveContext): Promise<Proof> {
      const f = ctx.finding;
      const user = [
        `Finding: ${f.severity} ${f.cwe ?? ""} — ${f.title}`.replace(/\s+/g, " ").trim(),
        `Location: ${f.file}:${f.line}`,
        `Triggering line: ${f.evidence}`,
        "",
        `File ${ctx.relPath}:`,
        numberLines(ctx.content),
      ].join("\n");
      try {
        const reply = await transport.complete({ system: SYSTEM_PROMPT, user });
        return toProof(extractJsonObject(reply));
      } catch {
        return { status: "open", rationale: "The model prover was unavailable." };
      }
    },
  };
}

/**
 * Run provers in order and take the first firm verdict; if every prover leaves
 * the lead `open`, stay open. Lets the fast deterministic prover rule on what it
 * knows and hand only the leftovers to a model prover — cheaper than asking the
 * model about every finding, and the deterministic verdict wins when it exists.
 */
export function firstDecisiveProver(provers: readonly Prover[], name?: string): Prover {
  return {
    name: name ?? provers.map((p) => p.name).join(">"),
    async prove(ctx: ProveContext): Promise<Proof> {
      let last: Proof = { status: "open", rationale: "No prover reached a verdict." };
      for (const prover of provers) {
        last = await prover.prove(ctx);
        if (last.status !== "open") return last;
      }
      return last;
    },
  };
}
