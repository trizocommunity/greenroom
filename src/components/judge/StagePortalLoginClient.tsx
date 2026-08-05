"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStagePortalLogin } from "@/api/client/server-actions";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ErrorScopeProvider, InlineError } from "@/components/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";

export function StagePortalLoginClient({
  festivalSlug,
}: {
  festivalSlug: string;
}) {
  const router = useRouter();
  const login = useStagePortalLogin();
  const [accessCode, setAccessCode] = useState("");
  const [pin, setPin] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const submit = () => {
    setFieldError(null);
    if (!accessCode.trim() || !pin.trim()) {
      setFieldError("Enter the stage access code and PIN.");
      return;
    }
    login.mutate(
      { festivalSlug, accessCode, pin },
      {
        onSuccess: () => {
          toast.success("Stage portal unlocked.");
          router.refresh();
        },
      },
    );
  };

  return (
    <AuthLayout
      title="Stage judge portal"
      description="Enter the access code and PIN from your stage manager."
      variant="centered"
      showLogo={false}
    >
      <ErrorScopeProvider scope="stage-portal-login">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <InlineError />

          {fieldError ? (
            <p
              role="alert"
              aria-live="polite"
              className="text-xs font-medium text-destructive"
            >
              {fieldError}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="accessCode">Access code</Label>
            <Input
              id="accessCode"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="AB12CD"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className="h-12 rounded-xl text-center font-mono text-lg tracking-[0.3em]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="••••"
              inputMode="numeric"
              autoComplete="one-time-code"
              enterKeyHint="go"
              className="h-12 rounded-xl text-center font-mono text-xl tracking-[0.4em]"
            />
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-full text-base font-medium shadow-primary-glow"
            disabled={login.isPending}
          >
            {login.isPending ? "Checking…" : "Unlock portal"}
          </Button>
        </form>
      </ErrorScopeProvider>
    </AuthLayout>
  );
}
