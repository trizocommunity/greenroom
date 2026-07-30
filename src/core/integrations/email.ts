import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.EMAIL_FROM || "Greenroom <trizocommunity@gmail.com>";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://trizo-greenroom.vercel.app"
    : "http://localhost:3000");

export async function sendMagicLinkEmail(
  to: string,
  token: string,
): Promise<void> {
  const magicLinkUrl = `${BASE_URL}/login/verify/${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "[EMAIL] RESEND_API_KEY not set. Magic link (dev only):",
      magicLinkUrl,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Sign in to Greenroom",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Outfit', sans-serif; background: #0a0a0a; color: #e5e7eb; padding: 40px;">
          <div style="max-width: 480px; margin: 0 auto; background: #111827; border-radius: 12px; padding: 40px; border: 1px solid #1f2937;">
            <h1 style="font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 8px;">
              Sign in to Greenroom
            </h1>
            <p style="color: #9ca3af; margin-bottom: 24px; font-size: 15px;">
              Click the button below to sign in to your Greenroom account. This link expires in <strong style="color:#fff">15 minutes</strong>.
            </p>
            <a href="${magicLinkUrl}"
               style="display: inline-block; background: #d72626; color: #fff; text-decoration: none;
                      padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Sign In
            </a>
            <p style="margin-top: 32px; color: #6b7280; font-size: 13px;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #1f2937; margin: 32px 0;" />
            <p style="color: #374151; font-size: 12px;">
              Greenroom &mdash; Festival Management Platform
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("[EMAIL] Failed to send magic link email:", error);
    throw new Error("Email delivery failed. Please try again later.");
  }
}

export async function sendInvitationEmail(
  to: string,
  token: string,
  festivalName: string,
  role: string,
): Promise<void> {
  const inviteUrl = `${BASE_URL}/invite/${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "[EMAIL] RESEND_API_KEY not set. Invitation link (dev only):",
      inviteUrl,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to ${festivalName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Outfit', sans-serif; background: #0a0a0a; color: #e5e7eb; padding: 40px;">
          <div style="max-width: 480px; margin: 0 auto; background: #111827; border-radius: 12px; padding: 40px; border: 1px solid #1f2937;">
            <h1 style="font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 8px;">
              You've been invited
            </h1>
            <p style="color: #9ca3af; margin-bottom: 24px; font-size: 15px;">
              You've been invited to join <strong style="color:#fff">${festivalName}</strong> as <strong style="color:#fff">${role}</strong>.
            </p>
            <a href="${inviteUrl}"
               style="display: inline-block; background: #d72626; color: #fff; text-decoration: none;
                      padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Accept Invitation
            </a>
            <p style="margin-top: 32px; color: #6b7280; font-size: 13px;">
              This invitation expires in <strong style="color:#fff">48 hours</strong>.
            </p>
            <hr style="border: none; border-top: 1px solid #1f2937; margin: 32px 0;" />
            <p style="color: #374151; font-size: 12px;">
              Greenroom &mdash; Festival Management Platform
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("[EMAIL] Failed to send invitation email:", error);
    throw new Error("Email delivery failed. Please try again later.");
  }
}

export async function sendTeamLeaderOtpEmail(
  to: string,
  otpCode: string,
  festivalName: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "[EMAIL] RESEND_API_KEY not set. Team leader OTP (dev only):",
      otpCode,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${festivalName}: Team Leader login OTP`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Outfit', sans-serif; background: #0a0a0a; color: #e5e7eb; padding: 40px;">
          <div style="max-width: 480px; margin: 0 auto; background: #111827; border-radius: 12px; padding: 40px; border: 1px solid #1f2937;">
            <h1 style="font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 8px;">
              Team Leader Login
            </h1>
            <p style="color: #9ca3af; margin-bottom: 24px; font-size: 15px;">
              Use this OTP code to sign in to your Team Leader panel for <strong style="color:#fff">${festivalName}</strong>.
              This code expires in <strong style="color:#fff">10 minutes</strong>.
            </p>
            <div style="display:inline-block;background:#d72626;color:#fff;padding:10px 16px;border-radius:8px;font-weight:700;font-size:22px;letter-spacing:4px;">
              ${otpCode}
            </div>
            <p style="margin-top: 32px; color: #6b7280; font-size: 13px;">
              If you did not request this, you can ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[EMAIL] Failed to send team leader OTP (dev fallback):",
        error,
      );
      console.warn("[EMAIL] Team leader OTP code (dev only):", otpCode);
      return;
    }

    console.error("[EMAIL] Failed to send team leader OTP:", error);
    throw new Error(
      "OTP delivery failed. Verify RESEND domain/sender configuration.",
    );
  }
}

export async function sendPlainFestivalEmail(
  to: string,
  subject: string,
  message: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not set. Plain email (dev only):", {
      to,
      subject,
      message,
    });
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Outfit', sans-serif; background: #0a0a0a; color: #e5e7eb; padding: 40px;">
          <div style="max-width: 560px; margin: 0 auto; background: #111827; border-radius: 12px; padding: 32px; border: 1px solid #1f2937;">
            <h1 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 12px;">
              ${subject}
            </h1>
            <p style="color: #d1d5db; font-size: 14px; line-height: 1.6;">
              ${message}
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[EMAIL] Failed to send plain festival email (dev fallback):",
        error,
      );
      return;
    }
    throw new Error("Email delivery failed.");
  }
}
