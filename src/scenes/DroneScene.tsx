import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";

export default function DroneScene({
  paused,
  flightProgress,
  onReady,
}: {
  paused: boolean;
  flightProgress?: MotionValue<number>;
  onReady: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
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
      metalness: 0.65,
      roughness: 0.42,
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
    const orange = new THREE.MeshStandardMaterial({
      color: 0xc45a24,
      metalness: 0.5,
      roughness: 0.48,
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
    box(1.6, 0.25, 2.1, 0, 0, 0);
    box(1.25, 0.43, 1.35, 0, 0.33, 0.13, black);
    box(1.42, 0.06, 1.8, 0, 0.59, 0, edge);
    for (let i = 0; i < 9; i++)
      box(0.95, 0.04, 0.035, 0, 0.64, -0.6 + i * 0.14, black);
    box(0.52, 0.07, 0.58, 0, 0.66, 0.53, black);
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
        const arm = box(0.32, 0.18, 2.5, x * 1.14, -0.05, z * 1.12);
        arm.rotation.y = x * z * 0.78;
        const reinforcement = box(
          0.13,
          0.07,
          2.65,
          x * 1.14,
          0.09,
          z * 1.12,
          edge,
        );
        reinforcement.rotation.y = x * z * 0.78;
        const mx = x * 2.1,
          mz = z * 2.1;
        mesh(
          new THREE.CylinderGeometry(0.28, 0.29, 0.4, 24),
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
            new THREE.BoxGeometry(0.027, 0.19, 0.04),
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
        blades.push(blade);
        const blur = mesh(
          new THREE.CircleGeometry(1.515, 64),
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
        const skid = box(0.1, 0.9, 0.12, x * 0.7, -0.55, z * 0.7, edge);
        skid.rotation.z = x * -0.22;
        mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8),
          edge,
          x * 0.58,
          0.65,
          z * 0.68,
        );
      }
    box(0.68, 0.48, 0.52, 0, -0.28, -1.2, black);
    const lens = mesh(
      new THREE.CylinderGeometry(0.21, 0.24, 0.16, 32),
      edge,
      0,
      -0.27,
      -1.52,
    );
    lens.rotation.x = Math.PI / 2;
    const lensGlass = mesh(
      new THREE.CylinderGeometry(0.155, 0.155, 0.17, 32),
      glass,
      0,
      -0.27,
      -1.55,
    );
    lensGlass.rotation.x = Math.PI / 2;
    const spool = mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 0.63, 40),
      orange,
      0,
      -0.55,
      0.35,
    );
    spool.rotation.z = Math.PI / 2;
    for (let i = 0; i < 19; i++) {
      const loop = mesh(
        new THREE.TorusGeometry(0.455, 0.009, 4, 40),
        edge,
        -0.3 + i * 0.033,
        -0.55,
        0.35,
      );
      loop.rotation.y = Math.PI / 2;
    }
    for (const x of [-0.36, 0.36]) {
      const disc = mesh(
        new THREE.CylinderGeometry(0.54, 0.54, 0.045, 40),
        black,
        x,
        -0.55,
        0.35,
      );
      disc.rotation.z = Math.PI / 2;
    }
    const fiberCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.05, -0.9, 0.45),
      new THREE.Vector3(0.4, -1.3, 1.7),
      new THREE.Vector3(2, -1.5, 2.9),
      new THREE.Vector3(4, -1.2, 3.3),
      new THREE.Vector3(5, -1.6, 4.8),
      new THREE.Vector3(8, -2, 5),
    ]);
    mesh(
      new THREE.TubeGeometry(fiberCurve, 96, 0.013, 5, false),
      new THREE.MeshBasicMaterial({ color: 0xb94b1d }),
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
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
      } else requestRender.current();
    });
    observer.observe(element);
    const resize = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });
    resize.observe(element);
    function render(time: number) {
      frame = 0;
      if (!visible || document.hidden) return;
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
      if (!pause.current && !reduced.matches && (!heroFlight || progress < 1))
        frame = requestAnimationFrame(render);
    }
    requestRender.current = () => {
      if (visible && !document.hidden && !frame)
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
    onReady();
    return () => {
      cancelAnimationFrame(frame);
      requestRender.current = () => {};
      reduced.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibilityChange);
      observer.disconnect();
      resize.disconnect();
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
  }, [onReady]);
  return <div className="drone-canvas" ref={host} aria-hidden="true" />;
}
