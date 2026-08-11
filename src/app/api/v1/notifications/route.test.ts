import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: the participant portal authenticates with a `participant_session`
 * cookie, NOT a Better Auth admin session. These routes previously used
 * `createProtectedHandler`, which requires `ctx.user` (admin session) and so
 * returned 401 UNAUTHORIZED to every logged-in participant BEFORE the handler
 * body — and its participant-aware authz — ever ran. The 401 then tripped the
 * axios interceptor's `window.location.href = "/login"`, producing the
 * login <-> participant page redirect loop.
 *
 * These routes must use `createHandler` and delegate authz to
 * `assertParticipantNotificationAccess`. Two properties are load-bearing:
 *   1. an authorized participant (no admin session) gets 200, and
 *   2. an UNauthorized caller gets a non-401 4xx (AppError -> 400), so the
 *      client never enters the redirect loop.
 */

const { getSessionFromHeaders } = vi.hoisted(() => ({
  getSessionFromHeaders: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/core/auth/session", () => ({ getSessionFromHeaders }));

const { assertParticipantNotificationAccess } = vi.hoisted(() => ({
  assertParticipantNotificationAccess: vi.fn(),
}));
vi.mock("@/features/programmes/actions/reporting-access", () => ({
  assertParticipantNotificationAccess,
}));

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/core/database/client", () => ({
  db: { query: { programmeNotification: { findMany } } },
}));
vi.mock("@/core/database/schema", () => ({
  programmeNotification: { recipientParticipantId: {}, createdAt: {} },
}));

// AppError is what `assertParticipantNotificationAccess` throws when the caller
// is neither an authorized admin nor the owning participant.
class AppError extends Error {
  constructor(
    message: string,
    public code = "APP_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}
vi.mock("@/core/errors/errors", () => ({
  AppError,
  ERROR_MESSAGES: { DEFAULT: "boom", FORBIDDEN: "forbidden" },
}));

const PARTICIPANT_ID = "abfc6cf4-41b0-4000-8000-000000000000";
const notificationsUrl = `https://zenoraev.example.in/api/v1/notifications?participantId=${PARTICIPANT_ID}`;

describe("GET /api/v1/notifications — participant session, no admin session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionFromHeaders.mockResolvedValue(null);
    findMany.mockResolvedValue([]);
  });

  it("serves a logged-in participant (200) and runs the participant authz check", async () => {
    assertParticipantNotificationAccess.mockResolvedValue({
      id: PARTICIPANT_ID,
      festivalId: "fest-1",
      groupId: "grp-1",
    });
    const { GET } = await import("./route");

    const res = await GET(new Request(notificationsUrl));
    const body = await res.json();

    expect(assertParticipantNotificationAccess).toHaveBeenCalledWith(
      PARTICIPANT_ID,
    );
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("rejects an unauthorized caller WITHOUT a 401 (so no login redirect loop)", async () => {
    assertParticipantNotificationAccess.mockRejectedValue(
      new AppError("forbidden", "FORBIDDEN"),
    );
    const { GET } = await import("./route");

    const res = await GET(new Request(notificationsUrl));
    const body = await res.json();

    // The interceptor only redirects on 401; an AppError surfaces as 400.
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });
});
