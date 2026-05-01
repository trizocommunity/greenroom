type SendTeamLeaderOtpSmsParams = {
  toPhone: string;
  otpCode: string;
  festivalName: string;
};

/**
 * Sends OTP over SMS when SMS provider credentials are configured.
 * Returns true when SMS send is considered successful.
 * Returns false when SMS cannot be sent (missing config / provider failure).
 */
export async function sendTeamLeaderOtpSms({
  toPhone,
  otpCode,
  festivalName,
}: SendTeamLeaderOtpSmsParams): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !fromPhone) {
    // Dev-friendly fallback: treat as not sent so caller can fallback to email.
    console.warn("[SMS] Twilio config missing. Team leader OTP (dev only):", {
      toPhone,
      otpCode,
    });
    return false;
  }

  try {
    const body = new URLSearchParams();
    body.set("To", toPhone);
    body.set("From", fromPhone);
    body.set(
      "Body",
      `${festivalName}: Your Team Leader OTP is ${otpCode}. Expires in 10 minutes.`,
    );

    const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SMS] Failed to send Team Leader OTP:", errorText);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[SMS] Team Leader OTP send error:", error);
    return false;
  }
}
