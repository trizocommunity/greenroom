import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHeaders = vi.fn(async () => new Headers());
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();
const mockSignInMagicLink = vi.fn();
const mockMagicLinkVerify = vi.fn();
const mockUserFindFirst = vi.fn();
const mockVerificationSelect = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

vi.mock("@/core/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      signInMagicLink: (...args: unknown[]) => mockSignInMagicLink(...args),
      magicLinkVerify: (...args: unknown[]) => mockMagicLinkVerify(...args),
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
    select: (...args: unknown[]) => mockVerificationSelect(...args),
  },
}));

vi.mock("@/core/database/schema", () => ({
  user: { id: "id" },
  verification: { identifier: "identifier", value: "value", createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return actual;
});

import {
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
  mockSignInMagicLink.mockReset();
  mockMagicLinkVerify.mockReset();
  mockUserFindFirst.mockReset();
  mockVerificationSelect.mockReset();
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
    mockSignInMagicLink.mockResolvedValueOnce({ status: true });
    mockVerificationSelect.mockReturnValueOnce({
      from: () => ({
        orderBy: () => ({
          limit: () => ({
            [Symbol.iterator]: function* () {
              yield {
                identifier: "tok-1",
                value: JSON.stringify({ email: "alice@example.com" }),
                createdAt: new Date(),
              };
            },
            [Symbol.asyncIterator]: async function* () {
              yield {
                identifier: "tok-1",
                value: JSON.stringify({ email: "alice@example.com" }),
                createdAt: new Date(),
              };
            },
            then: (resolve: (v: unknown) => void) =>
              resolve([
                {
                  identifier: "tok-1",
                  value: JSON.stringify({ email: "alice@example.com" }),
                  createdAt: new Date(),
                },
              ]),
          }),
        }),
      }),
    });
    mockMagicLinkVerify.mockResolvedValueOnce({ redirect: true });

    await createSession("user-1", "USER");

    expect(mockSignInMagicLink).toHaveBeenCalledTimes(1);
    expect(mockMagicLinkVerify).toHaveBeenCalledTimes(1);
  });

  it("throws when the user has no email", async () => {
    mockUserFindFirst.mockResolvedValueOnce(null);

    await expect(createSession("ghost", "USER")).rejects.toThrow(
      /has no email/,
    );
  });
});

describe("signInUserByEmail — silent session mint", () => {
  it("emits a verification row and consumes it via magicLinkVerify", async () => {
    mockSignInMagicLink.mockResolvedValueOnce({ status: true });
    mockVerificationSelect.mockReturnValueOnce({
      from: () => ({
        orderBy: () => ({
          limit: () =>
            Promise.resolve([
              {
                identifier: "tok-2",
                value: JSON.stringify({ email: "bob@example.com" }),
                createdAt: new Date(),
              },
            ]),
        }),
      }),
    });
    mockMagicLinkVerify.mockResolvedValueOnce({ redirect: true });

    await signInUserByEmail("  Bob@Example.COM ");

    expect(mockSignInMagicLink).toHaveBeenCalledTimes(1);
    const body = mockSignInMagicLink.mock.calls[0]?.[0]?.body;
    expect(body?.email).toBe("bob@example.com");
    expect(mockMagicLinkVerify).toHaveBeenCalledTimes(1);
    const query = mockMagicLinkVerify.mock.calls[0]?.[0]?.query;
    expect(query?.token).toBe("tok-2");
  });

  it("throws when no verification row can be located", async () => {
    mockSignInMagicLink.mockResolvedValueOnce({ status: true });
    mockVerificationSelect.mockReturnValueOnce({
      from: () => ({
        orderBy: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });

    await expect(signInUserByEmail("ghost@example.com")).rejects.toThrow(
      /no verification row/,
    );
  });
});

describe("decrypt — deprecated", () => {
  it("returns null (the JWT path is gone)", async () => {
    await expect(decrypt("any-token")).resolves.toBeNull();
  });
});
