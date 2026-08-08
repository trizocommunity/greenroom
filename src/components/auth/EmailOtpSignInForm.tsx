"use client";

import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { ArrowRight, Loader2, Mail, RotateCw } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuthLayout } from "@/components/auth/AuthLayout";
import { ErrorScopeProvider, InlineError } from "@/components/errors";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signIn, useSession } from "@/core/auth/better-auth/client";
import { toast } from "@/lib/toast";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type EmailFormData = z.infer<typeof emailSchema>;

const OTP_LENGTH = 4;

/**
 * Send a fresh sign-in OTP. Resolves when the server has accepted the
 * request (the email may still be in flight). Throws on hard errors
 * (rate-limited, network down) for the caller to surface — Better Auth
 * failure shapes are normalised to `Error` instances here.
 */
async function requestOtp(email: string): Promise<void> {
  const result = await authClient.emailOtp.sendVerificationOtp({
    email,
    type: "sign-in",
  });
  if (result.error) {
    throw new Error(result.error.message ?? "Could not send sign-in code");
  }
}

export function EmailOtpSignInForm() {
  const [phase, setPhase] = React.useState<"email" | "code">("email");
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(
    null,
  );
  const [codeDigits, setCodeDigits] = React.useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const [isSending, startSending] = React.useTransition();
  const [isVerifying, startVerifying] = React.useTransition();
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [agreed, setAgreed] = React.useState(true);
  const authLayout = useAuthLayout();

  const isCheckYourInbox = phase === "code" && submittedEmail !== null;
  const isBusy = isSending || isVerifying;

  // Centre the layout card on the "check your inbox" step.
  React.useEffect(() => {
    if (isCheckYourInbox) {
      authLayout?.setAlign("center");
    } else {
      authLayout?.setAlign("left");
    }
  }, [isCheckYourInbox, authLayout]);

  // 30s Resend cooldown (Locked Decision #9) — server throttles at 3/min
  // so this is purely a UX hint.
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const {
    register,
    handleSubmit,
    reset: resetEmailForm,
    formState: { errors: emailErrors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const onSubmitEmail = (data: EmailFormData) => {
    startSending(async () => {
      try {
        await requestOtp(data.email);
        setSubmittedEmail(data.email);
        setCodeDigits(Array(OTP_LENGTH).fill(""));
        setCodeError(null);
        setResendCooldown(30);
        setPhase("code");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not send sign-in code",
        );
      }
    });
  };

  const onResend = () => {
    if (!submittedEmail || resendCooldown > 0) return;
    startSending(async () => {
      try {
        await requestOtp(submittedEmail);
        setResendCooldown(30);
        toast.success("Code re-sent");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not re-send code",
        );
      }
    });
  };

  const onUseDifferentEmail = () => {
    setPhase("email");
    setSubmittedEmail(null);
    setCodeDigits(Array(OTP_LENGTH).fill(""));
    setCodeError(null);
    resetEmailForm();
  };

  const submitCode = (digits: string[]) => {
    if (!submittedEmail) return;
    const otp = digits.join("");
    if (otp.length !== OTP_LENGTH) {
      setCodeError(`Enter the ${OTP_LENGTH}-digit code`);
      return;
    }
    setCodeError(null);
    startVerifying(async () => {
      const result = await signIn.emailOtp({ email: submittedEmail, otp });
      if (result.error) {
        setCodeError(result.error.message ?? "Invalid code");
        setCodeDigits(Array(OTP_LENGTH).fill(""));
        // Refocus the first input after clearing so the user can retry.
        const first = document.getElementById("otp-0");
        first?.focus();
        return;
      }
      // Success — Better Auth set the session cookie. Hard-redirect to
      // /profile (matches the legacy form's default callbackURL).
      window.location.href = "/profile";
    });
  };

  const onCodeChange = (idx: number, value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 1);
    setCodeDigits((prev) => {
      const next = [...prev];
      next[idx] = cleaned;
      return next;
    });
    if (cleaned && idx < OTP_LENGTH - 1) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
    // Auto-submit on the last digit landing.
    if (cleaned && idx === OTP_LENGTH - 1) {
      const filled = [...codeDigits];
      filled[idx] = cleaned;
      if (filled.every((d) => d !== "")) {
        submitCode(filled);
      }
    }
  };

  const onCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pasted.length === 0) return;
    e.preventDefault();
    const digits = pasted.slice(0, OTP_LENGTH).split("");
    const next = Array(OTP_LENGTH).fill("");
    digits.forEach((d, i) => {
      next[i] = d;
    });
    setCodeDigits(next);
    if (digits.length === OTP_LENGTH) {
      submitCode(next);
    } else {
      document.getElementById(`otp-${digits.length}`)?.focus();
    }
  };

  const onCodeKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
  ) => {
    if (e.key === "Backspace" && !codeDigits[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  // Auto-redirect when a session is already present (e.g. user navigated
  // back to /login after signing in earlier). Better Auth's `useSession`
  // is the source of truth.
  const { data: session } = useSession();
  React.useEffect(() => {
    if (session?.user) {
      window.location.href = "/profile";
    }
  }, [session]);

  const onGoogle = () => {
    startSending(async () => {
      try {
        await signIn.social({
          provider: "google",
          callbackURL: "/profile",
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Google sign-in failed",
        );
      }
    });
  };

  // ─── step 2: code entry / "check your inbox" ───────────────────────────
  if (phase === "code" && submittedEmail) {
    return (
      <ErrorScopeProvider scope="email-otp">
        <InlineError className="mb-2" />
        <div className="text-center space-y-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mx-auto w-12 h-12 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mb-2">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Code sent to{" "}
            <span className="font-semibold text-foreground">
              {submittedEmail}
            </span>
            <br />
            <span className="text-xs opacity-75">Expires in 5 minutes</span>
          </p>

          <div
            className="flex items-center justify-center gap-2 sm:gap-3 py-2"
            onPaste={onCodePaste}
          >
            {codeDigits.map((digit, idx) => (
              <Input
                key={`otp-${idx}`}
                id={`otp-${idx}`}
                inputMode="numeric"
                autoComplete={idx === 0 ? "one-time-code" : "off"}
                autoFocus={idx === 0}
                maxLength={1}
                value={digit}
                disabled={isBusy}
                aria-label={`Digit ${idx + 1}`}
                onChange={(e) => onCodeChange(idx, e.target.value)}
                onKeyDown={(e) => onCodeKeyDown(e, idx)}
                className="w-11 sm:w-10 h-11 sm:h-10 text-center font-bold text-lg sm:text-xl tracking-widest rounded-xl border-border/60 bg-muted/30 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all shadow-sm"
              />
            ))}
          </div>

          {codeError && (
            <p
              className="text-[11px] text-destructive font-medium"
              role="alert"
              aria-live="polite"
            >
              {codeError}
            </p>
          )}

          <div className="flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground pt-4">
            <div className="flex items-center gap-1.5">
              <span>Didn&apos;t get it?</span>
              <Button
                type="button"
                variant="link"
                size="sm"
                disabled={isBusy || resendCooldown > 0}
                onClick={onResend}
                className="h-auto p-0 font-semibold text-primary hover:underline"
              >
                {isSending ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <RotateCw className="mr-1 h-3 w-3" />
                )}
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend code"}
              </Button>
            </div>

            <button
              type="button"
              className="text-muted-foreground hover:text-foreground underline transition-colors text-xs"
              onClick={onUseDifferentEmail}
              disabled={isBusy}
            >
              Use a different email
            </button>
          </div>
        </div>
      </ErrorScopeProvider>
    );
  }

  // ─── step 1: email entry ──────────────────────────────────────────────
  return (
    <ErrorScopeProvider scope="email-otp">
      <InlineError className="mb-2" />
      <form
        onSubmit={handleSubmit(onSubmitEmail)}
        className="space-y-3.5 text-left"
      >
        <div className="space-y-1.5 text-left">
          <Label
            htmlFor="email"
            className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block text-left"
          >
            Email Address
          </Label>
          <Input
            {...register("email")}
            id="email"
            type="email"
            placeholder="you@example.com"
            inputSize="m"
            disabled={isBusy}
            className="rounded-lg sm:rounded-xl border-border/60 bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all h-10 sm:h-11 px-3.5 text-xs sm:text-sm w-full text-left"
          />
          {emailErrors.email && (
            <p className="text-[11px] text-destructive font-medium mt-1 text-left">
              {emailErrors.email.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-0.5 text-left">
          <Checkbox
            id="terms"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            className="rounded border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label
            htmlFor="terms"
            className="text-[11px] text-muted-foreground leading-normal font-normal cursor-pointer select-none text-left"
          >
            Accept{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors font-medium"
            >
              terms
            </a>{" "}
            &{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors font-medium"
            >
              privacy policy
            </a>
          </Label>
        </div>

        <Button
          type="submit"
          disabled={isBusy || !agreed}
          className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl font-medium text-xs sm:text-base shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all flex items-center justify-center gap-2"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending code…</span>
            </>
          ) : (
            <>
              <span>Send code</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>

        <div className="flex items-center gap-3 pt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="flex-1 h-px bg-border/60" />
          <span>or</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onGoogle}
          disabled={isBusy}
          className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2"
        >
          <GoogleGIcon />
          <span>Continue with Google</span>
        </Button>
      </form>
    </ErrorScopeProvider>
  );
}

function GoogleGIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
