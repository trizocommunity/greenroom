"use client";

import { useSyncExternalStore } from "react";
import {
  errorStore,
  type ErrorEntry,
  type ErrorScope,
  type PushInput,
} from "./error-store";

export function useErrors(scope?: ErrorScope): ErrorEntry[] {
  return useSyncExternalStore(
    errorStore.subscribe,
    () => errorStore.getSnapshot().filter((e) => e.scope === scope),
    () => [] as ErrorEntry[],
  );
}

export function useGlobalErrors(): ErrorEntry[] {
  return useSyncExternalStore(
    errorStore.subscribe,
    () => errorStore.getSnapshot().filter((e) => !e.scope),
    () => [] as ErrorEntry[],
  );
}

export interface ErrorDispatcher {
  push: (input: PushInput | string) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export function useErrorDispatcher(defaultScope?: ErrorScope): ErrorDispatcher {
  return {
    push: (input) => {
      const normalized: PushInput =
        typeof input === "string" ? { message: input, scope: defaultScope } : { ...input, scope: input.scope ?? defaultScope };
      return errorStore.push(normalized);
    },
    dismiss: (id) => errorStore.dismiss(id),
    clear: () => errorStore.clear(defaultScope),
  };
}