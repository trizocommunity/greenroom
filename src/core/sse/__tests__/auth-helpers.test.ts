import "server-only";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the dependencies BEFORE importing the module under test.
const mockGetSessionFromHeaders = vi.fn();
const mockGetStagePortalSessionFromCookie = vi.fn();
const mockProgrammeFindFirst = vi.fn();
const mockFestivalFindFirst = vi.fn();

vi.mock("@/core/auth/session", () => ({
  getSessionFromHeaders: (...args: unknown[]) =>
    mockGetSessionFromHeaders(...args),
}));

vi.mock("@/core/auth/stage-portal-session", () => ({
  getStagePortalSessionFromCookie: (...args: unknown[]) =>
    mockGetStagePortalSessionFromCookie(...args),
}));

vi.mock("@/core/database/client", () => ({
  db: {
    query: {
      programme: {
        findFirst: (...args: unknown[]) => mockProgrammeFindFirst(...args),
      },
      festival: {
        findFirst: (...args: unknown[]) => mockFestivalFindFirst(...args),
      },
    },
  },
}));

vi.mock("server-only", () => ({}));

import {
  requireAdminOrStagePortal,
  requireAdminSession,
  requirePublicFestivalEnabled,
  requireSuperAdmin,
} from "../auth-helpers";

const REQ = new Request("http://localhost/test");

beforeEach(() => {
  mockGetSessionFromHeaders.mockReset();
  mockGetStagePortalSessionFromCookie.mockReset();
  mockProgrammeFindFirst.mockReset();
  mockFestivalFindFirst.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requireAdminSession", () => {
  it("returns 401 when there is no admin session", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(null);
    const res = await requireAdminSession(REQ);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
    expect(await res?.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  it("returns null (allow) when there is a session", async () => {
    mockGetSessionFromHeaders.mockResolvedValue({
      userId: "u1",
      role: "ADMIN",
    });
    const res = await requireAdminSession(REQ);
    expect(res).toBeNull();
  });
});

describe("requireSuperAdmin", () => {
  it("returns 401 when there is no session at all", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(null);
    const res = await requireSuperAdmin(REQ);
    expect(res?.status).toBe(401);
  });

  it("returns 403 when the session is admin but not super-admin", async () => {
    mockGetSessionFromHeaders.mockResolvedValue({
      userId: "u1",
      role: "ADMIN",
    });
    const res = await requireSuperAdmin(REQ);
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: "FORBIDDEN" });
  });

  it("returns null (allow) when the session is super-admin", async () => {
    mockGetSessionFromHeaders.mockResolvedValue({
      userId: "u1",
      role: "SUPER_ADMIN",
    });
    const res = await requireSuperAdmin(REQ);
    expect(res).toBeNull();
  });
});

describe("requireAdminOrStagePortal", () => {
  it("returns 401 when neither admin nor stage-portal session is present", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(null);
    mockGetStagePortalSessionFromCookie.mockResolvedValue(null);
    const res = await requireAdminOrStagePortal(REQ, "p1");
    expect(res?.status).toBe(401);
  });

  it("returns null (allow) when the admin session is present", async () => {
    mockGetSessionFromHeaders.mockResolvedValue({
      userId: "u1",
      role: "ADMIN",
    });
    mockGetStagePortalSessionFromCookie.mockResolvedValue(null);
    const res = await requireAdminOrStagePortal(REQ, "p1");
    expect(res).toBeNull();
  });

  it("returns null (allow) when the stage-portal session matches the programme's festival", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(null);
    mockGetStagePortalSessionFromCookie.mockResolvedValue({
      festivalId: "f1",
      programmeId: "p1",
    });
    mockProgrammeFindFirst.mockResolvedValue({
      id: "p1",
      festivalId: "f1",
    });
    const res = await requireAdminOrStagePortal(REQ, "p1");
    expect(res).toBeNull();
  });

  it("returns 403 when the stage-portal session is scoped to a different festival", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(null);
    mockGetStagePortalSessionFromCookie.mockResolvedValue({
      festivalId: "f2",
      programmeId: "p1",
    });
    mockProgrammeFindFirst.mockResolvedValue({
      id: "p1",
      festivalId: "f1",
    });
    const res = await requireAdminOrStagePortal(REQ, "p1");
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: "FORBIDDEN" });
  });

  it("returns 404 when the programme does not exist", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(null);
    mockGetStagePortalSessionFromCookie.mockResolvedValue({
      festivalId: "f1",
      programmeId: "p1",
    });
    mockProgrammeFindFirst.mockResolvedValue(null);
    const res = await requireAdminOrStagePortal(REQ, "p1");
    expect(res?.status).toBe(404);
  });
});

describe("requirePublicFestivalEnabled", () => {
  it("returns 404 when the festival does not exist", async () => {
    mockFestivalFindFirst.mockResolvedValue(null);
    const res = await requirePublicFestivalEnabled("f1");
    expect(res?.status).toBe(404);
  });

  it("returns 403 when the festival exists but is not publicly enabled and not expired", async () => {
    mockFestivalFindFirst.mockResolvedValue({
      publicSiteEnabled: false,
      status: "ACTIVE",
    });
    const res = await requirePublicFestivalEnabled("f1");
    expect(res?.status).toBe(403);
  });

  it("returns null (allow) when the festival is publicly enabled", async () => {
    mockFestivalFindFirst.mockResolvedValue({
      publicSiteEnabled: true,
      status: "ACTIVE",
    });
    const res = await requirePublicFestivalEnabled("f1");
    expect(res).toBeNull();
  });

  it("returns null (allow) when the festival is expired even if not publicly enabled", async () => {
    mockFestivalFindFirst.mockResolvedValue({
      publicSiteEnabled: false,
      status: "EXPIRED",
    });
    const res = await requirePublicFestivalEnabled("f1");
    expect(res).toBeNull();
  });
});
