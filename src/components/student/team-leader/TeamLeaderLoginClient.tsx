"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useRequestOtp, useVerifyOtp } from "@/api/client/team-leader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function TeamLeaderLoginClient({
  festivalSlug,
  studentSlug,
  studentName,
}: {
  festivalSlug: string;
  studentSlug: string;
  studentName: string;
}) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [requested, setRequested] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const requestOtpMutation = useRequestOtp();
  const verifyOtpMutation = useVerifyOtp();

  const requestOtp = () => {
    requestOtpMutation.mutate(
      { festivalSlug, studentSlug },
      {
        onSuccess: (data) => {
          setRequested(true);
          const incomingDevOtp =
            "debugOtp" in data &&
            typeof data.debugOtp === "string" &&
            data.debugOtp.length === 6
              ? data.debugOtp
              : null;
          setDevOtp(incomingDevOtp);
          toast.success(
            incomingDevOtp
              ? "OTP generated (dev mode shown below)."
              : "OTP sent. Check your email.",
          );
        },
        onError: (error) => {
          toast.error(
            (error as { message?: string }).message || "Failed to request OTP",
          );
        },
      },
    );
  };

  const verifyOtp = () => {
    if (!otp) return;
    verifyOtpMutation.mutate(
      { festivalSlug, studentSlug, otp },
      {
        onSuccess: () => {
          toast.success("Login successful");
          router.push(`/${festivalSlug}/${studentSlug}/leader/dashboard`);
          router.refresh();
        },
        onError: (error) => {
          toast.error(
            (error as { message?: string }).message ||
              "OTP verification failed",
          );
        },
      },
    );
  };

  return (
    <Card className="w-full max-w-[380px] mx-auto rounded-2xl shadow-xl border-border/40 bg-card/90 dark:bg-card/85 backdrop-blur-xl">
      <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
        <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">
          Team Leader Login
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5 px-5 sm:px-6 pb-5 sm:pb-6">
        <p className="text-xs sm:text-sm text-muted-foreground leading-normal">
          Sign in as{" "}
          <span className="font-semibold text-foreground">{studentName}</span>{" "}
          using OTP.
        </p>
        {!requested ? (
          <Button
            onClick={requestOtp}
            disabled={requestOtpMutation.isPending}
            className="w-full h-10 rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-primary/20"
          >
            {requestOtpMutation.isPending ? "Sending..." : "Send OTP"}
          </Button>
        ) : (
          <>
            {devOtp ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                <span className="font-semibold">Dev OTP:</span>{" "}
                <span className="font-mono tracking-widest font-bold">
                  {devOtp}
                </span>
              </div>
            ) : null}
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              inputSize="m"
              className="rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 h-10 text-center font-mono tracking-widest text-sm font-semibold"
            />
            <div className="flex gap-2 pt-0.5">
              <Button
                variant="outline"
                onClick={requestOtp}
                disabled={requestOtpMutation.isPending}
                className="flex-1 h-9 rounded-lg text-xs font-medium"
              >
                Resend
              </Button>
              <Button
                onClick={verifyOtp}
                disabled={verifyOtpMutation.isPending || otp.length !== 6}
                className="flex-1 h-9 rounded-lg text-xs font-semibold shadow-sm"
              >
                Verify
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
