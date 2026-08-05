"use client";

import { humanizeError } from "./humanize";

export type ErrorScope = string;

export interface ErrorEntry {
  id: string;
  severity: "error";
  scope?: ErrorScope;
  title?: string;
  message: string;
  dismissible?: boolean;
  ttlMs?: number;
  createdAt: number;
}

type Listener = () => void;

let entries: ErrorEntry[] = [];
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l();
}

function genId(): string {
  if (
    typeof globalThis !== "undefined" &&
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface PushInput {
  scope?: ErrorScope;
  title?: string;
  message?: string;
  err?: unknown;
  dismissible?: boolean;
  ttlMs?: number;
  replace?: boolean;
}

export const errorStore = {
  push(input: PushInput): string {
    let friendly: { title?: string; message: string };
    if (input.err !== undefined) {
      friendly = humanizeError(input.err);
    } else if (input.message) {
      friendly = { message: input.message };
    } else {
      friendly = { message: "Something went wrong. Please try again." };
    }

    const id = genId();
    const entry: ErrorEntry = {
      id,
      severity: "error",
      scope: input.scope,
      title: input.title ?? friendly.title,
      message: friendly.message,
      dismissible: input.dismissible ?? true,
      ttlMs: input.ttlMs,
      createdAt: Date.now(),
    };

    if (input.scope && input.replace !== false) {
      entries = entries.filter((e) => e.scope !== input.scope);
    }
    entries = [...entries, entry];

    if (entry.ttlMs && entry.ttlMs > 0) {
      setTimeout(() => errorStore.dismiss(id), entry.ttlMs);
    }

    notify();
    return id;
  },

  dismiss(id: string): void {
    const before = entries.length;
    entries = entries.filter((e) => e.id !== id);
    if (entries.length !== before) notify();
  },

  clear(scope?: ErrorScope): void {
    const before = entries.length;
    entries = scope ? entries.filter((e) => e.scope !== scope) : [];
    if (entries.length !== before) notify();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): ErrorEntry[] {
    return entries;
  },
};

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __errorStore?: typeof errorStore }).__errorStore =
    errorStore;
}