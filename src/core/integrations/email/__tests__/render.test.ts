import { describe, expect, it } from "vitest";
import { renderEmail } from "../render";

describe("renderEmail — festival_invitation", () => {
  it("renders light theme with eyebrow + accept CTA", async () => {
    const result = await renderEmail({
      kind: "festival_invitation",
      token: "tok",
      festivalName: "Ahlussuffa IGS",
      role: "JUDGE",
    });
    expect(result.subject).toBe(
      "[Greenroom] You've been invited to Ahlussuffa IGS",
    );
    expect(result.html).toContain("Ahlussuffa IGS");
    expect(result.html).toContain("Accept Invitation");
    expect(result.html).toContain("rgb(247,248,250)"); // light canvas
    expect(result.html).toMatch(/invite\/tok/);
    expect(result.text).toContain("invite/tok");
  });

  it("Accept Invitation href is an absolute /invite/{token} URL (no festival slug)", async () => {
    const token = "1b6d5374-5d69-4838-901a-03400f34ae4e";
    const result = await renderEmail({
      kind: "festival_invitation",
      token,
      festivalName: "Test Fest",
      role: "STAGE_MANAGER",
    });
    // Button must point at /invite/{token}, never /dashboard/{slug}/...
    expect(result.html).toMatch(new RegExp(`href="[^"]*/invite/${token}"`));
    expect(result.html).not.toMatch(/href="[^"]*\/dashboard\/[^"]*invite/);
    expect(result.text).toContain(`/invite/${token}`);
  });

  it("does not render copy-link or share-via-email affordances", async () => {
    const result = await renderEmail({
      kind: "festival_invitation",
      token: "tok",
      festivalName: "Ahlussuffa IGS",
      role: "JUDGE",
    });
    expect(result.html).not.toContain("Or copy and share this invitation:");
    expect(result.html).not.toContain("Copy link");
    expect(result.html).not.toContain("Share via email");
    expect(result.html).not.toContain("mailto:?subject=");
  });
});

describe("renderEmail — team_leader_otp", () => {
  it("renders dark theme with OTP code prominent", async () => {
    const result = await renderEmail({
      kind: "team_leader_otp",
      otp: "482915",
      festivalName: "SUFFA MEHFIL 2026",
    });
    expect(result.subject).toContain("SUFFA MEHFIL 2026");
    expect(result.html).toContain("482915");
    expect(result.html).toContain("rgb(11,14,20)"); // dark canvas
    expect(result.text).toContain("482915");
  });
});

describe("renderEmail — festival_expiring_soon", () => {
  it("renders days-remaining + dashboard URL", async () => {
    const result = await renderEmail({
      kind: "festival_expiring_soon",
      festivalName: "Suffa Mehfil",
      daysRemaining: 7,
      expiresOn: "2026-08-08",
      dashboardUrl: "https://greenroomm.vercel.app/dashboard/suffa-mehfil",
    });
    expect(result.subject).toBe("[Greenroom] Suffa Mehfil expires in 7 days");
    expect(result.html).toContain("Suffa Mehfil");
    expect(result.html).toContain("Open Dashboard");
    expect(result.html).toContain("dashboard/suffa-mehfil");
    expect(result.text).toContain("7 days");
  });

  it("singular 'day' for daysRemaining=1", async () => {
    const result = await renderEmail({
      kind: "festival_expiring_soon",
      festivalName: "X",
      daysRemaining: 1,
      expiresOn: "2026-08-01",
      dashboardUrl: "https://example.com/dashboard/x",
    });
    expect(result.subject).toBe("[Greenroom] X expires in 1 day");
    expect(result.html).toContain("1 day"); // singular, not "1 days"
  });
});

describe("renderEmail — two_factor_otp", () => {
  it("renders dark theme with OTP code prominent + email address", async () => {
    const result = await renderEmail({
      kind: "two_factor_otp",
      otp: "847201",
      email: "alice@example.com",
    });
    expect(result.subject).toBe("[Greenroom] Your sign-in verification code");
    expect(result.html).toContain("847201");
    expect(result.html).toContain("alice@example.com");
    expect(result.html).toContain("rgb(11,14,20)"); // dark canvas
    expect(result.text).toContain("847201");
  });

  it("respects expiresInMinutes override", async () => {
    const result = await renderEmail({
      kind: "two_factor_otp",
      otp: "123456",
      email: "alice@example.com",
      expiresInMinutes: 10,
    });
    expect(result.html).toContain("10 minutes");
  });
});

describe("renderEmail — sign_in_otp (ISSUE-42)", () => {
  it("renders dark theme with 4-digit OTP code prominent + email address", async () => {
    const result = await renderEmail({
      kind: "sign_in_otp",
      otp: "4821",
      email: "alice@example.com",
    });
    expect(result.subject).toBe("[Greenroom] Your sign-in code");
    expect(result.html).toContain("4821");
    expect(result.html).toContain("alice@example.com");
    expect(result.html).toContain("rgb(11,14,20)"); // dark canvas
    expect(result.text).toContain("4821");
  });

  it("default 5-minute expiry copy", async () => {
    const result = await renderEmail({
      kind: "sign_in_otp",
      otp: "0123",
      email: "alice@example.com",
    });
    expect(result.html).toContain("5 minutes");
  });

  it("respects expiresInMinutes override", async () => {
    const result = await renderEmail({
      kind: "sign_in_otp",
      otp: "1234",
      email: "alice@example.com",
      expiresInMinutes: 10,
    });
    expect(result.html).toContain("10 minutes");
  });
});
