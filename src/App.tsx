import { useMemo, useState } from "react";
import "./App.css";

type ProcessId = "A" | "B" | "C";
type EventKind = "local" | "send" | "receive";
type Event = {
  process: ProcessId;
  kind: EventKind;
  label: string;
  detail: string;
  clock: number;
  message?: string;
  from?: number;
};

const events: Event[] = [
  {
    process: "A",
    kind: "local",
    label: "Local event",
    detail: "A does some local work",
    clock: 1,
  },
  {
    process: "B",
    kind: "local",
    label: "Local event",
    detail: "B does some local work",
    clock: 1,
  },
  {
    process: "A",
    kind: "send",
    label: "Send m₁",
    detail: "A sends timestamp 2 to B",
    clock: 2,
    message: "m₁",
  },
  {
    process: "C",
    kind: "local",
    label: "Local event",
    detail: "C does some local work",
    clock: 1,
  },
  {
    process: "B",
    kind: "receive",
    label: "Receive m₁",
    detail: "max(1, 2) + 1 = 3",
    clock: 3,
    message: "m₁",
    from: 2,
  },
  {
    process: "B",
    kind: "send",
    label: "Send m₂",
    detail: "B sends timestamp 4 to C",
    clock: 4,
    message: "m₂",
  },
  {
    process: "C",
    kind: "receive",
    label: "Receive m₂",
    detail: "max(1, 4) + 1 = 5",
    clock: 5,
    message: "m₂",
    from: 4,
  },
  {
    process: "A",
    kind: "local",
    label: "Local event",
    detail: "A does some local work",
    clock: 3,
  },
];
const meta: Record<ProcessId, { name: string; color: string }> = {
  A: { name: "Process A", color: "#f0635b" },
  B: { name: "Process B", color: "#7657e8" },
  C: { name: "Process C", color: "#0ca88f" },
};

function Icon({ kind }: { kind: EventKind }) {
  return (
    <span className="event-symbol">
      {kind === "send" ? "↗" : kind === "receive" ? "↙" : "•"}
    </span>
  );
}

