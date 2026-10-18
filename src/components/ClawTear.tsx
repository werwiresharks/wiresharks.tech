import { useEffect, useRef } from "react";
import { CLAW_LAYOUTS, clawShape } from "./claw";
import type { Box } from "./claw";

/** Scroll input, in viewport heights, that takes the tear from intact to fully open. */
const DISTANCE = 0.55;
/** Under reduced motion the tear does not hold the page; it fades in past this point. */
const STILL_AT = 0.12;
/** Touch momentum this recent is still the user's swipe, so it is held at the lock too. */
const TOUCH_MS = 1500;

/**
 * The hero's surface as a torn skin. When the page reaches its lock point it
 * holds still, and scroll input drives three claw marks through the surface
 * to expose the Talon-1 layer beneath. Only a finished tear lets the page
 * scroll on; scrolling back up at the lock point seals it again.
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
    /** Document scroll position the page holds at while the tear is incomplete. */
    let lock = 0;
    let distance = 1;
    /** Where the input has taken the tear, and where the drawing has caught up to. */
    let target = 0;
    let current = 0;
    let last = -1;
    let frame = 0;
    let touchY: number | null = null;
    let touchAt = -Infinity;

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

    // Wheel ticks arrive in coarse steps; easing toward the target keeps the cut smooth.
    const settle = () => {
      frame = 0;
      current += (target - current) * 0.22;
      if (Math.abs(target - current) < 0.001) current = target;
      draw(current);
      if (current !== target) frame = requestAnimationFrame(settle);
    };
    const animate = () => {
      if (!frame) frame = requestAnimationFrame(settle);
    };
    const hold = () => window.scrollTo({ top: lock, behavior: "instant" });

    /** Spends a scroll intent on the tear. True when the page must not move. */
    const consume = (delta: number) => {
      if (motion.matches || delta === 0) return false;
      const y = window.scrollY;
      if (delta > 0) {
        if (target >= 1 || y + delta <= lock || y > lock + 1) return false;
        if (y < lock) hold();
        target = Math.min(1, target + (delta - Math.max(0, lock - y)) / distance);
      } else {
        if (target <= 0 || y + delta >= lock || y < lock - 1) return false;
        if (y > lock) hold();
        target = Math.max(0, target + (delta + Math.max(0, y - lock)) / distance);
      }
      animate();
      return true;
    };

    // Scrolls that got past the input handlers: scrollbar drags, anchors, focus,
    // find-in-page and restored positions set the tear to match where the page
    // is. Touch momentum is the user's own swipe, so it is held at the lock.
    const onScroll = () => {
      const y = window.scrollY;
      if (motion.matches) {
        node.dataset.torn = String(y > lock + window.innerHeight * STILL_AT);
        return;
      }
      const swiping = performance.now() - touchAt < TOUCH_MS;
      if (y > lock + 1 && target < 1) {
        if (swiping) {
          hold();
          target = Math.min(1, target + (y - lock) / distance);
        } else target = 1;
        animate();
      } else if (y < lock - 1 && target > 0) {
        if (swiping) {
          hold();
          target = Math.max(0, target - (lock - y) / distance);
        } else target = 0;
        animate();
      }
    };

    const outside = (event: Event) => event.target instanceof Element && event.target.closest("header, input, textarea, select, [contenteditable]");
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || outside(event)) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      if (consume(event.deltaY * unit)) event.preventDefault();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchY === null || event.touches.length !== 1 || outside(event)) return;
      const y = event.touches[0].clientY;
      const delta = touchY - y;
      touchY = y;
      touchAt = performance.now();
      if (consume(delta) && event.cancelable) event.preventDefault();
    };
    const KEYS: Record<string, number> = { ArrowDown: 40, ArrowUp: -40, PageDown: 0.85, PageUp: -0.85, " ": 0.85 };
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || !(event.key in KEYS) || outside(event)) return;
      if (event.key === " " && event.target instanceof Element && event.target.closest("a, button, summary")) return;
      const step = KEYS[event.key];
      const delta = (Math.abs(step) < 1 ? step * window.innerHeight : step) * (event.key === " " && event.shiftKey ? -1 : 1);
      if (consume(delta)) event.preventDefault();
    };

    const measure = () => {
      const rect = hero.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const vh = window.innerHeight;
      const top = rect.top + window.scrollY;
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
      // Hold where the whole tear is on screen: the top on most screens, a little lower on short phones.
      lock = Math.max(0, Math.round(top + Math.min(h, zone.y + zone.h + 16) - vh));
      distance = vh * DISTANCE;
      outer = `M0 0H${w}V${h}H0Z`;
      skin.current?.setAttribute("viewBox", `0 0 ${w} ${h}`);
      under.current?.style.setProperty("inset", `${zone.y}px ${w - zone.x - zone.w}px ${Math.max(0, h - zone.y - zone.h)}px ${zone.x}px`);
      node.dataset.ready = "true";
      if (motion.matches) {
        target = current = 1;
      } else if (target > 0 && target < 1) {
        hold();
      } else {
        target = current = window.scrollY > lock + 1 ? 1 : 0;
      }
      last = -1;
      draw(current);
      onScroll();
    };

    const resize = new ResizeObserver(measure);
    resize.observe(hero);
    measure();
    void document.fonts?.ready.then(measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    motion.addEventListener("change", measure);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
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
