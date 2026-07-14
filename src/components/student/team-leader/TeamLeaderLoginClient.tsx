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
    <Card>
      <CardHeader>
        <CardTitle>Team Leader Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sign in as <span className="font-medium">{studentName}</span> using
          OTP.
        </p>
        {!requested ? (
          <Button
            onClick={requestOtp}
            disabled={requestOtpMutation.isPending}
            className="w-full"
          >
            {requestOtpMutation.isPending ? "Sending..." : "Send OTP"}
          </Button>
        ) : (
          <>
            {devOtp ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                <span className="font-medium">Dev OTP:</span>{" "}
                <span className="font-mono tracking-widest">{devOtp}</span>
              </div>
            ) : null}
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={requestOtp}
                disabled={requestOtpMutation.isPending}
                className="flex-1"
              >
                Resend
              </Button>
              <Button
                onClick={verifyOtp}
                disabled={verifyOtpMutation.isPending || otp.length !== 6}
                className="flex-1"
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
