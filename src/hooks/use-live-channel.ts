"use client";

import { useEffect, useState } from "react";

import { type EventSourceState, useEventSource } from "./use-event-source";

export type LiveChannelUrl = string | (() => Promise<string>);

export interface UseLiveChannelOptions<T> {
  /**
   * Either a literal URL or a function that resolves one. The async form
   * is useful when the URL depends on context (e.g. a session-scoped
   * auth token) and the caller wants to defer the resolution until
   * client-side hydration.
   */
  url: LiveChannelUrl;
  /** Optional result parser. Same contract as `useEventSource.parse`. */
  parse?: (raw: unknown) => T;
}

/**
 * Typed wrapper around `useEventSource`. Resolves a possibly-async URL
 * once, then delegates to the underlying hook.
 *
 * While the URL is being resolved the hook stays in `status: "connecting"`
 * with a `null` data and error. If the URL resolves rejects, the hook
 * surfaces an error and stops attempting to connect.
 */
export function useLiveChannel<T = unknown>({
  url,
  parse,
}: UseLiveChannelOptions<T>): EventSourceState<T> {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    typeof url === "string" ? url : null,
  );
  const [resolveError, setResolveError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof url === "string") {
      setResolvedUrl(url);
      setResolveError(null);
      return;
    }
    let cancelled = false;
    setResolvedUrl(null);
    setResolveError(null);
    url()
      .then((u) => {
        if (!cancelled) setResolvedUrl(u);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResolveError(err instanceof Error ? err : new Error(String(err)));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const stream = useEventSource<T>({
    url: resolvedUrl ?? "",
    parse,
  });

  if (resolveError) {
    return { data: null, error: resolveError, status: "closed" };
  }
  if (!resolvedUrl) {
    return { data: null, error: null, status: "connecting" };
  }
  return stream;
}
