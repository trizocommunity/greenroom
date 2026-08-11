"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequestAccess, useVerifyParticipantOtp } from "@/api/client";
import { ErrorScopeProvider, InlineError } from "@/components/errors";
import { useFestivalLinkBase } from "@/components/providers/custom-domain-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  readParticipantSessionMeta,
  writeParticipantSessionMeta,
} from "@/lib/participant-session-storage";
import { toast } from "@/lib/toast";

export function ParticipantLoginClient({
  festivalSlug,
}: {
  festivalSlug: string;
}) {
  const router = useRouter();
  const linkBase = useFestivalLinkBase(festivalSlug);
  const requestAccess = useRequestAccess();
  const verifyOtpMutation = useVerifyParticipantOtp();

  const [chestNumber, setChestNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [otpStage, setOtpStage] = useState<{
    participantSlug: string;
    devOtp: string | null;
  } | null>(null);
  const [otp, setOtp] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    const meta = readParticipantSessionMeta(festivalSlug);
    if (!meta) return;
    router.replace(`${linkBase}/${meta.participantSlug}`);
  }, [festivalSlug, linkBase, router]);

  const submitIdentification = () => {
    setFieldError(null);
    if (!chestNumber) {
      setFieldError("Please enter your chest number.");
      return;
    }
    if (!dateOfBirth) {
      setFieldError("Please enter your date of birth.");
      return;
    }

    const identifierValue = dateOfBirth;

    requestAccess.mutate(
      { festivalSlug, chestNumber, identifierKind: "DOB", identifierValue },
      {
        onSuccess: (data) => {
          if (data.status === "AUTHENTICATED") {
            toast.success("Signed in successfully");
            writeParticipantSessionMeta({
              festivalSlug,
              participantSlug: data.participantSlug,
              isTeamLeader: false,
              expiresAt: data.expiresAt,
            });
            router.push(`${linkBase}/${data.participantSlug}`);
            router.refresh();
            return;
          }
          setOtpStage({
            participantSlug: data.participantSlug,
            devOtp: data.debugOtp ?? null,
          });
          toast.success(
            data.debugOtp
              ? "OTP generated (dev mode shown below)."
              : "OTP sent to your email.",
          );
        },
      },
    );
  };

  const submitOtp = () => {
    setFieldError(null);
    if (!otpStage) return;
    if (otp.length !== 6) {
      setFieldError("OTP must be exactly 6 digits.");
      return;
    }
    verifyOtpMutation.mutate(
      { festivalSlug, participantSlug: otpStage.participantSlug, otp },
      {
        onSuccess: (data) => {
          toast.success("Login successful");
          writeParticipantSessionMeta({
            festivalSlug,
            participantSlug: data.participantSlug,
            isTeamLeader: data.isTeamLeader,
            expiresAt: data.expiresAt,
          });
          const destination = data.isTeamLeader
            ? `${linkBase}/${data.participantSlug}/dashboard`
            : `${linkBase}/${data.participantSlug}`;
          router.push(destination);
          router.refresh();
        },
      },
    );
  };

  return (
    <ErrorScopeProvider scope="participant-login">
      <div className="space-y-4 w-full">
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

        {otpStage ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the OTP sent to your email to access the team leader
              dashboard.
            </p>
            {otpStage.devOtp ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  Dev OTP:
                </span>{" "}
                <span className="font-mono tracking-widest font-bold text-amber-900 dark:text-amber-200">
                  {otpStage.devOtp}
                </span>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>One-Time Password</Label>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                inputSize="m"
                className="rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 h-10 text-center font-mono tracking-widest text-sm font-semibold"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => submitIdentification()}
                disabled={requestAccess.isPending}
                className="flex-1 h-9 rounded-lg text-xs font-medium"
              >
                Resend
              </Button>
              <Button
                onClick={submitOtp}
                disabled={verifyOtpMutation.isPending || otp.length !== 6}
                className="flex-1 h-9 rounded-lg text-xs font-semibold shadow-sm"
              >
                {verifyOtpMutation.isPending ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chestNumber">Chest Number</Label>
              <Input
                id="chestNumber"
                value={chestNumber}
                onChange={(e) => setChestNumber(e.target.value)}
                placeholder="e.g. 101"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <Button
              onClick={submitIdentification}
              disabled={requestAccess.isPending}
              className="w-full h-10 rounded-xl font-semibold shadow-md mt-2"
            >
              {requestAccess.isPending ? "Continuing..." : "Continue"}
            </Button>
          </div>
        )}
      </div>
    </ErrorScopeProvider>
  );
}
