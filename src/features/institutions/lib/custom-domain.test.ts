import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFestivalHost,
  describeCustomDomainProblem,
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

  it("getPublicFestivalBaseUrl uses subdomain only when this festival's HTTPS is ready", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://greenroomm.vercel.app";
    expect(
      getPublicFestivalBaseUrl({
        slug: "suffamehil",
        institution: { customDomain: "ahlussuffa.in", verifiedAt: null },
      }),
    ).toBe("https://greenroomm.vercel.app/suffamehil");

    // DNS verified but this host's certificate is not serving yet: the branded
    // host would fail in a browser, so keep advertising the path URL.
    expect(
      getPublicFestivalBaseUrl({
        slug: "suffamehil",
        institution: {
          customDomain: "ahlussuffa.in",
          verifiedAt: "2026-01-01T00:00:00.000Z",
        },
        domainHttpsReadyAt: null,
      }),
    ).toBe("https://greenroomm.vercel.app/suffamehil");

    expect(
      getPublicFestivalBaseUrl({
        slug: "suffamehil",
        institution: {
          customDomain: "ahlussuffa.in",
          verifiedAt: "2026-01-01T00:00:00.000Z",
        },
        domainHttpsReadyAt: "2026-01-01T00:05:00.000Z",
      }),
    ).toBe("https://suffamehil.ahlussuffa.in");
  });

  it("getPublicFestivalBaseUrl gates per festival, not per institution", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://greenroomm.vercel.app";
    const institution = {
      customDomain: "ahlussuffa.in",
      verifiedAt: "2026-01-01T00:00:00.000Z",
    };

    // Same verified apex, two festivals: certificates are issued per host over
    // HTTP-01, so one can be serving while its sibling has never been published.
    expect(
      getPublicFestivalBaseUrl({
        slug: "suffamehil",
        institution,
        domainHttpsReadyAt: "2026-01-01T00:05:00.000Z",
      }),
    ).toBe("https://suffamehil.ahlussuffa.in");

    expect(
      getPublicFestivalBaseUrl({
        slug: "zenoraev",
        institution,
        domainHttpsReadyAt: null,
      }),
    ).toBe("https://greenroomm.vercel.app/zenoraev");
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
        },
        domainHttpsReadyAt: "2026-01-01T00:05:00.000Z",
      }),
    ).toBe("https://greenroomm.vercel.app/suffamehil");
  });

  it("buildFestivalHost joins slug and apex, rejecting unusable input", () => {
    expect(buildFestivalHost("suffamehil", "ahlussuffa.in")).toBe(
      "suffamehil.ahlussuffa.in",
    );
    // Normalizes the way Vercel expects the name.
    expect(buildFestivalHost(" SuffaMehil ", "https://Ahlussuffa.in./")).toBe(
      "suffamehil.ahlussuffa.in",
    );
    expect(buildFestivalHost("suffamehil", "")).toBeNull();
    expect(buildFestivalHost("", "ahlussuffa.in")).toBeNull();
    expect(buildFestivalHost("bad slug", "ahlussuffa.in")).toBeNull();
    expect(buildFestivalHost("-lead", "ahlussuffa.in")).toBeNull();
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

  it("describeCustomDomainProblem explains each rejection", () => {
    // The field pre-validates with this; the API rejects with the same rules,
    // so the two must never disagree about what is acceptable.
    expect(describeCustomDomainProblem("ahlussuffa.in")).toBeNull();
    expect(
      describeCustomDomainProblem("https://www.ahlussuffa.in/"),
    ).toBeNull();

    expect(describeCustomDomainProblem("")).toMatch(/Enter your domain/);
    expect(describeCustomDomainProblem("   ")).toMatch(/Enter your domain/);
    expect(describeCustomDomainProblem("localhost")).toMatch(/extension/);
    expect(describeCustomDomainProblem("not a domain")).toMatch(/spaces/);
    expect(describeCustomDomainProblem("ahlussuffa..in")).toMatch(/double dot/);
    expect(describeCustomDomainProblem("192.168.0.1")).toMatch(/IP address/);
    expect(describeCustomDomainProblem("ahlussuffa.in.")).toBeNull(); // trailing dot is normalized away
    expect(describeCustomDomainProblem("-bad.in")).toMatch(/hyphen/);
    expect(describeCustomDomainProblem("ahlus_suffa.in")).toMatch(
      /letters, numbers, and hyphens/,
    );
    expect(describeCustomDomainProblem(`${"a".repeat(64)}.in`)).toMatch(
      /63 characters/,
    );
  });

  it("describeCustomDomainProblem agrees with isValidCustomDomainShape", () => {
    const cases = [
      "ahlussuffa.in",
      "sub.ahlussuffa.in",
      "https://www.ahlussuffa.in/x",
      "",
      "localhost",
      "not a domain",
      "ahlussuffa..in",
      "192.168.0.1",
      "-bad.in",
      "bad-.in",
      "ahlus_suffa.in",
      `${"a".repeat(64)}.in`,
    ];
    for (const input of cases) {
      expect(isValidCustomDomainShape(input)).toBe(
        describeCustomDomainProblem(input) === null,
      );
    }
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
