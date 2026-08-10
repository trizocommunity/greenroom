import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindInstitutionById,
  mockMarkInstitutionHttpsReady,
  mockClearInstitutionHttpsReady,
  mockAddWildcardDomainToProject,
  mockCheckAttachStatus,
  mockIsVercelDomainsConfigured,
  mockRemoveProjectDomain,
} = vi.hoisted(() => ({
  mockFindInstitutionById: vi.fn(),
  mockMarkInstitutionHttpsReady: vi.fn(),
  mockClearInstitutionHttpsReady: vi.fn(),
  mockAddWildcardDomainToProject: vi.fn(),
  mockCheckAttachStatus: vi.fn(),
  mockIsVercelDomainsConfigured: vi.fn(),
  mockRemoveProjectDomain: vi.fn(),
}));

vi.mock("@/features/institutions/repositories/institution.repository", () => ({
  findInstitutionById: mockFindInstitutionById,
  markInstitutionHttpsReady: mockMarkInstitutionHttpsReady,
  clearInstitutionHttpsReady: mockClearInstitutionHttpsReady,
}));

vi.mock("@/features/institutions/services/vercel-domains.service", () => ({
  addWildcardDomainToProject: mockAddWildcardDomainToProject,
  checkAttachStatus: mockCheckAttachStatus,
  isVercelDomainsConfigured: mockIsVercelDomainsConfigured,
  removeProjectDomain: mockRemoveProjectDomain,
}));

import {
  detachWildcard,
  ensureWildcardAttached,
  probeHttpsReady,
  syncCustomDomainStatus,
} from "./custom-domain-provisioning.service";

const VERIFIED_AT = "2026-01-01T00:00:00.000Z";
const HTTPS_READY_AT = "2026-01-01T00:05:00.000Z";

/** Institution row shape as far as this service cares. */
function institution(overrides: Record<string, unknown> = {}) {
  return {
    id: "inst_1",
    customDomain: "ahlussuffa.in",
    verifiedAt: VERIFIED_AT,
    httpsReadyAt: null,
    ...overrides,
  };
}

describe("probeHttpsReady", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats any HTTP response as proof the TLS handshake worked", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(probeHttpsReady("ahlussuffa.in")).resolves.toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://_gr-tls-probe.ahlussuffa.in/");
    expect(init.method).toBe("HEAD");
  });

  it("returns false when the connection or handshake fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("certificate has expired")),
    );

    await expect(probeHttpsReady("ahlussuffa.in")).resolves.toBe(false);
  });

  it("returns false for an empty domain without hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(probeHttpsReady("")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ensureWildcardAttached", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no-ops to not-configured when Vercel env is absent", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(false);

    await expect(ensureWildcardAttached("ahlussuffa.in")).resolves.toEqual({
      status: "not-configured",
    });
    expect(mockAddWildcardDomainToProject).not.toHaveBeenCalled();
  });

  it("maps an attach failure to an error status instead of throwing", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(true);
    mockAddWildcardDomainToProject.mockRejectedValue(new Error("rate limited"));

    await expect(ensureWildcardAttached("ahlussuffa.in")).resolves.toEqual({
      status: "error",
      message: "rate limited",
    });
  });

  it("reports the post-attach status on success", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(true);
    mockAddWildcardDomainToProject.mockResolvedValue({ verified: true });
    mockCheckAttachStatus.mockResolvedValue({ status: "attached" });

    await expect(ensureWildcardAttached("ahlussuffa.in")).resolves.toEqual({
      status: "attached",
    });
  });
});

describe("detachWildcard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips the API when automation is not configured", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(false);

    await detachWildcard("ahlussuffa.in");
    expect(mockRemoveProjectDomain).not.toHaveBeenCalled();
  });

  it("swallows removal failures so a domain change is never blocked", async () => {
    mockIsVercelDomainsConfigured.mockReturnValue(true);
    mockRemoveProjectDomain.mockRejectedValue(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(detachWildcard("ahlussuffa.in")).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

describe("syncCustomDomainStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsVercelDomainsConfigured.mockReturnValue(true);
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

  it("returns error when the institution is missing", async () => {
    mockFindInstitutionById.mockResolvedValue(null);

    const status = await syncCustomDomainStatus("inst_1");
    expect(status.phase).toBe("error");
  });

  it("returns no-domain before a domain is saved", async () => {
    mockFindInstitutionById.mockResolvedValue(
      institution({ customDomain: null, verifiedAt: null }),
    );

    const status = await syncCustomDomainStatus("inst_1");
    expect(status).toMatchObject({ phase: "no-domain", customDomain: null });
  });

  it("returns awaiting-dns before verification, without probing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockFindInstitutionById.mockResolvedValue(
      institution({ verifiedAt: null }),
    );

    const status = await syncCustomDomainStatus("inst_1");
    expect(status.phase).toBe("awaiting-dns");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("persists httpsReadyAt the first time the probe succeeds", async () => {
    stubProbe(true);
    mockFindInstitutionById.mockResolvedValue(institution());
    mockMarkInstitutionHttpsReady.mockResolvedValue({
      httpsReadyAt: HTTPS_READY_AT,
    });

    const status = await syncCustomDomainStatus("inst_1");

    expect(mockMarkInstitutionHttpsReady).toHaveBeenCalledWith("inst_1");
    expect(status).toMatchObject({
      phase: "https-ready",
      httpsReadyAt: HTTPS_READY_AT,
    });
  });

  it("does not rewrite httpsReadyAt when it is already set", async () => {
    stubProbe(true);
    mockFindInstitutionById.mockResolvedValue(
      institution({ httpsReadyAt: HTTPS_READY_AT }),
    );

    const status = await syncCustomDomainStatus("inst_1");

    expect(mockMarkInstitutionHttpsReady).not.toHaveBeenCalled();
    expect(status.phase).toBe("https-ready");
  });

  it("clears httpsReadyAt when a previously serving certificate stops", async () => {
    stubProbe(false);
    mockCheckAttachStatus.mockResolvedValue({ status: "attached" });
    mockFindInstitutionById.mockResolvedValue(
      institution({ httpsReadyAt: HTTPS_READY_AT }),
    );

    const status = await syncCustomDomainStatus("inst_1");

    expect(mockClearInstitutionHttpsReady).toHaveBeenCalledWith("inst_1");
    expect(status.httpsReadyAt).toBeNull();
    expect(status.phase).toBe("provisioning");
  });

  it("keeps DNS verification intact when TLS is not ready", async () => {
    stubProbe(false);
    mockCheckAttachStatus.mockResolvedValue({ status: "attached" });
    mockFindInstitutionById.mockResolvedValue(institution());

    const status = await syncCustomDomainStatus("inst_1");

    expect(status.verifiedAt).toBe(VERIFIED_AT);
    expect(status.phase).toBe("provisioning");
  });

  it("reports manual-attach when Vercel automation is not configured", async () => {
    stubProbe(false);
    mockCheckAttachStatus.mockResolvedValue({ status: "not-configured" });
    mockFindInstitutionById.mockResolvedValue(institution());

    const status = await syncCustomDomainStatus("inst_1");

    expect(status.phase).toBe("manual-attach");
    expect(status.detail).toBeTruthy();
  });
});
