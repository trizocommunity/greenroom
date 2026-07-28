"use client";

import { ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useRequestAccess, useVerifyParticipantOtp } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const currentYear = new Date().getFullYear();

export function ParticipantLoginClient({
  festivalSlug,
}: {
  festivalSlug: string;
}) {
  const router = useRouter();
  const requestAccess = useRequestAccess();
  const verifyOtpMutation = useVerifyParticipantOtp();

  const [chestNumber, setChestNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [dobPickerOpen, setDobPickerOpen] = useState(false);
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

    if (!dateOfBirth) {
      toast.error("Please select your date of birth");
      return;
    }

    const identifierValue = dateOfBirth.toISOString();

    requestAccess.mutate(
      { festivalSlug, chestNumber, identifierKind: "DOB", identifierValue },
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
    <div className="space-y-4 w-full">
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
            <Popover open={dobPickerOpen} onOpenChange={setDobPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  id="dateOfBirth"
                  className="w-full h-10 rounded-xl justify-between font-normal text-left"
                  data-empty={!dateOfBirth || undefined}
                >
                  {dateOfBirth ? (
                    dateOfBirth.toLocaleDateString()
                  ) : (
                    <span className="text-muted-foreground">
                      Select your birth date
                    </span>
                  )}
                  <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateOfBirth}
                  captionLayout="dropdown"
                  startMonth={new Date(currentYear - 100, 0)}
                  endMonth={new Date()}
                  disabled={{ after: new Date() }}
                  onSelect={(date) => {
                    setDateOfBirth(date);
                    setDobPickerOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
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
  );
}
