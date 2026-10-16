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
    // Frame the orb in the part of the hero visible on first load, so all of it shows.
    const heroPose = heroFrame(rect.width, mobile ? rect.height : Math.min(rect.height, height - (rect.top + window.scrollY)));
    heroPose.y += rect.top + window.scrollY;
    const stops: JourneyStop[] = [{ at: 0, frame: heroPose }];
    const narrow = window.innerWidth < 1024;
    const rail = { x: window.innerWidth - (mobile ? 15 : narrow ? 20 : 46), y: 120, radius: mobile ? 11 : narrow ? 12 : 22 };
    const heroExit = mobile ? Math.max(1, heroPose.y - height * 0.65) : height * 0.7;
    if (mobile) {
      const depart = heroExit + height * 0.4;
      stops.push(
        { at: heroExit, frame: heroPose },
        { at: depart, frame: { ...rail, y: depart + 160 } },
      );
    }
    if (!mobile) {
      stops.push({ at: heroExit, frame: { ...rail, y: heroExit + height * 0.5 } });
    }
    let previousRail = rail.x;
    let previousDeparture = 0;
    const docks: JourneyDock[] = [];
    const hold = height * (mobile ? 0.44 : 0.5);
    const appendStops = (...next: JourneyStop[]) => {
      const first = next[0];
      while (stops.length > 1 && stops[stops.length - 1].at >= first.at) stops.pop();
      stops.push(...next);
    };
    for (const key of ["products", "talon", "talos", "platform", "principles", "closing"]) {
      const node = root.querySelector(`[data-home-stop="${key}"]`);
      if (!node) continue;
      const frame = readFrame(node);
      let at = Math.max(1, frame.y - hold);
      const edge = !mobile && key === "talos" ? (narrow ? 20 : 46) : rail.x;
      const approach: JourneyStop[] = [];
      if (!mobile && edge !== previousRail) {
        const section = root.querySelector(key === "talos" ? "#talos" : "#platform");
        const gap = section ? readFrame(section).y - section.getBoundingClientRect().height / 2 + (key === "talos" ? 24 : -40) : frame.y - 180;
        const crossing = gap - hold - height * 0.1;
        const start = Math.max(crossing - height * 0.18, previousDeparture);
        const finish = Math.max(crossing + height * 0.18, start + height * 0.12);
        approach.push(
          { at: start, frame: { ...rail, x: previousRail, y: gap } },
          { at: finish, frame: { ...rail, x: edge, y: gap } },
        );
      } else {
        const before = Math.max(at - height * (mobile ? 0.42 : 0.32), previousDeparture, key === "products" && !mobile ? heroExit : 0);
        approach.push({ at: before, frame: { ...rail, x: edge, y: before + (mobile ? 160 : hold) } });
      }
      at = Math.max(at, approach[approach.length - 1].at + height * 0.12);
      const panel = key === "talos" ? node.closest(".home-graph") : key === "talon" ? node.closest(".home-console") : null;
      const panelRelease = panel
        ? Math.max(at + height * 0.3, panel.getBoundingClientRect().bottom + window.scrollY - height * 0.28)
        : at + height * 0.08;
      // Depart while the complete sphere still clears the sticky header and its easing tail.
      const release = Math.min(panelRelease, frame.y - (mobile ? 64 : 76) - frame.radius - 40 - height * 0.12);
      const after = release + height * 0.24;
      const arrival = at - height * (mobile ? 0.24 : 0.18);
      if (arrival - approach[approach.length - 1].at >= height * 0.08) {
        approach.push({ at: arrival, frame: { ...rail, x: edge, y: frame.y } });
      }
      appendStops(
        ...approach,
        { at, frame },
        { at: release, frame },
        { at: release + height * 0.1, frame: { ...rail, x: edge, y: frame.y } },
        { at: after, frame: { ...rail, x: edge, y: after + (mobile ? 160 : hold) } },
      );
      previousRail = edge;
      previousDeparture = after;
      if (key === "talon") {
        docks.push({ enter: at - height * 0.18, leave: release, holdFrom: at, satellites: [] });
      }
      if (key !== "talos" && key !== "principles") continue;
      const selector = key === "talos" ? "[data-home-worker]" : "[data-home-principle]";
      const satellites = Array.from(root.querySelectorAll(selector), (slot, index) => ({
        key: `${key === "talos" ? "worker" : "principle"}-${index}`,
        frame: readFrame(slot, mobile ? 7 : 9),
      }));
      const last = satellites.at(-1);
      if (!last) continue;
      const enter = at - height * 0.18;
      const leave = panel ? panelRelease : Math.max(at + height * 0.14, last.frame.y - height * 0.42);
      docks.push({ enter, leave: panel ? release : leave, satelliteLeave: leave, holdFrom: panel ? at : undefined, satellites });
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
    geometry = { stops, docks, end, height, mobile, width: window.innerWidth, heroExit };
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
