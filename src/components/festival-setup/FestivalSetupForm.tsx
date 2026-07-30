"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { queryKeys } from "@/api/client/_query-keys";
import { useCreateFestival } from "@/api/client/festivals";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InstitutionType } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";
import {
  type CreateFestivalInput,
  createFestivalSchema,
} from "@/features/festivals/schemas/festival.schema";

type FormData = Omit<CreateFestivalInput, "startDate" | "endDate"> & {
  startDate?: string | Date;
  endDate?: string | Date;
};

const STEPS = ["basics", "institution", "dates", "loading", "done"] as const;
type Step = (typeof STEPS)[number];

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
    filter: "blur(4px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
    filter: "blur(4px)",
  }),
};

const transition = {
  duration: 0.35,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

interface FestivalSetupFormProps {
  paymentId: string;
  planValidFrom?: string;
  accountType?: "PERSONAL" | "INSTITUTIONAL";
}

export function FestivalSetupForm({
  paymentId,
  planValidFrom,
  accountType,
}: FestivalSetupFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<Step>("basics");
  const [direction, setDirection] = useState(1);

  const planExpiryDate = planValidFrom
    ? (() => {
        const d = new Date(planValidFrom);
        d.setDate(d.getDate() + 90);
        return d;
      })()
    : undefined;
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const createFestival = useCreateFestival();

  const showInstitutionStep = accountType !== "INSTITUTIONAL";

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
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

  const festivalName = watch("festivalName");

  useEffect(() => {
    if (festivalName && !isSlugManuallyEdited) {
      const generated = festivalName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setValue("festivalSlug", generated, { shouldValidate: true });
    }
  }, [festivalName, setValue, isSlugManuallyEdited]);

  const stepIndex = STEPS.indexOf(currentStep);

  function goTo(step: Step) {
    const nextIndex = STEPS.indexOf(step);
    setDirection(nextIndex > stepIndex ? 1 : -1);
    setCurrentStep(step);
  }

  async function handleNext(stepToValidate?: string[]) {
    if (stepToValidate) {
      const valid = await trigger(stepToValidate as any);
      if (!valid) return;
    }

    if (currentStep === "basics") {
      goTo(showInstitutionStep ? "institution" : "dates");
    } else if (currentStep === "institution") {
      goTo("dates");
    } else if (currentStep === "dates") {
      goTo("loading");
      const data = getValues();
      const slug =
        data.festivalSlug ||
        data.festivalName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      try {
        const festival = await createFestival.mutateAsync({
          name: data.festivalName,
          slug,
          location: data.location || undefined,
          startDate:
            data.startDate instanceof Date
              ? data.startDate.toISOString()
              : data.startDate,
          endDate:
            data.endDate instanceof Date
              ? data.endDate.toISOString()
              : data.endDate,
          institutionName: data.institutionName || undefined,
          institutionType: data.institutionType || undefined,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.festivals.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
        setTimeout(() => {
          goTo("done");
          setTimeout(() => {
            window.location.href = `/dashboard/${festival.slug}?celebrate=1`;
          }, 2200);
        }, 1500);
      } catch (error: any) {
        const message = error?.message || "";
        if (
          message.toLowerCase().includes("subdomain") ||
          message.toLowerCase().includes("slug") ||
          message.toLowerCase().includes("taken")
        ) {
          toast.error(
            "This subdomain is already taken. Please choose another.",
          );
        } else {
          toast.error(message || "Failed to create festival");
        }
        goTo("basics");
      }
    }
  }

  const progressWidth = {
    basics: "20%",
    institution: "50%",
    dates: "80%",
    loading: "95%",
    done: "100%",
  }[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full h-px bg-border/40">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: progressWidth }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="w-full max-w-md"
          >
            {/* ── STEP 1: BASICS ── */}
            {currentStep === "basics" && (
              <div className="flex flex-col space-y-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-widest mb-4">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      1
                    </span>
                    The Basics
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Name your festival
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Give it a catchy name and secure your unique subdomain.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleNext(["festivalName", "festivalSlug"]);
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="festivalName"
                        className="text-sm font-medium"
                      >
                        Festival Name
                      </Label>
                      <Input
                        id="festivalName"
                        placeholder="e.g. Summer Rock Fest"
                        autoFocus
                        className={cn(
                          "h-12 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm",
                          errors.festivalName &&
                            "border-destructive/60 focus-visible:ring-destructive/20",
                        )}
                        {...register("festivalName")}
                      />
                      {errors.festivalName && (
                        <p className="text-xs text-destructive">
                          {errors.festivalName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="festivalSlug"
                        className="text-sm font-medium"
                      >
                        Subdomain
                      </Label>
                      <div className="relative flex">
                        <Input
                          id="festivalSlug"
                          placeholder="summer-rock-fest"
                          className={cn(
                            "h-12 rounded-l-xl rounded-r-none border-border/60 bg-background/60 backdrop-blur-sm focus:z-10",
                            errors.festivalSlug &&
                              "border-destructive/60 focus-visible:ring-destructive/20",
                          )}
                          {...register("festivalSlug", {
                            onChange: () => setIsSlugManuallyEdited(true),
                          })}
                        />
                        <div className="flex items-center px-4 bg-muted/50 border border-l-0 border-border/60 rounded-r-xl text-muted-foreground text-sm whitespace-nowrap">
                          .greenroom.com
                        </div>
                      </div>
                      {errors.festivalSlug && (
                        <p className="text-xs text-destructive">
                          {errors.festivalSlug.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}

            {/* ── STEP 2: INSTITUTION ── */}
            {currentStep === "institution" && (
              <div className="flex flex-col space-y-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-widest mb-4">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      2
                    </span>
                    Organization Details
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Who's organizing?
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Link this festival to an institution or organization.
                    (Optional)
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleNext(["institutionName", "institutionType"]);
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="institutionName"
                        className="text-sm font-medium"
                      >
                        Institution Name
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                          id="institutionName"
                          placeholder="e.g. Al Noor College"
                          autoFocus
                          className={cn(
                            "h-12 pl-10 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm",
                            errors.institutionName &&
                              "border-destructive/60 focus-visible:ring-destructive/20",
                          )}
                          {...register("institutionName")}
                        />
                      </div>
                      {errors.institutionName && (
                        <p className="text-xs text-destructive">
                          {errors.institutionName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Institution Type
                      </Label>
                      <Select
                        onValueChange={(val) =>
                          setValue("institutionType", val as any)
                        }
                        value={watch("institutionType") as string | undefined}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm">
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {Object.values(InstitutionType).map((type) => (
                            <SelectItem
                              key={type}
                              value={type}
                              className="rounded-lg"
                            >
                              {type.charAt(0) + type.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.institutionType && (
                        <p className="text-xs text-destructive">
                          {errors.institutionType.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleNext()}
                      className="w-full h-12 text-sm text-muted-foreground rounded-xl"
                    >
                      Skip for now
                    </Button>
                    <button
                      type="button"
                      onClick={() => goTo("basics")}
                      className="text-xs text-muted-foreground hover:text-foreground py-1 mt-2"
                    >
                      ← Back
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── STEP 3: DATES ── */}
            {currentStep === "dates" && (
              <div className="flex flex-col space-y-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-widest mb-4">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      3
                    </span>
                    When & Where
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Festival details
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Set the physical location and schedule for the festival.
                    {planExpiryDate && (
                      <>
                        {" "}
                        Your scheduling is available until{" "}
                        <span className="text-foreground font-medium">
                          {planExpiryDate.toLocaleDateString()}
                        </span>
                        .
                      </>
                    )}
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleNext(["location", "startDate", "endDate"]);
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-sm font-medium">
                        Location
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                          id="location"
                          placeholder="City, Country"
                          autoFocus
                          className={cn(
                            "h-12 pl-10 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm",
                            errors.location &&
                              "border-destructive/60 focus-visible:ring-destructive/20",
                          )}
                          {...register("location")}
                        />
                      </div>
                      {errors.location && (
                        <p className="text-xs text-destructive">
                          {errors.location.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Festival Dates
                      </Label>
                      <DateRangePicker
                        value={{
                          from: watch("startDate")
                            ? watch("startDate") instanceof Date
                              ? (watch("startDate") as Date)
                              : new Date(watch("startDate") as any)
                            : undefined,
                          to: watch("endDate")
                            ? watch("endDate") instanceof Date
                              ? (watch("endDate") as Date)
                              : new Date(watch("endDate") as any)
                            : undefined,
                        }}
                        onChange={(range) => {
                          setValue("startDate", range.from);
                          setValue("endDate", range.to);
                        }}
                        placeholder="Select date range"
                        from={
                          planValidFrom ? new Date(planValidFrom) : undefined
                        }
                        to={planExpiryDate}
                        className="h-12 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm"
                      />
                      {(planValidFrom || planExpiryDate) && (
                        <p className="text-xs text-muted-foreground">
                          {[
                            planValidFrom &&
                              `From ${format(new Date(planValidFrom), "MMM d, yyyy")}`,
                            planExpiryDate &&
                              `Until ${format(planExpiryDate, "MMM d, yyyy")}`,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      )}
                      {errors.startDate && (
                        <p className="text-xs text-destructive">
                          {errors.startDate.message}
                        </p>
                      )}
                      {errors.endDate && (
                        <p className="text-xs text-destructive">
                          {errors.endDate.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20"
                    >
                      Complete Setup
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      onClick={() =>
                        goTo(showInstitutionStep ? "institution" : "basics")
                      }
                      className="text-xs text-muted-foreground hover:text-foreground py-1 mt-2"
                    >
                      ← Back
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* ── STEP 4: LOADING ── */}
            {currentStep === "loading" && (
              <div className="flex flex-col items-center justify-center space-y-8 py-10">
                <div className="relative flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-primary/50 relative flex items-center justify-center"
                  >
                    {/* Inner continuous loader */}
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-16 h-16 rounded-full border border-primary/80"
                    />
                  </motion.div>
                  <Sparkles className="absolute text-primary w-6 h-6 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold">
                    Setting up your festival...
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Provisioning resources and saving configurations.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 5: DONE ── */}
            {currentStep === "done" && (
              <div className="flex flex-col items-center text-center space-y-8 py-10">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/30">
                    <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                  </div>
                  <div className="absolute -inset-2 rounded-full bg-emerald-500/5 blur-md -z-10" />
                </motion.div>

                <div className="space-y-3">
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-bold tracking-tight text-foreground"
                  >
                    Festival Launched!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-muted-foreground text-sm max-w-xs mx-auto"
                  >
                    Taking you straight to your new dashboard...
                  </motion.p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step dots (not shown on loading/done screens) */}
      {currentStep !== "done" && currentStep !== "loading" && (
        <div className="relative z-10 flex items-center justify-center gap-2 pb-10">
          {(showInstitutionStep
            ? (["basics", "institution", "dates"] as Step[])
            : (["basics", "dates"] as Step[])
          ).map((step, i) => {
            const visibleSteps = showInstitutionStep
              ? (["basics", "institution", "dates"] as Step[])
              : (["basics", "dates"] as Step[]);
            const stepIdx = visibleSteps.indexOf(currentStep);
            return (
              <div
                key={step}
                className={cn(
                  "rounded-full transition-all duration-300",
                  currentStep === step
                    ? "w-6 h-1.5 bg-primary"
                    : stepIdx > i
                      ? "w-1.5 h-1.5 bg-primary/40"
                      : "w-1.5 h-1.5 bg-border",
                )}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
