import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCookieGet = vi.fn();
const mockCookieDelete = vi.fn();
const mockCookies = vi.fn(async () => ({
  get: mockCookieGet,
  delete: mockCookieDelete,
}));

const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

vi.mock("@/core/database/client", () => ({
  db: {
    select: ((...args: unknown[]) =>
      (mockSelect as unknown as (...a: unknown[]) => unknown)(
        ...args,
      )) as unknown as (...args: unknown[]) => unknown,
  },
}));

vi.mock("@/core/database/schema", () => ({
  user: { id: "id" },
}));

vi.mock("drizzle-orm", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    ...actual,
    eq: (...args: unknown[]) => ({ op: "eq", args }),
  };
});

import { deleteSession, encrypt, getSession } from "./session";

async function signCookie(
  userId: string,
  role: "USER" | "SUPER_ADMIN" = "USER",
) {
  return encrypt({
    userId,
    role,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

beforeEach(() => {
  mockCookieGet.mockReset();
  mockCookieDelete.mockReset();
  mockSelect.mockClear();
  mockFrom.mockClear();
  mockWhere.mockClear();
  mockLimit.mockReset();
});

describe("getSession", () => {
  it("returns null when there is no session cookie", async () => {
    mockCookieGet.mockReturnValueOnce(undefined);

    const result = await getSession();

    expect(result).toBeNull();
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockCookieDelete).not.toHaveBeenCalled();
  });

  it("returns null when the JWT is invalid", async () => {
    mockCookieGet.mockReturnValueOnce({ value: "not-a-valid-jwt" });

    const result = await getSession();

    expect(result).toBeNull();
    expect(mockCookieDelete).not.toHaveBeenCalled();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("returns the session payload when the cookie and user row are both valid", async () => {
    const token = await signCookie("user-1");
    mockCookieGet.mockReturnValueOnce({ value: token });
    mockLimit.mockResolvedValueOnce([{ id: "user-1" }]);

    const result = await getSession();

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-1");
    expect(mockSelect).toHaveBeenCalled();
    expect(mockCookieDelete).not.toHaveBeenCalled();
  });

  it("returns null and clears the cookie when the user row no longer exists", async () => {
    const token = await signCookie("ghost-user");
    mockCookieGet.mockReturnValueOnce({ value: token });
    mockLimit.mockResolvedValueOnce([]);

    const result = await getSession();

    expect(result).toBeNull();
    expect(mockSelect).toHaveBeenCalled();
    expect(mockCookieDelete).toHaveBeenCalledWith("session");
  });
});

describe("deleteSession", () => {
  it("clears the session cookie", async () => {
    await deleteSession();
    expect(mockCookieDelete).toHaveBeenCalledWith("session");
  });
});
