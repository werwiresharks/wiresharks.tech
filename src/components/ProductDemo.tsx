import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ProductDemo } from "../content/products";

function FiberLink() {
  const [sent, setSent] = useState(0);
  const reduced = useReducedMotion();
  return (
    <>
      <div className="fiber-diagram" aria-hidden="true">
        <span className="fiber-terminal">
          ⌘<small>Operator</small>
        </span>
        <div className="fiber-wire">
          <span>FIBER LINK</span>
          {sent > 0 && (
            <motion.i
              key={sent}
              initial={{ left: "0%" }}
              animate={{ left: "100%" }}
              transition={{ duration: reduced ? 0 : 1.2, ease: "easeInOut" }}
            />
          )}
        </div>
        <span className="fiber-terminal">
          ✣<small>Drone</small>
        </span>
      </div>
      <div className="demo-action">
        <button onClick={() => setSent(sent + 1)}>
          Send a sample signal <span aria-hidden="true">↗</span>
        </button>
        <p aria-live="polite">
          {sent
            ? `Sample signal ${sent} sent along the illustrated link.`
            : "Follow the connection."}
        </p>
      </div>
    </>
  );
}
function VoiceFlow({
  steps,
}: {
  steps: Extract<ProductDemo, { kind: "voice-flow" }>["steps"];
}) {
  const [step, setStep] = useState(0);
  return (
    <>
      <ol className="voice-steps">
        {steps.map((item, i) => (
          <li key={item.label} className={i === step ? "current" : ""}>
            <span>0{i + 1}</span>
            {item.label}
          </li>
        ))}
      </ol>
      <div className="voice-transcript" aria-live="polite">
        <span className="demo-kicker">{steps[step].label}</span>
        <p>{steps[step].text}</p>
      </div>
      <div className="demo-action">
        <button onClick={() => setStep((step + 1) % steps.length)}>
          {step === steps.length - 1 ? "Restart example" : "Next step"}
          <span aria-hidden="true">→</span>
        </button>
        <p>
          Prewritten · {step + 1} of {steps.length}
        </p>
      </div>
    </>
  );
}
function Flashcard({
  front,
  back,
}: Extract<ProductDemo, { kind: "flashcard" }>) {
  const [revealed, setRevealed] = useState(false);
  const [teach, setTeach] = useState(false);
  return (
    <>
      <div className="sample-card" aria-live="polite">
        <span className="demo-kicker">
          {teach
            ? "Teach it back"
            : revealed
              ? "The idea"
              : "Pause. Recall. Then reveal."}
        </span>
        <p>
          {teach
            ? "Explain the phases to a friend. What changes: the light, or our view?"
            : revealed
              ? back
              : front}
        </p>
        <span className="card-orbit" aria-hidden="true">
          ◐
        </span>
      </div>
      <div className="demo-action">
        <button
          onClick={() => {
            setRevealed(!revealed);
            setTeach(false);
          }}
          aria-pressed={revealed}
        >
          {revealed ? "Show question" : "Reveal answer"}
          <span aria-hidden="true">↻</span>
        </button>
        <button
          className="demo-text-button"
          onClick={() => setTeach(!teach)}
          aria-pressed={teach}
        >
          {teach ? "Back to card" : "Try teaching it back"}
        </button>
      </div>
    </>
  );
}
function ObstructionRoute() {
  const [blocked, setBlocked] = useState(false);
  return (
    <>
      <svg
        className="route-map"
        viewBox="0 0 560 230"
        role="img"
        aria-label={
          blocked
            ? "An obstruction blocks the center corridor. The sample route goes around the lower corridor."
            : "The sample route follows the open center corridor."
        }
      >
        <path
          className="map-room"
          d="M20 20H540V210H20Z M140 20V75H250V20 M310 20V75H420V20 M140 155V210 M420 155V210"
        />
        <text x="35" y="45">
          ENTRY
        </text>
        <text x="463" y="45">
          DESTINATION
        </text>
        <path
          className="map-route"
          d={blocked ? "M60 115H180V180H380V115H500" : "M60 115H500"}
        />
        <circle cx="60" cy="115" r="7" />
        <circle cx="500" cy="115" r="7" />
        {blocked && (
          <g className="map-obstacle">
            <rect x="265" y="92" width="30" height="46" rx="3" />
            <path d="M273 108L287 122M287 108L273 122" />
          </g>
        )}
      </svg>
      <div className="demo-action">
        <button onClick={() => setBlocked(!blocked)} aria-pressed={blocked}>
          {blocked ? "Clear obstruction" : "Add obstruction"}
          <span aria-hidden="true">{blocked ? "−" : "+"}</span>
        </button>
        <p aria-live="polite">
          {blocked
            ? "Sample route takes the lower corridor."
            : "Center corridor is clear."}
        </p>
      </div>
    </>
  );
}
export default function ProductDemoView({ demo }: { demo: ProductDemo }) {
  let content;
  switch (demo.kind) {
    case "fiber-link":
      content = <FiberLink />;
      break;
    case "voice-flow":
      content = <VoiceFlow steps={demo.steps} />;
      break;
    case "flashcard":
      content = <Flashcard {...demo} />;
      break;
    case "obstruction-route":
      content = <ObstructionRoute />;
      break;
  }
  return (
    <div className={`product-demo demo-${demo.kind}`}>
      <div className="demo-heading">
        <span>Try the idea</span>
        <span>Illustrative demo</span>
      </div>
      {content}
      <p className="demo-caption">{demo.caption}</p>
    </div>
  );
}
