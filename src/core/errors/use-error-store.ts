"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  type ErrorEntry,
  type ErrorScope,
  errorStore,
  type PushInput,
} from "./error-store";

function useFilteredSnapshot(
  predicate: (entry: ErrorEntry) => boolean,
): ErrorEntry[] {
  let cache: { snapshot: ErrorEntry[]; filtered: ErrorEntry[] } | null = null;

  const getFiltered = () => {
    const snapshot = errorStore.getSnapshot();
    if (cache && cache.snapshot === snapshot) {
      return cache.filtered;
    }
    const filtered = snapshot.filter(predicate);
    cache = { snapshot, filtered };
    return filtered;
  };

  return useSyncExternalStore(
    errorStore.subscribe,
    getFiltered,
    () => EMPTY,
  );
}

const EMPTY: ErrorEntry[] = [];

export function useErrors(scope?: ErrorScope): ErrorEntry[] {
  return useFilteredSnapshot((e) => e.scope === scope);
}

export function useGlobalErrors(): ErrorEntry[] {
  return useFilteredSnapshot((e) => !e.scope);
}

export interface ErrorDispatcher {
  push: (input: PushInput | string) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export function useErrorDispatcher(
  defaultScope?: ErrorScope,
): ErrorDispatcher {
  return {
    push: useCallback(
      (input: string | PushInput) => {
        const normalized: PushInput =
          typeof input === "string"
            ? { message: input, scope: defaultScope }
            : { ...input, scope: input.scope ?? defaultScope };
        return errorStore.push(normalized);
      },
      [defaultScope],
    ),
    dismiss: (id) => errorStore.dismiss(id),
    clear: () => errorStore.clear(defaultScope),
  };
}