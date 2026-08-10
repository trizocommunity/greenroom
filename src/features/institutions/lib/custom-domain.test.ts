import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractFestivalSlugFromPath,
  getDomainOwnershipToken,
  getPublicFestivalBaseUrl,
  isCustomDomainPhasePending,
  isValidCustomDomainShape,
  normalizeCustomDomain,
  parseCustomFestivalHost,
} from "./custom-domain";
import {
  __resetCustomDomainCacheForTests,
  getCachedVerifiedInstitution,
  getCustomDomainCacheTtlMs,
  invalidateCustomDomainCache,
  setCachedVerifiedInstitution,
} from "./custom-domain-cache";

describe("custom-domain helpers", () => {
  const prevAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (prevAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prevAppUrl;
    __resetCustomDomainCacheForTests();
  });

  it("parses suffamehil.ahlussuffa.in into slug + apex", () => {
    const parsed = parseCustomFestivalHost(
      "suffamehil.ahlussuffa.in",
      new Set(),
    );
    expect(parsed).toEqual({
      festivalSlug: "suffamehil",
      customDomain: "ahlussuffa.in",
    });
  });

  it("rejects app hosts and apex-only hosts", () => {
    const appHosts = new Set(["localhost", "greenroomm.vercel.app"]);
    expect(parseCustomFestivalHost("localhost:3000", appHosts)).toBeNull();
    expect(parseCustomFestivalHost("ahlussuffa.in", appHosts)).toBeNull();
    expect(parseCustomFestivalHost("www.ahlussuffa.in", appHosts)).toBeNull();
  });

  it("getPublicFestivalBaseUrl uses subdomain only when HTTPS is ready", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://greenroomm.vercel.app";
    expect(
      getPublicFestivalBaseUrl({
        slug: "suffamehil",
        institution: { customDomain: "ahlussuffa.in", verifiedAt: null },
      }),
    ).toBe("https://greenroomm.vercel.app/suffamehil");

    // DNS verified but the certificate is not serving yet: the branded host
    // would fail in a browser, so keep advertising the path URL.
    expect(
      getPublicFestivalBaseUrl({
        slug: "suffamehil",
        institution: {
          customDomain: "ahlussuffa.in",
          verifiedAt: "2026-01-01T00:00:00.000Z",
          httpsReadyAt: null,
        },
      }),
    ).toBe("https://greenroomm.vercel.app/suffamehil");

    expect(
      getPublicFestivalBaseUrl({
        slug: "suffamehil",
        institution: {
          customDomain: "ahlussuffa.in",
          verifiedAt: "2026-01-01T00:00:00.000Z",
          httpsReadyAt: "2026-01-01T00:05:00.000Z",
        },
      }),
    ).toBe("https://suffamehil.ahlussuffa.in");
  });

  it("getPublicFestivalBaseUrl falls back when no institution or domain", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://greenroomm.vercel.app";
    expect(
      getPublicFestivalBaseUrl({ slug: "suffamehil", institution: null }),
    ).toBe("https://greenroomm.vercel.app/suffamehil");

    expect(
      getPublicFestivalBaseUrl({
        slug: "suffamehil",
        institution: {
          customDomain: null,
          verifiedAt: "2026-01-01T00:00:00.000Z",
          httpsReadyAt: "2026-01-01T00:05:00.000Z",
        },
      }),
    ).toBe("https://greenroomm.vercel.app/suffamehil");
  });

  it("isCustomDomainPhasePending covers only the waiting phases", () => {
    expect(isCustomDomainPhasePending("provisioning")).toBe(true);
    expect(isCustomDomainPhasePending("manual-attach")).toBe(true);
    expect(isCustomDomainPhasePending("no-domain")).toBe(false);
    expect(isCustomDomainPhasePending("awaiting-dns")).toBe(false);
    expect(isCustomDomainPhasePending("https-ready")).toBe(false);
    expect(isCustomDomainPhasePending("error")).toBe(false);
  });

  it("normalizes and validates domain shape", () => {
    expect(normalizeCustomDomain("https://WWW.Example.COM/path")).toBe(
      "example.com",
    );
    expect(isValidCustomDomainShape("ahlussuffa.in")).toBe(true);
    expect(isValidCustomDomainShape("localhost")).toBe(false);
    expect(isValidCustomDomainShape("not a domain")).toBe(false);
  });

  it("builds ownership token from institution id", () => {
    expect(getDomainOwnershipToken("inst_1")).toBe("greenroom-verify=inst_1");
  });

  it("extracts festival slug from public paths", () => {
    expect(extractFestivalSlugFromPath("/suffamehil/login")).toBe("suffamehil");
    expect(extractFestivalSlugFromPath("/dashboard/suffamehil")).toBeNull();
    expect(extractFestivalSlugFromPath("/login")).toBeNull();
  });
});

describe("custom-domain cache", () => {
  afterEach(() => {
    __resetCustomDomainCacheForTests();
    vi.useRealTimers();
  });

  it("returns cached value within TTL and miss after expiry", () => {
    vi.useFakeTimers();
    setCachedVerifiedInstitution("ahlussuffa.in", { institutionId: "i1" });
    expect(getCachedVerifiedInstitution("ahlussuffa.in")).toEqual({
      institutionId: "i1",
    });

    vi.advanceTimersByTime(getCustomDomainCacheTtlMs() + 1);
    expect(getCachedVerifiedInstitution("ahlussuffa.in")).toBeUndefined();
  });

  it("invalidate clears entry immediately", () => {
    setCachedVerifiedInstitution("ahlussuffa.in", { institutionId: "i1" });
    invalidateCustomDomainCache("ahlussuffa.in");
    expect(getCachedVerifiedInstitution("ahlussuffa.in")).toBeUndefined();
  });
});
