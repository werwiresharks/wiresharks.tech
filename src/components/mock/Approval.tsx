import type { CSSProperties } from "react";
import { ArrowElbowDownLeft, CaretDown, Check, TerminalWindow } from "@phosphor-icons/react";
import { AppTabs, Composer, StatusBar } from "./AppChrome";
import { useBeats } from "./useBeats";

/** Held for a decision, the Run press, then the command's result. */
const HOLDS = [3600, 700, 3400];
const HELD = 0;
const PRESSED = 1;

/**
 * verity, raptor's approval system, as the desktop app draws it: the whole
 * command in a card with Reject, Always allow… and Run. The script holds the card,
 * presses Run, then shows the call as run with its output. Under reduced
 * motion it shows the held card, the state that matters.
 */
export function Approval({
  title,
  prompt,
  reply,
  command,
  output,
  cwd,
}: {
  title: string;
  prompt: string;
  reply: string;
  /** One shell call, shown line by line as the card shows it. */
  command: string[];
  output: string[];
  cwd: string;
}) {
  const [ref, beat] = useBeats<HTMLDivElement>(HOLDS, HELD);
  const held = beat === HELD || beat === PRESSED;

  return (
    <div ref={ref} className="panel session approval" data-ui aria-label={`verity approval: ${title}`}>
      <AppTabs title={title} tab={held ? "held" : "busy"} />
      <div className="app-chat">
        <p className="app-user">{prompt}</p>
        <p className="app-reply">{reply}</p>
        <div className={`approval-swap${held ? "" : " is-done"}`}>
          <div className="approval-card" aria-hidden={!held}>
            <p className="approval-head">
              <TerminalWindow aria-hidden="true" />
              verity
            </p>
            <pre>
              {command.map((line, i) => (
                <span key={i} className="line" style={{ "--i": i } as CSSProperties}>
                  {line}
                  {"\n"}
                </span>
              ))}
            </pre>
            <div className="approval-actions">
              <span className="approval-reject">Reject</span>
              <span className="approval-always">
                Always allow…<CaretDown aria-hidden="true" />
              </span>
              <span className={`approval-run${beat === PRESSED ? " is-pressed" : ""}`}>
                Run<ArrowElbowDownLeft aria-hidden="true" />
              </span>
            </div>
          </div>
          <div className="approval-result" aria-hidden={held}>
            <p className="app-tool">
              <Check aria-hidden="true" />
              Ran 1 command
            </p>
            <pre>{output.join("\n")}</pre>
          </div>
        </div>
        <Composer raptor={held ? "awaiting" : "working"} busy />
      </div>
      <StatusBar cwd={cwd} />
    </div>
  );
}
