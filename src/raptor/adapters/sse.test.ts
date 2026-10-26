import { test } from "node:test";
import assert from "node:assert/strict";
import { createEventSourceSource, type ConnectionStatus } from "./sse.ts";

test("SSE reports interruption and recovery while preserving validated, deduplicated events", (t) => {
  class FakeEventSource extends EventTarget {
    static instances: FakeEventSource[] = [];
    closed = false;
    readonly url: string;
    constructor(url: string) {
      super();
      this.url = url;
      FakeEventSource.instances.push(this);
    }
    close() { this.closed = true; }
    message(data: unknown) {
      this.dispatchEvent(new MessageEvent("raptor", { data: JSON.stringify(data) }));
    }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, "EventSource");
  Object.defineProperty(globalThis, "EventSource", {
    configurable: true,
    value: FakeEventSource,
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "EventSource", original);
    else Reflect.deleteProperty(globalThis, "EventSource");
  });

  const statuses: ConnectionStatus[] = [];
  const received: number[] = [];
  const source = createEventSourceSource("https://example.test/events", "raptor", (s) => statuses.push(s));
  assert.equal(FakeEventSource.instances.length, 0, "connect only when subscribed");
  const stop = source.subscribe((event) => received.push(event.seq));
  const stopSecond = source.subscribe(() => {});
  assert.equal(FakeEventSource.instances.length, 1, "share the native reconnecting transport");
  const transport = FakeEventSource.instances[0];
  transport.dispatchEvent(new Event("open"));
  transport.message({ type: "session.reset", seq: 1 });
  transport.dispatchEvent(new Event("error"));
  transport.dispatchEvent(new Event("open"));
  transport.message({ type: "session.reset", seq: 1 });
  transport.message({ type: "session.reset", seq: 0 });
  transport.message({ type: "unknown", seq: 2 });
  transport.message({ type: "session.reset", seq: 2 });
  assert.deepEqual(statuses, ["connecting", "connected", "reconnecting", "connected"]);
  assert.deepEqual(received, [1, 2]);
  stop();
  assert.equal(transport.closed, false);
  stopSecond();
  assert.equal(transport.closed, true);
  transport.dispatchEvent(new Event("error"));
  transport.message({ type: "session.reset", seq: 3 });
  assert.deepEqual(statuses, ["connecting", "connected", "reconnecting", "connected"], "remove status listeners on unmount");
  assert.deepEqual(received, [1, 2]);
});
