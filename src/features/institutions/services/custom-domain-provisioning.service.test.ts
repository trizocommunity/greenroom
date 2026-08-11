import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindInstitutionById,
  mockFindFestivalById,
  mockMarkFestivalHttpsReady,
  mockClearFestivalHttpsReady,
  mockAddDomainToProject,
  mockCheckAttachStatus,
  mockIsVercelDomainsConfigured,
  mockRemoveProjectDomain,
} = vi.hoisted(() => ({
  mockFindInstitutionById: vi.fn(),
  mockFindFestivalById: vi.fn(),
  mockMarkFestivalHttpsReady: vi.fn(),
  mockClearFestivalHttpsReady: vi.fn(),
  mockAddDomainToProject: vi.fn(),
  mockCheckAttachStatus: vi.fn(),
  mockIsVercelDomainsConfigured: vi.fn(),
  mockRemoveProjectDomain: vi.fn(),
}));

vi.mock("@/features/institutions/repositories/institution.repository", () => ({
  findInstitutionById: mockFindInstitutionById,
}));

vi.mock("@/features/festivals/repositories/festival.repository", () => ({
  findFestivalById: mockFindFestivalById,
  findFestivalsForInstitution: vi.fn(),
  markFestivalHttpsReady: mockMarkFestivalHttpsReady,
  clearFestivalHttpsReady: mockClearFestivalHttpsReady,
}));

vi.mock("@/features/institutions/services/vercel-domains.service", () => ({
  addDomainToProject: mockAddDomainToProject,
  checkAttachStatus: mockCheckAttachStatus,
  isVercelDomainsConfigured: mockIsVercelDomainsConfigured,
  removeProjectDomain: mockRemoveProjectDomain,
}));

import {
  detachFestivalDomain,
  ensureFestivalDomainAttached,
  probeHttpsReady,
  syncFestivalDomainStatus,
} from "./custom-domain-provisioning.service";

const VERIFIED_AT = "2026-01-01T00:00:00.000Z";
const HTTPS_READY_AT = "2026-01-01T00:05:00.000Z";
const APEX = "ahlussuffa.in";
const SLUG = "suffamehil";
const HOST = `${SLUG}.${APEX}`;

/** Institution row shape as far as this service cares. */
function institution(overrides: Record<string, unknown> = {}) {
  return {
    id: "inst_1",
    customDomain: APEX,
    verifiedAt: VERIFIED_AT,
    ...overrides,
  };
}

/** Festival row shape as far as this service cares. */
function festival(overrides: Record<string, unknown> = {}) {
  return {
    id: "fest_1",
    slug: SLUG,
    tier: "PRO",
    institutionId: "inst_1",
    publicSiteEnabled: true,
    domainHttpsReadyAt: null,
    ...overrides,
  };
}

describe("probeHttpsReady", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("probes the festival's own host, not a sentinel label", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(probeHttpsReady(SLUG, APEX)).resolves.toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    // Per-host certificates mean only the real host has one to present.
    expect(url).toBe(`https://${HOST}/`);
    expect(init.method).toBe("HEAD");
  });

  it("returns false when the connection or handshake fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("certificate has expired")),
    );

    await expect(probeHttpsReady(SLUG, APEX)).resolves.toBe(false);
  });

  it("returns false for an empty domain without hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(probeHttpsReady(SLUG, "")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ensureFestivalDomainAttached", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no-ops to not-configured when Vercel env is absent", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(false);

    await expect(ensureFestivalDomainAttached(SLUG, APEX)).resolves.toEqual({
      status: "not-configured",
    });
    expect(mockAddDomainToProject).not.toHaveBeenCalled();
  });

  it("attaches the bare host with no wildcard prefix", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(true);
    mockAddDomainToProject.mockResolvedValue({ verified: true });
    mockCheckAttachStatus.mockResolvedValue({ status: "attached" });

    await ensureFestivalDomainAttached(SLUG, APEX);

    // A `*.` prefix would force DNS-01 validation, which is the whole reason
    // the wildcard path was abandoned.
    expect(mockAddDomainToProject).toHaveBeenCalledWith(HOST);
  });

  it("maps an attach failure to an error status instead of throwing", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(true);
    mockAddDomainToProject.mockRejectedValue(new Error("rate limited"));

    await expect(ensureFestivalDomainAttached(SLUG, APEX)).resolves.toEqual({
      status: "error",
      message: "rate limited",
    });
  });

  it("reports the post-attach status on success", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(true);
    mockAddDomainToProject.mockResolvedValue({ verified: true });
    mockCheckAttachStatus.mockResolvedValue({ status: "attached" });

    await expect(ensureFestivalDomainAttached(SLUG, APEX)).resolves.toEqual({
      status: "attached",
    });
  });
});

