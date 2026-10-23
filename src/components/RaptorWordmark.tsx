import type { ReactNode } from "react";
import { RaptorMark } from "./ProductIcons";

/**
 * The registered mark after "raptor" in headings, questions, buttons and product
 * names. Screen readers skip it. This file is the only place ® is written.
 */
export function RaptorReg() {
  return (
    <span className="raptor-reg" aria-hidden="true">
      ®
    </span>
  );
}

/** Marks the first "raptor" in a display string; command lines (`$ raptor …`) stay plain. */
export function withRaptorReg(text: string): ReactNode {
  const match = /(?<!\$ )\braptor\b/.exec(text);
  if (!match) return text;
  const end = match.index + "raptor".length;
  return (
    <>
      {text.slice(0, end)}
      <RaptorReg />
      {text.slice(end)}
    </>
  );
}

/** The raptor® wordmark: the lowercase name with the registered mark, and the claw mark before it when `mark` is set. */
export function RaptorWordmark({ mark = false, className = "" }: { mark?: boolean; className?: string }) {
  return (
    <span className={`raptor-wordmark ${className}`}>
      {mark && <RaptorMark className="raptor-wordmark-mark" />}
      raptor
      <span className="raptor-wordmark-reg" aria-hidden="true">
        ®
      </span>
    </span>
  );
}
