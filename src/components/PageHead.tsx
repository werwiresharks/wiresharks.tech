import type { ReactNode } from "react";
import { Countdown } from "./Countdown";
import { Reveal } from "./Reveal";

/** Opening block for a product page: identifier, title, lede, release. */
export function PageHead({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <header className="page-head">
      <div className="wrap page-head-inner">
        <div>
          <Reveal as="p" className="label">
            {label}
          </Reveal>
          <Reveal as="h1" delay={60}>
            {title}
          </Reveal>
          <Reveal as="p" delay={120} className="page-lede">
            {children}
          </Reveal>
        </div>
        <Reveal delay={180} className="page-head-launch">
          <Countdown />
        </Reveal>
      </div>
    </header>
  );
}
