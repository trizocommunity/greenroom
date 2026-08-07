import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_KINDS } from "../types";

// Mock the EmailPreferencesService so we don't hit the DB.
const mockIsEnabled = vi.fn().mockResolvedValue(true);
const mockSetEnabled = vi.fn().mockResolvedValue(undefined);

vi.mock(
  "@/features/email-preferences/services/email-preferences.service",
  () => ({
    EmailPreferencesService: {
      isEnabled: (...args: unknown[]) => mockIsEnabled(...args),
      setEnabled: (...args: unknown[]) => mockSetEnabled(...args),
    },
  }),
);

// Mock Resend so the dev fallback path doesn't trigger network calls.
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
    },
  })),
}));

describe("sendEmail — global toggle", () => {
  beforeEach(() => {
    mockIsEnabled.mockReset();
    mockSetEnabled.mockReset();
    mockIsEnabled.mockResolvedValue(true);
    mockSetEnabled.mockResolvedValue(undefined);
  });

  // Cold-importing `../send` pulls in `@react-email/render` and the email
  // templates, which takes ~3s on a hot cache and ~4s on a cold one.
  // The default 5s vitest timeout is too tight under parallel-runner
  // load (the auth.test.ts better-auth constructor also slows things
  // down). Bump the timeout to 15s for the whole suite.
  it("returns kindDisabled result when toggle is off", async () => {
    mockIsEnabled.mockResolvedValue(false);
    const { sendEmail } = await import("../send");

    const result = await sendEmail({
      to: "x@example.com",
      kind: { kind: "sign_in_otp", otp: "1234", email: "x@example.com" },
    });

    expect("kindDisabled" in result).toBe(true);
    if ("kindDisabled" in result) {
      expect(result.id).toBe("skipped-sign_in_otp");
    }
  }, 15_000);

  it("proceeds to Resend when toggle is on", async () => {
    mockIsEnabled.mockResolvedValue(true);
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.EMAIL_FROM = "Greenroom <info@trizocreatives.in>";

    const { sendEmail } = await import("../send");
    const result = await sendEmail({
      to: "x@example.com",
      kind: { kind: "sign_in_otp", otp: "1234", email: "x@example.com" },
    });

    expect("kindDisabled" in result).toBe(false);
    expect("error" in result).toBe(false);
    expect("id" in result).toBe(true);
  });

  it("uses dev fallback when RESEND_API_KEY is unset (even with toggle on)", async () => {
    mockIsEnabled.mockResolvedValue(true);
    const prevKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendEmail } = await import("../send");

    const result = await sendEmail({
      to: "x@example.com",
      kind: { kind: "sign_in_otp", otp: "1234", email: "x@example.com" },
    });

    expect("id" in result).toBe(true);
    if ("id" in result && !("kindDisabled" in result)) {
      expect(result.id.startsWith("dev-")).toBe(true);
    }
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    if (prevKey) process.env.RESEND_API_KEY = prevKey;
  });

  it("dev fallback prints subject, recipients, and full text body", async () => {
    mockIsEnabled.mockResolvedValue(true);
    const prevKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendEmail } = await import("../send");

    await sendEmail({
      to: ["alice@example.com", "bob@example.com"],
      kind: { kind: "sign_in_otp", otp: "1234", email: "alice@example.com" },
    });

    const allWarned = warnSpy.mock.calls
      .map((call) => call.map((part) => String(part)).join(" "))
      .join("\n");

    expect(allWarned).toContain("[email:dev] would have sent");
    expect(allWarned).toContain("alice@example.com, bob@example.com");
    expect(allWarned).toContain("subject:");
    expect(allWarned).toMatch(/text \(\d+ chars\):/);
    expect(allWarned).toContain("─────────");

    warnSpy.mockRestore();
    if (prevKey) process.env.RESEND_API_KEY = prevKey;
  });
});

describe("EMAIL_KINDS registry", () => {
  it("contains exactly the 5 production kinds (ISSUE-42 PR C drops magic_link)", () => {
    expect(EMAIL_KINDS).toEqual([
      "sign_in_otp",
      "festival_invitation",
      "team_leader_otp",
      "two_factor_otp",
      "festival_expiring_soon",
    ]);
  });
});
