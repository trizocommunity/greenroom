"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const requestOtp = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/team-leader/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ festivalSlug, studentSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request OTP");
      setRequested(true);
      const incomingDevOtp =
        typeof data.debugOtp === "string" && data.debugOtp.length === 6
          ? data.debugOtp
          : null;
      setDevOtp(incomingDevOtp);
      toast.success(
        incomingDevOtp
          ? "OTP generated (dev mode shown below)."
          : "OTP sent. Check your email.",
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to request OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/team-leader/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ festivalSlug, studentSlug, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");
      toast.success("Login successful");
      router.push(`/${festivalSlug}/${studentSlug}/leader/dashboard`);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "OTP verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Leader Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sign in as <span className="font-medium">{studentName}</span> using OTP.
        </p>
        {!requested ? (
          <Button onClick={requestOtp} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Sending..." : "Send OTP"}
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
                disabled={isSubmitting}
                className="flex-1"
              >
                Resend
              </Button>
              <Button onClick={verifyOtp} disabled={isSubmitting || otp.length !== 6} className="flex-1">
                Verify
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
