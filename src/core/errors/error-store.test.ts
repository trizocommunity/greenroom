import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorStore } from "./error-store";

beforeEach(() => {
  errorStore.clear();
  vi.useRealTimers();
});

afterEach(() => {
  errorStore.clear();
});

describe("errorStore", () => {
  it("pushes a humanized entry and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = errorStore.subscribe(listener);

    const id = errorStore.push({
      scope: "test",
      message: "OTP is invalid or expired.",
    });

    expect(typeof id).toBe("string");
    expect(errorStore.getSnapshot()).toHaveLength(1);
    const entry = errorStore.getSnapshot()[0]!;
    expect(entry.scope).toBe("test");
    expect(entry.message).toBe("OTP is invalid or expired.");
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it("humanizes raw errors on push", () => {
    errorStore.push({ scope: "test", err: new Error("totally raw backend thing") });
    expect(errorStore.getSnapshot()[0]?.message).toBe(
      "An unexpected error occurred. Please try again.",
    );
  });

  it("dismisses an entry by id", () => {
    const id = errorStore.push({ scope: "test", message: "x" });
    expect(errorStore.getSnapshot()).toHaveLength(1);
    errorStore.dismiss(id);
    expect(errorStore.getSnapshot()).toHaveLength(0);
  });

  it("replaces previous entries in the same scope by default", () => {
    errorStore.push({ scope: "login", message: "first" });
    errorStore.push({ scope: "login", message: "second" });
    const scoped = errorStore.getSnapshot().filter((e) => e.scope === "login");
    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.message).toBe("second");
  });

  it("can opt out of replace via replace:false", () => {
    errorStore.push({ scope: "login", message: "first" });
    errorStore.push({ scope: "login", message: "second", replace: false });
    expect(errorStore.getSnapshot()).toHaveLength(2);
  });

  it("clear() with a scope removes only that scope", () => {
    errorStore.push({ scope: "login", message: "a" });
    errorStore.push({ scope: "other", message: "b" });
    errorStore.clear("login");
    expect(errorStore.getSnapshot()).toHaveLength(1);
    expect(errorStore.getSnapshot()[0]?.scope).toBe("other");
  });

  it("auto-dismisses entries with ttlMs", () => {
    vi.useFakeTimers();
    errorStore.push({ scope: "test", message: "x", ttlMs: 1000 });
    expect(errorStore.getSnapshot()).toHaveLength(1);
    vi.advanceTimersByTime(1001);
    expect(errorStore.getSnapshot()).toHaveLength(0);
  });
});