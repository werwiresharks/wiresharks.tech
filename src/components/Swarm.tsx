import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CLAWS } from "./ProductIcons";
import { Reveal } from "./Reveal";
import { pinProgress, routePath, swarmFrame, swarmLayout, TASK } from "./swarmLayout";
import type { Stage, SwarmLayout } from "./swarmLayout";

const STEPS: [Stage, string, string][] = [
  ["split", "Split", "One task becomes smaller jobs. Each job goes to a specialized agent."],
  ["execute", "Execute", "The agents work at the same time and share useful findings."],
  ["combine", "Combine", "The results come together in one report."],
];

const f = (v: number) => v.toFixed(2);

/**
 * The planned Raptor swarm. The figure pins under the header while scroll
 * steps it through three stages: one task splits into jobs for specialized
 * agents, the agents work in parallel, and their results combine in one
 * shared report. Under reduced motion it shows the finished figure, unpinned.
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
      pinProgress({ top: trackNode.getBoundingClientRect().top, height: trackHeight }, { top: pinTop, height: pinHeight }, window.innerHeight);
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
    const hub = root.querySelector<SVGCircleElement>(".swarm-hub");
    const report = root.querySelector<SVGGElement>(".swarm-report");
    const count = root.querySelector<SVGTextElement>(".swarm-count");
    const agents = all<SVGGElement>(".swarm-agent");
    const trails = all<SVGPathElement>(".swarm-trail");
    const findings = all<SVGPathElement>(".swarm-finding");
    const cards = all<SVGGElement>(".swarm-card");
    const done = all<SVGRectElement>(".swarm-card-done");
    const work = all<SVGRectElement>(".swarm-work-fill");
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
      hub?.setAttribute("opacity", f(frame.hub));
      report?.setAttribute("opacity", f(frame.report));
      frame.agents.forEach((agent, i) => {
        const { work: [w0], bar: [b0] } = layout.agents[i];
        agents[i].setAttribute("transform", `translate(${f(agent.x)} ${f(agent.y)}) scale(${f(agent.scale)})`);
        agents[i].setAttribute("opacity", f(agent.opacity));
        trails[i].style.strokeDashoffset = f(1 - agent.trail);
        findings[i].style.strokeDashoffset = f(1 - agent.finding);
        cards[i].setAttribute("opacity", f(agent.card));
        done[i].setAttribute("opacity", f(agent.work));
        work[i].setAttribute("transform", `translate(${f(w0.x)} ${f(w0.y)}) scale(${f(agent.work)} 1)`);
        signals[i].setAttribute("transform", `translate(${f(agent.signal.x)} ${f(agent.signal.y)})`);
        signals[i].setAttribute("opacity", f(agent.signal.opacity));
        rows[i].style.setProperty("--on", f(agent.reported));
        fills[i].setAttribute("transform", `translate(${f(b0.x)} ${f(b0.y)}) scale(${f(agent.reported)} 1)`);
      });
      if (count && frame.landed !== landed) {
        landed = frame.landed;
        count.textContent = `${landed}/${n}`;
      }
      STEPS.forEach(([stage], i) => {
        const { fill, state } = frame.stages[stage];
        items[i].style.setProperty("--fill", f(fill));
        if (items[i].dataset.state === state) return;
        items[i].dataset.state = state;
        if (state === "active") items[i].setAttribute("aria-current", "step");
        else items[i].removeAttribute("aria-current");
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
            <span id="swarm-title">One agent is powerful. A swarm is unstoppable.</span>
          </Reveal>
          <Reveal as="p" delay={120} className="section-lede">
            Raptor Swarm brings specialized AI agents together to do complex work. The agents divide
            a task, work in parallel, share what they find, and combine their results into one
            coordinated output.
          </Reveal>
          <Reveal as="p" delay={180} className="swarm-note">
            Swarm coordination is in development and not available yet. At launch,{" "}
            <span className="swarm-name">Raptor-1</span> splits one task across parallel workers,
            each with its own copy of the code.
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
                  In this planned design, one task, {TASK}, splits into smaller jobs. Specialized
                  agents for auth, APIs, dependencies, storage, pipelines and cloud work on the jobs
                  in parallel. Their results come together in one shared report.
                </figcaption>
              </figure>
            </Reveal>
            <ol ref={steps} className="swarm-steps" aria-label="How the swarm works">
              {STEPS.map(([stage, name, text], i) => (
                <li key={stage} data-state="next">
                  <span className="label">{String(i + 1).padStart(2, "0")}</span>
                  <b>{name}</b>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The figure's static structure; the paint loop moves and reveals its parts. */
