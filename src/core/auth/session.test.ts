import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHeaders = vi.fn(async () => new Headers());
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();
const mockCreateVerificationOTP = vi.fn();
const mockSignInEmailOTP = vi.fn();
const mockUserFindFirst = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

vi.mock("@/core/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      createVerificationOTP: (...args: unknown[]) =>
        mockCreateVerificationOTP(...args),
      signInEmailOTP: (...args: unknown[]) => mockSignInEmailOTP(...args),
    },
  },
}));

vi.mock("@/core/database/client", () => ({
  db: {
    query: {
      user: {
        findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
      },
    },
  },
}));

vi.mock("@/core/database/schema", () => ({
  user: { id: "id" },
}));

import {
  appendSetCookieHeaders,
  createSession,
  decrypt,
  deleteSession,
  getSession,
  signInUserByEmail,
} from "./session";

beforeEach(() => {
  mockHeaders.mockClear();
  mockGetSession.mockReset();
  mockSignOut.mockReset();
  mockCreateVerificationOTP.mockReset();
  mockSignInEmailOTP.mockReset();
  mockUserFindFirst.mockReset();
});

describe("getSession — adapter over Better Auth", () => {
  it("returns null when Better Auth reports no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await getSession();

    expect(result).toBeNull();
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockGetSession.mock.calls[0]?.[0]).toMatchObject({
      headers: expect.any(Headers),
    });
  });

  it("maps a Better Auth session to the legacy SessionPayload shape", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: {
        id: "user-1",
        email: "alice@example.com",
        name: "Alice",
        emailVerified: true,
        globalRole: "USER",
      },
      session: {
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        token: "tok",
      },
    });

    const result = await getSession();

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-1");
    expect(result?.role).toBe("USER");
    expect(result?.expires).toBeInstanceOf(Date);
  });

  it("maps SUPER_ADMIN correctly", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: {
        id: "user-2",
        email: "admin@example.com",
        name: "Admin",
        emailVerified: true,
        globalRole: "SUPER_ADMIN",
      },
      session: {
        id: "session-2",
        userId: "user-2",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        token: "tok",
      },
    });

    const result = await getSession();

    expect(result?.role).toBe("SUPER_ADMIN");
  });

  it("defaults the role to USER when globalRole is missing", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: {
        id: "user-3",
        email: "carol@example.com",
        name: "Carol",
        emailVerified: true,
      },
      session: {
        id: "session-3",
        userId: "user-3",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        token: "tok",
      },
    });

    const result = await getSession();

    expect(result?.role).toBe("USER");
  });
});

describe("deleteSession — delegates to Better Auth signOut", () => {
  it("calls auth.api.signOut with the request headers", async () => {
    mockSignOut.mockResolvedValueOnce({ success: true });

    await deleteSession();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut.mock.calls[0]?.[0]).toMatchObject({
      headers: expect.any(Headers),
    });
  });
});

describe("createSession — backwards-compat shim", () => {
  it("looks up the user by id and delegates to signInUserByEmail", async () => {
    mockUserFindFirst.mockResolvedValueOnce({ email: "alice@example.com" });
    mockCreateVerificationOTP.mockResolvedValueOnce("1234");
    mockSignInEmailOTP.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await createSession("user-1", "USER");

    expect(mockCreateVerificationOTP).toHaveBeenCalledTimes(1);
    expect(mockSignInEmailOTP).toHaveBeenCalledTimes(1);
  });

  it("throws when the user has no email", async () => {
    mockUserFindFirst.mockResolvedValueOnce(null);

    await expect(createSession("ghost", "USER")).rejects.toThrow(
      /has no email/,
    );
  });
});

describe("signInUserByEmail — silent session mint (ISSUE-42)", () => {
  it("mints an OTP via createVerificationOTP and consumes it via signInEmailOTP", async () => {
    mockCreateVerificationOTP.mockResolvedValueOnce("9876");
    const fakeResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Set-Cookie": "better-auth.session_token=abc; Path=/" },
    });
    mockSignInEmailOTP.mockResolvedValueOnce(fakeResponse);

    const result = await signInUserByEmail("  Bob@Example.COM ");

    expect(result).toBe(fakeResponse);
    expect(mockCreateVerificationOTP).toHaveBeenCalledTimes(1);
    const createBody = mockCreateVerificationOTP.mock.calls[0]?.[0]?.body;
    expect(createBody).toEqual({
      email: "bob@example.com",
      type: "sign-in",
    });

    expect(mockSignInEmailOTP).toHaveBeenCalledTimes(1);
    const signInArgs = mockSignInEmailOTP.mock.calls[0]?.[0];
    expect(signInArgs?.body).toEqual({
      email: "bob@example.com",
      otp: "9876",
    });
    expect(signInArgs?.asResponse).toBe(true);
  });

  it("throws when createVerificationOTP returns an unexpected shape", async () => {
    mockCreateVerificationOTP.mockResolvedValueOnce({ wrong: "shape" });

    await expect(signInUserByEmail("ghost@example.com")).rejects.toThrow(
      /unexpected shape/,
    );
  });

  it("throws when signInEmailOTP returns a non-OK response", async () => {
    mockCreateVerificationOTP.mockResolvedValueOnce("9876");
    mockSignInEmailOTP.mockResolvedValueOnce(
      new Response("nope", { status: 401 }),
    );

    await expect(signInUserByEmail("bob@example.com")).rejects.toThrow(
      /signInEmailOTP failed/,
    );
  });
});

describe("decrypt — deprecated", () => {
  it("returns null (the JWT path is gone)", async () => {
    await expect(decrypt("any-token")).resolves.toBeNull();
  });
});

describe("appendSetCookieHeaders", () => {
  it("forwards getSetCookie() values onto the target response", () => {
    const target = {
      headers: { append: vi.fn() },
    };
    const source = new Headers();
    // Undici/Node Headers exposes getSetCookie for multi Set-Cookie.
    const withCookies = source as Headers & {
      getSetCookie: () => string[];
    };
    withCookies.getSetCookie = () => [
      "a=1; Path=/",
      "b=2; Path=/",
    ];

    appendSetCookieHeaders(target as never, withCookies);

    expect(target.headers.append).toHaveBeenCalledWith("Set-Cookie", "a=1; Path=/");
    expect(target.headers.append).toHaveBeenCalledWith("Set-Cookie", "b=2; Path=/");
  });
});
