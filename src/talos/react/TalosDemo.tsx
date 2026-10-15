import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { TalosEngine } from "../engine/engine.ts";
import { describeModel } from "../engine/describe.ts";
import { DemoDirector, availableCommands } from "../demo/director.ts";
import type { DemoCommand, Narration } from "../demo/director.ts";
import { connect } from "../adapters/source.ts";
import { TalosStage } from "./TalosStage";
import { useEngineModel, useEventLog } from "./hooks.ts";

type Control = { command: DemoCommand; label: string; tone: "ink" | "cool" | "bronze" | "red" };

const GROUPS: { title: string; controls: Control[] }[] = [
  {
    title: "Session",
    controls: [
      { command: "idle", label: "Idle", tone: "ink" },
      { command: "conversation", label: "Conversation", tone: "ink" },
    ],
  },
  {
    title: "Orchestration",
    controls: [
      { command: "parallel", label: "Parallel agents", tone: "cool" },
      { command: "handoff", label: "Sequential handoff", tone: "cool" },
    ],
  },
  {
    title: "Authority",
    controls: [
      { command: "request", label: "Request authorization", tone: "bronze" },
      { command: "approve", label: "Approve", tone: "bronze" },
      { command: "reject", label: "Reject", tone: "bronze" },
    ],
  },
  {
    title: "Execution",
    controls: [
      { command: "execute", label: "Execute", tone: "bronze" },
      { command: "complete", label: "Complete", tone: "ink" },
      { command: "fail", label: "Fail and roll back", tone: "red" },
    ],
  },
];

export function TalosDemo() {
  const [engine] = useState(() => new TalosEngine());
  const [director] = useState(() => new DemoDirector(() => engine.model));
  const model = useEngineModel(engine);
  const log = useEventLog(engine);
  const [transcript, setTranscript] = useState<(Narration & { id: number })[]>([]);
  const stageWrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [panelBox, setPanelBox] = useState("");

  useEffect(() => {
    let id = 0;
    const disconnect = connect(engine, director);
    const quiet = director.onNarration((line) =>
      setTranscript((current) => [...current, { ...line, id: ++id }].slice(-4)),
    );
    director.start();
    return () => {
      disconnect();
      quiet();
      director.dispose();
    };
  }, [engine, director]);

  const conversation = model.mode === "conversation";
  useEffect(() => {
    if (!conversation) setTranscript([]);
  }, [conversation]);

  // Track the conversation panel so the orb can contract toward it.
  useLayoutEffect(() => {
    const element = panel.current;
    if (!element || !conversation) {
      setPanelBox("");
      return;
    }
    const measure = () => {
      const r = element.getBoundingClientRect();
      const s = stageWrap.current!.getBoundingClientRect();
      setPanelBox(`${r.left - s.left},${r.top - s.top},${r.width},${r.height}`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(stageWrap.current!);
    return () => observer.disconnect();
  }, [conversation]);

  const frame = useCallback(
    (w: number, h: number) => {
      const narrow = w < 640;
      if (conversation && panelBox) {
        const [left, top, , height] = panelBox.split(",").map(Number);
        if (narrow) {
          const radius = Math.min(w * 0.15, top * 0.22);
          return { x: w / 2, y: Math.max(radius * 1.8, top / 2 + 8), radius };
        }
        const radius = Math.min(w * 0.08, h * 0.13);
        return {
          x: Math.max(radius * 2, left - radius * 2.1),
          y: top + Math.min(height / 2, radius * 2.2),
          radius,
        };
      }
      const radius = Math.min(w * (narrow ? 0.2 : 0.17), h * 0.2);
      return { x: w / 2, y: h * 0.5, radius };
    },
    [conversation, panelBox],
  );

  const available = availableCommands(model);
  const status = describeModel(model);

  return (
    <div className="tpe-demo">
      <div className="tpe-demo-stage" ref={stageWrap}>
        <div className="tpe-demo-head">
          <span>Talos Particle Engine</span>
          <span className="tpe-badge">Illustrative simulation</span>
        </div>
        <TalosStage
          engine={engine}
          frame={frame}
          frameKey={`${conversation}:${panelBox}`}
          particleScale={0.85}
        />
        {conversation && (
          <div className="tpe-conversation" ref={panel} aria-label="Simulated conversation">
            <p className="tpe-conversation-title">Conversation</p>
            <ol>
              {transcript.map((line) => (
                <li key={line.id} className={`who-${line.who}`}>
                  <span>{line.who === "you" ? "You" : line.who === "talos" ? "Talos" : "Runtime"}</span>
                  {line.text}
                </li>
              ))}
            </ol>
          </div>
        )}
        <p className="tpe-status" role="status" aria-live="polite">
          {status}
        </p>
      </div>

      <div className="tpe-controls">
        {GROUPS.map((group) => (
          <fieldset key={group.title}>
            <legend>{group.title}</legend>
            <div>
              {group.controls.map((control) => (
                <button
                  key={control.command}
                  type="button"
                  className={`tpe-control tone-${control.tone}`}
                  disabled={!available[control.command]}
                  aria-pressed={control.command === "conversation" ? conversation : undefined}
                  onClick={() => director.run(control.command)}
                >
                  <i aria-hidden="true" />
                  {control.label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="tpe-log">
          <p>Event stream</p>
          <ol aria-label="Recent simulated events">
            {log.map((record) => (
              <li key={record.event.seq}>
                <span>{String(record.event.seq).padStart(3, "0")}</span>
                {record.description}
              </li>
            ))}
          </ol>
        </div>
        <p className="tpe-note">
          Events are generated in your browser to show how the engine behaves. No Talos runtime is
          connected, and these buttons stand in for the policy layer that would make real decisions.
        </p>
      </div>
    </div>
  );
}
