import { Component, lazy, Suspense, useCallback, useState } from "react";
import type { ReactNode } from "react";
import type { MotionValue } from "motion/react";
const DroneScene = lazy(() => import("../scenes/DroneScene"));
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function DroneVisual({
  paused = true,
  flightProgress,
}: {
  paused?: boolean;
  flightProgress?: MotionValue<number>;
}) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  return (
    <div className="drone-visual">
      <div
        className={`drone-fallback ${ready ? "is-ready" : ""}`}
        aria-hidden="true"
      >
        <div className="fallback-arm arm-one" />
        <div className="fallback-arm arm-two" />
        <div className="fallback-body" />
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={`fallback-rotor rotor-${i}`} />
        ))}
        <div className="fallback-fiber" />
      </div>
      <SceneBoundary>
        <Suspense fallback={null}>
          <DroneScene
            paused={paused}
            flightProgress={flightProgress}
            onReady={onReady}
          />
        </Suspense>
      </SceneBoundary>
    </div>
  );
}
