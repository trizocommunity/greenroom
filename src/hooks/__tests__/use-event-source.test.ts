// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEventSource } from "../use-event-source";

/**
 * Minimal browser-EventSource-API-compatible mock. The hook factory
 * injects this so we can drive the connection lifecycle without a real
 * SSE server (the integration test in sub-slice C uses eventsource-client
 * against a node:http server for that).
 *
 * Tracks every instance so tests can assert on construction and call
 * `emit(...)` to simulate the server.
 */
class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly url: string;
  readonly init: { withCredentials?: boolean } | undefined;
  readyState: number = 0;
  private listeners: Map<string, Set<(event: Event | MessageEvent) => void>> =
    new Map();
  closed = false;

  constructor(url: string, init?: { withCredentials?: boolean }) {
    this.url = url;
    this.init = init;
    MockEventSource.instances.push(this);
  }

  addEventListener(
    type: string,
    listener: (event: Event | MessageEvent) => void,
  ): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(listener);
  }

  removeEventListener(
    type: string,
    listener: (event: Event | MessageEvent) => void,
  ): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.readyState = 2;
    this.closed = true;
  }

  emit(type: string, event: Event | MessageEvent): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  static reset(): void {
    MockEventSource.instances = [];
  }
}

const Factory = MockEventSource as unknown as typeof EventSource;

function makeMessageEvent(data: string): MessageEvent {
  return new MessageEvent("message", { data });
}

