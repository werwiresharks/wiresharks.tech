import { useEffect, useRef, useState } from "react";

/**
 * "waiting" until the node first scrolls into view, then "play". "still" when
 * reduced motion is set or IntersectionObserver is missing: show the end state.
 */
export type Entrance = "waiting" | "play" | "still";

export function useInView<T extends Element>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [entrance, setEntrance] = useState<Entrance>("waiting");

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntrance("still");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setEntrance("play");
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [rootMargin]);

  return [ref, entrance] as const;
}
