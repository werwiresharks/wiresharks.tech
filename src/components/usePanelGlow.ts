import { useEffect } from "react";

/**
 * Feeds the panel glow in styles.css: one delegated pointer listener sets
 * --mx / --my (percent) on the instrument panel under a fine hovering pointer.
 */
export function usePanelGlow() {
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      frame = 0;
      const panel = last?.target instanceof Element ? last.target.closest<HTMLElement>(".panel") : null;
      if (!panel || !last) return;
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty("--mx", `${((last.clientX - rect.left) / rect.width) * 100}%`);
      panel.style.setProperty("--my", `${((last.clientY - rect.top) / rect.height) * 100}%`);
    };
    const onMove = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const sync = () => {
      document.removeEventListener("pointermove", onMove);
      if (query.matches) document.addEventListener("pointermove", onMove, { passive: true });
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      query.removeEventListener("change", sync);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);
}