function SwarmDrawing({ layout }: { layout: SwarmLayout }) {
  const { task, caption, title, origin, agentMark, report, agents } = layout;
  const head = agents[0].row.y - report.y;
  return (
    <>
      <defs>
        <symbol id="swarm-mark" viewBox="0 0 32 32">
          <path d={CLAWS[0] + CLAWS[1]} fill="currentColor" />
          <path d={CLAWS[2]} className="swarm-claw" />
        </symbol>
      </defs>
      {agents.map(({ name, trail, finding }) => (
        <g key={name}>
          <path className="swarm-trail" pathLength={1} d={routePath(trail)} />
          <path className="swarm-finding" pathLength={1} d={routePath(finding)} />
        </g>
      ))}
      <g className="swarm-task">
        <rect className="swarm-frame" x={task.x} y={task.y} width={task.w} height={task.h} rx="8" />
        <text className="swarm-caption" x={caption.x} y={caption.y}>
          Task
        </text>
        <text className="swarm-title" x={title.x} y={title.y}>
          {TASK}
        </text>
      </g>
      {agents.map(({ name, card, label, work: [w0, w1] }) => (
        <g key={name} className="swarm-card" opacity="0">
          <rect className="swarm-frame" x={card.x} y={card.y} width={card.w} height={card.h} rx="6" />
          <rect className="swarm-card-done" x={card.x} y={card.y} width={card.w} height={card.h} rx="6" opacity="0" />
          <text x={label.x} y={label.y}>
            {name}
          </text>
          <line className="swarm-track-line" x1={w0.x} x2={w1.x} y1={w0.y} y2={w1.y} />
          <rect className="swarm-work-fill" x="0" y="-1" width={w1.x - w0.x} height="2" transform={`translate(${w0.x} ${w0.y}) scale(0 1)`} />
        </g>
      ))}
      <g className="swarm-report" opacity="0">
        <rect className="swarm-frame" x={report.x} y={report.y} width={report.w} height={report.h} rx="8" />
        <text className="swarm-title" x={report.x + 14} y={report.y + head / 2 + 1}>
          Shared report
        </text>
        <text className="swarm-caption swarm-count" x={report.x + report.w - 14} y={report.y + head / 2 + 1} textAnchor="end">
          0/{agents.length}
        </text>
        <line className="swarm-track-line" x1={report.x} x2={report.x + report.w} y1={report.y + head - 6} y2={report.y + head - 6} />
        {agents.map(({ name, short, weight, row, bar: [b0, b1] }) => {
          const y = row.y + row.h / 2;
          return (
            <g key={name} className="swarm-row" style={{ "--on": 0 } as CSSProperties}>
              <rect className="swarm-row-marker" x={row.x + 14} y={y - 3} width="6" height="6" />
              <text x={row.x + 28} y={y + 4}>
                {short}
              </text>
              <line className="swarm-track-line" x1={b0.x} x2={b1.x} y1={y} y2={y} />
              <rect className="swarm-row-fill" x="0" y="-1.5" width={(b1.x - b0.x) * weight} height="3" transform={`translate(${b0.x} ${b0.y}) scale(0 1)`} />
            </g>
          );
        })}
      </g>
      {agents.map(({ name }) => (
        <circle key={name} className="swarm-signal" r="3" opacity="0" />
      ))}
      {agents.map(({ name }) => (
        <g key={name} className="swarm-agent" opacity="0">
          <use href="#swarm-mark" x={-agentMark / 2} y={-agentMark / 2} width={agentMark} height={agentMark} />
        </g>
      ))}
      <circle className="swarm-hub" cx={origin.x} cy={origin.y} r="3.5" opacity="0" />
    </>
  );
}