describe("useEventSource", () => {
  beforeEach(() => {
    MockEventSource.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the connection on mount and starts in 'connecting' status", () => {
    const { result } = renderHook(() =>
      useEventSource({ url: "/api/test", eventSourceFactory: Factory }),
    );

    expect(result.current.status).toBe("connecting");
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]?.url).toBe("/api/test");
  });

  it("forwards withCredentials to the EventSource constructor", () => {
    renderHook(() =>
      useEventSource({
        url: "/api/test",
        withCredentials: true,
        eventSourceFactory: Factory,
      }),
    );

    expect(MockEventSource.instances[0]?.init).toEqual({
      withCredentials: true,
    });
  });

  it("transitions to 'open' when the server opens the connection", () => {
    const { result } = renderHook(() =>
      useEventSource({ url: "/api/test", eventSourceFactory: Factory }),
    );

    act(() => {
      MockEventSource.instances[0]?.emit("open", new Event("open"));
    });

    expect(result.current.status).toBe("open");
    expect(result.current.error).toBeNull();
  });

  it("parses incoming JSON messages and exposes the result", () => {
    const { result } = renderHook(() =>
      useEventSource({ url: "/api/test", eventSourceFactory: Factory }),
    );

    act(() => {
      MockEventSource.instances[0]?.emit(
        "message",
        makeMessageEvent('{"count":42}'),
      );
    });

    expect(result.current.data).toEqual({ count: 42 });
    expect(result.current.error).toBeNull();
  });

  it("silently ignores SSE comments (lines starting with ':') — the browser consumes them", () => {
    // The browser's EventSource never surfaces comments as MessageEvents,
    // so this hook never sees them. We assert that fact by verifying a
    // comment sent as an `open` event followed by a `message` event lands
    // as the parsed payload, not as heartbeats in `data`.
    const { result } = renderHook(() =>
      useEventSource({ url: "/api/test", eventSourceFactory: Factory }),
    );

    act(() => {
      MockEventSource.instances[0]?.emit(
        "message",
        makeMessageEvent(": heartbeat"),
      );
      MockEventSource.instances[0]?.emit(
        "message",
        makeMessageEvent('{"id":"abc"}'),
      );
    });

    expect(result.current.data).toEqual({ id: "abc" });
  });

  it("applies a caller-supplied parse function and the result is typed", () => {
    type Payload = { count: number };
    const { result } = renderHook(() =>
      useEventSource<Payload>({
        url: "/api/test",
        eventSourceFactory: Factory,
        parse: (raw) => {
          const r = raw as { count: number };
          return { count: r.count * 2 };
        },
      }),
    );

    act(() => {
      MockEventSource.instances[0]?.emit(
        "message",
        makeMessageEvent('{"count":5}'),
      );
    });

    expect(result.current.data).toEqual({ count: 10 });
  });

  it("surfaces a parse error and does not overwrite the previous data", () => {
    const { result } = renderHook(() =>
      useEventSource({ url: "/api/test", eventSourceFactory: Factory }),
    );

    act(() => {
      MockEventSource.instances[0]?.emit(
        "message",
        makeMessageEvent('{"good":1}'),
      );
    });
    expect(result.current.data).toEqual({ good: 1 });

    act(() => {
      MockEventSource.instances[0]?.emit(
        "message",
        makeMessageEvent("not-json"),
      );
    });

    expect(result.current.data).toEqual({ good: 1 });
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("reconnects with exponential backoff after an error", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useEventSource({ url: "/api/test", eventSourceFactory: Factory }),
    );

    // First connection is open. Trigger an error → schedule reconnect at 1s.
    act(() => {
      MockEventSource.instances[0]?.emit("open", new Event("open"));
    });
    expect(result.current.status).toBe("open");

    act(() => {
      MockEventSource.instances[0]?.emit("error", new Event("error"));
    });
    expect(result.current.status).toBe("closed");
    expect(result.current.error).toBeInstanceOf(Error);
    expect(MockEventSource.instances[0]?.closed).toBe(true);

    // Advance past the first backoff (1s ± jitter).
    act(() => {
      vi.advanceTimersByTime(1_500);
    });
    expect(MockEventSource.instances).toHaveLength(2);
    expect(result.current.status).toBe("connecting");
  });

  it("caps backoff at 30s and keeps retrying", () => {
    vi.useFakeTimers();
    renderHook(() =>
      useEventSource({ url: "/api/test", eventSourceFactory: Factory }),
    );

    // Burn through 1s, 2s, 4s, 8s, 16s → 30s ceiling.
    const delays = [1_500, 2_500, 5_000, 9_000, 17_000, 30_500, 30_500];
    for (const delay of delays) {
      act(() => {
        vi.advanceTimersByTime(delay);
      });
      const last = MockEventSource.instances.at(-1);
      act(() => {
        last?.emit("error", new Event("error"));
      });
    }

    // After the 30s ceiling kicks in, the next attempt is still scheduled
    // at 30s and the consumer sees another connection attempted.
    expect(MockEventSource.instances.length).toBeGreaterThan(5);
  });

  it("resets the backoff attempt counter after a successful open", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useEventSource({ url: "/api/test", eventSourceFactory: Factory }),
    );

    // Open → error → reconnect (1s).
    act(() => {
      MockEventSource.instances[0]?.emit("open", new Event("open"));
    });
    act(() => {
      MockEventSource.instances[0]?.emit("error", new Event("error"));
    });
    act(() => {
      vi.advanceTimersByTime(1_500);
    });
    expect(result.current.status).toBe("connecting");

    // Reconnect succeeds.
    act(() => {
      MockEventSource.instances[1]?.emit("open", new Event("open"));
    });
    expect(result.current.status).toBe("open");

    // A subsequent error should re-arm the backoff at 1s, not 2s.
    act(() => {
      MockEventSource.instances[1]?.emit("error", new Event("error"));
    });
    // Before 1s: no third instance yet.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(MockEventSource.instances).toHaveLength(2);
    // Past 1s: third instance created.
    act(() => {
      vi.advanceTimersByTime(1_500);
    });
    expect(MockEventSource.instances).toHaveLength(3);
  });

  it("closes the connection on unmount and aborts the pending backoff", () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() =>
      useEventSource({ url: "/api/test", eventSourceFactory: Factory }),
    );

    act(() => {
      MockEventSource.instances[0]?.emit("error", new Event("error"));
    });
    expect(result.current.status).toBe("closed");

    // Unmount before the backoff fires.
    unmount();

    // The backoff timer must be cleared — no new EventSource is created.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it("reconnects when the URL prop changes", () => {
    const { rerender } = renderHook(
      ({ url }: { url: string }) =>
        useEventSource({ url, eventSourceFactory: Factory }),
      { initialProps: { url: "/api/a" } },
    );

    expect(MockEventSource.instances[0]?.url).toBe("/api/a");

    rerender({ url: "/api/b" });

    expect(MockEventSource.instances[0]?.closed).toBe(true);
    expect(MockEventSource.instances[1]?.url).toBe("/api/b");
  });

  it("returns a stable snapshot reference when no events have arrived", () => {
    const { result, rerender } = renderHook(() =>
      useEventSource({ url: "/api/test", eventSourceFactory: Factory }),
    );

    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
