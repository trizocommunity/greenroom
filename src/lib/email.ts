import { Resend } from "resend";

// BUG-2 FIX: Resend-based email service.
// Set RESEND_API_KEY in your .env to enable. All sends are logged in dev.
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.EMAIL_FROM || "Greenroom <noreply@greenroom.app>";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://greenroom.app"
    : "http://localhost:3000");

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
): Promise<void> {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;

  if (!process.env.RESEND_API_KEY) {
    // Graceful fallback in dev: log the URL instead of silently swallowing it.
    console.warn(
      "[EMAIL] RESEND_API_KEY not set. Password reset URL (dev only):",
      resetUrl,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Reset your Greenroom password",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Outfit', sans-serif; background: #0a0a0a; color: #e5e7eb; padding: 40px;">
          <div style="max-width: 480px; margin: 0 auto; background: #111827; border-radius: 12px; padding: 40px; border: 1px solid #1f2937;">
            <h1 style="font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 8px;">
              Reset your password
            </h1>
            <p style="color: #9ca3af; margin-bottom: 24px; font-size: 15px;">
              Someone requested a password reset for your Greenroom account. 
              Click the button below to set a new password. This link expires in <strong style="color:#fff">1 hour</strong>.
            </p>
            <a href="${resetUrl}"
               style="display: inline-block; background: #7c3aed; color: #fff; text-decoration: none;
                      padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Reset Password
            </a>
            <p style="margin-top: 32px; color: #6b7280; font-size: 13px;">
              If you didn't request this, you can safely ignore this email.<br/>
              Your password won't change until you click the button above.
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
    // Log but don't leak the error to the client — forgotPasswordAction already returns vague success.
    console.error("[EMAIL] Failed to send password reset email:", error);
    throw new Error("Email delivery failed. Please try again later.");
  }
}
