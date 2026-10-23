import { PageHead } from "../components/PageHead";
import { RaptorMarkDrawn } from "../components/ProductIcons";
import { RaptorReg, RaptorWordmark } from "../components/RaptorWordmark";
import { Feature } from "../components/Feature";
import { Closing } from "../components/Closing";
import { Approval } from "../components/mock/Approval";
import { Console } from "../components/mock/Console";
import { Registry } from "../components/mock/Registry";
import { Session } from "../components/mock/Session";
import { TRIAGE, TRIAGE_AGENTS } from "../components/mock/demos";
import { REVIEW_STEPS } from "../content";

export function Raptor() {
  return (
    <>
      <title>raptor | Wiresharks</title>
      <link rel="canonical" href="https://wiresharks.tech/raptor" />
      <link rel="icon" href="/raptor.svg" type="image/svg+xml" />
      <PageHead
        label={
          <>
            Agent / <span className="keep-case">raptor<RaptorReg /></span>
          </>
        }
        title="The autonomous cybersecurity agent."
        mark={
          <div className="page-lockup">
            <RaptorMarkDrawn />
            <RaptorWordmark />
          </div>
        }
      >
        raptor<RaptorReg /> is the autonomous cybersecurity agent, built on Hermes and running on Harness. It
        works with any model. It plans the work and keeps its own memory and skills.
      </PageHead>

      <Feature
        index="01"
        eyebrow="Engines"
        tone="soft"
        title="Three engines. One workspace."
        panel={
          <Registry
            title="raptor / engines"
            rows={[
              { key: "hermes", name: "Hermes native runtime", meta: "providers · gateway · sessions · MCP", active: true },
              { key: "claude", name: "Claude Code", meta: "skills · hooks · streaming events" },
              { key: "codex", name: "Codex", meta: "app-server · turns · diffs" },
            ]}
          />
        }
      >
        <p>
          Each engine is a full adapter. It handles sign-in, models, start, resume, streaming, tool
          calls, interrupts, cancellation and recovery.
        </p>
        <p>You choose the model and the engine for each task.</p>
      </Feature>

      <Feature
        index="02"
        eyebrow="Orchestration"
        title="Parallel workers. One view."
        flip
        panel={
          <Session
            title="Alert triage · prod-web"
            prompt="Triage last night's alerts on prod-web. Build a timeline with sources."
            reply="Four parts. Each one runs as its own worker."
            result="timeline.md is ready. Each event cites its source."
            agents={TRIAGE_AGENTS}
            beats={TRIAGE}
            still={2}
            cwd="ir-2026-10"
          />
        }
      >
        <p>
          raptor splits a task across parallel workers. Each worker shows its goal and its latest
          step above the composer. Its result returns to raptor when it finishes.
        </p>
        <p>
          A worker can run in its own copy of the code. Limits that you set control how many
          workers run at once and what they cost.
        </p>
      </Feature>

      <Feature
        index="03"
        eyebrow={<span className="keep-case">verity</span>}
        tone="soft"
        title="The whole command, before it runs."
        panel={
          <Approval
            title="Verify upload fix"
            prompt="Check that the upload fix holds. Run the tests in the sandbox."
            reply="This needs a shell command. Review it first."
            command={[
              "cd ~/work/acme-api",
              "git switch fix/upload-json",
              'docker run --rm --network none -v "$PWD":/src -w /src acme-api:test \\',
              "  python -m pytest tests/test_upload.py -q",
              "pip-audit -r requirements.txt",
            ]}
            output={["5 passed in 1.84s", "No known vulnerabilities found"]}
            cwd="acme-api"
          />
        }
      >
        <p>
          verity is raptor's approval system. When a command needs your approval, verity holds it
          and shows the whole command.
        </p>
        <p>You approve it once, approve it for the session, or deny it. verity records each decision on your machine.</p>
      </Feature>

      <Feature
        index="04"
        eyebrow="Knowledge"
        title="Skills on demand. Memory that lasts."
        flip
        panel={
          <Registry
            title="raptor / skills"
            rows={[
              { key: "security-audit", name: "Source-code security audit", meta: "optional · Cloudflare · MIT", active: true },
              { key: "rea", name: "Reverse engineering, 20 tools", meta: "MCP · gated by verity" },
              { key: "work-routing", name: "Suggests how to run a task", meta: "suggestion only" },
              { key: "skill-fabric", name: "Cited evidence pages", meta: "opt-in · exact sources", active: true },
            ]}
          />
        }
      >
        <p>
          Skills load when a task needs them, so the base context stays small. Each skill has
          triggers, dependencies and a license.
        </p>
        <p>Opt-in sessions write evidence pages that cite their exact sources.</p>
      </Feature>

      <Feature
        index="05"
        eyebrow="Workflow"
        title="Authorized repository security review."
        tone="soft"
        panel={
          <Console
            title="raptor / review"
            lines={[
              '$ node agent/main.ts review ./acme-api --scope "src/**" --out report.md',
              "scope  ./acme-api · read-only",
              "map    1,912 files in scope",
              "find   8 files at a time",
              "",
              "high    deploy.ts:41   CWE-78   shell command built from a string",
              "high    upload.py:88   CWE-502  pickle on untrusted data",
              "medium  client.py:23   CWE-295  TLS verification disabled",
              "",
              "report.md written · 3 findings",
              "exit 1 · a high finding fails the run",
            ]}
          />
        }
      >
        <p>
          The first end-to-end workflow. Its source is open in this site's repository, and{" "}
          <code>node agent/main.ts review</code> runs it. It reads and reports. It does not patch,
          deploy or exploit.
        </p>
        <ol className="steps">
          {REVIEW_STEPS.map(([name, text]) => (
            <li key={name}>
              <b>{name}</b>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </Feature>

      <Closing
        title="raptor runs talon-1 by default."
        text="Both ship together on December 25, 2026."
        mark={<RaptorMarkDrawn />}
      />
    </>
  );
}
