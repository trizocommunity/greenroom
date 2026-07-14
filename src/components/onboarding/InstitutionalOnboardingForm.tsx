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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Your Full Name</Label>
        <Input
          {...register("fullName")}
          id="fullName"
          placeholder="John Doe"
          disabled={isPending}
        />
        {errors.fullName && (
          <p className="text-sm text-red-500">{errors.fullName.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">Your Display Name</Label>
        <Input
          {...register("displayName")}
          id="displayName"
          placeholder="johnd"
          disabled={isPending}
        />
        {errors.displayName && (
          <p className="text-sm text-red-500">{errors.displayName.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="userRole">Your Role</Label>
        <Select
          onValueChange={(value) => setValue("userRole", value)}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            {USER_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.userRole && (
          <p className="text-sm text-red-500">{errors.userRole.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="institutionName">Institution Name</Label>
        <Input
          {...register("institutionName")}
          id="institutionName"
          placeholder="Islamic College of Excellence"
          disabled={isPending}
        />
        {errors.institutionName && (
          <p className="text-sm text-red-500">
            {errors.institutionName.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="institutionType">Institution Type</Label>
        <Select
          onValueChange={(value) => setValue("institutionType", value)}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select institution type" />
          </SelectTrigger>
          <SelectContent>
            {INSTITUTION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.institutionType && (
          <p className="text-sm text-red-500">
            {errors.institutionType.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="affiliation">Affiliation (Optional)</Label>
        <Input
          {...register("affiliation")}
          id="affiliation"
          placeholder="Board of Education"
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input
          {...register("city")}
          id="city"
          placeholder="Mumbai"
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sizeRange">Institution Size</Label>
        <Select
          onValueChange={(value) => setValue("sizeRange", value)}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select size range" />
          </SelectTrigger>
          <SelectContent>
            {SIZE_RANGES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label} students
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Complete Setup
      </Button>
    </form>
  );
}
