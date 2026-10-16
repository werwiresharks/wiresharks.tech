import { useEffect, useRef } from "react";
import type { TalosRenderer } from "../engine/renderer.ts";
import { createHomeSource } from "../home/source.ts";
import { heroFrame } from "../home/journey.ts";

export function HomeJourney() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = host.current;
    const root = node?.closest<HTMLElement>(".home-page");
    if (!node || !root) return;
    let cancelled = false;
    let renderer: TalosRenderer | null = null;
    let failed = false;
    let load = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const source = createHomeSource(root, () => renderer?.requestPresentation());
    const fallback = () => {
      failed = true;
      root.dataset.journey = "fallback";
      renderer?.dispose();
      renderer = null;
      node.replaceChildren();
    };
    const sync = () => {
      const generation = ++load;
      if (motion.matches) {
        root.dataset.journey = "static";
        renderer?.dispose();
        renderer = null;
        return;
      }
      if (failed || renderer) return;
      void import("../engine/renderer.ts").then(({ TalosRenderer, supportsWebGL }) => {
        if (cancelled || generation !== load) return;
        if (!supportsWebGL()) { fallback(); return; }
        renderer = new TalosRenderer({
          host: node,
          frame: heroFrame,
          home: source,
          interactive: true,
          particleScale: window.innerWidth < 768 ? 0.55 : 1,
          onFailure: fallback,
        });
        root.dataset.journey = "ready";
      }).catch(() => { if (!cancelled && generation === load) fallback(); });
    };
    sync();
    motion.addEventListener("change", sync);
    return () => {
      cancelled = true;
      load++;
      motion.removeEventListener("change", sync);
      source.dispose();
      renderer?.dispose();
      delete root.dataset.journey;
    };
  }, []);
  return <div ref={host} className="home-journey tpe-stage is-ready" aria-hidden="true" />;
}
