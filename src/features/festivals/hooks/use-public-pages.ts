"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PageEnvelope {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface PublicPagesState<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
  /** True while appending the next page. */
  isLoadingMore: boolean;
  /** True while replacing the list after a filter change. */
  isRefiltering: boolean;
  error: string | null;
  loadMore: () => void;
  /** Re-runs from page 1 with new query params, replacing the list. */
  refilter: (params: Record<string, string | undefined>) => void;
  /**
   * Re-reads page 1 in place without touching the loading flags. Only safe
   * while the visitor is still on page 1 — the caller must check that.
   */
  refreshFirstPage: () => void;
  goToPage: (targetPage: number) => void;
}

/**
 * Client-side paging over a public festival endpoint.
 *
 * Page 1 always arrives with the server-rendered HTML, so this hook makes no
 * request on mount — it only fires when the visitor asks for more or changes
 * a filter. Responses are sequence-checked, so a slow page 2 can never
 * overwrite the results of a filter the visitor has since changed.
 */
export function usePublicPages<T>({
  endpoint,
  select,
  initial,
  pageSize,
  initialParams,
}: {
  /** e.g. `/api/festivals/noor-fest/news` */
  endpoint: string;
  /** Pulls the array out of the endpoint's payload. */
  select: (data: unknown) => T[];
  initial: { items: T[]; total: number; page: number; hasMore: boolean };
  pageSize: number;
  initialParams?: Record<string, string | undefined>;
}): PublicPagesState<T> {
  const [items, setItems] = useState<T[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefiltering, setIsRefiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramsRef = useRef<Record<string, string | undefined>>(
    initialParams ?? {},
  );
  // Monotonic token: only the newest in-flight request may commit state.
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchPage = useCallback(
    async (
      targetPage: number,
      params: Record<string, string | undefined>,
      mode: "append" | "replace" | "silent",
    ) => {
      const requestId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (mode === "append") setIsLoadingMore(true);
      if (mode === "replace") {
        setIsRefiltering(true);
        setError(null);
      }

      try {
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.set("page", String(targetPage));
        url.searchParams.set("pageSize", String(pageSize));
        for (const [key, value] of Object.entries(params)) {
          if (value) url.searchParams.set(key, value);
        }

        const response = await fetch(url, { signal: controller.signal });
        const body = (await response.json()) as ApiEnvelope<PageEnvelope>;

        if (requestId !== requestIdRef.current) return;

        if (!response.ok || !body.success || !body.data) {
          // A background refresh must never surface an error banner over a
          // list the visitor is already reading successfully.
          if (mode !== "silent") {
            setError(body.error?.message ?? "Could not load more.");
          }
          return;
        }

        const nextItems = select(body.data);
        setItems((current) =>
          mode === "append" ? [...current, ...nextItems] : nextItems,
        );
        setTotal(body.data.total);
        setPage(body.data.page);
        setHasMore(body.data.hasMore);
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
        if (mode !== "silent") setError("Could not load more.");
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoadingMore(false);
          setIsRefiltering(false);
        }
      }
    },
    [endpoint, pageSize, select],
  );

  const loadMore = useCallback(() => {
    if (isLoadingMore || isRefiltering || !hasMore) return;
    void fetchPage(page + 1, paramsRef.current, "append");
  }, [fetchPage, hasMore, isLoadingMore, isRefiltering, page]);

  const refilter = useCallback(
    (params: Record<string, string | undefined>) => {
      paramsRef.current = params;
      void fetchPage(1, params, "replace");
    },
    [fetchPage],
  );

  const refreshFirstPage = useCallback(() => {
    if (isLoadingMore || isRefiltering) return;
    void fetchPage(1, paramsRef.current, "silent");
  }, [fetchPage, isLoadingMore, isRefiltering]);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (isLoadingMore || isRefiltering || targetPage === page) return;
      void fetchPage(targetPage, paramsRef.current, "replace");
    },
    [fetchPage, isLoadingMore, isRefiltering, page],
  );

  return {
    items,
    total,
    page,
    hasMore,
    isLoadingMore,
    isRefiltering,
    error,
    loadMore,
    refilter,
    refreshFirstPage,
    goToPage,
  };
}
