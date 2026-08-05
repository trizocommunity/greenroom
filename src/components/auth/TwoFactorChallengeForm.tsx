"use client";

import { AlertCircle, ArrowRight, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { z } from "zod";
import { ErrorScopeProvider, InlineError } from "@/components/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { twoFactor } from "@/core/auth/better-auth/client";
import { toast } from "@/lib/toast";

interface TwoFactorChallengeFormProps {
  callbackURL: string;
  showSentHint: boolean;
}

type ChallengeMethod = "totp" | "otp" | "backup";

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6, "Codes are at least 6 characters")
    .max(20, "Codes are at most 20 characters"),
});

type FormData = z.infer<typeof codeSchema>;

/**
 * Two-factor challenge form (PR 4 of ISSUE-41).
 *
 * Three tabs, all routed through Better Auth's `twoFactor` client:
 *
 * - Authenticator (TOTP): the user reads a 6-digit code from their
 *   authenticator app. Calls `authClient.twoFactor.verifyTotp`.
 * - Email code (OTP): the user requests an email, then enters the
 *   6-digit code we send. `authClient.twoFactor.sendOtp` triggers
 *   the email; `authClient.twoFactor.verifyOtp` consumes it.
 * - Backup code: a one-time recovery code from the codes shown when
 *   2FA was first enabled. Calls
 *   `authClient.twoFactor.verifyBackupCode`.
 *
 * On success, Better Auth returns a real session — `useSession`
 * updates and we navigate to the original `callbackURL` (default
 * `/profile`).
 */
export function TwoFactorChallengeForm({
  callbackURL,
  showSentHint,
}: TwoFactorChallengeFormProps) {
  const router = useRouter();
  const [method, setMethod] = React.useState<ChallengeMethod>(
    showSentHint ? "otp" : "totp",
  );
  const [code, setCode] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const [isSendingOtp, startOtpTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [otpSentNotice, setOtpSentNotice] = React.useState(showSentHint);

  const codeInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    codeInputRef.current?.focus();
    // We intentionally only re-focus when the user switches method —
    // re-focusing on every code keystroke would steal focus from the
    // input they're typing into. The "code length" effect below
    // handles the keyboard-driven path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = codeSchema.safeParse({ code });
    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Enter a valid code",
      );
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      try {
        if (method === "totp") {
          const { error } = await twoFactor.verifyTotp({
            code: parsed.data.code,
          });
          if (error) throw error;
        } else if (method === "otp") {
          const { error } = await twoFactor.verifyOtp({
            code: parsed.data.code,
          });
          if (error) throw error;
        } else {
          const { error } = await twoFactor.verifyBackupCode({
            code: parsed.data.code,
          });
          if (error) throw error;
        }
        toast.success("Verified — welcome back");
        router.push(callbackURL);
        router.refresh();
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Invalid code";
        setErrorMessage(message || "Invalid code");
      }
    });
  };

  const onSendOtp = () => {
    startOtpTransition(async () => {
      try {
        const { error } = await twoFactor.sendOtp();
        if (error) throw error;
        setOtpSentNotice(true);
        setMethod("otp");
        // Re-focus the code input once we switch tabs.
        setTimeout(() => codeInputRef.current?.focus(), 0);
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Could not send email code";
        toast.error(message || "Could not send email code");
      }
    });
  };

  return (
    <ErrorScopeProvider scope="two-factor">
      <InlineError className="mb-2" />
      <Tabs
        value={method}
        onValueChange={(value) => {
          setMethod(value as ChallengeMethod);
          setCode("");
          setErrorMessage(null);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 rounded-lg bg-card border border-border/60 p-0.5 h-9">
          <TabsTrigger
            value="totp"
            className="text-[11px] sm:text-xs gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            App
          </TabsTrigger>
          <TabsTrigger value="otp" className="text-[11px] sm:text-xs gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Email
          </TabsTrigger>
          <TabsTrigger
            value="backup"
            className="text-[11px] sm:text-xs gap-1.5"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Backup
          </TabsTrigger>
        </TabsList>

        <form onSubmit={onSubmit} className="mt-4 space-y-3.5 text-left">
          <div className="space-y-1.5 text-left">
            <Label
              htmlFor="two-factor-code"
              className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block text-left"
            >
              {method === "backup" ? "Backup code" : "6-digit code"}
            </Label>
            <Input
              ref={codeInputRef}
              id="two-factor-code"
              type="text"
              inputMode={
                method === "backup" ? "text" : "numeric"
              }
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => {
                const raw =
                  method === "backup"
                    ? event.target.value
                    : event.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(raw);
                setErrorMessage(null);
              }}
              placeholder={
                method === "backup" ? "ABCD-12345" : "123 456"
              }
              disabled={isPending}
              className="rounded-lg sm:rounded-xl border-border/60 bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all h-10 sm:h-11 px-3.5 text-xs sm:text-sm w-full text-left font-mono tracking-[0.4em]"
            />
            {errorMessage && (
              <p className="text-[11px] text-destructive font-medium mt-1 text-left flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                {errorMessage}
              </p>
            )}
          </div>

          <TabsContent value="totp" className="mt-0">
            <p className="text-[11px] text-muted-foreground leading-normal">
              Open your authenticator app (Google Authenticator, 1Password,
              Authy…) and enter the current code.
            </p>
          </TabsContent>

          <TabsContent value="otp" className="mt-0 space-y-2">
            {otpSentNotice ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-normal">
                We just sent a 6-digit code to your email. It expires in 5
                minutes.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-normal">
                We&apos;ll email you a one-time code.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSendOtp}
              disabled={isSendingOtp || isPending}
              className="rounded-lg font-medium text-xs"
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Sending…
                </>
              ) : otpSentNotice ? (
                "Resend email code"
              ) : (
                "Email me a code"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="backup" className="mt-0">
            <p className="text-[11px] text-muted-foreground leading-normal">
              Enter one of the backup codes you saved when you turned 2FA
              on. Each code works once.
            </p>
          </TabsContent>

          <Button
            type="submit"
            disabled={isPending || code.length < 6}
            className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl font-medium text-xs sm:text-base shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying…</span>
              </>
            ) : (
              <>
                <span>Verify and continue</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Tabs>
    </ErrorScopeProvider>
  );
}