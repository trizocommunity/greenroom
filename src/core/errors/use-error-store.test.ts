import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { errorStore, type ErrorEntry } from "./error-store";

beforeEach(() => {
  errorStore.clear();
});

afterEach(() => {
  errorStore.clear();
});

/**
 * Re-implement the same snapshot caching strategy used by useFilteredSnapshot
 * in use-error-store.ts. If we ever dilute the cache (return a new array when
 * the underlying snapshot is reference-equal), the next caller will see a new
 * reference and React's useSyncExternalStore will loop forever.
 */
function makeCachedFilter(
  predicate: (entry: ErrorEntry) => boolean,
): () => ErrorEntry[] {
  let cache: { snapshot: ErrorEntry[]; filtered: ErrorEntry[] } | null = null;
  return () => {
    const snapshot = errorStore.getSnapshot();
    if (cache && cache.snapshot === snapshot) {
      return cache.filtered;
    }
    const filtered = snapshot.filter(predicate);
    cache = { snapshot, filtered };
    return filtered;
  };
}

describe("snapshot caching — used by useErrors / useGlobalErrors", () => {
  it("returns the same array reference when the store has not changed", () => {
    errorStore.push({ scope: "scope-a", message: "stable" });
    const get = makeCachedFilter((e) => e.scope === "scope-a");
    const first = get();
    const second = get();
    expect(second).toBe(first);
  });

  it("returns a new array reference when the store changes", () => {
    const get = makeCachedFilter((e) => e.scope === "scope-a");
    const before = get();
    errorStore.push({ scope: "scope-a", message: "fresh" });
    const after = get();
    expect(after).not.toBe(before);
  });

  it("filters by scope", () => {
    errorStore.push({ scope: "scope-a", message: "a" });
    errorStore.push({ scope: "scope-b", message: "b" });
    const get = makeCachedFilter((e) => e.scope === "scope-a");
    const result = get();
    expect(result).toHaveLength(1);
    expect(result[0]?.message).toBe("a");
  });

  it("global errors filter picks entries without a scope", () => {
    errorStore.push({ scope: "scoped", message: "s" });
    errorStore.push({ scope: undefined, message: "g" });
    const get = makeCachedFilter((e) => !e.scope);
    const result = get();
    expect(result).toHaveLength(1);
    expect(result[0]?.message).toBe("g");
  });

  it("stays stable across many reads in a row", () => {
    errorStore.push({ scope: "scope-a", message: "x" });
    const get = makeCachedFilter((e) => e.scope === "scope-a");
    const refs = Array.from({ length: 50 }, () => get());
    refs.forEach((r) => expect(r).toBe(refs[0]));
  });

  it("invalidates cache on push, then stabilizes again", () => {
    const get = makeCachedFilter((e) => e.scope === "scope-a");
    const push = () => errorStore.push({ scope: "scope-a", message: "x" });
    push();
    const a1 = get();
    const a2 = get();
    expect(a2).toBe(a1);
    push();
    const b1 = get();
    expect(b1).not.toBe(a1);
    const b2 = get();
    expect(b2).toBe(b1);
  });

  it("invalidates cache on dismiss", () => {
    const id = errorStore.push({ scope: "scope-a", message: "x" });
    errorStore.push({
      scope: "scope-a",
      message: "y",
      replace: false,
    });
    const get = makeCachedFilter((e) => e.scope === "scope-a");
    const before = get();
    expect(before).toHaveLength(2);
    errorStore.dismiss(id);
    const after = get();
    expect(after).toHaveLength(1);
    expect(after).not.toBe(before);
  });

  it("invalidates cache on clear", () => {
    errorStore.push({ scope: "scope-a", message: "x" });
    const get = makeCachedFilter((e) => e.scope === "scope-a");
    const before = get();
    errorStore.clear("scope-a");
    const after = get();
    expect(after).toHaveLength(0);
    expect(after).not.toBe(before);
  });
});
