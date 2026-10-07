import { Component, lazy, Suspense } from "react";
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
  interactive = false,
  flightProgress,
}: {
  paused?: boolean;
  interactive?: boolean;
  flightProgress?: MotionValue<number>;
}) {
  return (
    <div className={`drone-visual${interactive ? " is-interactive" : ""}`}>
      <SceneBoundary>
        <Suspense fallback={null}>
          <DroneScene
            paused={paused}
            interactive={interactive}
            flightProgress={flightProgress}
          />
        </Suspense>
      </SceneBoundary>
    </div>
  );
}