describe("detachFestivalDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips the API when automation is not configured", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(false);

    await detachFestivalDomain(SLUG, APEX);
    expect(mockRemoveProjectDomain).not.toHaveBeenCalled();
  });

  it("removes the festival's own host", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(true);
    mockRemoveProjectDomain.mockResolvedValue(undefined);

    await detachFestivalDomain(SLUG, APEX);
    expect(mockRemoveProjectDomain).toHaveBeenCalledWith(HOST);
  });

  it("swallows removal failures so a domain change is never blocked", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(true);
    mockRemoveProjectDomain.mockRejectedValue(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(detachFestivalDomain(SLUG, APEX)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

describe("syncFestivalDomainStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsVercelDomainsConfigured.mockReturnValue(true);
    mockAddDomainToProject.mockResolvedValue({ verified: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Probe outcome is the only thing distinguishing the late phases. */
  function stubProbe(ready: boolean) {
    vi.stubGlobal(
      "fetch",
      ready
        ? vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
        : vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );
  }

  it("returns error when the festival is missing", async () => {
    mockFindFestivalById.mockResolvedValue(null);

    const status = await syncFestivalDomainStatus("fest_1");
    expect(status.phase).toBe("error");
  });

  it("returns no-domain before a domain is saved", async () => {
    mockFindFestivalById.mockResolvedValue(festival());
    mockFindInstitutionById.mockResolvedValue(
      institution({ customDomain: null, verifiedAt: null }),
    );

    const status = await syncFestivalDomainStatus("fest_1");
    expect(status).toMatchObject({ phase: "no-domain", customDomain: null });
  });

  it("returns no-domain for a festival with no institution", async () => {
    mockFindFestivalById.mockResolvedValue(festival({ institutionId: null }));

    const status = await syncFestivalDomainStatus("fest_1");
    expect(status.phase).toBe("no-domain");
    expect(mockFindInstitutionById).not.toHaveBeenCalled();
  });

  it("returns awaiting-dns before verification, without probing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockFindFestivalById.mockResolvedValue(festival());
    mockFindInstitutionById.mockResolvedValue(
      institution({ verifiedAt: null }),
    );

    const status = await syncFestivalDomainStatus("fest_1");
    expect(status.phase).toBe("awaiting-dns");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("persists readiness on the festival the first time the probe succeeds", async () => {
    stubProbe(true);
    mockFindFestivalById.mockResolvedValue(festival());
    mockFindInstitutionById.mockResolvedValue(institution());
    mockMarkFestivalHttpsReady.mockResolvedValue({
      domainHttpsReadyAt: HTTPS_READY_AT,
    });

    const status = await syncFestivalDomainStatus("fest_1");

    expect(mockMarkFestivalHttpsReady).toHaveBeenCalledWith("fest_1");
    expect(status).toMatchObject({
      phase: "https-ready",
      httpsReadyAt: HTTPS_READY_AT,
    });
  });

  it("does not rewrite readiness when it is already set", async () => {
    stubProbe(true);
    mockFindFestivalById.mockResolvedValue(
      festival({ domainHttpsReadyAt: HTTPS_READY_AT }),
    );
    mockFindInstitutionById.mockResolvedValue(institution());

    const status = await syncFestivalDomainStatus("fest_1");

    expect(mockMarkFestivalHttpsReady).not.toHaveBeenCalled();
    expect(status.phase).toBe("https-ready");
  });

  it("clears readiness when a previously serving certificate stops", async () => {
    stubProbe(false);
    mockCheckAttachStatus.mockResolvedValue({ status: "attached" });
    mockFindFestivalById.mockResolvedValue(
      festival({ domainHttpsReadyAt: HTTPS_READY_AT }),
    );
    mockFindInstitutionById.mockResolvedValue(institution());

    const status = await syncFestivalDomainStatus("fest_1");

    expect(mockClearFestivalHttpsReady).toHaveBeenCalledWith("fest_1");
    expect(status.httpsReadyAt).toBeNull();
    expect(status.phase).toBe("provisioning");
  });

  it("keeps DNS verification intact when TLS is not ready", async () => {
    stubProbe(false);
    mockCheckAttachStatus.mockResolvedValue({ status: "attached" });
    mockFindFestivalById.mockResolvedValue(festival());
    mockFindInstitutionById.mockResolvedValue(institution());

    const status = await syncFestivalDomainStatus("fest_1");

    expect(status.verifiedAt).toBe(VERIFIED_AT);
    expect(status.phase).toBe("provisioning");
  });

  it("attaches on demand, which is what backfills festivals published before verification", async () => {
    stubProbe(false);
    mockCheckAttachStatus.mockResolvedValue({ status: "attached" });
    mockFindFestivalById.mockResolvedValue(festival());
    mockFindInstitutionById.mockResolvedValue(institution());

    await syncFestivalDomainStatus("fest_1");

    expect(mockAddDomainToProject).toHaveBeenCalledWith(HOST);
  });

  it("does not attach a host for a festival that is not published", async () => {
    stubProbe(false);
    mockFindFestivalById.mockResolvedValue(
      festival({ publicSiteEnabled: false }),
    );
    mockFindInstitutionById.mockResolvedValue(institution());

    const status = await syncFestivalDomainStatus("fest_1");

    expect(mockAddDomainToProject).not.toHaveBeenCalled();
    expect(status.phase).toBe("provisioning");
    expect(status.detail).toContain("public site");
  });

  it("reports manual-attach when Vercel automation is not configured", async () => {
    stubProbe(false);
    mockIsVercelDomainsConfigured.mockReturnValue(false);
    mockFindFestivalById.mockResolvedValue(festival());
    mockFindInstitutionById.mockResolvedValue(institution());

    const status = await syncFestivalDomainStatus("fest_1");

    expect(status.phase).toBe("manual-attach");
    expect(status.detail).toBeTruthy();
  });

  it("surfaces the provider's own records instead of dropping them", async () => {
    stubProbe(false);
    mockCheckAttachStatus.mockResolvedValue({
      status: "pending-verification",
      records: [
        { type: "txt", domain: "_vercel.ahlussuffa.in", value: "vc-domain=x" },
      ],
    });
    mockFindFestivalById.mockResolvedValue(festival());
    mockFindInstitutionById.mockResolvedValue(institution());

    const status = await syncFestivalDomainStatus("fest_1");

    // Dropping these is what let the screen spin forever with nothing to act on.
    expect(status.vercelVerification).toEqual([
      { type: "TXT", domain: "_vercel.ahlussuffa.in", value: "vc-domain=x" },
    ]);
  });
});
