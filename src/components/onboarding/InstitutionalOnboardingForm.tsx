"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { useCompleteInstitutionalOnboarding } from "@/features/auth/hooks/use-auth";

const institutionalOnboardingSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  userRole: z.string().min(1, "Please select a role"),
  institutionName: z
    .string()
    .min(2, "Institution name must be at least 2 characters"),
  institutionType: z.string().min(1, "Please select institution type"),
  affiliation: z.string().optional(),
  city: z.string().optional(),
  sizeRange: z.string().optional(),
});

type FormData = z.infer<typeof institutionalOnboardingSchema>;

const USER_ROLES = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "DEAN", label: "Dean" },
  { value: "HOD", label: "Head of Department" },
  { value: "TEACHER", label: "Teacher" },
  { value: "COORDINATOR", label: "Coordinator" },
  { value: "JUDGE", label: "Judge" },
  { value: "OTHER", label: "Other" },
];

const INSTITUTION_TYPES = [
  { value: "COLLEGE", label: "College" },
  { value: "MADRASA", label: "Madrasa" },
  { value: "SCHOOL", label: "School" },
  { value: "UNIVERSITY", label: "University" },
  { value: "INSTITUTION", label: "Institution" },
  { value: "CAMPUS", label: "Campus" },
  { value: "DARS", label: "Dars" },
  { value: "OTHER", label: "Other" },
];

const SIZE_RANGES = [
  { value: "1-100", label: "1-100" },
  { value: "100-500", label: "100-500" },
  { value: "500-2000", label: "500-2000" },
  { value: "2000+", label: "2000+" },
];

export function InstitutionalOnboardingForm() {
  const { mutate, isPending } = useCompleteInstitutionalOnboarding();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(institutionalOnboardingSchema),
    defaultValues: {
      userRole: "",
      institutionType: "",
      sizeRange: "",
    },
  });

  const onSubmit = (data: FormData) => {
    mutate({
      ...data,
      affiliation: data.affiliation || null,
      city: data.city || null,
      sizeRange: data.sizeRange || null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 sm:space-y-3.5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:space-y-1.5">
          <Label
            htmlFor="userRole"
            className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block"
          >
            Your Role
          </Label>
          <Select
            onValueChange={(value) => setValue("userRole", value)}
            disabled={isPending}
          >
            <SelectTrigger className="rounded-lg sm:rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 text-foreground h-10 sm:h-11 px-3.5 text-xs sm:text-sm w-full">
              <SelectValue placeholder="Select role" />
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

        <div className="space-y-1 sm:space-y-1.5">
          <Label
            htmlFor="institutionType"
            className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block"
          >
            Institution Type
          </Label>
          <Select
            onValueChange={(value) => setValue("institutionType", value)}
            disabled={isPending}
          >
            <SelectTrigger className="rounded-lg sm:rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 text-foreground h-10 sm:h-11 px-3.5 text-xs sm:text-sm w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/60">
              {INSTITUTION_TYPES.map((type) => (
                <SelectItem
                  key={type.value}
                  value={type.value}
                  className="text-xs sm:text-sm"
                >
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.institutionType && (
            <p className="text-[11px] text-destructive font-medium mt-1">
              {errors.institutionType.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1 sm:space-y-1.5">
        <Label
          htmlFor="institutionName"
          className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block"
        >
          Institution Name
        </Label>
        <Input
          {...register("institutionName")}
          id="institutionName"
          placeholder="Islamic College of Excellence"
          inputSize="m"
          disabled={isPending}
          className="rounded-lg sm:rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 text-foreground h-10 sm:h-11 px-3.5 text-xs sm:text-sm w-full"
        />
        {errors.institutionName && (
          <p className="text-[11px] text-destructive font-medium mt-1">
            {errors.institutionName.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1 sm:space-y-1.5">
          <Label
            htmlFor="affiliation"
            className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block"
          >
            Affiliation
          </Label>
          <Input
            {...register("affiliation")}
            id="affiliation"
            placeholder="Optional"
            inputSize="m"
            disabled={isPending}
            className="rounded-lg sm:rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 text-foreground h-10 sm:h-11 px-3 text-xs sm:text-sm w-full"
          />
        </div>

        <div className="space-y-1 sm:space-y-1.5">
          <Label
            htmlFor="city"
            className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block"
          >
            City
          </Label>
          <Input
            {...register("city")}
            id="city"
            placeholder="Mumbai"
            inputSize="m"
            disabled={isPending}
            className="rounded-lg sm:rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 text-foreground h-10 sm:h-11 px-3 text-xs sm:text-sm w-full"
          />
        </div>

        <div className="space-y-1 sm:space-y-1.5">
          <Label
            htmlFor="sizeRange"
            className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block"
          >
            Size Range
          </Label>
          <Select
            onValueChange={(value) => setValue("sizeRange", value)}
            disabled={isPending}
          >
            <SelectTrigger className="rounded-lg sm:rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 text-foreground h-10 sm:h-11 px-3 text-xs sm:text-sm w-full">
              <SelectValue placeholder="Students" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/60">
              {SIZE_RANGES.map((size) => (
                <SelectItem
                  key={size.value}
                  value={size.value}
                  className="text-xs sm:text-sm"
                >
                  {size.label} students
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
