import * as THREE from "three";
import type { HomeFrame } from "../home/journey.ts";
import { HomeMotion } from "../home/journey.ts";
import type { RaptorView } from "./engine.ts";
import type { Effect, Layout, ThreadTarget } from "./layout.ts";
import type { RaptorModel } from "./model.ts";
import { COLORS, SURFACES } from "./palette.ts";
import type { Surface } from "./palette.ts";
import { ParticleField } from "./particles.ts";
import { Substrate } from "./substrate.ts";
import type { AnchorSet } from "./substrate.ts";
import { FrameGovernor, detectQuality } from "./quality.ts";
import {
  MAX_CUTS,
  particleFragment,
  particleVertex,
  ringFragment,
  ringVertex,
  threadFragment,
  threadVertex,
} from "./shaders.ts";
import type { Cut } from "../../components/claw.ts";

/**
 * WebGL view for the Raptor Particle Engine. Renders whatever the facade
 * hands it; it never decides state. Handles framing, pointer response,
 * adaptive quality, visibility pausing, reduced motion, and cleanup.
 */

/** Where the system sits in the stage, in CSS pixels. */
export type Framing = { x: number; y: number; radius: number };

export type RendererOptions = {
  host: HTMLElement;
  home?: { sample: () => HomeFrame; readonly active?: boolean };
  /**
   * The chat substrate: one population shared by every agent, drawn at anchors
   * the host measures. `anchors` is read every frame; `onPresence` reports which
   * agents still have a globe (a finished one keeps it until its particles leave).
   */
  substrate?: { anchors: () => AnchorSet; onPresence?: (agentIds: readonly string[]) => void };
  /** Marks cut through the page that the particles part around, in document pixels. Read each frame of the home journey. */
  cuts?: () => readonly Cut[];
  frame: (width: number, height: number) => Framing;
  particleScale?: number;
  interactive?: boolean;
  reducedMotion?: boolean;
  /** The ground behind the canvas. Defaults to light, the site's white page. */
  surface?: Surface;
  onFailure?: () => void;
};

const FOV = 28;
const CAMERA_Z = 8;
const THREAD_SEGMENTS = 22;
const MAX_THREADS = 40;

type ThreadRuntime = ThreadTarget & { alpha: number; target: number; flow: number };

