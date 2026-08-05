"use client";

import {
  AlertCircle,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import { twoFactor, useSession } from "@/core/auth/better-auth/client";
import { toast } from "@/lib/toast";

/**
 * Two-factor setup component (PR 4 of ISSUE-41).
 *
 * Three states:
 *
 * 1. Disabled — the user can start setup. Better Auth returns a
 *    `totpURI` (otpauth://…) and a fresh set of backup codes.
 * 2. Enabled (TOTP only) — the user sees the enabled status, can
 *    regenerate backup codes, or disable 2FA. The TOTP URI is
 *    not re-displayed (the user already set it up).
 * 3. Disable flow — confirm dialog → `twoFactor.disable`.
 *
 * Backup codes are shown once during enable, never re-shown in
 * the UI after that. The user is told to save them at enable
 * time. After enable, the only way to see fresh backup codes is
 * to regenerate them (which invalidates the old set).
 */
export function TwoFactorSetup() {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const { data: session, isPending: sessionLoading } = useSession();
  const [isStarting, startStart] = React.useTransition();
  const [isDisabling, startDisable] = React.useTransition();
  const [isRegenerating, startRegenerate] = React.useTransition();
  const [isVerifying, startVerify] = React.useTransition();

  const [setupData, setSetupData] = React.useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);
  const [verifyCode, setVerifyCode] = React.useState("");
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const [disableOpen, setDisableOpen] = React.useState(false);
  const [regenerated, setRegenerated] = React.useState<string[] | null>(null);
  const [regeneratedOpen, setRegeneratedOpen] = React.useState(false);

  const isEnabled =
    (session?.user as { twoFactorEnabled?: boolean } | undefined)
      ?.twoFactorEnabled === true ||
    currentUser?.twoFactorEnabled === true;

  const onStartSetup = () => {
    setSetupData(null);
    setVerifyCode("");
    setVerifyError(null);
    startStart(async () => {
      try {
        const result = await twoFactor.enable({
          issuer: "Greenroom",
        });
        if (result.error) throw result.error;
        const data = result.data as {
          totpURI: string;
          backupCodes: string[];
        };
        setSetupData({ totpURI: data.totpURI, backupCodes: data.backupCodes });
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Could not start 2FA setup";
        toast.error(message || "Could not start 2FA setup");
      }
    });
  };

  const onVerify = () => {
    setVerifyError(null);
    if (!/^\d{6}$/.test(verifyCode.trim())) {
      setVerifyError("Enter the 6-digit code from your authenticator");
      return;
    }
    startVerify(async () => {
      try {
        const result = await twoFactor.verifyTotp({ code: verifyCode.trim() });
        if (result.error) throw result.error;
        toast.success("Two-factor authentication enabled");
        setSetupData(null);
        setVerifyCode("");
        router.refresh();
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Invalid code";
        setVerifyError(message || "Invalid code");
      }
    });
  };

  const onDisable = () => {
    startDisable(async () => {
      try {
        const result = await twoFactor.disable({});
        if (result.error) throw result.error;
        toast.success("Two-factor authentication disabled");
        setDisableOpen(false);
        router.refresh();
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Could not disable 2FA";
        toast.error(message || "Could not disable 2FA");
      }
    });
  };

  const onRegenerateBackupCodes = () => {
    startRegenerate(async () => {
      try {
        const result = await twoFactor.generateBackupCodes({});
        if (result.error) throw result.error;
        const data = result.data as { backupCodes: string[] };
        setRegenerated(data.backupCodes);
        setRegeneratedOpen(true);
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Could not regenerate backup codes";
        toast.error(message || "Could not regenerate backup codes");
      }
    });
  };

  if (sessionLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isEnabled ? (
        <EnabledState
          onRegenerate={onRegenerateBackupCodes}
          onDisable={() => setDisableOpen(true)}
          isRegenerating={isRegenerating}
        />
      ) : (
        <DisabledState onStart={onStartSetup} isStarting={isStarting} />
      )}

      <Dialog
        open={setupData !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSetupData(null);
            setVerifyCode("");
            setVerifyError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>
              Scan this code with your authenticator app, then enter the
              6-digit code it shows to confirm.
            </DialogDescription>
          </DialogHeader>

          {setupData && (
            <div className="space-y-4">
              <TotpUriDisplay uri={setupData.totpURI} />

              <div className="space-y-1.5">
                <Label
                  htmlFor="totp-confirm"
                  className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Code from your app
                </Label>
                <Input
                  id="totp-confirm"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(event) => {
                    setVerifyCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    );
                    setVerifyError(null);
                  }}
                  placeholder="123456"
                  disabled={isVerifying}
                  className="rounded-lg font-mono tracking-[0.4em] text-center"
                />
                {verifyError && (
                  <p className="text-[11px] text-destructive font-medium flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    {verifyError}
                  </p>
                )}
              </div>

              <BackupCodesList codes={setupData.backupCodes} />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSetupData(null);
                    setVerifyCode("");
                    setVerifyError(null);
                  }}
                  disabled={isVerifying}
                  className="rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={onVerify}
                  disabled={isVerifying || verifyCode.length < 6}
                  className="rounded-lg"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Enable 2FA"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={disableOpen} onOpenChange={setDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone with your password will be able to sign in without a
              second factor. Existing backup codes will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisabling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                onDisable();
              }}
              disabled={isDisabling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisabling ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Disabling…
                </>
              ) : (
                "Disable 2FA"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={regeneratedOpen} onOpenChange={setRegeneratedOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New backup codes</DialogTitle>
            <DialogDescription>
              Save these somewhere safe. The old codes no longer work.
            </DialogDescription>
          </DialogHeader>
          {regenerated && <BackupCodesList codes={regenerated} />}
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setRegeneratedOpen(false)}
              className="rounded-lg"
            >
              I&apos;ve saved them
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DisabledState({
  onStart,
  isStarting,
}: {
  onStart: () => void;
  isStarting: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Two-factor authentication is off
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Add a second factor to protect your account. After enabling,
            you&apos;ll sign in with a 6-digit code from an authenticator app
            (Google Authenticator, 1Password, Authy…) or a one-time email
            code.
          </p>
          <Button
            type="button"
            onClick={onStart}
            disabled={isStarting}
            className="rounded-lg font-medium mt-2"
            size="sm"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Starting setup…
              </>
            ) : (
              <>
                <Smartphone className="mr-1.5 h-3.5 w-3.5" />
                Set up 2FA
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EnabledState({
  onRegenerate,
  onDisable,
  isRegenerating,
}: {
  onRegenerate: () => void;
  onDisable: () => void;
  isRegenerating: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 space-y-1.5">
            <h3 className="text-sm font-medium text-foreground">
              Two-factor authentication is on
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every sign-in will require a 6-digit code from your
              authenticator app (or a backup code).
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="rounded-lg"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              Regenerating…
            </>
          ) : (
            <>
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              Regenerate backup codes
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDisable}
          className="rounded-lg text-destructive hover:text-destructive"
        >
          <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
          Disable 2FA
        </Button>
      </div>
    </div>
  );
}

function TotpUriDisplay({ uri }: { uri: string }) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — paste manually from the field below");
    }
  };
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor="totp-uri"
        className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Authenticator URI
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="totp-uri"
          readOnly
          value={uri}
          className="rounded-lg font-mono text-[11px] truncate"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCopy}
          className="rounded-lg shrink-0"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Paste this into your authenticator app, or scan the QR code if your
        app supports it (most apps accept the URI directly).
      </p>
    </div>
  );
}

function BackupCodesList({ codes }: { codes: string[] }) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — save the codes below manually");
    }
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Backup codes (save these)
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="h-6 px-2 text-[11px] rounded"
        >
          <Copy className="h-3 w-3 mr-1" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed mb-2">
          Each code works once. We can&apos;t show them again — store them in
          a password manager or print this page.
        </p>
        <div className="grid grid-cols-2 gap-1.5 font-mono text-[12px] text-foreground">
          {codes.map((code) => (
            <code
              key={code}
              className="px-2 py-1 rounded bg-background border border-border/60"
            >
              {code}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}