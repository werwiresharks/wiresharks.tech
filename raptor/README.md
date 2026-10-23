# Raptor

An **authorized, read-only repository security-review agent.** Point it at a
repository you control; it maps the code, dispatches specialized workers to find
defect classes, proves each lead, and writes an evidence-backed report.

Raptor is **read-only by construction.** It never patches, executes, deploys, or
reaches outside the path you name. Every finding is a lead to verify, cited to a
file and line — not a claim of exploitability.

## Requirements

- **Node 22.18+ or 24** (Raptor runs TypeScript directly; no build step).
- No dependencies. The model-backed features need an `ANTHROPIC_API_KEY`; the
  default offline mode needs nothing.

## Use

```sh
# Offline, deterministic — scan one repo you own:
node src/cli.ts review /path/to/repo

# The multi-agent assessment: discover applicable workers, run them in
# parallel, consolidate their findings:
node src/cli.ts assess /path/to/repo --objective "full security review"
```

Or via npm scripts, or the `raptor` bin once installed:

```sh
npm run review -- /path/to/repo
npm run assess -- /path/to/repo
```

### Flags

| Flag | Effect |
| --- | --- |
| `--scope "src/**,lib/**"` | only review matching paths |
| `--exclude "**/vendor/**"` | skip paths (on top of the defaults) |
| `--out report.md` | write the report to a file |
| `--objective "<text>"` | (assess) shape which workers run |
| `--no-prove` | stop after Find; leave every lead `open` |
| `--quiet` | suppress the live event trace |
| `--model` / `--model=<id>` | add a model to Find (needs `ANTHROPIC_API_KEY`) |
| `--plan` | the agentic loop: a model chooses what to read/review/verify |

The CLI exits non-zero when a high/critical finding is present and the Prove
step did not dismiss it, so it can gate CI.

## What's inside

- **Scope** (`scope.ts`) — the authorization boundary; nothing is read outside it.
- **Map** (`map.ts`) — the in-scope file set; never follows symlinks out.
- **Reviewers** (`reviewer.ts`, `modelReviewer.ts`) — deterministic regex pass and
  an optional model pass, behind one `Reviewer` seam.
- **Provers** (`prove.ts`, `modelProver.ts`) — rule a lead verified/dismissed/open,
  deterministically or with a model.
- **Agentic loop** (`plan.ts`) — a model-driven investigation: list / search /
  read / review / prove / note / finish, with in-run memory, scope-locked.
- **Orchestrator + workers** (`orchestrator.ts`, `worker.ts`, `workers.ts`,
  `scheduler.ts`, `task.ts`) — split an objective into jobs for specialized
  workers, run them in parallel (bounded, cancellable, timed out), consolidate.
- **Report** (`report.ts`) — the Markdown report.
- **Narration contract** (`events.ts`, `narration.ts`) — the event vocabulary
  Raptor emits as it works, and a reducer that validates it. A visualization
  (such as the Wiresharks console) is a compatible consumer of this stream.

## Tests

```sh
node --test src/*.test.ts
```

## Boundary

Raptor is for authorized review of infrastructure you own or are cleared to
assess. It does not weaponize findings, launch exploits, or modify the target.
Those boundaries are enforced in code (the Scope and the scoped reader), not left
to a model to respect.
