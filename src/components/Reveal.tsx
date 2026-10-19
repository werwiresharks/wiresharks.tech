import { Fragment, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * Splits a display heading into word spans for a `words` Reveal. `from`
 * continues the stagger after words set elsewhere in the same heading.
 */
export function Words({ children, from = 0 }: { children: string; from?: number }) {
  const words = children.split(" ");
  return words.map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span className="word" style={{ "--i": from + i } as CSSProperties}>
        {word}
      </span>
    </Fragment>
  ));
}

/**
 * Entrance for a section's parts: rises and fades in once, on scroll.
 * Falls back to fully visible when reduced motion is set or IO is missing.
 * `words` staggers the heading's `Words` in place of the block entrance.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
  words = false,
}: {
  children: ReactNode;
  as?: "div" | "h1" | "h2" | "h3" | "p" | "li" | "section";
  delay?: number;
  className?: string;
  words?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const node = ref.current;
    if (reduce || !node || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    // Content already on screen at load (the hero) plays its entrance right
    // away instead of waiting on the observer, so it can never sit invisible.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const id = window.setTimeout(() => setShown(true), 20);
      return () => window.clearTimeout(id);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const Component = Tag as "div";
  return (
    <Component
      ref={ref as never}
      className={`reveal${words ? " reveal-words" : ""}${shown ? " in" : ""} ${className}`}
      style={delay ? (words ? ({ "--d": `${delay}ms` } as CSSProperties) : { transitionDelay: `${delay}ms` }) : undefined}
    >
      {children}
    </Component>
  );
}
