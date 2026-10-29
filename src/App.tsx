import { useMemo, useState } from "react";
import "./App.css";

type Process = string;
type Kind = "local" | "send" | "receive";
type Message = {
  id: string;
  name: string;
  from: Process;
  to: Process;
  timestamp: number;
  sendIndex: number;
  delivered?: boolean;
  receiveIndex?: number;
};
type Event = {
  process: Process;
  kind: Kind;
  label: string;
  clock: number;
  messageId?: string;
  from?: number;
};

const defaultMeta: Record<
  Process,
  { color: string; name: string; role: string }
> = {
  A: { color: "#ed6a5e", name: "Process A", role: "API gateway" },
  B: { color: "#7657e8", name: "Process B", role: "Order service" },
  C: { color: "#0ca88f", name: "Process C", role: "Inventory worker" },
};
const defaultProcesses: Process[] = ["A", "B", "C"];
const colors = ["#ed6a5e", "#7657e8", "#0ca88f", "#d08a2e", "#d45395"];

function Glyph({ kind }: { kind: Kind }) {
  return <>{kind === "send" ? "↗" : kind === "receive" ? "↙" : "•"}</>;
}
function label(message: Message) {
  return message.name || message.id;
}

export default function App() {
  const [processes, setProcesses] = useState<Process[]>(defaultProcesses);
  const [meta, setMeta] =
    useState<Record<Process, { color: string; name: string; role: string }>>(
      defaultMeta,
    );
  const [events, setEvents] = useState<Event[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [clocks, setClocks] = useState<Record<Process, number>>({
    A: 0,
    B: 0,
    C: 0,
  });
  const [from, setFrom] = useState<Process>("A");
  const [to, setTo] = useState<Process>("B");
  const [messageName, setMessageName] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const pending = messages.filter((message) => !message.delivered);
  const activeEvent = selected === null ? events.at(-1) : events[selected];
  const totalSlots = Math.max(8, events.length + 1);
  const eventX = (index: number) => ((index + 1) / (totalSlots + 1)) * 100;
  const laneY = (process: Process) =>
    ((processes.indexOf(process) + 1) / (processes.length + 1)) * 100;
  const messageById = useMemo(
    () => Object.fromEntries(messages.map((message) => [message.id, message])),
    [messages],
  );

  const addEvent = (event: Event) => {
    setEvents((current) => [...current, event]);
    setSelected(null);
  };
  const local = (process: Process) => {
    const next = clocks[process] + 1;
    setClocks((current) => ({ ...current, [process]: next }));
    addEvent({ process, kind: "local", label: "Internal event", clock: next });
  };
  const send = () => {
    if (from === to) return;
    const timestamp = clocks[from] + 1;
    const id = `m${messages.length + 1}`;
    setClocks((current) => ({ ...current, [from]: timestamp }));
    const name = messageName.trim() || id;
    setMessages((current) => [
      ...current,
      { id, name, from, to, timestamp, sendIndex: events.length },
    ]);
    addEvent({
      process: from,
      kind: "send",
      label: `Send ${name}`,
      clock: timestamp,
      messageId: id,
    });
    setMessageName("");
  };
  const deliver = (id: string) => {
    const message = messages.find((item) => item.id === id);
    if (!message || message.delivered) return;
    const next = Math.max(clocks[message.to], message.timestamp) + 1;
    setClocks((current) => ({ ...current, [message.to]: next }));
    setMessages((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, delivered: true, receiveIndex: events.length }
          : item,
      ),
    );
    addEvent({
      process: message.to,
      kind: "receive",
      label: `Receive ${message.name}`,
      clock: next,
      messageId: id,
      from: message.timestamp,
    });
  };
  const reset = () => {
    setEvents([]);
    setMessages([]);
    setClocks(Object.fromEntries(processes.map((process) => [process, 0])));
    setSelected(null);
  };
  const loadExample = () => {
    setProcesses(defaultProcesses);
    setMeta(defaultMeta);
    setEvents([]);
    setMessages([]);
    setClocks({ A: 0, B: 0, C: 0 });
    setSelected(null);
    const exampleEvents: Event[] = [
      { process: "A", kind: "local", label: "Internal event", clock: 1 },
      { process: "B", kind: "local", label: "Internal event", clock: 1 },
      {
        process: "A",
        kind: "send",
        label: "Send m1",
        clock: 2,
        messageId: "m1",
      },
      { process: "C", kind: "local", label: "Internal event", clock: 1 },
      {
        process: "B",
        kind: "receive",
        label: "Receive m1",
        clock: 3,
        messageId: "m1",
        from: 2,
      },
      {
        process: "B",
        kind: "send",
        label: "Send m2",
        clock: 4,
        messageId: "m2",
      },
      {
        process: "C",
        kind: "receive",
        label: "Receive m2",
        clock: 5,
        messageId: "m2",
        from: 4,
      },
    ];
    setEvents(exampleEvents);
    setMessages([
      {
        id: "m1",
        name: "m1",
        from: "A",
        to: "B",
        timestamp: 2,
        sendIndex: 2,
        delivered: true,
        receiveIndex: 4,
      },
      {
        id: "m2",
        name: "m2",
        from: "B",
        to: "C",
        timestamp: 4,
        sendIndex: 5,
        delivered: true,
        receiveIndex: 6,
      },
    ]);
    setClocks({ A: 2, B: 4, C: 5 });
  };
  const addProcess = () => {
    if (processes.length >= 5) return;
    const id = String.fromCharCode(65 + processes.length);
    setProcesses((current) => [...current, id]);
    setMeta((current) => ({
      ...current,
      [id]: {
        color: colors[processes.length],
        name: `Process ${id}`,
        role: "Custom worker",
      },
    }));
    setClocks((current) => ({ ...current, [id]: 0 }));
  };
  const undo = () => {
    const last = events.at(-1);
    if (!last) return;
    const remaining = events.slice(0, -1);
    const previousClock =
      remaining.filter((event) => event.process === last.process).at(-1)
        ?.clock ?? 0;
    setEvents(remaining);
    setClocks((current) => ({ ...current, [last.process]: previousClock }));
    setSelected(null);
    if (last.kind === "send" && last.messageId)
      setMessages((current) =>
        current.filter((message) => message.id !== last.messageId),
      );
    if (last.kind === "receive" && last.messageId)
      setMessages((current) =>
        current.map((message) =>
          message.id === last.messageId
            ? { ...message, delivered: false, receiveIndex: undefined }
            : message,
        ),
      );
  };

  const detail = !activeEvent
    ? "Build your own sequence. Internal events tick one process; messages carry a timestamp to another."
    : activeEvent.kind === "receive"
      ? `Incoming timestamp ${activeEvent.from}; max(local clock, ${activeEvent.from}) + 1 makes this clock ${activeEvent.clock}.`
      : activeEvent.kind === "send"
        ? `This message leaves with timestamp ${activeEvent.clock}. It can be delivered whenever you choose.`
        : `${activeEvent.process} increments only its own logical clock to ${activeEvent.clock}.`;

  return (
    <main className="lab">
      <header className="app-header">
        <div className="wordmark">
          <span>⌁</span>
          <b>lamport</b>
          <em>lab</em>
        </div>
        <div className="header-center">
          BUILD A DISTRIBUTED SYSTEM, ONE EVENT AT A TIME
        </div>
        <div>
          <button className="quiet-button" onClick={loadExample}>
            Load example
          </button>
          <button
            className="quiet-button"
            onClick={undo}
            disabled={!events.length}
          >
            ↶ Undo
          </button>
          <button className="quiet-button reset" onClick={reset}>
            ↺ Reset
          </button>
        </div>
      </header>
      <section className="workspace">
        <aside className="side-panel">
          <div className="panel-kicker">INTERACTIVE SIMULATION</div>
          <h1>
            You control
            <br />
            <i>the clocks.</i>
          </h1>
          <p>
            Create concurrent work, route messages however you like, and decide
            when each message arrives.
          </p>
          <div className="rule">
            <span>RECEIVE RULE</span>
            <strong>max(local, message) + 1</strong>
          </div>
          <div className="legend">
            <span>
              <i className="local-dot" /> internal event
            </span>
            <span>
              <i className="send-dot" /> message sent
            </span>
            <span>
              <i className="receive-dot" /> message received
            </span>
          </div>
        </aside>
        <section
          className="simulator"
          aria-label="Interactive Lamport clock visualizer"
        >
          <div className="sim-top">
            <div>
              <span>YOUR SYSTEM</span>
              <b>
                {events.length
                  ? `${events.length} events recorded`
                  : "No events yet — start experimenting"}
              </b>
            </div>
            <div className="event-counter">
              PENDING <strong>{pending.length}</strong>
              {pending.length > 0 && (
                <button onClick={() => deliver(pending[0].id)}>
                  Deliver next →
                </button>
              )}
            </div>
          </div>
          <div
            className="process-list"
            style={{ gridTemplateColumns: `repeat(${processes.length}, 1fr)` }}
          >
            {processes.map((id) => (
              <div className="process-card" key={id}>
                <i style={{ background: meta[id].color }} />
                <div>
                  <b>{meta[id].name}</b>
                  <span>{meta[id].role}</span>
                </div>
                <strong style={{ color: meta[id].color }}>{clocks[id]}</strong>
              </div>
            ))}
          </div>
          <div className="visual-stage">
            <div className="time-axis">
              <span>START</span>
              <span>causal history →</span>
              <span>NOW</span>
            </div>
            {processes.map((id) => (
              <div className="lane" key={id} style={{ top: `${laneY(id)}%` }} />
            ))}
            <svg
              className="message-paths"
              viewBox="0 0 1000 600"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="arrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L0,6 L7,3 z" fill="#908a83" />
                </marker>
              </defs>
              {messages
                .filter(
                  (message) =>
                    message.delivered && message.receiveIndex !== undefined,
                )
                .map((message) => (
                  <path
                    key={message.id}
                    d={`M${eventX(message.sendIndex) * 10},${laneY(message.from) * 6} L${eventX(message.receiveIndex!) * 10},${laneY(message.to) * 6}`}
                    markerEnd="url(#arrow)"
                  />
                ))}
            </svg>
            {events.map((event, index) => {
              const message = event.messageId
                ? messageById[event.messageId]
                : undefined;
              return (
                <button
                  className={`event ${event.kind} ${selected === index ? "selected" : ""}`}
                  key={`${event.process}${index}`}
                  style={
                    {
                      "--x": `${eventX(index)}%`,
                      "--y": `${laneY(event.process)}%`,
                      "--color": meta[event.process].color,
                    } as React.CSSProperties
                  }
                  onClick={() => setSelected(index)}
                  aria-label={`Inspect ${event.label}`}
                >
                  <span className="event-node">
                    <Glyph kind={event.kind} />
                  </span>
                  <b>{event.clock}</b>
                  <small>{message ? label(message) : "internal"}</small>
                </button>
              );
            })}
            {pending.map((message) => (
              <button
                key={message.id}
                className="flight"
                style={{
                  left: `${eventX(message.sendIndex)}%`,
                  top: `${laneY(message.from)}%`,
                }}
                onClick={() => deliver(message.id)}
                aria-label={`Deliver ${label(message)} to ${message.to}`}
              >
                <span>
                  {label(message)} <b>{message.timestamp}</b>
                </span>
                <small>Click to deliver to {message.to} →</small>
              </button>
            ))}
            {!events.length && (
              <div className="empty-stage">
                <span>⌁</span>
                <b>Your causal timeline will appear here.</b>
                <small>Try an internal event or send a message below.</small>
              </div>
            )}
          </div>
          <div className="event-timeline">
            <span>EVENT TIMELINE</span>
            <div>
              {events.map((_, index) => (
                <button
                  key={index}
                  className={selected === index ? "selected" : ""}
                  onClick={() => setSelected(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="control-area">
            <div className="control-title">
              <span>01</span>
              <b>Create internal work</b>
              <small>increments only that process</small>
            </div>
            <div
              className="process-actions"
              style={{
                gridTemplateColumns: `repeat(${processes.length}, 1fr)`,
              }}
            >
              {processes.map((id) => (
                <button key={id} onClick={() => local(id)}>
                  <i style={{ background: meta[id].color }} />
                  {id} internal +1
                </button>
              ))}
            </div>
            <button
              className="add-process"
              onClick={addProcess}
              disabled={processes.length >= 5}
            >
              + Add process {processes.length >= 5 ? "(max 5)" : ""}
            </button>
            <div className="control-title">
              <span>02</span>
              <b>Send a message</b>
              <small>timestamp leaves with it</small>
            </div>
            <div className="composer">
              <select
                aria-label="Sending process"
                value={from}
                onChange={(e) => setFrom(e.target.value as Process)}
              >
                {processes.map((id) => (
                  <option key={id} value={id}>
                    from {id}
                  </option>
                ))}
              </select>
              <span>→</span>
              <select
                aria-label="Receiving process"
                value={to}
                onChange={(e) => setTo(e.target.value as Process)}
              >
                {processes.map((id) => (
                  <option key={id} value={id}>
                    to {id}
                  </option>
                ))}
              </select>
              <input
                aria-label="Message label"
                value={messageName}
                onChange={(e) => setMessageName(e.target.value)}
                placeholder="message name"
                maxLength={12}
              />
              <button
                className="send-button"
                disabled={from === to}
                onClick={send}
              >
                Send message
              </button>
            </div>
          </div>
        </section>
      </section>
      <section className="bottom-panel">
        <div className="event-detail">
          <div className={`event-icon ${activeEvent?.kind ?? "local"}`}>
            <Glyph kind={activeEvent?.kind ?? "local"} />
          </div>
          <div>
            <span>CURRENTLY INSPECTING</span>
            <h2>{activeEvent?.label ?? "No event selected"}</h2>
            <p>{detail}</p>
          </div>
        </div>
        <div className="queue">
          <span>MESSAGE QUEUE</span>
          {pending.length ? (
            pending.map((message) => (
              <button key={message.id} onClick={() => deliver(message.id)}>
                <b>{label(message)}</b>
                <span>
                  {message.from} → {message.to}, timestamp {message.timestamp}
                </span>
                <i>Deliver →</i>
              </button>
            ))
          ) : (
            <p>No messages in flight.</p>
          )}
        </div>
      </section>
    </main>
  );
}
