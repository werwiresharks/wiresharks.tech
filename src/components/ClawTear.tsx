import { useEffect, useRef } from "react";
import { CLAW_LAYOUTS, clawShape } from "./claw";
import type { Box } from "./claw";

/** Scroll, in viewport heights, before the first mark lands. */
const START = 0.03;
/** The tear is fully open when the bottom of its zone has risen to this height in the viewport. */
const OPEN_AT = 0.42;
/** Under reduced motion the tear does not track scroll; it fades in past this point. */
const STILL_AT = 0.12;

/**
 * The hero's surface as a torn skin: three claw marks cut through it on
 * scroll and expose the Talon-1 layer beneath. Scrolling back seals it.
 */
export function ClawTear() {
  const root = useRef<HTMLDivElement>(null);
  const skin = useRef<SVGSVGElement>(null);
  const surface = useRef<SVGPathElement>(null);
  const lip = useRef<SVGPathElement>(null);
  const shade = useRef<SVGPathElement>(null);
  const strike = useRef<SVGPathElement>(null);
  const under = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    const hero = node?.parentElement;
    if (!node || !hero) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let layout: (typeof CLAW_LAYOUTS)[keyof typeof CLAW_LAYOUTS] = CLAW_LAYOUTS.edge;
    let zone: Box = { x: 0, y: 0, w: 0, h: 0 };
    let outer = "";
    let top = 0;
    let start = 0;
    let span = 1;
    let last = -1;
    let frame = 0;

    const draw = (progress: number) => {
      if (progress === last) return;
      last = progress;
      const shape = clawShape(layout, zone, progress);
      surface.current?.setAttribute("d", outer + shape.holes);
      lip.current?.setAttribute("d", shape.holes);
      shade.current?.setAttribute("d", shape.holes);
      strike.current?.setAttribute("d", shape.strike);
      node.style.setProperty("--claw", shape.open.toFixed(3));
    };

    const update = () => {
      frame = 0;
      const scrolled = window.scrollY - top;
      if (motion.matches) {
        node.dataset.torn = String(scrolled > start + window.innerHeight * STILL_AT);
        draw(1);
        return;
      }
      draw(Math.min(1, Math.max(0, (scrolled - start) / span)));
    };

    const measure = () => {
      const rect = hero.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const vh = window.innerHeight;
      top = rect.top + window.scrollY;
      layout = CLAW_LAYOUTS.edge;
      // Layout offsets, not client rects: the copy's entrance transform must not move the zone.
      const relative = (selector: string) => {
        const el = hero.querySelector<HTMLElement>(selector);
        if (!el) return null;
        let x = 0;
        let y = 0;
        for (let at: HTMLElement | null = el; at && at !== hero; at = at.offsetParent as HTMLElement | null) {
          x += at.offsetLeft;
          y += at.offsetTop;
        }
        return { top: y, bottom: y + el.offsetHeight, right: x + el.offsetWidth };
      };
      // Desktop marks start right of the headline and glass, however narrow the window.
      const copyRight = Math.max(relative("#hero-title")?.right ?? 0, relative(".hero-glass")?.right ?? 0);
      const left = Math.max(w * 0.52, copyRight + 40);
      zone = { x: left, y: h * 0.14, w: w * 0.96 - left, h: h * 0.86 };
      if (window.innerWidth < 768) {
        // Phones cut the band between the buttons and the countdown, so no copy is torn.
        const above = relative(".hero-ctas");
        const below = relative(".hero-launch");
        if (above && below) zone = { x: w * 0.04, y: above.bottom + 28, w: w * 0.92, h: below.top - above.bottom - 52 };
        layout = CLAW_LAYOUTS.band;
      } else if (window.innerWidth < 1024) {
        // Tablets stack the copy at the bottom; the tear takes the open space above it.
        const copy = relative(".hero-eyebrow");
        if (copy) zone = { x: w * 0.08, y: h * 0.08, w: w * 0.84, h: copy.top - 48 - h * 0.08 };
        layout = CLAW_LAYOUTS.band;
      }
      start = vh * START;
      const end = Math.min(h, zone.y + zone.h) - vh * OPEN_AT;
      span = Math.max(vh * 0.15, end - start);
      outer = `M0 0H${w}V${h}H0Z`;
      skin.current?.setAttribute("viewBox", `0 0 ${w} ${h}`);
      under.current?.style.setProperty("inset", `${zone.y}px ${w - zone.x - zone.w}px ${Math.max(0, h - zone.y - zone.h)}px ${zone.x}px`);
      node.dataset.ready = "true";
      last = -1;
      update();
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(hero);
    measure();
    void document.fonts?.ready.then(measure);
    window.addEventListener("scroll", schedule, { passive: true });
    motion.addEventListener("change", measure);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      motion.removeEventListener("change", measure);
    };
  }, []);

  return (
    <div ref={root} className="claw" aria-hidden="true">
      <div className="claw-under tone-dark">
        <div ref={under} className="claw-under-inner">
          <p className="label">
            <i /> Talon-1 / 27B / Open weights
          </p>
          <p className="claw-under-name">Talon-1</p>
          <p className="claw-under-code">
            <span>$ talos model use talon-1</span>
            <span>loaded · Q4_K_M · network off</span>
            <span>3 critical · 11 high · 128 info</span>
          </p>
        </div>
      </div>
      <svg ref={skin} className="claw-skin" viewBox="0 0 1 1" preserveAspectRatio="none">
        <filter id="claw-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <path ref={shade} className="claw-shade" filter="url(#claw-blur)" />
        <path ref={surface} className="claw-surface" d="M0 0H1V1H0Z" fillRule="evenodd" />
        <path ref={lip} className="claw-lip" />
        <path ref={strike} className="claw-strike" />
      </svg>
      <div className="claw-seal" />
    </div>
  );
}