function App() {
  const [step, setStep] = useState(0);
  const [showRule, setShowRule] = useState(false);
  const visible = events.slice(0, step);
  const last = visible.at(-1);
  const clocks = useMemo(() => {
    const v: Record<ProcessId, number> = { A: 0, B: 0, C: 0 };
    visible.forEach((e) => {
      v[e.process] = e.clock;
    });
    return v;
  }, [visible]);
  const note = !last
    ? "Start the simulation to watch each process build its own logical clock."
    : last.kind === "receive"
      ? `Message ${last.message} arrives with timestamp ${last.from}. ${last.detail}.`
      : `${meta[last.process].name}: ${last.detail}. Clock becomes ${last.clock}.`;

  return (
    <main className="app-shell">
      <nav className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark">⌁</span>lamport<span>lab</span>
        </a>
        <div className="nav-links">
          <a href="#playground">Playground</a>
          <a href="#how-it-works">How it works</a>
        </div>
        <button className="reset-button" onClick={() => setStep(0)}>
          ↺ Reset
        </button>
      </nav>
      <section className="hero" id="top">
        <div className="eyebrow">
          <span className="pulse-dot" /> INTERACTIVE EXPLAINER
        </div>
        <h1>
          Make time make sense
          <br />
          <em>in distributed systems.</em>
        </h1>
        <p className="hero-copy">
          Follow messages across independent processes and see how Lamport
          clocks create a shared sense of “before” — without a shared clock.
        </p>
        <a href="#playground" className="start-link">
          Explore the timeline <span>↓</span>
        </a>
      </section>
      <section className="playground" id="playground">
        <div className="section-heading">
          <div>
            <div className="eyebrow">01 / PLAYGROUND</div>
            <h2>One timeline, three perspectives.</h2>
          </div>
          <p>
            Step through a small distributed system. Each process ticks on its
            own, and messages carry a little bit of time with them.
          </p>
        </div>
        <div className="sim-card">
          <div className="sim-header">
            <div>
              <span className="live-dot" /> SIMULATION
            </div>
            <span className="step-count">
              STEP {step} <i /> {events.length}
            </span>
          </div>
          <div className="timeline-wrap">
            <div className="timeline-labels">
              {(["A", "B", "C"] as ProcessId[]).map((id) => (
                <div className="process-name" key={id}>
                  <span style={{ background: meta[id].color }} />
                  {meta[id].name}
                  <b>{clocks[id]}</b>
                </div>
              ))}
            </div>
            <div className="timeline" aria-label="Lamport clock timeline">
              <div className="timeline-grid">
                {[0, 1, 2, 3, 4, 5].map((v) => (
                  <span key={v}>{v ? `t + ${v}` : "START"}</span>
                ))}
              </div>
              {(["A", "B", "C"] as ProcessId[]).map((id, row) => (
                <div
                  className="lane"
                  key={id}
                  style={{ top: `${49 + row * 33.5}%` }}
                />
              ))}
              {events.map((event, index) => {
                const row = ["A", "B", "C"].indexOf(event.process);
                const done = index < step;
                return (
                  <button
                    key={`${event.process}-${index}`}
                    className={`timeline-event ${event.kind} ${done ? "done" : ""} ${index === step ? "current" : ""}`}
                    style={
                      {
                        left: `${8 + index * 12.1}%`,
                        top: `${47 + row * 33.5}%`,
                        "--event-color": meta[event.process].color,
                      } as React.CSSProperties
                    }
                    onClick={() => setStep(Math.min(events.length, index + 1))}
                    aria-label={`Go to ${event.label}`}
                  >
                    <Icon kind={event.kind} />
                    {done && <small>{event.clock}</small>}
                    {event.kind !== "local" && <strong>{event.message}</strong>}
                  </button>
                );
              })}
              {step >= 5 && (
                <div className="message-line m1">
                  <span>m₁ · timestamp 2</span>
                </div>
              )}
              {step >= 7 && (
                <div className="message-line m2">
                  <span>m₂ · timestamp 4</span>
                </div>
              )}
            </div>
          </div>
          <div className="sim-footer">
            <div className="event-readout">
              <span className={`readout-icon ${last?.kind ?? "local"}`}>
                <Icon kind={last?.kind ?? "local"} />
              </span>
              <div>
                <b>{last?.label ?? "Ready to begin"}</b>
                <p>{note}</p>
              </div>
            </div>
            <button
              className="next-button"
              onClick={() => setStep((v) => Math.min(events.length, v + 1))}
              disabled={step === events.length}
            >
              {step === events.length ? (
                "Complete ✓"
              ) : (
                <>
                  Next event <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
        <p className="hint">
          Tip: click any event in the timeline to jump to it.
        </p>
      </section>
      <section className="rule-section" id="how-it-works">
        <div className="rule-copy">
          <div className="eyebrow">02 / THE RULE</div>
          <h2>
            Time only moves
            <br />
            forward.
          </h2>
          <p>
            Lamport’s idea is wonderfully small: every process owns a counter.
            It increments before each event, and incoming messages nudge it
            forward when necessary.
          </p>
          <button
            className="text-button"
            onClick={() => setShowRule((v) => !v)}
          >
            {showRule ? "Hide the rule" : "See it in action"}{" "}
            <span>{showRule ? "↑" : "↓"}</span>
          </button>
        </div>
        <div className={`rule-card ${showRule ? "expanded" : ""}`}>
          <div className="rule-title">
            <span>THE RECEIVING RULE</span>
            <i>?</i>
          </div>
          <div className="formula">
            <span>new clock</span>
            <b>=</b>
            <span>max</span>
            <div className="bracket">
              (<span>local clock</span>
              <span>message timestamp</span>)
            </div>
            <b>+ 1</b>
          </div>
          <div className="example-row">
            <span>Example: B receives m₁</span>
            <strong>
              max(1, 2) + 1 = <em>3</em>
            </strong>
          </div>
          {showRule && (
            <p className="rule-extra">
              That “max” is the key: B refuses to move backward, then ticks once
              so receiving the message is unmistakably later than sending it.
            </p>
          )}
        </div>
      </section>
      <section className="takeaway">
        <span className="quote-mark">“</span>
        <p>
          If <code>a → b</code>, then <code>L(a) &lt; L(b)</code>.
        </p>
        <span>— LAMPORT’S HAPPENED-BEFORE GUARANTEE</span>
      </section>
      <footer>
        <span>Built for curious systems thinkers.</span>
        <span>Logical time ≠ wall-clock time</span>
      </footer>
    </main>
  );
}
export default App;
