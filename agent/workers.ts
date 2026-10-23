import type { Finding } from "./findings.ts";
import type { RepoMap } from "./map.ts";
import type { Reviewer } from "./reviewer.ts";
import type { InvestigationWorker, WorkerContext, WorkerResult } from "./worker.ts";

/**
 * The first specialized investigation workers.
 *
 * Each is a real, read-only analysis over the in-scope file set, looking at a
 * different facet of the repository — exactly the swarm the product figure
 * shows (specialized workers whose results combine in one report). They share
 * nothing but the `InvestigationWorker` contract, so the orchestrator runs them
 * in parallel and consolidates their findings without knowing what any one does.
 * More capabilities (auth-logic, data-flow, cloud-config) are further workers
 * behind the same seam.
 */

const SOURCE_EXT = /\.(py|js|mjs|cjs|jsx|ts|tsx|rb|go|java|php|c|cc|cpp|h|hpp|cs|rs|kt|swift|scala)$/i;

/**
 * Source-vulnerability analysis: run a Reviewer over every source file. This is
 * the capability the single-reviewer CLI already exposes, wrapped as a worker so
 * it can run alongside the others. The Reviewer is injected, so the pattern
 * pass, a model pass, or a composite all plug in unchanged.
 */
export function sourceVulnWorker(reviewer: Reviewer): InvestigationWorker {
  return {
    capability: "source-vulnerability",
    title: "Source vulnerability analysis",
    description:
      "Reviews source files for known defect classes: unsafe deserialization, command and code injection, disabled TLS verification, weak hashing, and hard-coded secrets.",
    applicableTo: (map) => map.files.some((f) => SOURCE_EXT.test(f)),
    async run(ctx: WorkerContext): Promise<WorkerResult> {
      const findings: Finding[] = [];
      for (const file of ctx.map.files) {
        if (ctx.signal.aborted) break;
        if (!SOURCE_EXT.test(file)) continue;
        let content: string;
        try {
          content = await ctx.read(file);
        } catch {
          continue; // out of scope or unreadable: skip, never fail the worker
        }
        const found = await reviewer.review({ relPath: file, content });
        for (const finding of found) {
          findings.push(finding);
          ctx.emit({
            type: "action.proposed",
            actionId: finding.id,
            agentId: ctx.agentId,
            summary: `${finding.severity.toUpperCase()} ${finding.cwe ?? ""} ${finding.file}:${finding.line} — ${finding.title}`.replace(/\s+/g, " ").trim(),
          });
        }
      }
      return { findings, notes: [] };
    },
  };
}

/** Dependency manifests this worker understands. */
const MANIFESTS = /(^|\/)(requirements[^/]*\.txt|Pipfile|package\.json)$/;

const isManifest = (map: RepoMap): boolean => map.files.some((f) => MANIFESTS.test(f));

/**
 * Dependency and configuration analysis: inspect dependency manifests for
 * supply-chain risk. Unpinned requirements and floating version ranges both let
 * a build silently pull a different package version than the one that was
 * reviewed — a real, read-only finding distinct from source review, and the
 * "Dependency worker" the product figure names. It reads only manifest files.
 */
export function dependencyWorker(): InvestigationWorker {
  return {
    capability: "dependency-config",
    title: "Dependency & configuration analysis",
    description:
      "Inspects dependency manifests for supply-chain risk: unpinned Python requirements and floating npm version ranges that let a build drift from what was reviewed.",
    applicableTo: isManifest,
    async run(ctx: WorkerContext): Promise<WorkerResult> {
      const findings: Finding[] = [];
      const notes: string[] = [];
      let manifests = 0;
      for (const file of ctx.map.files) {
        if (ctx.signal.aborted) break;
        if (!MANIFESTS.test(file)) continue;
        let content: string;
        try {
          content = await ctx.read(file);
        } catch {
          continue;
        }
        manifests += 1;
        const found = file.endsWith("package.json")
          ? inspectPackageJson(file, content)
          : inspectRequirements(file, content);
        for (const finding of found) {
          findings.push(finding);
          ctx.emit({
            type: "action.proposed",
            actionId: finding.id,
            agentId: ctx.agentId,
            summary: `${finding.severity.toUpperCase()} ${finding.cwe ?? ""} ${finding.file}:${finding.line} — ${finding.title}`.replace(/\s+/g, " ").trim(),
          });
        }
      }
      if (manifests > 0)
        notes.push(`Inspected ${manifests} dependency manifest(s); ${findings.length} drifted from a pinned version.`);
      return { findings, notes };
    },
  };
}

/** CWE-1104: Use of Unmaintained / Unpinned Third-Party Components. */
const UNPINNED_CWE = "CWE-1104";

const lead = (file: string, line: number, title: string, evidence: string): Finding => ({
  id: `dep-unpinned:${file}:${line}`,
  file,
  line,
  cwe: UNPINNED_CWE,
  severity: "low",
  title,
  evidence: evidence.trim().slice(0, 200),
  status: "open",
});

/** Flag requirements lines that name a package without pinning an exact version. */
function inspectRequirements(file: string, content: string): Finding[] {
  const out: Finding[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const text = raw.replace(/#.*$/, "").trim();
    if (!text) continue;
    // Skip options, URLs and editable installs — only plain requirement specs.
    if (text.startsWith("-") || /[:@]/.test(text.split(/[<>=!~ ]/)[0])) continue;
    const name = text.split(/[<>=!~; ]/)[0];
    if (!/^[A-Za-z0-9._-]+$/.test(name)) continue;
    if (!text.includes("==")) {
      out.push(lead(file, i + 1, `Unpinned dependency \`${name}\``, raw));
    }
  }
  return out;
}

/** Flag npm dependency ranges that float (`*`, `latest`, or an open `>=`). */
function inspectPackageJson(file: string, content: string): Finding[] {
  let pkg: unknown;
  try {
    pkg = JSON.parse(content);
  } catch {
    return []; // malformed manifest: not this worker's call to make
  }
  if (typeof pkg !== "object" || pkg === null) return [];
  const out: Finding[] = [];
  const lines = content.split("\n");
  const sections = ["dependencies", "devDependencies", "optionalDependencies"] as const;
  for (const section of sections) {
    const deps = (pkg as Record<string, unknown>)[section];
    if (typeof deps !== "object" || deps === null) continue;
    for (const [name, range] of Object.entries(deps as Record<string, unknown>)) {
      if (typeof range !== "string") continue;
      if (range === "*" || range === "latest" || range === "" || /^>=?/.test(range.trim())) {
        const line = lines.findIndex((l) => l.includes(`"${name}"`)) + 1 || 1;
        out.push(lead(file, line, `Floating dependency range \`${name}\`: "${range}"`, `"${name}": "${range}"`));
      }
    }
  }
  return out;
}
