"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useRequestAccess, useVerifyParticipantOtp } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ParticipantLoginClient({
  festivalSlug,
  festivalName,
  groups,
}: {
  festivalSlug: string;
  festivalName: string;
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const requestAccess = useRequestAccess();
  const verifyOtpMutation = useVerifyParticipantOtp();

  const [chestNumber, setChestNumber] = useState("");
  const [identifierKind, setIdentifierKind] = useState<"DOB" | "GROUP">("DOB");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [groupId, setGroupId] = useState("");
  const [otpStage, setOtpStage] = useState<{
    studentSlug: string;
    devOtp: string | null;
  } | null>(null);
  const [otp, setOtp] = useState("");

  const submitIdentification = () => {
    if (!chestNumber) {
      toast.error("Please enter your chest number");
      return;
    }

    if (identifierKind === "DOB" && !dateOfBirth) {
      toast.error("Please select your date of birth");
      return;
    }

    if (identifierKind === "GROUP" && !groupId) {
      toast.error("Please select your group");
      return;
    }

    const identifierValue =
      identifierKind === "DOB" && dateOfBirth
        ? dateOfBirth.toISOString()
        : groupId;

    requestAccess.mutate(
      { festivalSlug, chestNumber, identifierKind, identifierValue },
      {
        onSuccess: (data) => {
          if (data.status === "AUTHENTICATED") {
            toast.success("Signed in successfully");
            router.push(`/${festivalSlug}/${data.studentSlug}`);
            router.refresh();
            return;
          }
          // OTP stage (Team Leader)
          setOtpStage({
            studentSlug: data.studentSlug,
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
    if (!otpStage || otp.length !== 6) return;
    verifyOtpMutation.mutate(
      { festivalSlug, studentSlug: otpStage.studentSlug, otp },
      {
        onSuccess: () => {
          toast.success("Login successful");
          router.push(
            `/${festivalSlug}/${otpStage.studentSlug}/leader/dashboard`,
          );
          router.refresh();
        },
      },
    );
  };

  return (
    <Card className="w-full max-w-[380px] mx-auto rounded-2xl shadow-xl border-border/40 bg-card/90 dark:bg-card/85 backdrop-blur-xl">
      <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
        <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">
          Participant Login
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Sign in to {festivalName}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-5 sm:px-6 pb-5 sm:pb-6">
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
              <Label>Identify by</Label>
              <Tabs
                value={identifierKind}
                onValueChange={(val) =>
                  setIdentifierKind(val as "DOB" | "GROUP")
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="DOB">Date of Birth</TabsTrigger>
                  <TabsTrigger value="GROUP">Group</TabsTrigger>
                </TabsList>
                <div className="mt-4">
                  <TabsContent
                    value="DOB"
                    className="m-0 space-y-2 focus-visible:outline-none"
                  >
                    <Label className="sr-only">Date of Birth</Label>
                    <div className="w-full">
                      <DatePicker
                        date={dateOfBirth}
                        onChange={setDateOfBirth}
                        placeholder="Select your birth date"
                        className="w-full"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent
                    value="GROUP"
                    className="m-0 space-y-2 focus-visible:outline-none"
                  >
                    <Label className="sr-only">Group</Label>
                    <Select value={groupId} onValueChange={setGroupId}>
                      <SelectTrigger className="w-full h-10 rounded-xl">
                        <SelectValue placeholder="Select your group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                </div>
              </Tabs>
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
      </CardContent>
    </Card>
  );
}
