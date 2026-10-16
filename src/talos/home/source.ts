import { createHomeFrame, heroFrame, sampleHomeFrame } from "./journey.ts";
import type { HomeGeometry, JourneyDock, JourneyStop } from "./journey.ts";
import type { Framing } from "../engine/renderer.ts";

export function createHomeSource(root: HTMLElement, onChange: () => void) {
  const pose = createHomeFrame();
  let geometry: HomeGeometry = { stops: [], docks: [], end: 0, height: 1, mobile: false };
  let dirty = true;
  let quietStart = Infinity;
  let quietEnd = Infinity;
  let pending = 0;
  let disposed = false;
  const readFrame = (node: Element, radius?: number): Framing => {
    const rect = node.getBoundingClientRect();
    // Reveal translates its contents. Layout coordinates remain stable throughout its entrance.
    let offset = 0;
    for (let parent: Element | null = node; parent && parent !== root; parent = parent.parentElement) {
      const transform = getComputedStyle(parent).transform;
      if (transform !== "none") offset += new DOMMatrixReadOnly(transform).m42;
    }
    return { x: rect.left + rect.width / 2, y: rect.top + window.scrollY - offset + rect.height / 2, radius: radius ?? rect.width / 2 };
  };
  const measure = () => {
    const height = window.innerHeight;
    const mobile = window.innerWidth < 768;
    const hero = root.querySelector<HTMLElement>(".hero");
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const heroPose = heroFrame(rect.width, rect.height);
    heroPose.y += rect.top + window.scrollY;
    const stops: JourneyStop[] = [{ at: 0, frame: heroPose }];
    const narrow = window.innerWidth < 1024;
    const rail = { x: window.innerWidth - (mobile ? 15 : narrow ? 20 : 46), y: 120, radius: mobile ? 11 : narrow ? 12 : 22 };
    if (mobile) stops.push({ at: 130, frame: { ...rail, y: 250 } });
    let previousRail = rail.x;
    const docks: JourneyDock[] = [];
    const hold = height * (mobile ? 0.34 : 0.42);
    for (const key of ["products", "talon", "talos", "platform", "principles", "closing"]) {
      const node = root.querySelector(`[data-home-stop="${key}"]`);
      if (!node) continue;
      const frame = readFrame(node);
      const at = Math.max(1, frame.y - hold);
      const edge = !mobile && key === "talos" ? (narrow ? 20 : 46) : rail.x;
      if (!mobile && edge !== previousRail) {
        const section = root.querySelector(key === "talos" ? "#talos" : "#platform");
        const gap = section ? section.getBoundingClientRect().top + window.scrollY + (key === "talos" ? 24 : -40) : frame.y - 180;
        const crossing = gap - hold - height * 0.1;
        stops.push(
          { at: crossing - height * 0.07, frame: { ...rail, x: previousRail, y: gap } },
          { at: crossing + height * 0.07, frame: { ...rail, x: edge, y: gap } },
        );
      } else {
        const before = at - height * (mobile ? 0.42 : 0.32);
        stops.push({ at: before, frame: { ...rail, x: edge, y: before + (mobile ? 120 : hold) } });
      }
      const after = at + height * 0.32;
      stops.push(
        { at: at - height * (mobile ? 0.24 : 0.18), frame: { ...rail, x: edge, y: frame.y } },
        { at, frame },
        { at: at + height * 0.08, frame },
        { at: at + height * 0.18, frame: { ...rail, x: edge, y: frame.y } },
        { at: after, frame: { ...rail, x: edge, y: after + (mobile ? 120 : hold) } },
      );
      previousRail = edge;
      if (key !== "talos" && key !== "principles") continue;
      const selector = key === "talos" ? "[data-home-worker]" : "[data-home-principle]";
      const satellites = Array.from(root.querySelectorAll(selector), (slot, index) => ({
        key: `${key === "talos" ? "worker" : "principle"}-${index}`,
        frame: readFrame(slot, mobile ? 7 : 9),
      }));
      const last = satellites.at(-1);
      if (!last) continue;
      const enter = at - height * 0.18;
      const leave = Math.max(at + height * 0.14, last.frame.y - height * 0.42);
      docks.push({ enter, leave, satellites });
    }
    const faq = root.querySelector(".faq");
    if (faq) {
      const top = faq.getBoundingClientRect().top + window.scrollY;
      const frame = { x: window.innerWidth - (mobile ? 15 : 46), y: top + height * 0.3, radius: mobile ? 11 : 22 };
      quietStart = top - height * 0.5;
      const closing = root.querySelector(".closing");
      quietEnd = closing ? Math.max(quietStart, closing.getBoundingClientRect().top + window.scrollY - height * 0.75) : top;
      stops.push({ at: quietStart, frame, opacity: 0.5 });
      stops.push({ at: quietEnd, frame: { ...frame, y: top + height * 0.7 }, opacity: 0.5 });
    }
    stops.sort((a, b) => a.at - b.at);
    const end = document.documentElement.scrollHeight - height + height * 0.15;
    geometry = { stops, docks, end, height, mobile, width: window.innerWidth };
    dirty = false;
  };
  const notify = () => {
    pending = 0;
    if (!disposed) onChange();
  };
  const schedule = () => { if (!pending && !disposed) pending = requestAnimationFrame(notify); };
  const invalidate = () => { dirty = true; schedule(); };
  const resize = new ResizeObserver(invalidate);
  resize.observe(root);
  root.querySelectorAll("section, .product, .graph, .principle-grid").forEach((node) => resize.observe(node));
  const mutations = new MutationObserver(invalidate);
  root.querySelectorAll(".reveal").forEach((node) => mutations.observe(node, { attributes: true, attributeFilter: ["class"] }));
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", invalidate);
  window.visualViewport?.addEventListener("resize", invalidate);
  root.addEventListener("transitionend", invalidate);
  document.fonts.addEventListener("loadingdone", invalidate);
  void document.fonts.ready.then(() => { if (!disposed) invalidate(); });
  return {
    get active() { return window.scrollY < quietStart || window.scrollY > quietEnd; },
    sample() {
      if (dirty) measure();
      return sampleHomeFrame(geometry, window.scrollY, pose);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(pending);
      resize.disconnect();
      mutations.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", invalidate);
      window.visualViewport?.removeEventListener("resize", invalidate);
      root.removeEventListener("transitionend", invalidate);
      document.fonts.removeEventListener("loadingdone", invalidate);
    },
  };
}
