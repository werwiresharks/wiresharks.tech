import { useCallback, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { RaptorStage } from "../raptor/react/RaptorStage";
import { EngineNarration, useEngineNarration } from "../raptor/react/EngineNarration";
import { useEngine } from "../raptor/react/hooks";
import { createEventSourceSource } from "../raptor/adapters/sse";
import type { Framing } from "../raptor/engine/renderer";

const STREAM_URL =
  import.meta.env.VITE_RAPTOR_STREAM_URL ?? "http://localhost:8787/events";
const WAITLIST_URL =
  import.meta.env.VITE_WAITLIST_URL ?? "http://localhost:8787/waitlist";

/** Centre the orb in the stage with a radius that fits the smaller side. */
const centreFrame = (width: number, height: number): Framing => ({
  x: width / 2,
  y: height / 2,
  radius: Math.min(width, height) * 0.42,
});

const stageStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "min(60vh, 520px)",
  margin: "1.5rem 0",
};

type Submit = "idle" | "sending" | "added" | "duplicate" | "error";

/**
 * The live gateway: a real Raptor session streamed from the session server and
 * rendered through the engine, with a screen-reader narration and a waitlist
 * sign-up. The visualization only reports the session; it decides nothing.
 */
export function LiveConsole() {
  const engine = useEngine();
  const source = useMemo(() => createEventSourceSource(STREAM_URL), []);
  const frame = useCallback(centreFrame, []);
  const { summary } = useEngineNarration(engine);

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
    <section className="wrap" style={{ paddingBlock: "4rem" }}>
      <title>Live console | Wiresharks</title>
      <meta name="robots" content="noindex" />
      <p className="label">Live / Session</p>
      <h1>Raptor, live.</h1>
      <p className="page-lede">
        A Raptor session streamed from the session server and drawn by the
        engine. The engine reports the session; it makes no authorization
        decisions.
      </p>

      <div style={stageStyle}>
        <RaptorStage engine={engine} source={source} frame={frame} interactive />
      </div>
      <EngineNarration engine={engine} />
      <p className="label" role="status" aria-live="polite">
        {summary}
      </p>

      <form onSubmit={submit} style={{ marginTop: "2.5rem", maxWidth: "28rem" }}>
        <label className="label" htmlFor="waitlist-email">
          Join the waitlist
        </label>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <input
            id="waitlist-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={state === "sending"}
            style={{
              flex: 1,
              padding: "0.6rem 0.75rem",
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--bronze-deep)",
              borderRadius: "0.25rem",
              font: "inherit",
            }}
          />
          <button className="cta cta-primary" type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Join"}
            <span className="cta-arrow" aria-hidden="true">→</span>
          </button>
        </div>
        <p className="label" role="status" aria-live="polite" style={{ marginTop: "0.75rem" }}>
          {state === "added" && "You're on the list."}
          {state === "duplicate" && "You're already on the list."}
          {state === "error" && "Could not reach the waitlist. Try again later."}
        </p>
      </form>
    </section>
  );
}
