import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Node has no WebGL: three is a recording stand-in, and the DOM is the little the renderer touches.
const THREE_STUB = `
class Vec { constructor(x = 0, y = 0, z = 0, w = 0) { Object.assign(this, { x, y, z, w }); }
  set(x, y, z, w) { Object.assign(this, { x, y, z: z ?? this.z, w: w ?? this.w }); return this; }
  copy(v) { return this.set(v.x, v.y, v.z); }
  lerp(v, k) { return this.set(this.x + (v.x - this.x) * k, this.y + (v.y - this.y) * k, this.z + (v.z - this.z) * k); }
  setScalar(s) { return this.set(s, s, s); } }
export class Vector2 extends Vec {} export class Vector3 extends Vec {} export class Vector4 extends Vec {}
export class Color { setRGB() { return this; } }
export class Sphere {}
export const DynamicDrawUsage = 1;
export class BufferAttribute { constructor(array, size) { this.array = array; this.itemSize = size; } setUsage() { return this; } }
export class BufferGeometry { constructor() { this.attributes = {}; } setAttribute(k, v) { this.attributes[k] = v; } setDrawRange() {} dispose() {} }
export class ShaderMaterial { constructor(o) { this.uniforms = o.uniforms; } dispose() {} }
class Node3 { constructor(geometry, material) { Object.assign(this, { geometry, material, position: new Vec(), scale: new Vec(1, 1, 1), visible: true }); } add() {} }
export class Scene extends Node3 {} export class Group extends Node3 {} export class Points extends Node3 {}
export class Mesh extends Node3 {} export class LineSegments extends Node3 {}
export class PerspectiveCamera extends Node3 { updateProjectionMatrix() {} }
export class PlaneGeometry { dispose() {} }
export class WebGLRenderer { constructor() { this.domElement = globalThis.__rendererCanvas(); }
  setClearColor() {} setPixelRatio() {} setSize() {} render() {} dispose() {} forceContextLoss() {} }
`;
registerHooks({
  resolve: (specifier, context, next) =>
    specifier === "three"
      ? { url: `data:text/javascript,${encodeURIComponent(THREE_STUB)}`, shortCircuit: true }
      : next(specifier, context),
});

type Listener = (event: { preventDefault(): void }) => void;
function eventTarget<T extends object>(target: T) {
  const listeners = new Map<string, Listener[]>();
  return Object.assign(target, {
    addEventListener: (type: string, listener: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    removeEventListener: (type: string, listener: Listener) =>
      listeners.set(type, (listeners.get(type) ?? []).filter((l) => l !== listener)),
    dispatch: (type: string, init: object = {}) => {
      for (const listener of listeners.get(type) ?? []) listener({ preventDefault() {}, ...init });
    },
  });
}

const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
const globals = globalThis as Record<string, unknown>;
globals.requestAnimationFrame = (callback: FrameRequestCallback) => {
  frames.set(++nextFrame, callback);
  return nextFrame;
};
globals.cancelAnimationFrame = (handle: number) => frames.delete(handle);
globals.window = eventTarget({ devicePixelRatio: 1, matchMedia: () => ({ matches: false }), setTimeout: () => 0, clearTimeout() {} });
globals.document = eventTarget({ visibilityState: "visible", documentElement: eventTarget({}) });
Object.defineProperty(globalThis, "navigator", { value: { hardwareConcurrency: 8, deviceMemory: 8 }, configurable: true });
globals.ResizeObserver = class { observe() {} disconnect() {} };
globals.IntersectionObserver = class { observe() {} disconnect() {} };
let canvas = eventTarget({ setAttribute() {}, className: "", remove() {} });
globals.__rendererCanvas = () => (canvas = eventTarget({ setAttribute() {}, className: "", remove() {} }));

const { RaptorRenderer } = await import("./renderer.ts");
const { RaptorEngine } = await import("./engine.ts");

/** Runs queued animation frames until none are queued, up to `limit`; returns how many ran. */
function pump(limit: number) {
  let ran = 0;
  while (ran < limit && frames.size) {
    const batch = [...frames.values()];
    frames.clear();
    ran++;
    for (const frame of batch) frame(performance.now());
  }
  return ran;
}

test("a lost WebGL context runs no frames, whatever wakes the scene, until the context is restored", () => {
  const host = eventTarget({
    clientWidth: 800,
    clientHeight: 600,
    appendChild() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  });
  let failures = 0;
  const renderer = new RaptorRenderer({
    host: host as unknown as HTMLElement,
    frame: () => ({ x: 0, y: 0, radius: 1 }),
    interactive: true,
    particleScale: 0.2,
    substrate: { anchors: () => ({ primary: { x: 400, y: 300, radius: 42 } }) },
    onFailure: () => failures++,
  });
  const engine = new RaptorEngine();
  engine.attach(renderer);
  engine.ingest({ type: "agent.spawned", agentId: "root", parentId: null, label: "root", seq: 1 });
  assert.equal(pump(30), 30, "an animating scene draws every frame");

  canvas.dispatch("webglcontextlost");
  assert.equal(failures, 1);
  engine.ingest({ type: "agent.state", agentId: "root", state: "running", seq: 2 });
  (globalThis.window as unknown as ReturnType<typeof eventTarget>).dispatch("pointermove", { clientX: 10, clientY: 10 });
  renderer.requestPresentation();
  assert.equal(pump(60), 0, "engine events, pointer movement and redraw requests all stay stopped");

  canvas.dispatch("webglcontextrestored");
  assert.equal(pump(30), 30, "a restored context draws again");
  renderer.dispose();
});
