/**
 * Custom-domain cache integration test against real Redis (Testcontainers).
 *
 * The cache module is a thin Redis wrapper now, so the behavioural tests
 * that used to live in `custom-domain.test.ts` (set / get / invalidate,
 * TTL expiry) are exercised here. Fake timers no longer work because the
 * TTL is owned by Redis, not the JS clock.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  __resetCustomDomainCacheForTests,
  getCachedVerifiedInstitution,
  getCustomDomainPositiveTtlMs,
  invalidateCustomDomainCache,
  setCachedVerifiedInstitution,
} from "@/features/institutions/lib/custom-domain-cache";
import { getRedis } from "./setup";

describe("custom-domain cache (Redis)", () => {
  afterEach(async () => {
    await __resetCustomDomainCacheForTests();
  });

  it("round-trips a positive entry until invalidated", async () => {
    await setCachedVerifiedInstitution("ahlussuffa.in", {
      institutionId: "i-1",
    });

    const got = await getCachedVerifiedInstitution("ahlussuffa.in");
    expect(got).toEqual({ institutionId: "i-1" });

    await invalidateCustomDomainCache("ahlussuffa.in");

    const after = await getCachedVerifiedInstitution("ahlussuffa.in");
    expect(after).toBeNull();
  });

  it("negative cache stores null", async () => {
    await setCachedVerifiedInstitution("missing.in", null);

    const got = await getCachedVerifiedInstitution("missing.in");
    expect(got).toBeNull();
  });

  it("honours positive TTL via Redis expiry", async () => {
    const redis = getRedis();
    await redis.set(
      "greenroom:domain:short-lived.in",
      JSON.stringify({ institutionId: "i-2" }),
      "PX",
      50,
    );

    const immediate = await getCachedVerifiedInstitution("short-lived.in");
    expect(immediate).toEqual({ institutionId: "i-2" });

    await new Promise((resolve) => setTimeout(resolve, 200));

    const expired = await getCachedVerifiedInstitution("short-lived.in");
    expect(expired).toBeNull();
  });

  it("exposes the positive TTL constant", () => {
    expect(getCustomDomainPositiveTtlMs()).toBe(60_000);
  });

  it("lowercases the host when writing", async () => {
    await setCachedVerifiedInstitution("AHLUSSUFFA.IN", {
      institutionId: "i-3",
    });

    const got = await getCachedVerifiedInstitution("ahlussuffa.in");
    expect(got).toEqual({ institutionId: "i-3" });
  });
});
