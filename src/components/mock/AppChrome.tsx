import { ArrowUp, CaretDown, Folder, Lightning, Microphone, Plus, Pulse, Stop } from "@phosphor-icons/react";
import { MiniOrb } from "./MiniOrb";
import type { OrbState } from "./orb";

/**
 * The parts of the raptor desktop window every product panel shares: the
 * session tab strip, the composer with raptor's globe at its left, and the
 * status bar. Labels are the app's own.
 */
export function AppTabs({ title, tab }: { title: string; tab: "busy" | "held" | "idle" }) {
  return (
    <div className="app-tabs">
      <span className="app-tab">
        <i data-tab={tab} aria-hidden="true" />
        {title}
      </span>
      <Plus className="app-tab-add" aria-hidden="true" />
      <span className="panel-note">Illustrative</span>
    </div>
  );
}

/** With `journey`, the home page's particle engine docks into the composer globe. */
export function Composer({ raptor, busy, journey = false }: { raptor: OrbState; busy: boolean; journey?: boolean }) {
  return (
    <div className="app-composer">
      <Plus className="app-icon" aria-hidden="true" />
      <span className="app-composer-orb" data-home-stop={journey ? "raptor" : undefined}>
        <MiniOrb state={raptor} size={24} yieldToJourney={journey} />
      </span>
      <span className="app-placeholder">Send a follow-up</span>
      <span className="app-pill keep-case">
        talon-1
        <CaretDown aria-hidden="true" />
      </span>
      <span className="app-pill app-pill-quiet">
        Med
        <CaretDown aria-hidden="true" />
      </span>
      <Microphone className="app-icon app-icon-quiet" aria-hidden="true" />
      <span className={`app-send${busy ? " is-busy" : ""}`} aria-hidden="true">
        {busy ? <Stop weight="fill" /> : <ArrowUp weight="bold" />}
      </span>
    </div>
  );
}

export function StatusBar({ cwd }: { cwd: string }) {
  return (
    <div className="app-statusbar">
      <span>
        <Pulse aria-hidden="true" /> Backend ready
      </span>
      <span>
        <Folder aria-hidden="true" /> {cwd}
      </span>
      <span className="app-statusbar-end" title="verity mode: Manual">
        <Lightning aria-hidden="true" /> Manual
      </span>
    </div>
  );
}
