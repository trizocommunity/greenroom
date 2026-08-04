import { describe, expect, it } from "vitest";
import { renderEmail } from "../render";

describe("renderEmail — magic_link", () => {
  it("renders dark theme with brand CTA + verify URL", async () => {
    const result = await renderEmail({
      kind: "magic_link",
      token: "abc123",
    });
    expect(result.subject).toBe("[Greenroom] Your sign-in link");
    expect(result.html).toContain("Sign in to Greenroom");
    expect(result.html).toContain("rgb(11,14,20)"); // dark canvas
    expect(result.html).toContain("rgb(239,68,68)"); // dark brand
    expect(result.html).toMatch(/login\/verify\/abc123/);
    expect(result.text).toContain("login/verify/abc123");
  });

  it("renders a copyable URL block + copy button + share-via-email mailto link", async () => {
    const result = await renderEmail({
      kind: "magic_link",
      token: "abc123",
    });
    // Helper text + copy button + brand-coloured share link
    expect(result.html).toContain("Or copy and share this link:");
    expect(result.html).toContain("Copy link");
    expect(result.html).toContain("Share via email");
    // mailto: subject + URL pre-filled, encoded
    expect(result.html).toContain(
      "mailto:?subject=Greenroom%20sign-in%20link",
    );
    expect(result.html).toContain(encodeURIComponent("login/verify/abc123"));
    // Full URL appears as selectable text inside the styled block (not just href)
    expect(result.html).toContain("https://");
    expect(result.html).toContain("login/verify/abc123");
    // Plain-text fallback also carries the URL so copy works in plain-text clients
    expect(result.text).toContain("login/verify/abc123");
  });

  it("respects expiresInMinutes override", async () => {
    const result = await renderEmail({
      kind: "magic_link",
      token: "x",
      expiresInMinutes: 5,
    });
    expect(result.text).toContain("5 minutes");
  });

  it("theme override switches to light palette", async () => {
    const light = await renderEmail(
      { kind: "magic_link", token: "x" },
      "light",
    );
    // Light canvas hex is #f7f8fa.
    expect(
      light.html.includes("rgb(247,248,250)") || light.html.includes("#f7f8fa"),
    ).toBe(true);
    expect(light.html).not.toContain("rgb(11,14,20)");
    // Light brand hex is #d72626.
    expect(
      light.html.includes("rgb(215,38,38)") || light.html.includes("#d72626"),
    ).toBe(true);
  });

  it("default magic_link renders dark", async () => {
    const dark = await renderEmail({ kind: "magic_link", token: "x" });
    expect(dark.html).toContain("rgb(11,14,20)");
    expect(dark.html).not.toContain("rgb(247,248,250)");
  });
});

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
  });

  it("renders a copyable invite URL block + copy button + share-via-email mailto link", async () => {
    const result = await renderEmail({
      kind: "festival_invitation",
      token: "tok",
      festivalName: "Ahlussuffa IGS",
      role: "JUDGE",
    });
    expect(result.html).toContain("Or copy and share this invitation:");
    expect(result.html).toContain("Copy link");
    expect(result.html).toContain("Share via email");
    expect(result.html).toContain(
      "mailto:?subject=Invitation%20to%20Ahlussuffa%20IGS%20on%20Greenroom",
    );
    expect(result.html).toContain(encodeURIComponent("invite/tok"));
    expect(result.text).toContain("invite/tok");
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
