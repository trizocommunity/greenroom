"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { InstitutionType } from "@/lib/prisma-enums";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { queryKeys } from "@/lib/query-keys";
import { getResolvedTier } from "@/lib/tier";
import { TIER_CONFIG } from "@/config/pricing";
import {
  type CreateFestivalInput,
  createFestivalSchema,
} from "@/lib/validations/festival";
import { createFestival } from "@/server/actions/festival.actions";

type FormData = Omit<CreateFestivalInput, "startDate" | "endDate"> & {
  startDate?: string | Date;
  endDate?: string | Date;
};

interface CreateFestivalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  tier?: string;
  planValidFrom?: string | Date | null;
  planValidUntil?: string | Date | null;
}

export function CreateFestivalModal({
  open,
  onOpenChange,
  paymentId,
  tier: _tier,
  planValidFrom,
  planValidUntil,
}: CreateFestivalModalProps) {
  const queryClient = useQueryClient();
  const form = useForm<FormData>({
    resolver: zodResolver(createFestivalSchema) as any,
    mode: "onChange",
    defaultValues: {
      paymentId,
      festivalName: "",
      festivalSlug: "",
      institutionName: "",
      institutionType: undefined,
      location: "",
      startDate: undefined,
      endDate: undefined,
    },
  });

  const { setValue, watch } = form;
  const festivalName = watch("festivalName");
  const startDateRaw = watch("startDate");

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Launch window: from plan validFrom to plan validUntil (fallback: tier duration from now)
  const resolvedTier = getResolvedTier(_tier as any);
  const fallbackDays =
    TIER_CONFIG[resolvedTier]?.durationDays ??
    TIER_CONFIG.STANDARD.durationDays ??
    30;
  const fallbackStart = new Date();
  const fallbackEnd = new Date(
    fallbackStart.getTime() + fallbackDays * 24 * 60 * 60 * 1000,
  );

  const planStart = planValidFrom ? new Date(planValidFrom) : fallbackStart;
  const planEnd = planValidUntil ? new Date(planValidUntil) : fallbackEnd;

  const startDateMin = planStart;
  const startDateMax = planEnd;

  const endDateMin =
    startDateRaw instanceof Date && !Number.isNaN(startDateRaw.getTime())
      ? startDateRaw
      : planStart;
  const endDateMax = planEnd;

  useEffect(() => {
    if (festivalName && !isSlugManuallyEdited) {
      const generated = festivalName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setValue("festivalSlug", generated, { shouldValidate: true });
    }
  }, [festivalName, setValue, isSlugManuallyEdited]);

  useEffect(() => {
    if (!showCelebration) return;
    const id = setTimeout(() => {
      setShowCelebration(false);
      onOpenChange(false);
    }, 2400);
    return () => clearTimeout(id);
  }, [showCelebration, onOpenChange]);

  const onSubmit = async (data: FormData) => {
    try {
      const slug =
        data.festivalSlug ||
        data.festivalName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

      // Ensure dates are Dates if they are strings (zod resolver handles this usually but let's be safe)
      // Actually createsFestival expects CreateFestivalInput where startDate is Date.
      // But data has string | Date.
      // Zod parser in backend will handle coercion too if we used coerce in backend validation?
      // No, we used coerce in Frontend validation.
      // So 'data' coming out of handleSubmit is actually the RESULT of validation, so it SHOULD be Dates.
      // But Typescript 'FormData' override says string | Date.
      // We can cast `data` to `CreateFestivalInput`.

      const validData = data as CreateFestivalInput;

      const result = await createFestival({
        ...validData,
        festivalSlug: slug,
        paymentId,
      });

      if (result.success) {
        toast.success("Festival Created Successfully!");
        setShowCelebration(true);
        queryClient.invalidateQueries({ queryKey: queryKeys.festivals.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
        form.reset();
        setIsSlugManuallyEdited(false);
      } else {
        const errorResult = result as any;
        if (errorResult.fields) {
          if (errorResult.fields.slug || errorResult.fields.festivalSlug) {
            form.setError("festivalSlug", {
              message:
                "This subdomain is already taken. Please choose another.",
            });
            return;
          }
          Object.entries(errorResult.fields).forEach(([key, message]) => {
            if (key === "slug") return;
            form.setError(key as any, { message: message as string });
          });
          return;
        }
        toast.error(errorResult.error || "Failed to create festival");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto relative">
        <DialogHeader>
          <DialogTitle>Launch Your Festival</DialogTitle>
          <DialogDescription>
            Set up your festival details. You have 30 days of access.
          </DialogDescription>
        </DialogHeader>

        {showCelebration && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/20 via-transparent to-fuchsia-500/30 animate-pulse" />
            <div className="relative flex flex-col items-center gap-3 text-center">
              <div className="text-5xl animate-bounce">🎉</div>
              <p className="text-lg font-semibold">Festival launched!</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your festival is ready. You can manage it anytime from your dashboard.
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="festivalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Festival Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Summer Rock Fest" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="festivalSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Festival Subdomain</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <div className="relative flex-1">
                          <Input
                            placeholder="summer-rock-fest"
                            {...field}
                            className="font-mono pr-32"
                            onChange={(e) => {
                              field.onChange(e);
                              setIsSlugManuallyEdited(true);
                            }}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground bg-muted/50 border-l px-3 rounded-r-md">
                            .greenroom.com
                          </div>
                        </div>
                      </FormControl>
                    </div>
                    <FormDescription>
                      This will be your unique URL. You can change it now.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="institutionName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Al Noor College"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="institutionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value as string | undefined}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select institution type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={InstitutionType.COLLEGE}>
                            College
                          </SelectItem>
                          <SelectItem value={InstitutionType.SCHOOL}>
                            School
                          </SelectItem>
                          <SelectItem value={InstitutionType.MADRASA}>
                            Madrasa
                          </SelectItem>
                          <SelectItem value={InstitutionType.OTHER}>
                            Other
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="City, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={
                            field.value instanceof Date
                              ? field.value
                              : field.value
                                ? new Date(field.value as any)
                                : undefined
                          }
                          from={startDateMin}
                          to={startDateMax}
                          onChange={(date) => field.onChange(date)}
                          placeholder="Pick start date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={
                            field.value instanceof Date
                              ? field.value
                              : field.value
                                ? new Date(field.value as any)
                                : undefined
                          }
                          from={endDateMin}
                          to={endDateMax}
                          onChange={(date) => field.onChange(date)}
                          placeholder="Pick end date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !form.formState.isValid}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Launch Festival
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
