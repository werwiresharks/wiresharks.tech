import { useEffect, useId, useRef, useState } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export default function DroneScene({
  paused,
  interactive,
  flightProgress,
}: {
  paused: boolean;
  interactive: boolean;
  flightProgress?: MotionValue<number>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [ready, setReady] = useState(false);
  const [batteryReleased, setBatteryReleased] = useState(false);
  const batteryRelease = useRef(false);
  const instructionsId = useId();
  const pause = useRef(paused);
  const progressValue = useRef(flightProgress);
  const requestRender = useRef<() => void>(() => {});
  useEffect(() => {
    pause.current = paused;
    progressValue.current = flightProgress;
    requestRender.current();
    return flightProgress?.on("change", () => requestRender.current());
  }, [paused, flightProgress]);
  useEffect(() => {
    const element = host.current!;
    setReady(false);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    let hasRendered = false;
    let hasSize = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(7, 7.8, 10);
    camera.lookAt(0, 0, 0);
    const controls = interactive
      ? new OrbitControls(camera, renderer.domElement)
      : null;
    if (controls) controls.enabled = false;
    controlsRef.current = controls;
    const controlsChange = () => requestRender.current();
    const controlsStart = () => renderer.domElement.classList.add("is-orbiting");
    const controlsEnd = () => renderer.domElement.classList.remove("is-orbiting");
    const focusView = () => element.focus({ preventScroll: true });
    const keyDown = (event: KeyboardEvent) => {
      if (
        !controls?.enabled ||
        event.target !== element ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const angle = Math.PI / 24;
      switch (event.key) {
        case "ArrowLeft":
          controls.rotateLeft(angle);
          break;
        case "ArrowRight":
          controls.rotateLeft(-angle);
          break;
        case "ArrowUp":
          controls.rotateUp(angle);
          break;
        case "ArrowDown":
          controls.rotateUp(-angle);
          break;
        case "+":
        case "=":
          controls.dollyIn(0.9);
          break;
        case "-":
          controls.dollyOut(0.9);
          break;
        case "Home":
          controls.reset();
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    if (controls) {
      controls.enableDamping = false;
      controls.enablePan = false;
      controls.minDistance = 8;
      controls.maxDistance = 25;
      controls.minPolarAngle = Math.PI / 18;
      controls.maxPolarAngle = Math.PI * 0.85;
      controls.addEventListener("change", controlsChange);
      controls.addEventListener("start", controlsStart);
      controls.addEventListener("end", controlsEnd);
      renderer.domElement.addEventListener("pointerdown", focusView);
      element.addEventListener("keydown", keyDown);
    }
    const towardCamera = camera.position.clone().normalize();
    const screenRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
      camera.quaternion,
    );
    const screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(
      camera.quaternion,
    );
    scene.add(new THREE.HemisphereLight(0xf0f1f2, 0x292d30, 3));
    const key = new THREE.DirectionalLight(0xffffff, 5);
    key.position.set(-4, 8, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xcdd4dc, 4);
    rim.position.set(3, 2, -5);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xd2d8dd, 2);
    fill.position.set(-4, -1, -2);
    scene.add(fill);
    const drone = new THREE.Group();
    scene.add(drone);
    drone.rotation.set(0.05, -0.35, -0.14);
    const carbon = new THREE.MeshStandardMaterial({
      color: 0x131517,
      metalness: 0.15,
      roughness: 0.62,
    });
    const edge = new THREE.MeshStandardMaterial({
      color: 0x2c3034,
      metalness: 0.82,
      roughness: 0.34,
    });
    const black = new THREE.MeshStandardMaterial({
      color: 0x070809,
      metalness: 0.25,
      roughness: 0.54,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x111b21,
      metalness: 0.9,
      roughness: 0.1,
    });
    const mesh = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      x: number,
      y: number,
      z: number,
      parent: THREE.Object3D = drone,
    ) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    const box = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      material = carbon,
    ) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z);
    const rounded = (w: number, h: number, d: number, x: number, y: number, z: number,
      material = carbon, parent: THREE.Object3D = drone) =>
      mesh(new RoundedBoxGeometry(w, h, d, 2, 0.035), material, x, y, z, parent);
    rounded(1.4, 0.1, 1.75, 0, 0, 0);
    rounded(1.04, 0.22, 1.32, 0, 0.16, 0.06, black);
    for (const z of [-0.2, 0.4])
      box(0.78, 0.035, 0.12, 0, 0.265, z);
    box(0.46, 0.045, 0.36, 0, 0.09, -0.58, edge);
    box(0.13, 0.045, 0.12, 0, 0.135, -0.58, black);
    // The carrier is fixed to the airframe; the keyed pack slides rearward.
    const battery = new THREE.Group();
    battery.name = "Hot-swappable battery module";
    battery.position.set(0, -0.25, 0.05);
    drone.add(battery);
    rounded(0.94, 0.29, 1.24, 0, 0, 0, edge, battery);
    rounded(0.86, 0.03, 1.12, 0, -0.156, 0, black, battery);
    const latchMaterial = new THREE.MeshStandardMaterial({ color: 0xd52b24, roughness: 0.48, metalness: 0.3 });
    for (const x of [-0.49, 0.49]) {
      rounded(0.065, 0.085, 1.35, x, -0.085, 0.04, black);
      rounded(0.03, 0.045, 1.16, x * 0.94, 0.13, 0, black, battery);
    }
    rounded(0.96, 0.065, 0.08, 0, -0.095, -0.63, edge);
    rounded(0.25, 0.065, 0.055, 0, 0.065, 0.646, latchMaterial, battery);
    // Recessed pull grip and casing seam make the separate pack legible.
    rounded(0.36, 0.08, 0.045, 0, -0.03, 0.642, black, battery);
    for (const x of [-0.18, 0.18])
      rounded(0.035, 0.11, 0.055, x, -0.025, 0.65, edge, battery);
    for (const z of [-0.3, 0, 0.3])
      for (const x of [-0.476, 0.476])
        mesh(new THREE.BoxGeometry(0.012, 0.1, 0.018), black, x, -0.015, z, battery);
    const rotors: THREE.Group[] = [];
    const blades: THREE.Mesh[] = [];
    const blurs: THREE.Mesh[] = [];
    const bladeMaterial = carbon.clone();
    bladeMaterial.transparent = true;
    const blurMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { strength: { value: 0 } },
      vertexShader: `
        varying vec2 rotorUv;
        void main() {
          rotorUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float strength;
        varying vec2 rotorUv;
        void main() {
          float radius = length(rotorUv - 0.5) * 2.0;
          float feather = smoothstep(0.09, 0.22, radius)
            * (1.0 - smoothstep(0.85, 1.0, radius));
          float rings = 0.86 + 0.04 * cos(radius * 18.0);
          gl_FragColor = vec4(vec3(0.30, 0.32, 0.34),
            strength * feather * rings * 0.23);
        }
      `,
    });
    for (const x of [-1, 1])
      for (const z of [-1, 1]) {
        const mx = x * 2.1,
          mz = z * 2.1;
        const rootX = x * 0.55, rootZ = z * 0.63;
        const armLength = Math.hypot(mx - rootX, mz - rootZ);
        const armAngle = Math.atan2(mx - rootX, mz - rootZ);
        const arm = rounded(0.2, 0.1, armLength, (mx + rootX) / 2, -0.015, (mz + rootZ) / 2);
        arm.rotation.y = armAngle;
        const reinforcement = box(0.075, 0.025, armLength, (mx + rootX) / 2, 0.047, (mz + rootZ) / 2, edge);
        reinforcement.rotation.y = armAngle;
        mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.075, 24), carbon, mx, -0.045, mz);
        mesh(
          new THREE.CylinderGeometry(0.28, 0.29, 0.25, 24),
          black,
          mx,
          0.13,
          mz,
        );
        mesh(
          new THREE.CylinderGeometry(0.285, 0.285, 0.07, 24),
          edge,
          mx,
          0.31,
          mz,
        );
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          mesh(
            new THREE.BoxGeometry(0.027, 0.12, 0.04),
            edge,
            mx + Math.cos(a) * 0.276,
            0.16,
            mz + Math.sin(a) * 0.276,
          );
        }
        const rotor = new THREE.Group();
        rotor.position.set(mx, 0.4, mz);
        drone.add(rotor);
        rotors.push(rotor);
        const shape = new THREE.Shape();
        shape.moveTo(-1.5, -0.06);
        shape.bezierCurveTo(-1.3, -0.26, -0.35, -0.23, 0, -0.07);
        shape.bezierCurveTo(0.5, 0.08, 1.4, -0.02, 1.5, 0.06);
        shape.bezierCurveTo(1.3, 0.26, 0.35, 0.23, 0, 0.07);
        shape.bezierCurveTo(-0.5, -0.08, -1.4, 0.02, -1.5, -0.06);
        const blade = mesh(
          new THREE.ExtrudeGeometry(shape, {
            depth: 0.025,
            bevelEnabled: true,
            bevelSize: 0.015,
            bevelThickness: 0.01,
            bevelSegments: 1,
            steps: 1,
          }),
          bladeMaterial,
          0,
          0,
          0,
          rotor,
        );
        blade.rotation.x = -Math.PI / 2;
        blade.scale.set(0.9, 0.9, 1);
        blades.push(blade);
        const blur = mesh(
          new THREE.CircleGeometry(1.365, 64),
          blurMaterial,
          mx,
          0.4125,
          mz,
        );
        blur.rotation.x = -Math.PI / 2;
        blur.visible = false;
        blurs.push(blur);
        mesh(
          new THREE.CylinderGeometry(0.09, 0.12, 0.12, 16),
          edge,
          mx,
          0.46,
          mz,
        );
        // Splayed supports are mounted below the motors, clear of rotor discs.
        const legTop = new THREE.Vector3(mx, -0.08, mz);
        const legBottom = new THREE.Vector3(mx + x * 0.14, -0.82, mz + z * 0.14);
        const legAxis = legBottom.clone().sub(legTop);
        const legCenter = legTop.clone().add(legBottom).multiplyScalar(0.5);
        const leg = mesh(new THREE.CylinderGeometry(0.047, 0.035, legAxis.length(), 10), edge, legCenter.x, legCenter.y, legCenter.z);
        leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), legAxis.normalize());
        rounded(0.22, 0.08, 0.3, legBottom.x, -0.85, legBottom.z, black);
        mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8),
          edge,
          x * 0.58,
          0.065,
          z * 0.68,
        );
      }
    box(0.4, 0.22, 0.28, 0, -0.1, -0.9, black);
    const lens = mesh(
      new THREE.CylinderGeometry(0.13, 0.15, 0.1, 32),
      edge,
      0,
      -0.1,
      -1.07,
    );
    lens.rotation.x = Math.PI / 2;
    const lensGlass = mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.11, 32),
      glass,
      0,
      -0.1,
      -1.09,
    );
    lensGlass.rotation.x = Math.PI / 2;
    const fiberCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.74, -0.015, 0.58),
      new THREE.Vector3(1.15, -1.3, 1.7),
      new THREE.Vector3(2, -1.5, 2.9),
      new THREE.Vector3(4, -1.2, 3.3),
      new THREE.Vector3(5, -1.6, 4.8),
      new THREE.Vector3(8, -2, 5),
    ]);
    const fiberMaterial = new THREE.MeshBasicMaterial({ color: 0xd52b24 });
    mesh(
      new THREE.TubeGeometry(fiberCurve, 96, 0.013, 5, false),
      fiberMaterial,
      0,
      0,
      0,
    );
    const fiberEnd = fiberCurve.getPoint(1);
    const fiberTail = new THREE.LineCurve3(
      fiberEnd,
      fiberEnd.clone().addScaledVector(fiberCurve.getTangent(1), camera.far * 4),
    );
    mesh(
      new THREE.TubeGeometry(fiberTail, 1, 0.013, 5, false),
      fiberMaterial,
      0,
      0,
      0,
    );
    let visible = true,
      frame = 0,
      last = 0,
      elapsed = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const rotorState = { throttle: 0, throttleVelocity: 0, angle: 0, hold: 0 };
    let batteryTravel = 0;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
      } else requestRender.current();
    });
    observer.observe(element);
    const resizeCanvas = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      hasSize = true;
      requestRender.current();
    };
    const resize = new ResizeObserver(resizeCanvas);
    resize.observe(element);
    function render(time: number) {
      frame = 0;
      if (
        !hasSize ||
        !visible ||
        document.hidden ||
        renderer.getContext().isContextLost()
      )
        return;
      const delta = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;
      if (!pause.current && !reduced.matches) elapsed += delta;
      const progress =
        reduced.matches || pause.current
          ? 0
          : (progressValue.current?.get() ?? 0);
      const approach = THREE.MathUtils.smoothstep(progress, 0.06, 0.6);
      const exit = THREE.MathUtils.smoothstep(progress, 0.52, 1);
      const heroFlight = !!progressValue.current;
      const batteryTarget = batteryRelease.current ? 1.65 : 0;
      batteryTravel = reduced.matches ? batteryTarget : THREE.MathUtils.damp(batteryTravel, batteryTarget, 12, delta);
      if (Math.abs(batteryTarget - batteryTravel) < 0.001) batteryTravel = batteryTarget;
      battery.position.z = 0.05 + batteryTravel;
      drone.position.set(0, Math.sin(elapsed * 0.7) * 0.065, 0);
      if (heroFlight) {
        drone.position.addScaledVector(towardCamera, approach * 5.2);
        drone.position.addScaledVector(
          screenRight,
          (camera.aspect < 1.2 ? 0.5 : 2.8) - approach * 1.2 + exit * 15,
        );
        drone.position.addScaledVector(screenUp, -0.5 + exit * 7);
      }
      drone.scale.setScalar(heroFlight && camera.aspect < 1.2 ? 0.78 : 1);
      drone.rotation.set(
        0.05 + approach * 0.12,
        -0.35 + approach * 0.5 - exit * 0.3,
        -0.14 - Math.sin(progress * Math.PI) * 0.65,
      );
      if (!pause.current && !reduced.matches) {
        const scrolling = heroFlight && progress > 0.02 && progress < 0.98;
        rotorState.hold = scrolling
          ? 0.1
          : Math.max(0, rotorState.hold - delta);
        const target = scrolling || rotorState.hold > 0 ? 1 : 0;
        const omega = target > rotorState.throttle ? 22 : 7;
        const previousThrottle = rotorState.throttle;
        const displacement = rotorState.throttle - target;
        const springVelocity =
          rotorState.throttleVelocity + omega * displacement;
        const decay = Math.exp(-omega * delta);
        rotorState.throttle =
          target + (displacement + springVelocity * delta) * decay;
        rotorState.throttleVelocity =
          (rotorState.throttleVelocity - omega * springVelocity * delta) *
          decay;
        rotorState.angle =
          (rotorState.angle +
            (7 + (620 * (previousThrottle + rotorState.throttle)) / 2) *
              delta) %
          (Math.PI * 2);
      } else {
        rotorState.throttle = 0;
        rotorState.throttleVelocity = 0;
        rotorState.hold = 0;
      }
      const blurStrength = THREE.MathUtils.smoothstep(
        rotorState.throttle,
        0.2,
        0.82,
      );
      bladeMaterial.opacity = 1 - blurStrength;
      bladeMaterial.depthWrite = blurStrength === 0;
      blurMaterial.uniforms.strength.value = blurStrength;
      blades.forEach((blade) => {
        blade.visible = blurStrength < 1;
      });
      blurs.forEach((blur) => {
        blur.visible = blurStrength > 0;
      });
      rotors.forEach((rotor, i) => {
        const direction = i === 0 || i === 3 ? 1 : -1;
        rotor.rotation.y = rotorState.angle * direction + i * 0.8;
      });
      renderer.render(scene, camera);
      if (!hasRendered) {
        hasRendered = true;
        if (controls) controls.enabled = true;
        setReady(true);
      }
      if ((!pause.current && !reduced.matches && (!heroFlight || progress < 1)) || batteryTravel !== batteryTarget)
        frame = requestAnimationFrame(render);
    }
    requestRender.current = () => {
      if (
        visible &&
        !document.hidden &&
        !renderer.getContext().isContextLost() &&
        !frame
      )
        frame = requestAnimationFrame(render);
    };
    const motionChange = () => requestRender.current();
    const visibilityChange = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      requestRender.current();
    };
    reduced.addEventListener("change", motionChange);
    document.addEventListener("visibilitychange", visibilityChange);
    frame = requestAnimationFrame(render);
    const contextLost = (event: Event) => {
      event.preventDefault();
      hasRendered = false;
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (controls) controls.enabled = false;
      controlsEnd();
      setReady(false);
    };
    const contextRestored = () => {
      requestRender.current();
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    renderer.domElement.addEventListener("webglcontextrestored", contextRestored);
    resizeCanvas();
    return () => {
      cancelAnimationFrame(frame);
      requestRender.current = () => {};
      reduced.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibilityChange);
      observer.disconnect();
      resize.disconnect();
      controls?.removeEventListener("change", controlsChange);
      controls?.removeEventListener("start", controlsStart);
      controls?.removeEventListener("end", controlsEnd);
      controls?.dispose();
      controlsRef.current = null;
      renderer.domElement.removeEventListener("pointerdown", focusView);
      element.removeEventListener("keydown", keyDown);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        contextRestored,
      );
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [interactive]);
  const canvas = (
    <div
      className={`drone-canvas${ready ? " is-ready" : ""}`}
      ref={host}
      aria-hidden={interactive ? undefined : true}
      tabIndex={interactive && ready ? 0 : undefined}
      role={interactive && ready ? "region" : undefined}
      aria-label={
        interactive && ready ? "Interactive Wireshark drone view" : undefined
      }
      aria-describedby={interactive && ready ? instructionsId : undefined}
    />
  );
  return interactive ? (
    <div className="drone-interaction">
      {canvas}
      {ready && (
        <div className="drone-view-controls">
          <p id={instructionsId}>
            <span>Drag to orbit · Scroll or pinch to zoom</span>
            <span>Arrow keys orbit · + / − zoom · Home resets</span>
          </p>
          <button type="button" onClick={() => controlsRef.current?.reset()}>
            Reset view
          </button>
          <button type="button" aria-pressed={batteryReleased} onClick={() => {
            batteryRelease.current = !batteryRelease.current;
            setBatteryReleased(batteryRelease.current);
            requestRender.current();
          }}>
            {batteryReleased ? "Latch battery" : "Slide battery out"}
          </button>
        </div>
      )}
    </div>
  ) : canvas;
}
