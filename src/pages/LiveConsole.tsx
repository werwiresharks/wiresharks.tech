import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { RaptorStage } from "../raptor/react/RaptorStage";
import { EngineNarration, useEngineNarration } from "../raptor/react/EngineNarration";
import { useEngine } from "../raptor/react/hooks";
import { createEventSourceSource } from "../raptor/adapters/sse";
import type { Framing } from "../raptor/engine/renderer";
import { RaptorReg } from "../components/RaptorWordmark";
import { Arrow } from "../components/Arrow";

/* Endpoints come from the build env; the fallback is same-origin, never a
   developer machine (C-6). In production the session server must be served
   from the same origin as the site, or VITE_RAPTOR_STREAM_URL /
   VITE_WAITLIST_URL must be set at build time. */
const STREAM_URL = import.meta.env.VITE_RAPTOR_STREAM_URL ?? "/events";
const WAITLIST_URL = import.meta.env.VITE_WAITLIST_URL ?? "/waitlist";

/** Centre the orb in the stage. The authority ring rides outside the orb
    radius, so the orb is framed at 0.34 of the smaller side — the ring
    then closes inside the canvas instead of clipping at its edges. */
const centreFrame = (width: number, height: number): Framing => ({
  x: width / 2,
  y: height / 2,
  radius: Math.min(width, height) * 0.34,
});

type Submit = "idle" | "sending" | "added" | "duplicate" | "error";

/** The status LED state, read from the narration summary's own words (S-5:
    the word is the signal; the LED only accents it). */
function ledState(summary: string): "running" | "done" | "idle" {
  if (/running/i.test(summary)) return "running";
  if (/completed|complete/i.test(summary)) return "done";
  return "idle";
}

/**
 * The live gateway: a real raptor session streamed from the session server and
 * rendered through the engine, with a screen-reader narration and a waitlist
 * sign-up. The visualization only reports the session; it decides nothing.
 */
export function LiveConsole() {
  const engine = useEngine();
  const source = useMemo(() => createEventSourceSource(STREAM_URL), []);
  const frame = useCallback(centreFrame, []);
  const { lines, summary } = useEngineNarration(engine);
  /* The status leads with its state clause (S-5: the word is the status);
     the worker/action counts follow as a detail readout. Both halves are
     the narration's own words, split at its first comma — nothing is
     rewritten, only laid out. */
  const comma = summary.indexOf(",");
  const statusHead = comma === -1 ? summary : summary.slice(0, comma);
  const statusDetail = comma === -1 ? "" : summary.slice(comma + 1).trim();

  const [email, setEmail] = useState("");
  const [state, setState] = useState<Submit>("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    try {
      const res = await fetch(WAITLIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "console" }),
      });
      if (res.status === 201) setState("added");
      else if (res.status === 200) setState("duplicate");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <section className="wrap console-page">
      <title>Live console | Wiresharks</title>
      <meta name="robots" content="noindex" />
      <p className="label">Live / Session</p>
      <h1>raptor<RaptorReg />, live.</h1>
      <p className="page-lede">
        A live raptor session from the session server. The raptor particle
        engine visualizes agent authorization state. It never makes decisions.
      </p>

      <div className="console-grid">
        <div className="console-stage">
          <RaptorStage engine={engine} source={source} frame={frame} interactive />
        </div>
        <div className="console-rail">
          <div className="console-status-panel">
            <p className="label">Session status</p>
            <p className="console-status" role="status" aria-live="polite">
              <i className="console-led" data-state={ledState(summary)} aria-hidden="true" />
              <span>{statusHead}</span>
            </p>
            {statusDetail && <p className="console-status-detail">{statusDetail}</p>}
            <EngineNarration engine={engine} />
          </div>

          <div className="console-log-panel">
            <p className="label">Session log</p>
            {lines.length > 0 ? (
              <ol className="console-log">
                {lines.slice(-6).map((line, i) => (
                  <li key={`${i}-${line}`}>{line}</li>
                ))}
              </ol>
            ) : (
              <p className="console-log">Waiting for session events.</p>
            )}
          </div>

          <form onSubmit={submit} className="console-waitlist">
        <p className="label">Join the waitlist</p>
        <label className="console-field-label" htmlFor="waitlist-email">
          Email
        </label>
        <div className="console-waitlist-row">
          <input
            id="waitlist-email"
            className="console-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={state === "sending"}
          />
          <button className="cta cta-primary" type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Join"}
            <span className="cta-arrow" aria-hidden="true"><Arrow /></span>
          </button>
        </div>
            <p className="label console-waitlist-status" role="status" aria-live="polite">
              {state === "added" && "You're on the list."}
              {state === "duplicate" && "You're already on the list."}
              {state === "error" && "Could not reach the waitlist. Try again later."}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
