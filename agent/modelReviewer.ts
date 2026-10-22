import type { Finding, Severity } from "./findings.ts";
import type { Reviewer, ReviewContext } from "./reviewer.ts";

/**
 * The model-backed Reviewer: the seam the product page means by "works with any
 * model", filled in. Where `patternReviewer` matches regexes, this asks an
 * aligned model to reason over a file and report the security defects it sees.
 * It is still only a Reviewer — it opens leads for the Prove step to rule on;
 * it reads a file and reports, and does nothing else.
 *
 * Two deliberate choices keep it honest and safe:
 *
 *  - **Evidence is ground truth, never the model's word.** A finding's evidence
 *    is the real source line at the line the model cites, read back from the
 *    file — so the model cannot invent a quote, and a hallucinated line number
 *    is dropped rather than shown.
 *  - **It never throws into the review.** Any transport, parse or validation
 *    failure yields no findings for that file; a flaky model degrades the pass,
 *    it does not wedge it. This mirrors the engine's boundary validators.
 *
 * The HTTP call goes through `anthropicTransport` by default, but the `Transport`
 * seam lets a test inject a deterministic fake — so the whole reviewer is
 * covered offline, with no network and no API key.
 */

/** Sends one review request and returns the model's text output. */
export interface Transport {
  readonly model: string;
  complete(input: { system: string; user: string }): Promise<string>;
}

export interface ModelReviewerOptions {
  /** How the request reaches a model. Defaults to `anthropicTransport()`. */
  transport?: Transport;
  /** Files larger than this are skipped, to bound cost. Default 64 KiB. */
  maxFileBytes?: number;
  name?: string;
}

const SEVERITIES: readonly Severity[] = ["info", "low", "medium", "high", "critical"];

const SYSTEM_PROMPT = [
  "You are a security code reviewer performing an authorized, read-only review of a",
  "repository the operator controls. You examine one file at a time and report the",
  "security defects you find, as leads for a human to verify. You do not write",
  "exploits, payloads, or proof-of-concept attack code; you describe the defect and",
  "cite its location.",
  "",
  "Return ONLY a JSON array (no prose, no code fence). Each element is an object:",
  '  { "line": <1-based integer>, "cwe": <"CWE-NNN" or null>,',
  '    "severity": "info"|"low"|"medium"|"high"|"critical", "title": <short string> }',
  "Report only genuine security defects — injection, unsafe deserialization, broken",
  "auth or crypto, hard-coded secrets, SSRF, path traversal, and the like. Do not",
  "flag style or non-security issues. If the file has no security defects, return [].",
].join("\n");

/** Number each line so the model can cite exact locations. */
function numberLines(content: string): string {
  const lines = content.split("\n");
  const width = String(lines.length).length;
  return lines
    .map((line, i) => `${String(i + 1).padStart(width, " ")}: ${line}`)
    .join("\n");
}

/** Pull the first balanced JSON array out of a model reply, tolerant of fences. */
function extractJsonArray(text: string): unknown {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Coerce one raw model item into a Finding, or null if it is not usable. */
function toFinding(
  raw: unknown,
  ctx: ReviewContext,
  sourceLines: readonly string[],
  index: number,
): Finding | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;

  const line = Number(item.line);
  if (!Number.isInteger(line) || line < 1 || line > sourceLines.length) return null;

  const title = typeof item.title === "string" ? item.title.trim().slice(0, 200) : "";
  if (title === "") return null;

  const severity: Severity = SEVERITIES.includes(item.severity as Severity)
    ? (item.severity as Severity)
    : "medium";

  const cwe =
    typeof item.cwe === "string" && /^CWE-\d+$/i.test(item.cwe.trim())
      ? item.cwe.trim().toUpperCase()
      : null;

  return {
    // Ground-truth evidence: the real source line, not the model's echo.
    id: `model-${index}:${ctx.relPath}:${line}`,
    file: ctx.relPath,
    line,
    cwe,
    severity,
    title,
    evidence: (sourceLines[line - 1] ?? "").trim().slice(0, 200),
    status: "open",
  };
}

export function modelReviewer(options: ModelReviewerOptions = {}): Reviewer {
  const transport = options.transport ?? anthropicTransport();
  const maxBytes = options.maxFileBytes ?? 64 * 1024;
  const name = options.name ?? `model:${transport.model}`;

  return {
    name,
    async review(ctx: ReviewContext): Promise<Finding[]> {
      if (Buffer.byteLength(ctx.content, "utf8") > maxBytes) return [];
      let reply: string;
      try {
        reply = await transport.complete({
          system: SYSTEM_PROMPT,
          user: `File: ${ctx.relPath}\n\n${numberLines(ctx.content)}`,
        });
      } catch {
        return []; // a failed call yields no findings; it never fails the review
      }
      const parsed = extractJsonArray(reply);
      if (!Array.isArray(parsed)) return [];
      const sourceLines = ctx.content.split("\n");
      const findings: Finding[] = [];
      parsed.forEach((raw, i) => {
        const finding = toFinding(raw, ctx, sourceLines, i);
        if (finding) findings.push(finding);
      });
      return findings;
    },
  };
}

export interface AnthropicTransportOptions {
  /** Defaults to the ANTHROPIC_API_KEY environment variable. */
  apiKey?: string;
  /** Defaults to `claude-opus-5-5`. */
  model?: string;
  /** Defaults to ANTHROPIC_BASE_URL, then `https://api.anthropic.com`. */
  baseUrl?: string;
  /** Reasoning effort; omitted when unset so the model uses its default. */
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}
interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  stop_reason?: string;
}

/**
 * The default transport: a dependency-free call to the Anthropic Messages API
 * over fetch (the service ships no runtime dependencies, so no SDK). The API key
 * is read from the environment at call time and is never logged or committed.
 */
export function anthropicTransport(
  options: AnthropicTransportOptions = {},
): Transport {
  const model = options.model ?? "claude-opus-5-5";
  const baseUrl = (
    options.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"
  ).replace(/\/$/, "");
  const maxTokens = options.maxTokens ?? 16000;
  const doFetch = options.fetchImpl ?? globalThis.fetch;

  return {
    model,
    async complete(input: { system: string; user: string }): Promise<string> {
      const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY is not set; the model reviewer needs an aligned-model key.",
        );
      }
      const body: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        system: input.system,
        messages: [{ role: "user", content: input.user }],
      };
      if (options.effort) body.output_config = { effort: options.effort };

      const res = await doFetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as AnthropicResponse;
      if (data.stop_reason === "refusal") return "[]"; // declined: no findings
      return (data.content ?? [])
        .filter((block) => block.type === "text" && typeof block.text === "string")
        .map((block) => block.text as string)
        .join("");
    },
  };
}

/**
 * Run several reviewers over the same file and merge their findings, keeping one
 * per (line, defect) so a pattern hit and a model hit on the same issue collapse.
 * Lets the fast offline pass and the model pass run together behind one Reviewer.
 */
export function compositeReviewer(
  reviewers: readonly Reviewer[],
  name?: string,
): Reviewer {
  return {
    name: name ?? reviewers.map((r) => r.name).join("+"),
    async review(ctx: ReviewContext): Promise<Finding[]> {
      const lists = await Promise.all(reviewers.map((r) => r.review(ctx)));
      const seen = new Set<string>();
      const merged: Finding[] = [];
      for (const finding of lists.flat()) {
        const key = `${finding.file}:${finding.line}:${finding.cwe ?? finding.title.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(finding);
      }
      return merged;
    },
  };
}
