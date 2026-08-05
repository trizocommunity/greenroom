import { describe, expect, it, vi } from "vitest";
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
    // Should point at Better Auth's catch-all verify endpoint, not the
    // deleted `/login/verify/[token]` page. Default callbackURL is
    // `/profile` (matches BetterAuthMagicLinkRequestForm). HTML output
    // HTML-encodes the `&` between query params, so look for `&amp;`.
    expect(result.html).toMatch(
      /api\/auth\/magic-link\/verify\?token=abc123&amp;callbackURL=%2Fprofile/,
    );
    expect(result.text).toContain(
      "api/auth/magic-link/verify?token=abc123&callbackURL=%2Fprofile",
    );
  });

  it("never emits a double slash even when NEXT_PUBLIC_APP_URL ends with /", async () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://greenroomm.vercel.app/";
    vi.resetModules();
    try {
      const { renderEmail: renderFresh } = await import("../render");
      const result = await renderFresh({ kind: "magic_link", token: "abc123" });
      expect(result.html).not.toMatch(/\/\/api\/auth\/magic-link\/verify/);
      expect(result.text).not.toMatch(/\/\/api\/auth\/magic-link\/verify/);
      expect(result.html).toContain(
        "https://greenroomm.vercel.app/api/auth/magic-link/verify?token=abc123&amp;callbackURL=%2Fprofile",
      );
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous;
      vi.resetModules();
    }
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
    // mailto: subject + URL pre-filled, encoded (the mailto body is
    // double-encoded: the `&` in the URL body becomes `%26`).
    expect(result.html).toContain("mailto:?subject=Greenroom%20sign-in%20link");
    expect(result.html).toContain(
      encodeURIComponent(
        "api/auth/magic-link/verify?token=abc123&callbackURL=%2Fprofile",
      ),
    );
    // Full URL appears as selectable text inside the styled block (not just href).
    // HTML output uses `&amp;` in attribute values; the visible rendered text
    // (output below the button) shows the raw `&`, which is what copy-paste
    // and the mailto body both use.
    expect(result.html).toContain("https://");
    expect(result.html).toContain(
      "api/auth/magic-link/verify?token=abc123&amp;callbackURL=%2Fprofile",
    );
    expect(result.text).toContain(
      "api/auth/magic-link/verify?token=abc123&callbackURL=%2Fprofile",
    );
  });

  it("respects expiresInMinutes override", async () => {
    const result = await renderEmail({
      kind: "magic_link",
      token: "x",
      expiresInMinutes: 5,
    });
    expect(result.text).toContain("5 minutes");
  });

  it("forwards a custom callbackURL into the verify URL", async () => {
    const result = await renderEmail({
      kind: "magic_link",
      token: "tok",
      callbackURL: "/festival/suffa",
    });
    expect(result.html).toMatch(
      /api\/auth\/magic-link\/verify\?token=tok&amp;callbackURL=%2Ffestival%2Fsuffa/,
    );
    expect(result.text).toContain(
      "api/auth/magic-link/verify?token=tok&callbackURL=%2Ffestival%2Fsuffa",
    );
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
