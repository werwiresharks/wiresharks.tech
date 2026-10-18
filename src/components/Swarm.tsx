import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CLAWS } from "./ProductIcons";
import { Reveal } from "./Reveal";
import { stageProgress, swarmFrame, swarmLayout } from "./swarmLayout";
import type { Phase, SwarmLayout } from "./swarmLayout";

const STEPS: [Phase, string, string][] = [
  ["split", "Split", "One Raptor divides into specialized agents."],
  ["examine", "Examine", "Each agent takes one part of the system."],
  ["report", "Report", "Findings merge into one shared report."],
];

/** Where each report row's bar starts, right of its label. */
const BAR = 92;
const f = (v: number) => v.toFixed(2);

/**
 * The planned Raptor swarm. The stage pins under the header while scroll
 * drives one Raptor mark through a split into agents, their connections to
 * the parts of a system, and their findings flowing into one shared report.
 * Under reduced motion it shows the finished figure, unpinned.
 */
export function Swarm() {
  const track = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const steps = useRef<HTMLOListElement>(null);
  const [layout, setLayout] = useState<SwarmLayout | null>(null);
  /** Where scroll has taken the figure, and where the drawing has caught up to. */
  const progress = useRef({ target: 0, current: 0 });
  const paint = useRef((_progress: number) => {});

  useEffect(() => {
    const trackNode = track.current;
    const pinNode = pin.current;
    const canvasNode = canvas.current;
    if (!trackNode || !pinNode || !canvasNode) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const state = progress.current;
    let still = motion.matches;
    let visible = false;
    let frame = 0;
    let pinTop = 0;
    let pinHeight = 0;
    let trackHeight = 0;

    const measure = () => {
      pinTop = parseFloat(getComputedStyle(pinNode).top) || 0;
      pinHeight = pinNode.offsetHeight;
      trackHeight = trackNode.offsetHeight;
    };
    const read = () =>
      stageProgress({ top: trackNode.getBoundingClientRect().top, height: trackHeight }, { top: pinTop, height: pinHeight }, window.innerHeight);
    // Wheel ticks arrive in coarse steps; easing toward the target keeps the figure smooth.
    const tick = () => {
      frame = 0;
      if (!still) state.target = read();
      const gap = state.target - state.current;
      state.current = Math.abs(gap) < 0.0005 ? state.target : state.current + gap * 0.2;
      paint.current(state.current);
      if (state.current !== state.target) frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    // Entering the viewport jumps straight to the scroll position, so a stale
    // frame from a jump elsewhere on the page never plays back on screen.
    const snap = () => {
      measure();
      state.target = state.current = still ? 1 : read();
      paint.current(state.current);
    };
    const listen = () => {
      if (visible && !still) window.addEventListener("scroll", schedule, { passive: true });
      else window.removeEventListener("scroll", schedule);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) snap();
        listen();
      },
      { rootMargin: "25% 0px" },
    );
    const resize = new ResizeObserver(() => {
      const width = Math.round(canvasNode.clientWidth);
      const height = Math.round(canvasNode.clientHeight);
      if (width && height) setLayout((prev) => (prev && prev.width === width && prev.height === height ? prev : swarmLayout(width, height)));
      measure();
      schedule();
    });
    const onMotion = () => {
      still = motion.matches;
      snap();
      listen();
    };
    snap();
    io.observe(trackNode);
    [trackNode, pinNode, canvasNode].forEach((node) => resize.observe(node));
    motion.addEventListener("change", onMotion);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      motion.removeEventListener("change", onMotion);
    };
  }, []);

  useLayoutEffect(() => {
    const root = svg.current;
    const legend = steps.current;
    if (!layout || !root || !legend) return;
    const all = <T extends Element>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
    const mark = root.querySelector<SVGGElement>(".swarm-mark");
    const hub = root.querySelector<SVGCircleElement>(".swarm-hub");
    const caption = root.querySelector<SVGTextElement>(".swarm-mark-caption");
    const report = root.querySelector<SVGGElement>(".swarm-report");
    const count = root.querySelector<SVGTextElement>(".swarm-count");
    const agents = all<SVGGElement>(".swarm-agent");
    const trails = all<SVGPathElement>(".swarm-trail");
    const links = all<SVGLineElement>(".swarm-link");
    const findings = all<SVGPathElement>(".swarm-finding");
    const nodes = all<SVGGElement>(".swarm-node");
    const signals = all<SVGCircleElement>(".swarm-signal");
    const rows = all<SVGGElement>(".swarm-row");
    const fills = all<SVGRectElement>(".swarm-row-fill");
    const items = Array.from(legend.children) as HTMLElement[];
    const n = layout.agents.length;
    let last = -1;
    let landed = -1;
    paint.current = (progress: number) => {
      if (progress === last) return;
      last = progress;
      const frame = swarmFrame(layout, progress);
      const { x, y } = layout.origin;
      mark?.setAttribute("transform", `translate(${f(x)} ${f(y)}) scale(${f(frame.mark.scale)})`);
      mark?.setAttribute("opacity", f(frame.mark.opacity));
      hub?.setAttribute("opacity", f(frame.hub));
      const { mark: from, hub: to } = layout.labels;
      caption?.setAttribute("transform", `translate(${f((to.x - from.x) * frame.hub)} ${f((to.y - from.y) * frame.hub)})`);
      report?.setAttribute("opacity", f(frame.report));
      frame.agents.forEach((agent, i) => {
        const shape = layout.agents[i];
        agents[i].setAttribute("transform", `translate(${f(agent.x)} ${f(agent.y)}) scale(${f(agent.scale)})`);
        agents[i].setAttribute("opacity", f(agent.opacity));
        trails[i].style.strokeDashoffset = f(1 - agent.trail);
        links[i].style.strokeDashoffset = f(1 - agent.link);
        findings[i].style.strokeDashoffset = f(1 - agent.finding);
        nodes[i].style.setProperty("--on", f(agent.link));
        signals[i].setAttribute("cx", f(agent.signal.x));
        signals[i].setAttribute("cy", f(agent.signal.y));
        signals[i].setAttribute("opacity", f(agent.signal.opacity));
        rows[i].style.setProperty("--on", f(agent.reported));
        fills[i].setAttribute("width", f((shape.row.w - BAR - 14) * shape.weight * agent.reported));
      });
      if (count && frame.landed !== landed) {
        landed = frame.landed;
        count.textContent = `${landed}/${n}`;
      }
      STEPS.forEach(([phase], i) => {
        const value = frame.phases[phase];
        items[i].style.setProperty("--fill", f(value));
        if (value > 0) items[i].dataset.state = value >= 1 ? "done" : "active";
        else delete items[i].dataset.state;
      });
    };
    paint.current(progress.current.current);
  }, [layout]);

  return (
    <section className="swarm section tone-soft" id="swarm" aria-labelledby="swarm-title">
      <div className="wrap">
        <header className="section-head">
          <Reveal as="p" className="label swarm-label">
            <span>02 / Swarm</span>
            <span className="swarm-status">In development</span>
          </Reveal>
          <Reveal as="h2" delay={60}>
            <span id="swarm-title">One agent. An entire swarm.</span>
          </Reveal>
          <Reveal as="p" delay={120} className="section-lede">
            Raptor is being designed to coordinate multiple specialized security agents, allowing
            complex systems to be examined from different perspectives.
          </Reveal>
          <Reveal as="p" delay={180} className="swarm-tagline">
            Distributed analysis. Coordinated intelligence.
          </Reveal>
        </header>

        <div ref={track} className="swarm-track">
          <div ref={pin} className="swarm-pin">
            <Reveal className="swarm-figure">
              <figure className="panel">
                <div className="panel-bar">
                  <span className="panel-dots" aria-hidden="true" />
                  <span>raptor / swarm</span>
                  <span className="panel-note">Planned</span>
                </div>
                <div ref={canvas} className="swarm-canvas">
                  <svg ref={svg} aria-hidden="true">{layout && <SwarmDrawing layout={layout} />}</svg>
                </div>
                <figcaption className="sr-only">
                  One Raptor finds the weakness. A swarm examines the system. In this planned design,
                  one Raptor agent splits into specialized agents, each examines one part of a
                  system, such as auth, api, dependencies and infrastructure, and their findings
                  flow into one shared report.
                </figcaption>
              </figure>
            </Reveal>
            <div className="swarm-aside">
              <ol ref={steps} className="swarm-steps" aria-label="How the swarm works">
                {STEPS.map(([phase, name, text], i) => (
                  <li key={phase}>
                    <span className="label">{String(i + 1).padStart(2, "0")}</span>
                    <b>{name}</b>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
              <p className="swarm-note">
                Swarm coordination is in development and not yet available. At launch, Raptor
                splits one task across parallel workers in isolated worktrees. Specialized agents
                that coordinate across a whole system come next.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The figure's static structure; the paint loop moves and reveals its parts. */
function SwarmDrawing({ layout }: { layout: SwarmLayout }) {
  const { mark, agentMark, labels, system, report, agents } = layout;
  const head = agents[0].row.y - report.y;
  return (
    <>
      <defs>
        <symbol id="swarm-mark" viewBox="0 0 32 32">
          <path d={CLAWS[0] + CLAWS[1]} fill="currentColor" />
          <path d={CLAWS[2]} className="swarm-claw" />
        </symbol>
      </defs>
      <rect className="swarm-system" x={system.x} y={system.y} width={system.w} height={system.h} rx="10" />
      <text className="swarm-caption" x={labels.system.x} y={labels.system.y} textAnchor={labels.system.anchor}>
        system
      </text>
      {agents.map(({ part, trail: [a, b, c, d], link, finding: [e, g, h, k] }) => (
        <g key={part}>
          <path className="swarm-trail" pathLength={1} d={`M${a.x} ${a.y}C${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`} />
          <line className="swarm-link" pathLength={1} x1={link[0].x} y1={link[0].y} x2={link[1].x} y2={link[1].y} />
          <path className="swarm-finding" pathLength={1} d={`M${e.x} ${e.y}C${g.x} ${g.y} ${h.x} ${h.y} ${k.x} ${k.y}`} />
        </g>
      ))}
      {agents.map(({ part, node }) => (
        <g key={part} className="swarm-node">
          <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="6" />
          <rect className="swarm-node-on" x={node.x} y={node.y} width={node.w} height={node.h} rx="6" />
          <text x={node.x + node.w / 2} y={node.y + node.h / 2 + 4} textAnchor="middle">
            {part}
          </text>
        </g>
      ))}
      <g className="swarm-report" opacity="0">
        <rect className="swarm-report-frame" x={report.x} y={report.y} width={report.w} height={report.h} rx="8" />
        <text className="swarm-report-title" x={report.x + 14} y={report.y + head / 2 + 1}>
          Shared report
        </text>
        <text className="swarm-caption swarm-count" x={report.x + report.w - 14} y={report.y + head / 2 + 1} textAnchor="end">
          0/{agents.length}
        </text>
        <line className="swarm-rule" x1={report.x} x2={report.x + report.w} y1={report.y + head - 6} y2={report.y + head - 6} />
        {agents.map(({ part, row }) => {
          const y = row.y + row.h / 2;
          return (
            <g key={part} className="swarm-row" style={{ "--on": 0 } as CSSProperties}>
              <rect className="swarm-row-marker" x={row.x + 14} y={y - 3} width="6" height="6" />
              <text x={row.x + 28} y={y + 4}>
                {part}
              </text>
              <line className="swarm-row-track" x1={row.x + BAR} x2={row.x + row.w - 14} y1={y} y2={y} />
              <rect className="swarm-row-fill" x={row.x + BAR} y={y - 1.5} height="3" width="0" />
            </g>
          );
        })}
      </g>
      {agents.map(({ part }) => (
        <circle key={part} className="swarm-signal" r="3" opacity="0" />
      ))}
      {agents.map(({ part }) => (
        <g key={part} className="swarm-agent" opacity="0">
          <use href="#swarm-mark" x={-agentMark / 2} y={-agentMark / 2} width={agentMark} height={agentMark} />
        </g>
      ))}
      <circle className="swarm-hub" cx={layout.origin.x} cy={layout.origin.y} r="3.5" opacity="0" />
      <g className="swarm-mark">
        <use href="#swarm-mark" x={-mark / 2} y={-mark / 2} width={mark} height={mark} />
      </g>
      <text className="swarm-caption swarm-mark-caption" x={labels.mark.x} y={labels.mark.y} textAnchor={labels.mark.anchor}>
        raptor
      </text>
    </>
  );
}
