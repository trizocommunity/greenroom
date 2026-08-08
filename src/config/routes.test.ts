import { afterEach, describe, expect, it } from "vitest";
import { buildInviteUrl, getAppBaseUrl } from "./routes";

describe("getAppBaseUrl / buildInviteUrl", () => {
  const prevAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const prevVercel = process.env.VERCEL_URL;

  afterEach(() => {
    if (prevAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prevAppUrl;
    if (prevVercel === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = prevVercel;
  });

  it("strips trailing slashes from NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com/";
    expect(getAppBaseUrl()).toBe("https://example.com");
  });

  it("builds /invite/{token} with no festival slug", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    const token = "abc-123";
    expect(buildInviteUrl(token)).toBe("https://example.com/invite/abc-123");
  });

  it("encodes unsafe token characters", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(buildInviteUrl("a/b?c")).toBe(
      "http://localhost:3000/invite/a%2Fb%3Fc",
    );
  });

  it("throws when token is empty", () => {
    expect(() => buildInviteUrl("  ")).toThrow(/token is required/);
  });
});
