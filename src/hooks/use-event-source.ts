"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

export type EventSourceStatus = "connecting" | "open" | "closed";

export interface EventSourceState<T> {
  data: T | null;
  error: Error | null;
  status: EventSourceStatus;
}

export interface UseEventSourceOptions<T = unknown> {
  /** SSE endpoint URL. */
  url: string;
  /** Pass `withCredentials: true` when the endpoint requires cookies. */
  withCredentials?: boolean;
  /**
   * Forward-compat: the server emits unnamed `data:` events today, so this
   * is a no-op. It exists so callers can name a logical channel without
   * having to migrate the hook signature later if the server gains named
   * events.
   */
  eventName?: string;
  /** Optional result parser. If omitted, the raw JSON payload is returned. */
  parse?: (raw: unknown) => T;
  /**
   * Injected EventSource factory. Defaults to `globalThis.EventSource`.
   * Tests inject a mock factory; the integration suite (sub-slice C) will
   * inject an adapter that wraps `eventsource-client` so the same hook
   * runs in both browsers and Node.
   */
  eventSourceFactory?: typeof EventSource;
}

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;
const JITTER_RATIO = 0.3;

function backoffDelay(attempt: number): number {
  const base = Math.min(
    INITIAL_BACKOFF_MS * BACKOFF_MULTIPLIER ** attempt,
    MAX_BACKOFF_MS,
  );
  // Add up to 30% jitter so failed clients don't all retry in lockstep.
  return Math.floor(base + Math.random() * (base * JITTER_RATIO));
}

interface Store<T> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => EventSourceState<T>;
  setState: (
    updater: (prev: EventSourceState<T>) => EventSourceState<T>,
  ) => void;
}

function createStore<T>(): Store<T> {
  let state: EventSourceState<T> = {
    data: null,
    error: null,
    status: "connecting",
  };
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return state;
    },
    setState(updater) {
      const next = updater(state);
      if (next === state) return;
      state = next;
      for (const l of listeners) l();
    },
  };
}

/**
 * Generic React SSE hook. Connects to `url`, exposes the latest payload,
 * reconnects with exponential backoff on disconnect, and tears down on
 * unmount.
 *
 * Heartbeats: SSE comments (lines starting with `:`) are silently consumed
 * by the underlying EventSource. The liveness timer is therefore implicit
 * — the runtime fires an `error` event when the connection dies, which
 * triggers our reconnect path. The 30s server-side heartbeat in
 * `src/core/sse/sse-handler.ts` keeps Vercel's proxy from killing idle
 * connections.
 *
 * Backoff: 1s → 2s → 4s → 8s → 16s → 30s (ceiling), with up to 30% jitter
 * to prevent thundering herd. Consecutive failures keep retrying at the
 * 30s ceiling until the consumer unmounts.
 */
export function useEventSource<T = unknown>({
  url,
  withCredentials,
  parse,
  eventSourceFactory,
}: UseEventSourceOptions<T>): EventSourceState<T> {
  const storeRef = useRef<Store<T> | null>(null);
  if (!storeRef.current) storeRef.current = createStore<T>();
  const store = storeRef.current;

  // Refs so the connection effect only re-runs on `url` changes — the
  // parse function and withCredentials flag can change without forcing
  // a reconnect.
  const parseRef = useRef(parse);
  parseRef.current = parse;
  const withCredentialsRef = useRef(withCredentials);
  withCredentialsRef.current = withCredentials;
  const factoryRef = useRef(eventSourceFactory);
  factoryRef.current = eventSourceFactory;

  useEffect(() => {
    let attempt = 0;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let aborted = false;

    const cleanup = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (es) {
        es.close();
        es = null;
      }
    };

    const connect = () => {
      if (aborted) return;
      // Empty URL means the parent (e.g. `useLiveChannel`) hasn't finished
      // resolving an async URL yet. Stay in `connecting` and wait for the
      // next effect run — don't try to construct an EventSource against "".
      if (!url) return;
      store.setState((prev) => ({ ...prev, status: "connecting" }));

      const Factory = factoryRef.current ?? globalThis.EventSource;
      try {
        es = new Factory(url, { withCredentials: withCredentialsRef.current });
      } catch (err) {
        store.setState((prev) => ({
          ...prev,
          status: "closed",
          error: err instanceof Error ? err : new Error(String(err)),
        }));
        scheduleReconnect();
        return;
      }

      es.addEventListener("open", () => {
        attempt = 0;
        store.setState((prev) => ({
          ...prev,
          status: "open",
          error: null,
        }));
      });

      es.addEventListener("message", (event: MessageEvent) => {
        try {
          const raw = JSON.parse(event.data);
          const data = parseRef.current ? parseRef.current(raw) : (raw as T);
          store.setState((prev) => ({ ...prev, data, error: null }));
        } catch (err) {
          store.setState((prev) => ({
            ...prev,
            error: err instanceof Error ? err : new Error(String(err)),
          }));
        }
      });

      es.addEventListener("error", () => {
        store.setState((prev) => ({
          ...prev,
          status: "closed",
          error: new Error("EventSource connection error"),
        }));
        cleanup();
        scheduleReconnect();
      });
    };

    const scheduleReconnect = () => {
      if (aborted) return;
      const delay = backoffDelay(attempt);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      aborted = true;
      cleanup();
    };
  }, [url, store]);

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
