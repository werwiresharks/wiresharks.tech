import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { RaptorStage } from "../raptor/react/RaptorStage";
import { EngineNarration, useEngineNarration } from "../raptor/react/EngineNarration";
import { useEngine } from "../raptor/react/hooks";
import { createEventSourceSource } from "../raptor/adapters/sse";
import type { ConnectionStatus } from "../raptor/adapters/sse";
import type { Framing } from "../raptor/engine/renderer";
import { RaptorReg } from "../components/RaptorWordmark";
import { computeLayout } from "../raptor/engine/layout";

const STREAM_URL =
  import.meta.env.VITE_RAPTOR_STREAM_URL ?? "http://localhost:8787/events";
const WAITLIST_URL =
  import.meta.env.VITE_WAITLIST_URL ?? "http://localhost:8787/waitlist";

type Submit = "idle" | "sending" | "added" | "duplicate" | "error";

/**
 * The live gateway: a real raptor session streamed from the session server and
 * rendered through the engine, with a screen-reader narration and a waitlist
 * sign-up. The visualization only reports the session; it decides nothing.
 */
export function LiveConsole() {
  const engine = useEngine();
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const source = useMemo(() => createEventSourceSource(STREAM_URL, "raptor", setConnection), []);
  // Fit the authority boundary and its graduations, including when workers expand it.
  const [sceneRadius, setSceneRadius] = useState(() => computeLayout(engine.model).ring.radius + 0.3);
  useEffect(() => engine.subscribe((model) => {
    setSceneRadius(computeLayout(model).ring.radius + 0.3);
  }), [engine]);
  const frame = useCallback((width: number, height: number): Framing => ({
    x: width / 2,
    y: height / 2,
    radius: Math.min(width, height) * 0.45 / sceneRadius,
  }), [sceneRadius]);
  const { summary } = useEngineNarration(engine);

  const [email, setEmail] = useState("");
  const [state, setState] = useState<Submit>("idle");
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    setState("sending");
    try {
      const res = await fetch(WAITLIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "console" }),
        signal: controller.signal,
      });
      if (request.current !== controller) return;
      if (res.status === 201) setState("added");
      else if (res.status === 200) setState("duplicate");
      else setState("error");
    } catch {
      if (request.current === controller) setState("error");
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) request.current = null;
    }
  };

  return (
    <section className="wrap live-console">
      <title>Live console | Wiresharks</title>
      <meta name="robots" content="noindex" />
      <p className="label">Live / Session</p>
      <h1>raptor<RaptorReg />, live.</h1>
      <p className="page-lede">
        A live raptor session from the session server. The raptor particle
        engine visualizes agent authorization state. It never makes decisions.
      </p>

      <p className="live-console-status" role="status">
        {connection === "connecting" && "Connecting to the session server…"}
        {connection === "connected" && "Connected to the session server."}
        {connection === "reconnecting" && "Session connection interrupted. Retrying…"}
      </p>
      <div className="live-console-stage">
        <RaptorStage engine={engine} source={source} frame={frame} frameKey={String(sceneRadius)} interactive />
      </div>
      <EngineNarration engine={engine} />
      <p className="label" role="status" aria-live="polite">
        {connection !== "connected" && "Last received state: "}
        {summary}
      </p>

      <form className="waitlist" onSubmit={submit} aria-busy={state === "sending"}>
        <label className="label" htmlFor="waitlist-email">
          Join the waitlist
        </label>
        <div className="waitlist-row">
          <input
            id="waitlist-email"
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            aria-describedby="waitlist-status"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            readOnly={state === "sending"}
          />
          <button className="cta cta-primary" type="submit" aria-disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Join"}
            <span className="cta-arrow" aria-hidden="true">→</span>
          </button>
        </div>
        <p id="waitlist-status" className="waitlist-status" role="status">
          {state === "added" && "You're on the list."}
          {state === "duplicate" && "You're already on the list."}
          {state === "error" && "Could not confirm your sign-up. Please try again."}
        </p>
      </form>
    </section>
  );
}
