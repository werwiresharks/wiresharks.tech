import { useEffect, useRef, useState } from "react";

/**
 * Steps through a looping script of `holds` (milliseconds per beat) while the
 * panel is on screen and the tab is visible. Under reduced motion it shows
 * the `still` beat and never advances.
 */
export function useBeats<T extends Element>(holds: number[], still: number) {
  const ref = useRef<T>(null);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const node = ref.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!node || typeof IntersectionObserver === "undefined") {
      setBeat(still);
      return;
    }
    let visible = false;
    let timer = 0;
    let current = 0;
    const halt = () => {
      window.clearTimeout(timer);
      timer = 0;
    };
    const advance = () => {
      current = (current + 1) % holds.length;
      setBeat(current);
      timer = window.setTimeout(advance, holds[current]);
    };
    const sync = () => {
      if (motion.matches) {
        halt();
        setBeat(still);
        return;
      }
      if (visible && !document.hidden) {
        if (!timer) timer = window.setTimeout(advance, holds[current]);
      } else halt();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { rootMargin: "0px 0px -15% 0px" });
    io.observe(node);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      halt();
      io.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [holds, still]);

  return [ref, beat] as const;
}
