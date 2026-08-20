"use client";

import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompletePersonalOnboarding } from "@/features/auth/hooks/use-auth";

const personalOnboardingSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  userRole: z.string().min(1, "Please select a role"),
});

type FormData = z.infer<typeof personalOnboardingSchema>;

const USER_ROLES = [
  { value: "TEACHER", label: "Teacher" },
  { value: "PARTICIPANT", label: "Participant" },
  { value: "JUDGE", label: "Judge" },
  { value: "INDEPENDENT", label: "Independent" },
  { value: "OTHER", label: "Other" },
];

export function PersonalOnboardingForm() {
  const { mutate, isPending } = useCompletePersonalOnboarding();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(personalOnboardingSchema),
    defaultValues: {
      userRole: "",
    },
  });

  const onSubmit = (data: FormData) => {
    mutate(data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 sm:space-y-3.5"
    >
      <div className="space-y-1 sm:space-y-1.5">
        <Label
          htmlFor="fullName"
          className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block"
        >
          Full Name
        </Label>
        <Input
          {...register("fullName")}
          id="fullName"
          placeholder="John Doe"
          inputSize="m"
          disabled={isPending}
          className="rounded-lg sm:rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 text-foreground h-10 sm:h-11 px-3.5 text-xs sm:text-sm w-full"
        />
        {errors.fullName && (
          <p className="text-[11px] text-destructive font-medium mt-1">
            {errors.fullName.message}
          </p>
        )}
      </div>

      <div className="space-y-1 sm:space-y-1.5">
        <Label
          htmlFor="displayName"
          className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block"
        >
          Display Name
        </Label>
        <Input
          {...register("displayName")}
          id="displayName"
          placeholder="johnd"
          inputSize="m"
          disabled={isPending}
          className="rounded-lg sm:rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 text-foreground h-10 sm:h-11 px-3.5 text-xs sm:text-sm w-full"
        />
        {errors.displayName && (
          <p className="text-[11px] text-destructive font-medium mt-1">
            {errors.displayName.message}
          </p>
        )}
      </div>

      <div className="space-y-1 sm:space-y-1.5">
        <Label
          htmlFor="userRole"
          className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block"
        >
          Role
        </Label>
        <Select
          onValueChange={(value) => setValue("userRole", value)}
          disabled={isPending}
        >
          <SelectTrigger className="rounded-lg sm:rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 text-foreground h-10 sm:h-11 px-3.5 text-xs sm:text-sm w-full">
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/60">
            {USER_ROLES.map((role) => (
              <SelectItem
                key={role.value}
                value={role.value}
                className="text-xs sm:text-sm"
              >
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.userRole && (
          <p className="text-[11px] text-destructive font-medium mt-1">
            {errors.userRole.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-primary/20 mt-2"
        disabled={isPending}
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Complete Setup
      </Button>
    </form>
  );
}
