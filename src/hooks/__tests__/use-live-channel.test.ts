// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLiveChannel } from "../use-live-channel";

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly url: string;
  readyState: number = 0;
  private listeners: Map<string, Set<(event: Event | MessageEvent) => void>> =
    new Map();
  closed = false;

  constructor(url: string) {
    this.url = url;
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

describe("useLiveChannel", () => {
  beforeEach(() => {
    MockEventSource.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes a literal URL string straight through to the EventSource factory", () => {
    const { result } = renderHook(() =>
      useLiveChannel<{ count: number }>({
        url: "/api/v1/test/stream",
        eventSourceFactory: Factory,
      }),
    );

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]?.url).toBe("/api/v1/test/stream");
    expect(result.current.status).toBe("connecting");
  });

  it("stays in 'connecting' until the URL function resolves", async () => {
    let resolveUrl: (u: string) => void = () => {};
    const urlFn = () =>
      new Promise<string>((resolve) => {
        resolveUrl = resolve;
      });

    const { result } = renderHook(() =>
      useLiveChannel<{ count: number }>({
        url: urlFn,
        eventSourceFactory: Factory,
      }),
    );

    expect(result.current.status).toBe("connecting");
    expect(MockEventSource.instances).toHaveLength(0);

    await act(async () => {
      resolveUrl("/api/v1/late/stream");
    });

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]?.url).toBe("/api/v1/late/stream");
  });

  it("surfaces a 'closed' state with an error when the URL promise rejects", async () => {
    let rejectUrl: (err: Error) => void = () => {};
    const urlFn = () =>
      new Promise<string>((_resolve, reject) => {
        rejectUrl = reject;
      });

    const { result } = renderHook(() =>
      useLiveChannel<{ count: number }>({
        url: urlFn,
        eventSourceFactory: Factory,
      }),
    );

    await act(async () => {
      rejectUrl(new Error("auth token expired"));
    });

    expect(result.current.status).toBe("closed");
    expect(result.current.error?.message).toBe("auth token expired");
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("applies the parse function to incoming messages", () => {
    const { result } = renderHook(() =>
      useLiveChannel<{ count: number }>({
        url: "/api/v1/test/stream",
        eventSourceFactory: Factory,
        parse: (raw) => ({ count: (raw as { n: number }).n * 2 }),
      }),
    );

    act(() => {
      MockEventSource.instances[0]?.emit(
        "message",
        makeMessageEvent('{"n":3}'),
      );
    });

    expect(result.current.data).toEqual({ count: 6 });
  });

  it("switches back to a literal URL after the URL function resolves a different string", async () => {
    let resolveUrl: (u: string) => void = () => {};
    const urlFn = () =>
      new Promise<string>((resolve) => {
        resolveUrl = resolve;
      });

    const { rerender } = renderHook(
      ({ u }) =>
        useLiveChannel<{ count: number }>({
          url: u,
          eventSourceFactory: Factory,
        }),
      { initialProps: { u: "/api/v1/a" as string | (() => Promise<string>) } },
    );

    expect(MockEventSource.instances[0]?.url).toBe("/api/v1/a");

    rerender({ u: urlFn });
    expect(MockEventSource.instances).toHaveLength(1);

    await act(async () => {
      resolveUrl("/api/v1/b");
    });
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[1]?.url).toBe("/api/v1/b");
  });
});
