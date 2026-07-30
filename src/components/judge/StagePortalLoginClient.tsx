"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useStagePortalLogin } from "@/api/client/server-actions";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StagePortalLoginClient({
  festivalSlug,
}: {
  festivalSlug: string;
}) {
  const router = useRouter();
  const login = useStagePortalLogin();
  const [accessCode, setAccessCode] = useState("");
  const [pin, setPin] = useState("");

  const submit = () => {
    if (!accessCode.trim() || !pin.trim()) {
      toast.error("Enter the stage access code and PIN.");
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
      title="Stage Judge Portal"
      description="Enter the stage's access code and PIN from your stage manager."
      variant="centered"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accessCode">Access code</Label>
          <Input
            id="accessCode"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="e.g. AB12CD"
            autoCapitalize="characters"
            className="h-11 text-center font-mono text-lg tracking-widest"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pin">PIN</Label>
          <Input
            id="pin"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="h-11 text-center font-mono text-xl tracking-[0.35em]"
          />
        </div>
        <Button
          className="h-11 w-full text-base"
          onClick={submit}
          disabled={login.isPending}
        >
          {login.isPending ? "Checking…" : "Unlock portal"}
        </Button>
      </div>
    </AuthLayout>
  );
}
