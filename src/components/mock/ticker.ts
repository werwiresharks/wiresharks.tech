/**
 * One animation frame loop for every small globe on the page. A globe joins
 * while it is on screen and leaves when it scrolls away, so off-screen
 * panels cost nothing, and the loop stops when no globe is visible.
 */
type Draw = (now: number) => void;

const active = new Set<Draw>();
let frame = 0;

const loop = (now: number) => {
  frame = 0;
  if (document.hidden) return;
  active.forEach((draw) => draw(now));
  if (active.size) frame = requestAnimationFrame(loop);
};

const wake = () => {
  if (!frame && active.size && !document.hidden) frame = requestAnimationFrame(loop);
};

if (typeof document !== "undefined") document.addEventListener("visibilitychange", wake);

export function play(draw: Draw) {
  active.add(draw);
  wake();
}

export function stop(draw: Draw) {
  active.delete(draw);
}
