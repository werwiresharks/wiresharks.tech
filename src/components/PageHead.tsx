import type { ReactNode } from "react";
import { Countdown } from "./Countdown";
import { Reveal, Words } from "./Reveal";

/** Opening block for a product page: identifier, title, lede, release, and the product's mark. */
export function PageHead({ label, title, mark, children }: { label: ReactNode; title: string; mark: ReactNode; children: ReactNode }) {
  return (
    <header className="page-head">
      <div className="wrap page-head-inner">
        <div>
          <Reveal as="p" className="label">
            {label}
          </Reveal>
          <Reveal as="h1" delay={60} words>
            <Words>{title}</Words>
          </Reveal>
          <Reveal as="p" delay={120} className="page-lede">
            {children}
          </Reveal>
          <Reveal delay={180} className="page-head-launch">
            <Countdown />
          </Reveal>
        </div>
        <div className="page-mark" aria-hidden="true">
          {mark}
        </div>
      </div>
    </header>
  );
}