export class RaptorRenderer implements RaptorView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  private system = new THREE.Group();
  private field: ParticleField;
  private substrate: Substrate | null = null;
  private stillWake = 0;
  private geometry = new THREE.BufferGeometry();
  private positionAttr: THREE.BufferAttribute;
  private colorAttr: THREE.BufferAttribute;
  private paramsAttr: THREE.BufferAttribute;
  private clipAttr: THREE.BufferAttribute;
  private particleMaterial: THREE.ShaderMaterial;
  private ring: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private checkpoint: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private threadGeometry = new THREE.BufferGeometry();
  private threadMaterial: THREE.ShaderMaterial;
  private threadPositions: Float32Array;
  private threadStyle: Float32Array;
  private threads = new Map<string, ThreadRuntime>();
  private governor = new FrameGovernor();
  private options: RendererOptions;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private maxPixelRatio: number;
  private framing: Framing = { x: 0, y: 0, radius: 100 };
  private center = new THREE.Vector3();
  private targetCenter = new THREE.Vector3();
  private scale = 1;
  private targetScale = 1;
  private ringRadius = 1.24;
  private targetRingRadius = 1.24;
  private hold = 0;
  private targetHold = 0;
  private holdAngle = 0;
  private gate = 0;
  private checkpointOpacity = 0;
  private targetCheckpointOpacity = 0;
  private checkpointRadius = 1;
  private pointer: { x: number; y: number } | null = null;
  private pointerStrength = 0;
  private tiltX = 0;
  private tiltY = 0;
  private time = 0;
  private homeMotion = new HomeMotion();
  private cutChords = Array.from({ length: MAX_CUTS }, () => new THREE.Vector4());
  private cutMarks = Array.from({ length: MAX_CUTS }, () => new THREE.Vector4());
  /** Per cut: the shove left by its strike, and whether it was drawn last frame (unset before the first). */
  private kicks = new Float32Array(MAX_CUTS);
  private drawn: boolean[] | null = null;
  private last = 0;
  private frameHandle = 0;
  private visible = true;
  private paused = false;
  private reduced: boolean;
  private needsRender = true;
  private disposed = false;
  /** Between webglcontextlost and webglcontextrestored nothing can be drawn, so no frame may run. */
  private lost = false;
  private observers: { disconnect(): void }[] = [];
  private cleanups: (() => void)[] = [];

  constructor(options: RendererOptions) {
    this.options = options;
    this.reduced = !!options.reducedMotion;
    const quality = detectQuality(options.particleScale ?? 1);
    this.maxPixelRatio = quality.maxPixelRatio;
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
    });
    this.renderer.setClearColor(0xffffff, 0);
    const canvas = this.renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "rpe-canvas";
    options.host.appendChild(canvas);

    this.camera.position.set(0, 0, CAMERA_Z);
    this.scene.add(this.system);

    this.field = new ParticleField(quality.particles);
    this.positionAttr = new THREE.BufferAttribute(this.field.position, 3).setUsage(THREE.DynamicDrawUsage);
    this.colorAttr = new THREE.BufferAttribute(this.field.color, 3).setUsage(THREE.DynamicDrawUsage);
    this.paramsAttr = new THREE.BufferAttribute(this.field.params, 4).setUsage(THREE.DynamicDrawUsage);
    this.clipAttr = new THREE.BufferAttribute(this.field.clip, 4).setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", this.positionAttr);
    this.geometry.setAttribute("aColor", this.colorAttr);
    this.geometry.setAttribute("aParams", this.paramsAttr);
    this.geometry.setAttribute("aClip", this.clipAttr);
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
    this.particleMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uDrift: { value: options.home || options.substrate ? 0 : 1 },
        uLocalDepth: { value: options.substrate ? 1 : 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uBaseSize: { value: 2.2 },
        uScale: { value: 1 },
        uCenterZ: { value: -CAMERA_Z },
        uPointer: { value: new THREE.Vector3(99, 99, 0) },
        uPointerStrength: { value: 0 },
        uViewport: { value: new THREE.Vector2(1, 1) },
        uFog: { value: new THREE.Color(...SURFACES.light.fog) },
        uCutChord: { value: this.cutChords },
        uCutMark: { value: this.cutMarks },
      },
    });
    if (options.substrate) {
      this.substrate = new Substrate(this.field.lattice, this.field.capacity);
      this.substrate.onPresence = options.substrate.onPresence ?? null;
    }
    const points = new THREE.Points(this.geometry, this.particleMaterial);
    points.frustumCulled = false;
    this.system.add(points);

    this.ring = this.createRing(false);
    this.checkpoint = this.createRing(true);
    this.system.add(this.checkpoint, this.ring);

    this.threadPositions = new Float32Array(MAX_THREADS * THREAD_SEGMENTS * 2 * 3);
    this.threadStyle = new Float32Array(MAX_THREADS * THREAD_SEGMENTS * 2 * 3);
    const threadT = new Float32Array(MAX_THREADS * THREAD_SEGMENTS * 2);
    for (let t = 0; t < MAX_THREADS; t++)
      for (let s = 0; s < THREAD_SEGMENTS; s++) {
        const base = (t * THREAD_SEGMENTS + s) * 2;
        threadT[base] = s / THREAD_SEGMENTS;
        threadT[base + 1] = (s + 1) / THREAD_SEGMENTS;
      }
    this.threadGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.threadPositions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.threadGeometry.setAttribute("aT", new THREE.BufferAttribute(threadT, 1));
    this.threadGeometry.setAttribute(
      "aStyle",
      new THREE.BufferAttribute(this.threadStyle, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.threadGeometry.setDrawRange(0, 0);
    this.threadMaterial = new THREE.ShaderMaterial({
      vertexShader: threadVertex,
      fragmentShader: threadFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uInk: { value: new THREE.Color(...COLORS.graphite) },
        uBronze: { value: new THREE.Color(...COLORS.redDeep) },
        uCool: { value: new THREE.Color(...COLORS.red) },
      },
    });
    const lines = new THREE.LineSegments(this.threadGeometry, this.threadMaterial);
    lines.frustumCulled = false;
    lines.renderOrder = -1;
    this.system.add(lines);

    if (options.surface && options.surface !== "light") this.setSurface(options.surface);
    this.bindEvents();
    this.resize();
    this.start();
  }

  private createRing(dashed: boolean) {
    const material = new THREE.ShaderMaterial({
      vertexShader: ringVertex,
      fragmentShader: ringFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uHalf: { value: 2.4 },
        uRadius: { value: 1.24 },
        uPx: { value: 0.004 },
        uColor: { value: new THREE.Color(...(dashed ? COLORS.slate : COLORS.redDeep)) },
        uHotColor: { value: new THREE.Color(...COLORS.redGlow) },
        uOpacity: { value: dashed ? 0 : 0.85 },
        uHoldAngle: { value: 0 },
        uHold: { value: 0 },
        uGate: { value: 0 },
        uGateAngle: { value: 0 },
        uTime: { value: 0 },
        uDashed: { value: dashed ? 1 : 0 },
        uTicks: { value: dashed ? 0 : 1 },
      },
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    mesh.renderOrder = dashed ? -2 : 2;
    return mesh;
  }

  private bindEvents() {
    const { host } = this.options;
    const canvas = this.renderer.domElement;
    const resize = new ResizeObserver(() => this.resize());
    resize.observe(host);
    this.observers.push(resize);
    const io = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        this.start();
      },
      { rootMargin: "80px" },
    );
    io.observe(host);
    this.observers.push(io);
    const onVisibility = () => this.start();
    document.addEventListener("visibilitychange", onVisibility);
    this.cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));
    const onLost = (event: Event) => {
      event.preventDefault();
      this.lost = true;
      this.stop();
      this.options.onFailure?.();
    };
    const onRestored = () => {
      this.lost = false;
      this.requestPresentation();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    this.cleanups.push(() => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    });
    if (this.options.interactive) {
      // Listen on the window, not the stage: the stage is pointer-events: none
      // so the decorative canvas can never intercept clicks on content above it.
      const move = (event: PointerEvent) => {
        const rect = this.options.home ? null : host.getBoundingClientRect();
        if (this.substrate) this.needsRender = true;
        const x = event.clientX - (rect?.left ?? 0);
        const y = event.clientY - (rect?.top ?? 0);
        const inside = x >= 0 && y >= 0 && x <= (rect?.width ?? this.width) && y <= (rect?.height ?? this.height);
        this.pointer = inside ? { x, y } : null;
        if (inside) this.start();
      };
      const leave = () => {
        this.pointer = null;
      };
      window.addEventListener("pointermove", move, { passive: true });
      document.documentElement.addEventListener("pointerleave", leave);
      this.cleanups.push(() => {
        window.removeEventListener("pointermove", move);
        document.documentElement.removeEventListener("pointerleave", leave);
      });
    }
  }

  private worldHeight() {
    return 2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360);
  }

  /** CSS pixels to world units on the z = 0 plane. */
  private toWorld(x: number, y: number) {
    const h = this.worldHeight();
    const w = h * (this.width / this.height);
    return new THREE.Vector3((x / this.width - 0.5) * w, (0.5 - y / this.height) * h, 0);
  }

  private resize() {
    const { host } = this.options;
    this.width = Math.max(1, host.clientWidth);
    this.height = Math.max(1, host.clientHeight);
    if (this.options.home && this.width < 768 && this.field.active > 6000) this.field.setActive(6000);
    const maxDpr = this.options.home && this.width < 768 ? 1.5 : this.maxPixelRatio;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio, maxDpr);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.particleMaterial.uniforms.uPixelRatio.value = this.pixelRatio;
    this.particleMaterial.uniforms.uViewport.value.set(this.width, this.height);
    const first = this.needsFraming;
    this.refreshFraming();
    if (first) this.snapFraming();
    this.needsRender = true;
    this.start();
  }

  private needsFraming = true;

  /** Recompute framing, e.g. when the surrounding layout changes. */
  refreshFraming() {
    if (this.options.home) {
      this.requestPresentation();
      return;
    }
    this.framing = this.options.frame(this.width, this.height);
    this.targetCenter.copy(this.toWorld(this.framing.x, this.framing.y));
    const pxPerUnit = this.height / this.worldHeight();
    this.targetScale = this.framing.radius / pxPerUnit;
    this.particleMaterial.uniforms.uBaseSize.value = Math.min(
      3,
      Math.max(1.6, Math.sqrt(this.framing.radius / 260) * 2.6),
    );
    if (this.reduced) this.snapFraming();
    this.needsRender = true;
    this.start();
  }

  setFrame(frame: RendererOptions["frame"]) {
    this.options.frame = frame;
    this.refreshFraming();
  }

  private snapFraming() {
    this.needsFraming = false;
    this.center.copy(this.targetCenter);
    this.scale = this.targetScale;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.needsRender = true;
    this.start();
  }

  /** Recolour for the ground behind the canvas. Structure eases to the new tones. */
  setSurface(surface: Surface) {
    const style = SURFACES[surface];
    this.substrate?.setSurface(surface);
    this.field.setTones(style.tones);
    this.particleMaterial.uniforms.uFog.value.setRGB(...style.fog);
    this.threadMaterial.uniforms.uInk.value.setRGB(...style.thread);
    this.threadMaterial.uniforms.uBronze.value.setRGB(...style.boundary);
    this.ring.material.uniforms.uColor.value.setRGB(...style.boundary);
    this.checkpoint.material.uniforms.uColor.value.setRGB(...style.checkpoint);
    this.needsRender = true;
    this.start();
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
    if (reduced) this.snapFraming();
    this.needsRender = true;
    this.start();
  }

  update(layout: Layout, model: RaptorModel, effects: Effect[]) {
    void model;
    if (this.options.home) return;
    if (this.substrate) {
      this.substrate.sync(model);
      this.needsRender = true;
      this.start();
      return;
    }
    this.field.setTargets(layout.clusters);
    this.targetRingRadius = layout.ring.radius;
    this.targetHold = layout.ring.holdAngle !== null ? 1 : 0;
    if (layout.ring.holdAngle !== null) this.holdAngle = layout.ring.holdAngle;
    if (layout.checkpoint) {
      this.checkpointRadius = layout.checkpoint.radius;
      this.targetCheckpointOpacity = layout.checkpoint.active ? 0.6 : 0.16;
    } else this.targetCheckpointOpacity = 0;

    const seen = new Set<string>();
    for (const thread of layout.threads) {
      seen.add(thread.key);
      const existing = this.threads.get(thread.key);
      if (existing) Object.assign(existing, thread, { target: 1 });
      else this.threads.set(thread.key, { ...thread, alpha: 0, target: 1, flow: 0 });
    }
    for (const [key, thread] of this.threads) if (!seen.has(key)) thread.target = 0;

    if (!this.reduced)
      for (const effect of effects) {
        if (effect.kind === "bloom") this.field.bloom(effect.key);
        else if (effect.kind === "flash") this.field.flash(effect.key, effect.strength);
        else if (effect.kind === "gate") {
          this.gate = 1;
          this.ring.material.uniforms.uGateAngle.value = effect.angle;
        } else if (effect.kind === "handoff") {
          const thread = this.threads.get(effect.threadKey);
          if (thread) thread.flow = 1;
          else this.pendingFlow = effect.threadKey;
        }
      }
    if (this.pendingFlow) {
      const thread = this.threads.get(this.pendingFlow);
      if (thread) thread.flow = 1;
      this.pendingFlow = null;
    }
    this.needsRender = true;
    this.start();
  }

  private pendingFlow: string | null = null;

  requestPresentation() {
    this.needsRender = true;
    this.start();
  }

  private get animating() {
    return !this.paused && !this.reduced && this.visible && document.visibilityState === "visible";
  }

  private start() {
    if (this.disposed || this.lost || this.frameHandle) return;
    if (!this.animating && !this.needsRender) return;
    this.last = performance.now();
    this.frameHandle = requestAnimationFrame(this.tick);
  }

  private stop() {
    cancelAnimationFrame(this.frameHandle);
    this.frameHandle = 0;
  }

  private tick = (now: number) => {
    this.frameHandle = 0;
    if (this.disposed) return;
    const elapsed = now - this.last;
    this.last = now;
    const animating = this.animating;
    const dt = animating ? Math.min(elapsed / 1000, 1 / 30) : 0;
    if (animating && this.governor.sample(elapsed)) this.shedLoad();
    this.advance(dt, !animating);
    this.renderer.render(this.scene, this.camera);
    this.needsRender = false;
    if (this.animating) this.frameHandle = requestAnimationFrame(this.tick);
  };

  private shedLoad() {
    if (this.pixelRatio > 1) {
      this.maxPixelRatio = Math.max(1, this.pixelRatio - 0.35);
      this.resize();
    } else {
      this.field.setActive(Math.max(this.options.home || this.substrate ? 2400 : 256, this.field.active * 0.72));
      this.substrate?.setActive(this.field.active);
    }
  }

  private advance(dt: number, still: boolean) {
    this.time += dt;
    if (this.substrate) {
      this.advanceSubstrate(this.substrate, dt, still);
      return;
    }
    if (this.options.home) {
      const pose = this.homeMotion.step(this.options.home.sample(), dt, still);
      this.system.position.set(0, 0, 0);
      this.system.scale.setScalar(1);
      const response = still || pose.docked ? 1 : 1 - Math.exp(-dt * 3);
      const interactive = this.pointer !== null && !still && !pose.docked && pose.mother.radius > 45;
      const unit = this.worldHeight() / this.height;
      const pointer = this.pointer;
      const px = pointer ? (pointer.x - this.width / 2) * unit : 99;
      const py = pointer ? (this.height / 2 - pointer.y) * unit : 99;
      const tiltY = interactive && pointer ? Math.max(-1, Math.min(1, (pointer.x - pose.mother.x) / pose.mother.radius / 3)) * 0.25 : 0;
      const tiltX = interactive && pointer ? Math.max(-1, Math.min(1, (pointer.y - pose.mother.y) / pose.mother.radius / 3)) * 0.2 : 0;
      this.tiltX += (tiltX - this.tiltX) * response;
      this.tiltY += (tiltY - this.tiltY) * response;
      this.pointerStrength += ((interactive ? 1 : 0) - this.pointerStrength) * response;
      this.field.stepHome(pose, this.width, this.height, this.worldHeight(), this.time, this.tiltX, this.tiltY);
      this.geometry.setDrawRange(0, this.field.active);
      this.positionAttr.needsUpdate = true;
      this.colorAttr.needsUpdate = true;
      this.paramsAttr.needsUpdate = true;
      const u = this.particleMaterial.uniforms;
      u.uTime.value = this.time;
      u.uPointer.value.set(px, py, 0);
      u.uPointerStrength.value = this.pointerStrength;
      u.uScale.value = Math.max(0.01, pose.mother.radius * this.worldHeight() / this.height);
      u.uBaseSize.value = 2.2;
      this.partForCuts(pose.scroll, dt);
      this.ring.visible = this.checkpoint.visible = false;
      this.threadGeometry.setDrawRange(0, 0);
      this.paused = pose.opacity < 0.005 || this.options.home.active === false;
      return;
    }
    const k = (rate: number) => (still ? 1 : 1 - Math.exp(-rate * dt));
    this.center.lerp(this.targetCenter, k(3));
    this.scale += (this.targetScale - this.scale) * k(3);
    this.system.position.copy(this.center);
    this.system.scale.setScalar(this.scale);

    // Pointer: gentle tilt toward the cursor plus local displacement.
    let px = 99;
    let py = 99;
    let tiltXTarget = 0;
    let tiltYTarget = 0;
    if (this.pointer && !still) {
      const world = this.toWorld(this.pointer.x, this.pointer.y);
      px = (world.x - this.center.x) / this.scale;
      py = (world.y - this.center.y) / this.scale;
      const reach = Math.min(1, Math.hypot(px, py) / 3);
      tiltYTarget = Math.max(-1, Math.min(1, px / 3)) * 0.32 * (1 - reach * 0.4);
      tiltXTarget = -Math.max(-1, Math.min(1, py / 3)) * 0.24 * (1 - reach * 0.4);
    }
    this.tiltX += (tiltXTarget - this.tiltX) * k(1.6);
    this.tiltY += (tiltYTarget - this.tiltY) * k(1.6);
    this.pointerStrength += ((this.pointer && !still ? 1 : 0) - this.pointerStrength) * k(3);
    const u = this.particleMaterial.uniforms;
    u.uPointer.value.set(px, py, 0);
    u.uPointerStrength.value = this.pointerStrength;
    u.uTime.value = this.time;
    u.uScale.value = this.scale;
    u.uCenterZ.value = this.center.z - CAMERA_Z;

    this.field.step(dt, this.tiltX, this.tiltY, still);
    this.geometry.setDrawRange(0, this.field.active);
    this.positionAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.paramsAttr.needsUpdate = true;

    // Authority boundary.
    this.ringRadius += (this.targetRingRadius - this.ringRadius) * k(2.4);
    this.hold += (this.targetHold - this.hold) * k(3.5);
    this.gate = still ? 0 : this.gate * Math.exp(-dt * 1.6);
    const pxSystem = this.worldHeight() / this.height / this.scale;
    const half = this.ringRadius + 0.3;
    const ring = this.ring.material.uniforms;
    this.ring.scale.setScalar(half);
    ring.uHalf.value = half;
    ring.uRadius.value = this.ringRadius;
    ring.uPx.value = pxSystem;
    ring.uHold.value = this.hold;
    ring.uHoldAngle.value = this.holdAngle;
    ring.uGate.value = this.gate;
    ring.uTime.value = this.time;
    // Graduations only read on a large ring; fade them out on small ones.
    ring.uTicks.value = Math.min(1, Math.max(0, (this.ringRadius / pxSystem - 110) / 160));

    this.checkpointOpacity +=
      (this.targetCheckpointOpacity - this.checkpointOpacity) * k(3);
    const cp = this.checkpoint.material.uniforms;
    const cpHalf = this.checkpointRadius + 0.2;
    this.checkpoint.scale.setScalar(cpHalf);
    cp.uHalf.value = cpHalf;
    cp.uRadius.value = this.checkpointRadius;
    cp.uPx.value = pxSystem;
    cp.uOpacity.value = this.checkpointOpacity;
    this.checkpoint.visible = this.checkpointOpacity > 0.005;

    this.updateThreads(dt, still);
  }

  private advanceSubstrate(substrate: Substrate, dt: number, still: boolean) {
    this.system.position.set(0, 0, 0);
    this.system.scale.setScalar(1);
    const anchors = this.options.substrate!.anchors();
    substrate.setAnchors(anchors);
    substrate.step(dt, this.reduced);
    // The root globe leans toward the pointer while it is large, as the site's hero does.
    const root = anchors.primary;
    const response = still ? 1 : 1 - Math.exp(-dt * 3);
    const pointer = this.pointer;
    const interactive = !!pointer && !still && !!root && root.radius > 45;
    const tiltY = interactive ? Math.max(-1, Math.min(1, (pointer.x - root.x) / root.radius / 3)) * 0.25 : 0;
    const tiltX = interactive ? Math.max(-1, Math.min(1, (pointer.y - root.y) / root.radius / 3)) * 0.2 : 0;
    this.tiltX += (tiltX - this.tiltX) * response;
    this.tiltY += (tiltY - this.tiltY) * response;
    substrate.write(this.field, this.width, this.height, this.worldHeight(), this.tiltX, this.tiltY);
    this.clipAttr.needsUpdate = true;
    this.geometry.setDrawRange(0, this.field.active);
    this.positionAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.paramsAttr.needsUpdate = true;
    const u = this.particleMaterial.uniforms;
    u.uTime.value = this.time;
    u.uPointerStrength.value = 0;
    u.uBaseSize.value = 2.2;
    this.ring.visible = this.checkpoint.visible = false;
    this.threadGeometry.setDrawRange(0, 0);
    // Reduced motion draws still frames; wake once more when a still route marker lands.
    window.clearTimeout(this.stillWake);
    const wake = this.reduced ? substrate.nextStillChange() : null;
    if (wake !== null)
      this.stillWake = window.setTimeout(() => this.requestPresentation(), Math.max(16, (wake - performance.now() / 1000) * 1000 + 16));
  }

  /** Hands the page's cuts to the particle shader in viewport pixels, with a shove the moment each one strikes. */
  private partForCuts(scroll: number, dt: number) {
    const cuts = this.options.cuts?.() ?? [];
    const decay = Math.exp(-dt * 5);
    // Marks already drawn when the page loads did not just strike.
    this.drawn ??= Array.from({ length: MAX_CUTS }, (_, k) => (cuts[k]?.reach ?? 0) > 0);
    for (let k = 0; k < MAX_CUTS; k++) {
      const cut = cuts[k];
      const drawn = cut !== undefined && cut.reach > 0;
      if (drawn && !this.drawn[k]) this.kicks[k] = 1;
      this.drawn[k] = drawn;
      this.kicks[k] *= decay;
      if (!cut) {
        this.cutMarks[k].set(0, 0, 0, 0);
        continue;
      }
      this.cutChords[k].set(cut.ax, cut.ay - scroll, cut.bx, cut.by - scroll);
      this.cutMarks[k].set(cut.bow, cut.half, cut.reach, this.kicks[k]);
    }
  }

  private updateThreads(dt: number, still: boolean) {
    let t = 0;
    const fade = still ? 1 : 1 - Math.exp(-dt * 4);
    for (const [key, thread] of this.threads) {
      thread.alpha += (thread.target - thread.alpha) * fade;
      thread.flow = still ? 0 : Math.max(0, thread.flow - dt * 0.38);
      const a = this.field.geometry(thread.from);
      const b = this.field.geometry(thread.to);
      if ((thread.target === 0 && thread.alpha < 0.01) || !a || !b) {
        if (thread.target === 0 || !a || !b) this.threads.delete(key);
        continue;
      }
      if (t >= MAX_THREADS) continue;
      const dx = b.center[0] - a.center[0];
      const dy = b.center[1] - a.center[1];
      const len = Math.hypot(dx, dy);
      if (len < 1e-3) continue;
      const ux = dx / len;
      const uy = dy / len;
      const sx = a.center[0] + ux * a.radius * 1.02;
      const sy = a.center[1] + uy * a.radius * 1.02;
      const ex = b.center[0] - ux * b.radius * 1.02;
      const ey = b.center[1] - uy * b.radius * 1.02;
      const bend = thread.kind === "lineage" ? 0.1 : 0.05;
      const mx = (sx + ex) / 2 - uy * len * bend;
      const my = (sy + ey) / 2 + ux * len * bend;
      const kind = thread.kind === "hierarchy" ? 0 : thread.kind === "lineage" ? 1 : 2;
      const flow = thread.kind === "tether" ? 0.35 : thread.flow;
      for (let s = 0; s < THREAD_SEGMENTS; s++) {
        for (let e = 0; e < 2; e++) {
          const u = (s + e) / THREAD_SEGMENTS;
          const v = 1 - u;
          const vi = ((t * THREAD_SEGMENTS + s) * 2 + e) * 3;
          this.threadPositions[vi] = v * v * sx + 2 * v * u * mx + u * u * ex;
          this.threadPositions[vi + 1] = v * v * sy + 2 * v * u * my + u * u * ey;
          this.threadPositions[vi + 2] = 0;
          this.threadStyle[vi] = kind;
          this.threadStyle[vi + 1] = flow;
          this.threadStyle[vi + 2] = thread.alpha;
        }
      }
      t++;
    }
    this.threadGeometry.setDrawRange(0, t * THREAD_SEGMENTS * 2);
    this.threadGeometry.attributes.position.needsUpdate = true;
    this.threadGeometry.attributes.aStyle.needsUpdate = true;
    this.threadMaterial.uniforms.uTime.value = this.time;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.clearTimeout(this.stillWake);
    if (this.substrate) this.substrate.onPresence = null;
    this.stop();
    this.observers.forEach((observer) => observer.disconnect());
    this.cleanups.forEach((cleanup) => cleanup());
    this.geometry.dispose();
    this.particleMaterial.dispose();
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.checkpoint.geometry.dispose();
    this.checkpoint.material.dispose();
    this.threadGeometry.dispose();
    this.threadMaterial.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

/** Probe for WebGL support without keeping a context alive. */
export function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const ok = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}
