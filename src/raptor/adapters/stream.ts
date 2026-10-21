import type { RaptorEvent } from "../engine/events.ts";
import type { RaptorEventSource } from "./source.ts";
import { parseEvent } from "./wire.ts";

/**
 * A concrete {@link RaptorEventSource} over a message transport: the piece a
 * real Raptor runtime wires to its socket. It validates every message at the
 * boundary (see {@link parseEvent}), drops stale or duplicate events so a
 * reconnect replay is harmless, and reconnects with capped backoff.
 *
 * The transport and scheduler are injected so the whole thing runs under a
 * fake clock in tests, exactly like the demo director.
 */

/** One live connection. `close` must be idempotent and stop all callbacks. */
export interface StreamConnection {
  /** Send one message upstream (for resync requests). A no-op if unsupported. */
  send(data: unknown): void;
  close(): void;
}

export interface StreamHandlers {
  /** A decoded message: a JSON string, or an already-parsed value. */
  onMessage(data: unknown): void;
  onOpen(): void;
  onClose(): void;
}

/** Opens connections on demand. Each call is a fresh attempt. */
export interface StreamTransport {
  connect(handlers: StreamHandlers): StreamConnection;
}

type Scheduler = {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
};

const browserScheduler: Scheduler = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type StreamOptions = {
  scheduler?: Scheduler;
  /** First reconnect delay in ms. Doubles each attempt up to `maxBackoffMs`. */
  backoffMs?: number;
  maxBackoffMs?: number;
  /** Stop after this many consecutive failed reconnects. Infinite by default. */
  maxRetries?: number;
  /** Called after a reconnect opens, so the host can request a resync. */
  onReopen?: () => void;
  /**
   * Build the upstream request sent on every open to resume the stream. Given
   * the last sequence number delivered (-1 before any), it returns the message
   * to send; the runtime replays only events after it, so a reconnect loses
   * nothing. Omit for receive-only transports.
   */
  resyncRequest?: (sinceSeq: number) => unknown;
  /** Called for each message that fails validation. */
  onInvalid?: (data: unknown) => void;
};

type ResolvedOptions = Required<
  Pick<StreamOptions, "scheduler" | "backoffMs" | "maxBackoffMs" | "maxRetries">
> &
  Pick<StreamOptions, "onReopen" | "onInvalid" | "resyncRequest">;

class StreamSource implements RaptorEventSource {
  private readonly listeners = new Set<(event: RaptorEvent) => void>();
  private readonly transport: StreamTransport;
  private readonly options: ResolvedOptions;
  private connection: StreamConnection | null = null;
  private retryHandle: unknown = null;
  private retries = 0;
  private lastSeq = -1;
  private opened = false;
  private closed = false;

  constructor(transport: StreamTransport, options: ResolvedOptions) {
    this.transport = transport;
    this.options = options;
  }

  subscribe(listener: (event: RaptorEvent) => void) {
    this.listeners.add(listener);
    if (this.listeners.size === 1 && !this.closed) this.open();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.teardown();
    };
  }

  private open() {
    if (this.connection || this.closed) return;
    const everOpened = this.opened;
    let conn: StreamConnection | null = null;
    conn = this.transport.connect({
      onMessage: (data) => this.handleMessage(data),
      onOpen: () => {
        this.retries = 0;
        this.opened = true;
        if (everOpened) this.options.onReopen?.();
        // Resume from the last delivered seq, so a reconnect loses nothing.
        if (this.options.resyncRequest) {
          (conn ?? this.connection)?.send(this.options.resyncRequest(this.lastSeq));
        }
      },
      onClose: () => this.handleClose(),
    });
    this.connection = conn;
  }

  private handleMessage(data: unknown) {
    const event = parseEvent(data);
    if (!event) {
      this.options.onInvalid?.(data);
      return;
    }
    // Strictly increasing: drop replays and out-of-order stragglers before
    // they reach the engine, which would otherwise reject them as stale.
    if (event.seq <= this.lastSeq) return;
    this.lastSeq = event.seq;
    for (const listener of this.listeners) listener(event);
  }

  private handleClose() {
    this.connection = null;
    if (this.closed || this.listeners.size === 0) return;
    if (this.retries >= this.options.maxRetries) return;
    const delay = Math.min(
      this.options.backoffMs * 2 ** this.retries,
      this.options.maxBackoffMs,
    );
    this.retries += 1;
    this.retryHandle = this.options.scheduler.set(() => {
      this.retryHandle = null;
      this.open();
    }, delay);
  }

  private teardown() {
    if (this.retryHandle !== null) {
      this.options.scheduler.clear(this.retryHandle);
      this.retryHandle = null;
    }
    this.connection?.close();
    this.connection = null;
  }

  /** Permanently stop: close the socket and refuse further reconnects. */
  close() {
    this.closed = true;
    this.teardown();
  }
}

/** Create a reconnecting event source over a message transport. */
export function createStreamSource(
  transport: StreamTransport,
  options: StreamOptions = {},
): RaptorEventSource & { close(): void } {
  return new StreamSource(transport, {
    scheduler: options.scheduler ?? browserScheduler,
    backoffMs: options.backoffMs ?? 500,
    maxBackoffMs: options.maxBackoffMs ?? 15000,
    maxRetries: options.maxRetries ?? Number.POSITIVE_INFINITY,
    onReopen: options.onReopen,
    onInvalid: options.onInvalid,
    resyncRequest: options.resyncRequest,
  });
}

/**
 * A {@link StreamTransport} over the browser `WebSocket`. Each `connect` opens
 * one socket; `close` detaches handlers so a closed attempt stays silent.
 */
export function webSocketTransport(
  url: string | URL,
  protocols?: string | string[],
): StreamTransport {
  return {
    connect(handlers) {
      const socket = new WebSocket(url, protocols);
      const onMessage = (ev: MessageEvent) => handlers.onMessage(ev.data);
      const onOpen = () => handlers.onOpen();
      const onClose = () => handlers.onClose();
      socket.addEventListener("message", onMessage);
      socket.addEventListener("open", onOpen);
      socket.addEventListener("close", onClose);
      socket.addEventListener("error", onClose);
      return {
        send(data) {
          if (socket.readyState !== WebSocket.OPEN) return;
          socket.send(typeof data === "string" ? data : JSON.stringify(data));
        },
        close() {
          socket.removeEventListener("message", onMessage);
          socket.removeEventListener("open", onOpen);
          socket.removeEventListener("close", onClose);
          socket.removeEventListener("error", onClose);
          if (
            socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING
          ) {
            socket.close();
          }
        },
      };
    },
  };
}
